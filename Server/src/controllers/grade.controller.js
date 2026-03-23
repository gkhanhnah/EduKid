import mongoose from 'mongoose'
import { Grade } from '../models/Grade.js'
import { GradeType } from '../models/GradeType.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { findClassForTeacher } from '../utils/teacherClassScope.js'

function handleError(res, err) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate grade for this type' })
  }
  return res.status(500).json({ error: 'Server error' })
}

function calculateWeightedAverage({ grades = [] }) {
  // Weighted average logic:
  // weighted_avg = sum(score * weight) / sum(weights)
  // where "weight" comes from the GradeType for each grade.
  let weightedSum = 0
  let weightSum = 0

  for (const g of grades) {
    const w = Number(g?.type?.weight)
    const score = Number(g?.score)
    if (!Number.isFinite(w) || !Number.isFinite(score)) continue
    weightedSum += score * w
    weightSum += w
  }

  if (weightSum <= 0) return { weightedAverage: null, weightSum: 0 }
  return { weightedAverage: weightedSum / weightSum, weightSum }
}

function weightWarningFromTypeWeights({ typeWeightsSum }) {
  if (!Number.isFinite(typeWeightsSum)) return null
  const EPS = 0.02 // optional warning tolerance
  const diff = Math.abs(typeWeightsSum - 1)
  if (diff <= EPS) return null
  return { typeWeightsSum, expected: 1, diff }
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
    .populate('type', 'name weight')
    .populate('createdBy', 'name email')
    .lean()
}

export async function postGrade(req, res) {
  try {
    const { studentId, classId, typeId, score, showToParent } = req.body || {}

    if (!studentId || !classId || !typeId) {
      return res.status(400).json({ error: 'studentId, classId, typeId are required' })
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: 'Invalid studentId' })
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }
    if (!mongoose.Types.ObjectId.isValid(typeId)) {
      return res.status(400).json({ error: 'Invalid typeId' })
    }
    const s = Number(score)
    if (!Number.isFinite(s)) {
      return res.status(400).json({ error: 'score must be a valid number' })
    }

    // Role-based restriction: only teachers belonging to this class can create grades.
    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const student = await Student.findOne({ _id: studentId, classId }).lean()
    if (!student) {
      return res.status(404).json({ error: 'Student not found in this class' })
    }

    const type = await GradeType.findOne({ _id: typeId, classId }).lean()
    if (!type) return res.status(404).json({ error: 'Grade type not found for this class' })

    const existing = await Grade.findOne({ student: studentId, class: classId, type: typeId })

    let doc
    if (existing) {
      existing.score = s
      existing.createdBy = req.user.id
      if (showToParent !== undefined) existing.showToParent = Boolean(showToParent)
      doc = existing
      await existing.save()
    } else {
      doc = await Grade.create({
        student: studentId,
        class: classId,
        type: typeId,
        score: s,
        createdBy: req.user.id,
        showToParent: Boolean(showToParent),
      })
    }

    const populated = await populateGradeDoc(doc)
    res.status(existing ? 200 : 201).json(populated)
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

    const cls = await findClassForTeacher(grade.class, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Not your class' })

    const updates = {}
    if (score !== undefined) {
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

    const cls = await findClassForTeacher(grade.class, req.user.id).lean()
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
        .populate('type', 'name weight')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    } else {
      // showToParent logic:
      // Parents only see grades where showToParent=true.
      const owned = await assertStudentAccessForParent(studentId, req.user.id)
      if (!owned) return res.status(403).json({ error: 'Not authorized for this student' })
      student = owned.student
      classId = student.classId

      grades = await Grade.find({ student: studentId, class: classId, showToParent: true })
        .populate('type', 'name weight')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()
    }

    const { weightedAverage, weightSum } = calculateWeightedAverage({ grades })

    let typeWeightsSum = null
    let weightWarning = null
    if (role === 'teacher') {
      const types = await GradeType.find({ classId }).lean()
      typeWeightsSum = types.reduce((acc, t) => acc + Number(t?.weight || 0), 0)
      weightWarning = weightWarningFromTypeWeights({ typeWeightsSum })
    }

    res.json({
      student: {
        _id: student._id,
        name: student.name,
        classId: student.classId,
      },
      grades,
      weightedAverage,
      weightSum,
      typeWeightsSum,
      weightWarning,
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

    // Role-based restriction: this endpoint is teacher-only.
    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const [gradeTypes, students, gradesAll] = await Promise.all([
      GradeType.find({ classId }).lean(),
      Student.find({ classId }).sort({ name: 1 }).lean(),
      Grade.find({ class: classId })
        .populate('type', 'name weight')
        .populate('createdBy', 'name email')
        .lean(),
    ])

    const typeWeightsSum = gradeTypes.reduce((acc, t) => acc + Number(t?.weight || 0), 0)
    const weightWarning = weightWarningFromTypeWeights({ typeWeightsSum })

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
      const grades = (byStudent.get(String(s._id)) ?? []).sort((a, b) => {
        const an = a?.type?.name ?? ''
        const bn = b?.type?.name ?? ''
        return an.localeCompare(bn)
      })
      const { weightedAverage, weightSum } = calculateWeightedAverage({ grades })
      const parentVisible = grades.some((g) => g.showToParent)
      return {
        student: { _id: s._id, name: s.name, age: s.age, gender: s.gender, classId: s.classId },
        grades,
        weightedAverage,
        weightSum,
        parentVisible,
        weightWarning,
      }
    })

    res.json({
      classId,
      gradeTypes: gradeTypes.map((t) => ({
        _id: t._id,
        name: t.name,
        weight: t.weight,
      })),
      typeWeightsSum,
      weightWarning,
      students: studentsPayload,
    })
  } catch (err) {
    handleError(res, err)
  }
}

// ---------------------------
// Grade Type management
// ---------------------------

export async function getGradeTypesByClass(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const gradeTypes = await GradeType.find({ classId }).sort({ createdAt: 1 }).lean()
    res.json({ classId, gradeTypes })
  } catch (err) {
    handleError(res, err)
  }
}

export async function postGradeType(req, res) {
  try {
    const { classId, name, weight } = req.body || {}

    if (!classId || !name?.trim()) {
      return res.status(400).json({ error: 'classId and name are required' })
    }
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }
    const w = Number(weight)
    if (!Number.isFinite(w) || w < 0 || w > 1) {
      return res.status(400).json({ error: 'weight must be between 0 and 1' })
    }

    // Role-based restriction: only teachers belonging to this class can edit grade types.
    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found or not your class' })

    const created = await GradeType.create({
      classId,
      name: name.trim(),
      weight: w,
    })

    res.status(201).json(created)
  } catch (err) {
    handleError(res, err)
  }
}

export async function putGradeType(req, res) {
  try {
    const { id } = req.params
    const { name, weight } = req.body || {}

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid grade type id' })
    }

    const type = await GradeType.findById(id)
    if (!type) return res.status(404).json({ error: 'Grade type not found' })

    const cls = await findClassForTeacher(type.classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Not your class' })

    const updates = {}
    if (name !== undefined) {
      const n = String(name).trim()
      if (!n) return res.status(400).json({ error: 'name cannot be empty' })
      updates.name = n
    }
    if (weight !== undefined) {
      const w = Number(weight)
      if (!Number.isFinite(w) || w < 0 || w > 1) {
        return res.status(400).json({ error: 'weight must be between 0 and 1' })
      }
      updates.weight = w
    }

    const updated = await GradeType.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean()

    res.json(updated)
  } catch (err) {
    handleError(res, err)
  }
}

