import mongoose from 'mongoose'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import {
  distinctClassIdsForTeacher,
  findClassForTeacher,
} from '../utils/teacherClassScope.js'
import { createParentStudentLink } from './parentStudent.controller.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid student id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

async function assertStudentOwnedByTeacher(studentId, userId) {
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  const cls = await findClassForTeacher(student.classId, userId).lean()
  if (!cls) return null
  return student
}

export async function createStudent(req, res) {
  try {
    const { name, age, gender, classId, photoUrl } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' })
    }
    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) {
      return res.status(400).json({ error: 'Invalid class or not your class' })
    }
    const student = await Student.create({
      name: name.trim(),
      age,
      gender,
      photoUrl: photoUrl?.trim() || undefined,
      classId,
    })
    const populated = await Student.findById(student._id)
      .populate('classId', 'name grade')
      .lean()
    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getAllStudents(req, res) {
  try {
    const classIds = await distinctClassIdsForTeacher(req.user.id)
    const filter = { classId: { $in: classIds } }
    if (req.query.classId) {
      const qid = String(req.query.classId)
      const allowed = classIds.some((id) => String(id) === qid)
      if (!allowed) {
        return res.json([])
      }
      filter.classId = qid
    }
    const students = await Student.find(filter)
      .populate('classId', 'name grade')
      .sort({ name: 1 })
      .lean()
    res.json(students)
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /students/:id — full profile for teachers who can access the student's class */
export async function getStudentById(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid student id' })
    }
    const owned = await assertStudentOwnedByTeacher(id, req.user.id)
    if (!owned) {
      return res.status(404).json({ error: 'Student not found' })
    }
    const student = await Student.findById(id)
      .populate('classId', 'name grade')
      .lean()
    const links = await ParentStudent.find({ studentId: id })
      .populate('parentUserId', 'name email')
      .lean()
    const parents = links
      .map((l) => ({
        _id: l._id,
        relationship: l.relationship,
        parent: l.parentUserId
          ? {
              _id: l.parentUserId._id,
              name: l.parentUserId.name,
              email: l.parentUserId.email,
            }
          : null,
      }))
      .filter((p) => p.parent)
    res.json({ ...student, parents })
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateStudent(req, res) {
  try {
    const owned = await assertStudentOwnedByTeacher(req.params.id, req.user.id)
    if (!owned) {
      return res.status(404).json({ error: 'Student not found' })
    }
    const body = { ...req.body }
    delete body.className
    if (body.classId != null) {
      const cls = await findClassForTeacher(body.classId, req.user.id).lean()
      if (!cls) {
        return res.status(400).json({ error: 'Invalid class or not your class' })
      }
    }
    const student = await Student.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    })
      .populate('classId', 'name grade')
      .lean()
    res.json(student)
  } catch (err) {
    handleError(res, err)
  }
}

export async function deleteStudent(req, res) {
  try {
    const owned = await assertStudentOwnedByTeacher(req.params.id, req.user.id)
    if (!owned) {
      return res.status(404).json({ error: 'Student not found' })
    }
    const student = await Student.findByIdAndDelete(req.params.id).lean()
    res.json({ deleted: true, id: student._id })
  } catch (err) {
    handleError(res, err)
  }
}

/** PUT /students/:id/add-parent — same rules as POST /parent-students */
export async function addParentToStudent(req, res) {
  req.body = { ...req.body, studentId: req.params.id }
  return createParentStudentLink(req, res)
}
