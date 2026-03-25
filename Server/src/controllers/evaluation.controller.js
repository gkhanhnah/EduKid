import { Evaluation } from '../models/Evaluation.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { findMainTeacherClass } from '../utils/teacherClassScope.js'
import { computeGradesAverageForStudent } from '../services/gradesAverage.service.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

async function assertStudentOwnedByTeacher(studentId, teacherUserId) {
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  const cls = await findMainTeacherClass(student.classId, teacherUserId).lean()
  if (!cls) return null
  return student
}

export async function createEvaluation(req, res) {
  try {
    const { studentId, comment, period } = req.body
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' })
    }
    const owned = await assertStudentOwnedByTeacher(studentId, req.user.id)
    if (!owned) {
      return res.status(404).json({ error: 'Student not found or not in your classes' })
    }

    const { summaryScores } = await computeGradesAverageForStudent({
      studentId,
      classId: owned.classId,
    })

    const doc = await Evaluation.create({
      studentId,
      teacherId: req.user.id,
      scores: summaryScores,
      comment: comment?.trim() || undefined,
      period: period?.trim() || undefined,
    })

    const populated = await Evaluation.findById(doc._id)
      .populate('studentId', 'name')
      .populate('teacherId', 'name email')
      .lean()

    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getEvaluations(req, res) {
  try {
    const role = req.user.role
    let filter = {}

    if (role === 'teacher') {
      filter.teacherId = req.user.id
      if (req.query.studentId) {
        const owned = await assertStudentOwnedByTeacher(req.query.studentId, req.user.id)
        if (!owned) {
          return res.json([])
        }
        filter.studentId = req.query.studentId
      }
    } else if (role === 'parent') {
      const links = await ParentStudent.find({ parentUserId: req.user.id }).distinct('studentId')
      if (!links.length) {
        return res.json([])
      }
      const allowed = new Set(links.map(String))
      if (req.query.studentId) {
        if (!allowed.has(String(req.query.studentId))) {
          return res.status(403).json({ error: 'Not authorized for this student' })
        }
        filter.studentId = req.query.studentId
      } else {
        filter.studentId = { $in: links }
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const rows = await Evaluation.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name')
      .populate('teacherId', 'name email')
      .lean()

    res.json(rows)
  } catch (err) {
    handleError(res, err)
  }
}
