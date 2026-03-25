import mongoose from 'mongoose'
import { Grade } from '../models/Grade.js'
import { Subject } from '../models/GradeType.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { findClassForTeacher, findMainTeacherClass } from '../utils/teacherClassScope.js'
import { computeGradesAverageForStudent } from '../services/gradesAverage.service.js'

const SOURCE_HOMEWORK = 'HOMEWORK'
const SOURCE_MANUAL = 'MANUAL'
const MANUAL_SOURCE_ID = 'MANUAL'

function handleError(res, err) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate grade for this component' })
  }
  return res.status(500).json({ error: 'Server error' })
}

/** Weight from populated subject.components matched by componentName; optional legacy g.type.weight. */
export function resolveGradeWeight(g) {
  const sub = g?.subject
  if (sub && typeof sub === 'object' && Array.isArray(sub.components)) {
    const c = sub.components.find((x) => x.name === g.componentName)
    const w = Number(c?.weight)
    if (Number.isFinite(w)) return w
  }
  const legacy = Number(g?.type?.weight)
  if (Number.isFinite(legacy)) return legacy
  return NaN
}

function calculateWeightedAverage({ grades = [] }) {
  let weightedSum = 0
  let weightSum = 0

  for (const g of grades) {
    const w = resolveGradeWeight(g)
    const score = Number(g?.score)
    if (!Number.isFinite(w) || !Number.isFinite(score)) continue
    weightedSum += score * w
    weightSum += w
  }

  if (weightSum <= 0) return { weightedAverage: null, weightSum: 0 }
  return { weightedAverage: weightedSum / weightSum, weightSum }
}

function reduceGradesToLatestByComponent(grades = []) {
  const latest = new Map()
  for (const g of grades) {
    const studentId =
      g?.student && typeof g.student === 'object' ? String(g.student._id) : String(g?.student ?? '')
    const subjectId =
      g?.subject && typeof g.subject === 'object' ? String(g.subject._id) : String(g?.subject ?? '')
    const componentName = String(g?.componentName ?? '')

    const key = `${studentId}:${subjectId}:${componentName}`
    const nextTime = g?.createdAt ? new Date(g.createdAt).getTime() : -Infinity
    const prev = latest.get(key)
    const prevTime = prev?.createdAt ? new Date(prev.createdAt).getTime() : -Infinity
    if (!prev || nextTime >= prevTime) latest.set(key, g)
  }

  return Array.from(latest.values())
}

function weightWarningFromTypeWeights({ typeWeightsSum }) {
  if (!Number.isFinite(typeWeightsSum)) return null
  const EPS = 0.02
  const diff = Math.abs(typeWeightsSum - 1)
  if (diff <= EPS) return null
  return { typeWeightsSum, expected: 1, diff }
}

function subjectWeightWarningsFromSubjects(subjects = []) {
  const out = []
  for (const sub of subjects) {
    const componentsWeightSum = (sub.components || []).reduce(
      (acc, c) => acc + Number(c?.weight || 0),
      0,
    )
    const warning = weightWarningFromTypeWeights({ typeWeightsSum: componentsWeightSum })
    if (warning) {
      out.push({
        subjectId: sub._id,
        subjectName: sub.name,
        ...warning,
      })
    }
  }
  return out
}

/** Parent UI still expects `type: { name, weight }` on each grade row. */
function withTypeAlias(g) {
  if (!g) return g
  const w = resolveGradeWeight(g)
  const subName = g.subject && typeof g.subject === 'object' ? g.subject.name : ''
  const name = subName ? `${subName} · ${g.componentName}` : g.componentName || 'Grade'
  return { ...g, type: { name, weight: Number.isFinite(w) ? w : null } }
}

async function assertStudentAccessForTeacher(studentId, teacherUserId) {
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  const cls = await findClassForTeacher(student.classId, teacherUserId).lean()
  if (!cls) return null
  return { student, classId: student.classId }
}

async function assertStudentAccessForParent(studentId, parentUserId) {
  const link = await ParentStudent.findOne({ parentUserId, studentId }).lean()
  if (!link) return null
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  return { student }
}

async function populateGradeDoc(doc) {
  return Grade.findById(doc._id)
    .populate('subject', 'name description components classId')
    .populate('createdBy', 'name email')
    .lean()
}

function validateComponents(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return 'components must be a non-empty array'
  }
  for (const c of components) {
    const n = String(c?.name ?? '').trim()
    if (!n) return 'Each component must have a non-empty name'
    const w = Number(c?.weight)
    if (!Number.isFinite(w) || w < 0 || w > 1) {
      return 'Each component weight must be between 0 and 1'
    }
  }
  return null
}

export async function createSubject(req, res) {
  try {
    const { classId, name, description, components } = req.body || {}

    if (!classId || !name?.trim()) {
      return res.status(400).json({ error: 'classId and name are required' })
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }
    const compErr = validateComponents(components)
    if (compErr) return res.status(400).json({ error: compErr })

    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const normalized = components.map((c) => ({
      name: String(c.name).trim(),
      weight: Number(c.weight),
    }))

    const created = await Subject.create({
      classId,
      name: name.trim(),
      description: description?.trim() || undefined,
      components: normalized,
    })
    res.status(201).json(created.toObject())
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'A subject with this name already exists in this class' })
    }
    handleError(res, err)
  }
}

export async function getSubjects(req, res) {
  try {
    const classId = req.query?.classId
    if (!classId) return res.status(400).json({ error: 'classId query is required' })
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const subjects = await Subject.find({ classId }).sort({ createdAt: 1 }).lean()
    res.json({ classId, subjects })
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateSubject(req, res) {
  try {
    const { id } = req.params
    const { name, description, components } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid subject id' })
    }

    const subj = await Subject.findById(id)
    if (!subj) return res.status(404).json({ error: 'Subject not found' })

    const cls = await findMainTeacherClass(subj.classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Not your class' })

    const updates = {}
    if (name !== undefined) {
      const n = String(name).trim()
      if (!n) return res.status(400).json({ error: 'name cannot be empty' })
      updates.name = n
    }
    if (description !== undefined) {
      updates.description = description === null || description === '' ? '' : String(description).trim()
    }
    if (components !== undefined) {
      const compErr = validateComponents(components)
      if (compErr) return res.status(400).json({ error: compErr })
      updates.components = components.map((c) => ({
        name: String(c.name).trim(),
        weight: Number(c.weight),
      }))
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No updates provided' })
    }

    const updated = await Subject.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean()

    res.json(updated)
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'A subject with this name already exists in this class' })
    }
    handleError(res, err)
  }
}

export async function addGradeToSubject(req, res) {
  try {
    const { subjectId } = req.params
    const { studentId, classId, componentName, score, showToParent } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Invalid subjectId' })
    }
    if (!studentId || !classId || !componentName?.trim()) {
      return res.status(400).json({ error: 'studentId, classId, and componentName are required' })
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid studentId' })
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }
    const s = Number(score)
    if (!Number.isFinite(s)) {
      return res.status(400).json({ error: 'score must be a valid number' })
    }

    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const subject = await Subject.findOne({ _id: subjectId, classId }).lean()
    if (!subject) return res.status(404).json({ error: 'Subject not found for this class' })

    const comp = String(componentName).trim()
    const validComp = subject.components?.some((c) => c.name === comp)
    if (!validComp) {
      return res.status(400).json({ error: 'componentName is not part of this subject' })
    }

    const student = await Student.findOne({ _id: studentId, classId }).lean()
    if (!student) {
      return res.status(404).json({ error: 'Student not found in this class' })
    }

    // Connected academic flow: grades coming from graded Homework should not be overridden manually.
    const hasHomeworkGrade = await Grade.exists({
      student: studentId,
      class: classId,
      subject: subjectId,
      componentName: comp,
      source: SOURCE_HOMEWORK,
    })
    if (hasHomeworkGrade) {
      return res
        .status(409)
        .json({ error: 'Cannot override homework-sourced grades for this component' })
    }

    // Backward compatibility: legacy grades might not have `source/sourceId` yet.
    // Prefer the current MANUAL row; otherwise reuse any non-HOMEWORK row.
    const existingManual = await Grade.findOne({
      student: studentId,
      class: classId,
      subject: subjectId,
      componentName: comp,
      source: SOURCE_MANUAL,
      sourceId: MANUAL_SOURCE_ID,
    }).sort({ createdAt: -1 })

    const existing =
      existingManual ??
      (await Grade.findOne({
        student: studentId,
        class: classId,
        subject: subjectId,
        componentName: comp,
        source: { $ne: SOURCE_HOMEWORK },
      }).sort({ createdAt: -1 }))

    let doc
    if (existing) {
      existing.score = s
      existing.createdBy = req.user.id
      existing.source = SOURCE_MANUAL
      existing.sourceId = MANUAL_SOURCE_ID
      if (showToParent !== undefined) existing.showToParent = Boolean(showToParent)
      await existing.save()
      doc = existing
    } else {
      doc = await Grade.create({
        student: studentId,
        class: classId,
        subject: subjectId,
        componentName: comp,
        score: s,
        createdBy: req.user.id,
        showToParent: Boolean(showToParent),
        source: SOURCE_MANUAL,
        sourceId: MANUAL_SOURCE_ID,
      })
    }

    const populated = await populateGradeDoc(doc)
    res.status(existing ? 200 : 201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getGradesBySubject(req, res) {
  try {
    const { subjectId } = req.params
    const studentId = req.query?.studentId

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Invalid subjectId' })
    }
    if (studentId && !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid studentId' })
    }

    const subject = await Subject.findById(subjectId).lean()
    if (!subject) return res.status(404).json({ error: 'Subject not found' })

    const cls = await findClassForTeacher(subject.classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const filter = { subject: subjectId, class: subject.classId }
    if (studentId) filter.student = studentId

    const grades = await Grade.find(filter)
      .populate('subject', 'name description components classId')
      .populate('student', 'name age gender classId')
      .populate('createdBy', 'name email')
      .sort({ student: 1, componentName: 1 })
      .lean()

    const effectiveGrades = reduceGradesToLatestByComponent(grades)
      .slice()
      .sort((a, b) => {
        const an = a?.student?._id ?? a?.student ?? ''
        const bn = b?.student?._id ?? b?.student ?? ''
        const c = String(an).localeCompare(String(bn))
        if (c !== 0) return c
        return String(a?.componentName ?? '').localeCompare(String(b?.componentName ?? ''))
      })

    const weightedAverage = studentId && effectiveGrades.length
      ? calculateWeightedAverage({ grades: effectiveGrades }).weightedAverage
      : null

    res.json({
      subject,
      grades: effectiveGrades,
      weightedAverage,
    })
  } catch (err) {
    handleError(res, err)
  }
}

export async function putGrade(req, res) {
  try {
    const { id } = req.params
    const { score, showToParent } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid grade id' })
    }

    const grade = await Grade.findById(id)
    if (!grade) return res.status(404).json({ error: 'Grade not found' })

    const cls = await findMainTeacherClass(grade.class, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Not your class' })

    const updates = {}
    if (score !== undefined) {
      if (grade.source === SOURCE_HOMEWORK) {
        return res.status(409).json({
          error: 'This grade comes from a graded homework and cannot be overridden',
        })
      }
      const s = Number(score)
      if (!Number.isFinite(s)) return res.status(400).json({ error: 'score must be a valid number' })
      updates.score = s
      updates.createdBy = req.user.id
    }
    if (showToParent !== undefined) {
      updates.showToParent = Boolean(showToParent)
    }

    const updated = await Grade.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })

    const populated = await populateGradeDoc(updated)
    res.json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function putGradeShow(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid grade id' })
    }

    const grade = await Grade.findById(id)
    if (!grade) return res.status(404).json({ error: 'Grade not found' })

    const cls = await findMainTeacherClass(grade.class, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Not your class' })

    grade.showToParent = true
    grade.createdBy = req.user.id
    await grade.save()

    const populated = await populateGradeDoc(grade)
    res.json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getGradesForStudent(req, res) {
  try {
    const { studentId } = req.params
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid studentId' })
    }

    const role = req.user?.role
    if (!role || (role !== 'teacher' && role !== 'parent')) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    let student
    let grades
    let classId

    if (role === 'teacher') {
      const owned = await assertStudentAccessForTeacher(studentId, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
      student = owned.student
      classId = owned.classId

      grades = await Grade.find({ student: studentId, class: classId })
        .populate('subject', 'name description components classId')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    } else {
      const owned = await assertStudentAccessForParent(studentId, req.user.id)
      if (!owned) return res.status(403).json({ error: 'Not authorized for this student' })
      student = owned.student
      classId = student.classId

      grades = await Grade.find({ student: studentId, class: classId, showToParent: true })
        .populate('subject', 'name description components classId')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    }

    const effectiveGrades = reduceGradesToLatestByComponent(grades)
    const gradesWithAlias = effectiveGrades.map(withTypeAlias)
    const { weightedAverage, weightSum } = calculateWeightedAverage({ grades: gradesWithAlias })

    let subjectWeightWarnings = []
    if (role === 'teacher') {
      const subjects = await Subject.find({ classId }).lean()
      subjectWeightWarnings = subjectWeightWarningsFromSubjects(subjects)
    }

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        classId: student.classId,
      },
      grades: gradesWithAlias,
      weightedAverage,
      weightSum,
      subjectWeightWarnings,
    })
  } catch (err) {
    handleError(res, err)
  }
}

export async function getGradesForClass(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const [subjects, students, gradesAll] = await Promise.all([
      Subject.find({ classId }).sort({ name: 1 }).lean(),
      Student.find({ classId }).sort({ name: 1 }).lean(),
      Grade.find({ class: classId })
        .populate('subject', 'name description components classId')
        .populate('createdBy', 'name email')
        .lean(),
    ])

    const subjectWeightWarnings = subjectWeightWarningsFromSubjects(subjects)

    const byStudent = new Map()
    for (const s of students) {
      byStudent.set(String(s._id), [])
    }
    for (const g of gradesAll) {
      const key = String(g.student)
      if (!byStudent.has(key)) byStudent.set(key, [])
      byStudent.get(key).push(g)
    }

    const studentsPayload = students.map((s) => {
      const gradesAll = byStudent.get(String(s._id)) ?? []
      const grades = reduceGradesToLatestByComponent(gradesAll).sort((a, b) => {
        const an = a?.subject?.name ?? ''
        const bn = b?.subject?.name ?? ''
        const c = an.localeCompare(bn)
        if (c !== 0) return c
        return String(a?.componentName ?? '').localeCompare(String(b?.componentName ?? ''))
      })
      const { weightedAverage, weightSum } = calculateWeightedAverage({ grades })
      const parentVisible = grades.some((g) => g.showToParent)
      return {
        student: { _id: s._id, name: s.name, age: s.age, gender: s.gender, classId: s.classId },
        grades,
        weightedAverage,
        weightSum,
        parentVisible,
      }
    })

    res.json({
      classId,
      subjects: subjects.map((sub) => ({
        _id: sub._id,
        name: sub.name,
        description: sub.description,
        components: sub.components,
      })),
      subjectWeightWarnings,
      students: studentsPayload,
    })
  } catch (err) {
    handleError(res, err)
  }
}

export async function getGradesAverage(req, res) {
  try {
    const studentId = req.query?.studentId
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'studentId query is required' })
    }

    const role = req.user?.role
    if (!role || (role !== 'teacher' && role !== 'parent')) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    let classId
    if (role === 'teacher') {
      const owned = await assertStudentAccessForTeacher(studentId, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
      classId = owned.classId
    } else {
      const owned = await assertStudentAccessForParent(studentId, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
      classId = owned.student.classId
    }

    const { subjects } = await computeGradesAverageForStudent({ studentId, classId })
    res.json({ subjects })
  } catch (err) {
    handleError(res, err)
  }
}
