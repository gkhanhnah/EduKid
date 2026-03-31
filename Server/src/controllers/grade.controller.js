import mongoose from 'mongoose'
import { Grade } from '../models/Grade.js'
import { GradeAuditLog } from '../models/GradeAuditLog.js'
import { Subject } from '../models/GradeType.js'
import { Student } from '../models/Student.js'
import { ClassRoom } from '../models/Class.js'
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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin
      ? await ClassRoom.findById(classId).lean()
      : await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({
        error: isAdmin ? 'Class not found' : 'Class not found or not your class',
      })
    }

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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(classId).lean() : await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: isAdmin ? 'Class not found' : 'Class not found or not your class' })
    }

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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(subj.classId).lean() : await findMainTeacherClass(subj.classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: isAdmin ? 'Class not found' : 'Not your class' })

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
  const { subjectId } = req.params
  const { studentId, classId, componentName, score, showToParent } = req.body || {}
  try {
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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(classId).lean() : await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({
        error: isAdmin ? 'Class not found' : 'Class not found or not your class',
      })
    }

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

    // If the workflow is locked for this subject, prevent any manual writes (even new components).
    const anyLocked = await Grade.exists({
      class: classId,
      subject: subjectId,
      locked: true,
    })
    if (anyLocked) {
      return res.status(409).json({ error: 'Grades are locked' })
    }

    // Atomically upsert the MANUAL grade. Retry once on duplicate-key (11000) which
    // can happen with concurrent requests hitting the same unique index slot.
    // Thay toàn bộ đoạn upsert trong addGradeToSubject:

    const setFields = { score: s, createdBy: req.user.id }
    if (showToParent !== undefined) setFields.showToParent = Boolean(showToParent)

    const upsertFilter = {
      student: studentId,
      class: classId,
      subject: subjectId,
      componentName: comp,
      source: SOURCE_MANUAL,
      sourceId: MANUAL_SOURCE_ID,
    }

    // If grades are locked (submitted/approved), prevent manual overwrites.
    const existingManual = await Grade.findOne(upsertFilter).lean()
    if (existingManual?.locked) {
      return res.status(409).json({ error: 'Grades are locked' })
    }

    let upsertResult
    try {
      upsertResult = await Grade.findOneAndUpdate(
        upsertFilter,
        { $set: setFields },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
    } catch (err) {
      if (err.code !== 11000) throw err
      // Race condition: doc was inserted concurrently — just update it
      upsertResult = await Grade.findOneAndUpdate(
        upsertFilter,
        { $set: setFields },
        { new: true },
      )
      if (!upsertResult) throw err // truly unexpected
    }

    const populated = await populateGradeDoc(upsertResult)

    const to = {
      score: upsertResult?.score,
      showToParent: showToParent !== undefined ? Boolean(showToParent) : populated?.showToParent,
      approvalStatus: upsertResult?.approvalStatus,
      locked: upsertResult?.locked,
    }

    await GradeAuditLog.create({
      action: existingManual ? 'GRADE_MANUAL_UPDATED' : 'GRADE_MANUAL_CREATED',
      scopeType: 'GRADE',
      actor: req.user.id,
      gradeId: populated?._id ?? upsertResult?._id,
      studentId: studentId,
      classId: classId,
      subjectId: subjectId,
      componentName: comp,
      from: existingManual
        ? {
            score: existingManual.score,
            showToParent: existingManual.showToParent,
          }
        : null,
      to,
    })
    res.status(200).json(populated)
  } catch (err) {
    // Final idempotency fallback: if a duplicate key still leaks from any path,
    // resolve by business key and return deterministic output.
    if (err?.code === 11000) {
      try {
        const comp = String(componentName ?? '').trim()
        if (
          studentId &&
          classId &&
          mongoose.Types.ObjectId.isValid(studentId) &&
          mongoose.Types.ObjectId.isValid(classId) &&
          mongoose.Types.ObjectId.isValid(subjectId) &&
          comp
        ) {
          const existing = await Grade.findOne({
            student: studentId,
            class: classId,
            subject: subjectId,
            componentName: comp,
          })

          if (existing) {
            if (existing.source === SOURCE_HOMEWORK) {
              return res
                .status(409)
                .json({ error: 'Cannot override homework-sourced grades for this component' })
            }

            const s = Number(score)
            if (Number.isFinite(s)) existing.score = s
            existing.createdBy = req.user.id
            existing.source = SOURCE_MANUAL
            existing.sourceId = MANUAL_SOURCE_ID
            if (showToParent !== undefined) existing.showToParent = Boolean(showToParent)
            await existing.save()
            const populated = await populateGradeDoc(existing)
            return res.status(200).json(populated)
          }
        }
      } catch {
        // Fall through to default error response below.
      }
    }
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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin
      ? await ClassRoom.findById(subject.classId).lean()
      : await findClassForTeacher(subject.classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({
        error: isAdmin ? 'Class not found' : 'Class not found or not your class',
      })
    }

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

    if (grade.locked) {
      return res.status(409).json({ error: 'Grades are locked' })
    }

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(grade.class).lean() : await findMainTeacherClass(grade.class, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: isAdmin ? 'Class not found' : 'Not your class' })
    }

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

    if (updated) {
      const from = {
        score: grade.score,
        showToParent: grade.showToParent,
        locked: grade.locked,
        approvalStatus: grade.approvalStatus,
      }
      const to = {
        score: updates.score !== undefined ? updates.score : grade.score,
        showToParent: updates.showToParent !== undefined ? updates.showToParent : grade.showToParent,
        locked: grade.locked,
        approvalStatus: grade.approvalStatus,
      }

      if (score !== undefined || showToParent !== undefined) {
        await GradeAuditLog.create({
          action: 'GRADE_UPDATED',
          scopeType: 'GRADE',
          actor: req.user.id,
          gradeId: updated._id,
          studentId: updated.student,
          classId: updated.class,
          subjectId: updated.subject,
          componentName: updated.componentName,
          from,
          to,
        })
      }
    }

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

    if (grade.locked) {
      return res.status(409).json({ error: 'Grades are locked' })
    }

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(grade.class).lean() : await findMainTeacherClass(grade.class, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: isAdmin ? 'Class not found' : 'Not your class' })
    }

    grade.showToParent = true
    grade.createdBy = req.user.id
    await grade.save()

    await GradeAuditLog.create({
      action: 'GRADE_VISIBILITY_UPDATED',
      scopeType: 'GRADE',
      actor: req.user.id,
      gradeId: grade._id,
      studentId: grade.student,
      classId: grade.class,
      subjectId: grade.subject,
      componentName: grade.componentName,
      from: { showToParent: false },
      to: { showToParent: true },
    })

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
    if (!role || (role !== 'teacher' && role !== 'parent' && role !== 'admin')) {
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
    } else if (role === 'parent') {
      const owned = await assertStudentAccessForParent(studentId, req.user.id)
      if (!owned) return res.status(403).json({ error: 'Not authorized for this student' })
      student = owned.student
      classId = student.classId

      grades = await Grade.find({ student: studentId, class: classId, showToParent: true })
        .populate('subject', 'name description components classId')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    } else {
      // Admin: full grade history for any student.
      student = await Student.findById(studentId).lean()
      if (!student) return res.status(404).json({ error: 'Student not found' })
      classId = student.classId
      grades = await Grade.find({ student: studentId, class: classId })
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

    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(classId).lean() : await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({
        error: isAdmin ? 'Class not found' : 'Class not found or not your class',
      })
    }

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
    if (!role || (role !== 'teacher' && role !== 'parent' && role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    let classId
    if (role === 'teacher') {
      const owned = await assertStudentAccessForTeacher(studentId, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
      classId = owned.classId
    } else if (role === 'parent') {
      const owned = await assertStudentAccessForParent(studentId, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
      classId = owned.student.classId
    } else {
      // Admin
      const s = await Student.findById(studentId).select('classId').lean()
      if (!s) return res.status(404).json({ error: 'Student not found' })
      classId = s.classId
    }

    const { subjects } = await computeGradesAverageForStudent({ studentId, classId })
    res.json({ subjects })
  } catch (err) {
    handleError(res, err)
  }
}

function getWorkflowScopeFromQuery({ classId, subjectId }) {
  return {
    classId: classId || null,
    subjectId: subjectId || null,
  }
}

function getActorId(req) {
  return req.user?.id
}

export async function submitGradesForSubject(req, res) {
  try {
    const { classId, subjectId } = req.body || {}
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const cls = await findMainTeacherClass(classId, getActorId(req)).lean()
      if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const now = new Date()
    const filter = { class: classId, subject: subjectId }
    const sample = await Grade.findOne(filter).lean()

    const updated = await Grade.updateMany(filter, {
      $set: {
        approvalStatus: 'SUBMITTED',
        locked: true,
        lockedAt: now,
        submittedAt: now,
        submittedBy: getActorId(req),
      },
    })

    await GradeAuditLog.create({
      action: 'SUBJECT_SUBMITTED',
      scopeType: 'SUBJECT',
      actor: getActorId(req),
      ...getWorkflowScopeFromQuery({ classId, subjectId }),
      from: sample ? { locked: sample.locked, approvalStatus: sample.approvalStatus } : null,
      to: { locked: true, approvalStatus: 'SUBMITTED' },
    })

    res.json({ updated: updated.modifiedCount ?? updated.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

export async function approveGradesForSubject(req, res) {
  try {
    const { classId, subjectId } = req.body || {}
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }

    const now = new Date()
    const filter = { class: classId, subject: subjectId }
    const sample = await Grade.findOne(filter).lean()

    const updated = await Grade.updateMany(filter, {
      $set: {
        approvalStatus: 'APPROVED',
        locked: true,
        lockedAt: now,
        approvedAt: now,
        approvedBy: getActorId(req),
      },
    })

    await GradeAuditLog.create({
      action: 'SUBJECT_APPROVED',
      scopeType: 'SUBJECT',
      actor: getActorId(req),
      ...getWorkflowScopeFromQuery({ classId, subjectId }),
      from: sample ? { locked: sample.locked, approvalStatus: sample.approvalStatus } : null,
      to: { locked: true, approvalStatus: 'APPROVED' },
    })

    res.json({ updated: updated.modifiedCount ?? updated.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

export async function rejectGradesForSubject(req, res) {
  try {
    const { classId, subjectId, rejectionReason } = req.body || {}
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }

    const now = new Date()
    const filter = { class: classId, subject: subjectId }
    const sample = await Grade.findOne(filter).lean()

    const updated = await Grade.updateMany(filter, {
      $set: {
        approvalStatus: 'REJECTED',
        locked: false,
        lockedAt: null,
        rejectedAt: now,
        rejectedBy: getActorId(req),
        rejectionReason: String(rejectionReason ?? '').trim() || '',
      },
    })

    await GradeAuditLog.create({
      action: 'SUBJECT_REJECTED',
      scopeType: 'SUBJECT',
      actor: getActorId(req),
      ...getWorkflowScopeFromQuery({ classId, subjectId }),
      from: sample ? { locked: sample.locked, approvalStatus: sample.approvalStatus } : null,
      to: { locked: false, approvalStatus: 'REJECTED' },
    })

    res.json({ updated: updated.modifiedCount ?? updated.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

export async function lockGradesForSubject(req, res) {
  try {
    const { classId, subjectId } = req.body || {}
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const cls = await findMainTeacherClass(classId, getActorId(req)).lean()
      if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const now = new Date()
    const filter = { class: classId, subject: subjectId }
    const sample = await Grade.findOne(filter).lean()
    const updated = await Grade.updateMany(filter, {
      $set: { locked: true, lockedAt: now },
    })

    await GradeAuditLog.create({
      action: 'SUBJECT_LOCKED',
      scopeType: 'SUBJECT',
      actor: getActorId(req),
      classId,
      subjectId,
      from: sample ? { locked: sample.locked } : null,
      to: { locked: true },
    })

    res.json({ updated: updated.modifiedCount ?? updated.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

export async function unlockGradesForSubject(req, res) {
  try {
    const { classId, subjectId } = req.body || {}
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const cls = await findMainTeacherClass(classId, getActorId(req)).lean()
      if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const sample = await Grade.findOne({ class: classId, subject: subjectId }).lean()
    const updated = await Grade.updateMany(
      { class: classId, subject: subjectId },
      { $set: { locked: false, lockedAt: null } },
    )
    await GradeAuditLog.create({
      action: 'SUBJECT_UNLOCKED',
      scopeType: 'SUBJECT',
      actor: getActorId(req),
      classId,
      subjectId,
      from: sample ? { locked: sample.locked } : null,
      to: { locked: false },
    })
    res.json({ updated: updated.modifiedCount ?? updated.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

export async function getGradeAuditLogs(req, res) {
  try {
    const { classId, subjectId, limit } = req.query || {}
    const isAdmin = req.user?.role === 'admin'

    const q = {}
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ error: 'Invalid classId' })
      }
      q.classId = classId
    }
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ error: 'Invalid subjectId' })
      }
      q.subjectId = subjectId
    }

    if (!isAdmin && !classId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!isAdmin && classId) {
      const cls = await findMainTeacherClass(classId, getActorId(req)).lean()
      if (!cls) return res.status(403).json({ error: 'Forbidden' })
    }

    const rows = await GradeAuditLog.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Number(limit) || 50))
      .lean()

    res.json({ rowsCount: rows.length, rows })
  } catch (err) {
    handleError(res, err)
  }
}
