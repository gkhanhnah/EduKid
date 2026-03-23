import { User } from '../models/User.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { Student } from '../models/Student.js'
import { findClassForTeacher } from '../utils/teacherClassScope.js'

function handleError(res, err) {
  if (err.code === 11000) {
    return res.status(400).json({ error: 'This parent is already linked to this student' })
  }
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
  const cls = await findClassForTeacher(student.classId, teacherUserId).lean()
  if (!cls) return null
  return student
}

export async function createParentStudentLink(req, res) {
  try {
    const { parentUserId, studentId, parentEmail, relationship } = req.body

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' })
    }

    const owned = await assertStudentOwnedByTeacher(studentId, req.user.id)
    if (!owned) {
      return res.status(404).json({ error: 'Student not found or not in your classes' })
    }

    let resolvedParentId = parentUserId
    if (!resolvedParentId && parentEmail?.trim()) {
      const u = await User.findOne({
        email: parentEmail.trim().toLowerCase(),
        role: 'parent',
      }).lean()
      if (!u) {
        return res.status(400).json({ error: 'No parent account found with this email' })
      }
      resolvedParentId = u._id.toString()
    }

    if (!resolvedParentId) {
      return res.status(400).json({ error: 'parentUserId or parentEmail is required' })
    }

    const parentUser = await User.findOne({ _id: resolvedParentId, role: 'parent' }).lean()
    if (!parentUser) {
      return res.status(400).json({ error: 'Invalid parent user or user is not a parent' })
    }

    const link = await ParentStudent.create({
      parentUserId: parentUser._id,
      studentId,
      relationship: relationship?.trim() || undefined,
    })

    const populated = await ParentStudent.findById(link._id)
      .populate('parentUserId', 'name email')
      .populate({
        path: 'studentId',
        populate: { path: 'classId', select: 'name grade' },
      })
      .lean()

    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}
