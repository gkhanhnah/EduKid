import mongoose from 'mongoose'
import { Student } from '../models/Student.js'
import { ClassRoom } from '../models/Class.js'
import { User } from '../models/User.js'
import {
  classScopeFilter,
  findClassForTeacher,
  findMainTeacherClass,
  isMainTeacher,
} from '../utils/teacherClassScope.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

/** List item: counts + populated teachers for UI */
function serializeListClass(c, studentCount, viewerUserId) {
  const mainId =
    c.teacherId && typeof c.teacherId === 'object'
      ? String(c.teacherId._id)
      : c.teacherId
        ? String(c.teacherId)
        : ''
  const main = c.teacherId && typeof c.teacherId === 'object'
    ? { _id: String(c.teacherId._id), name: c.teacherId.name, email: c.teacherId.email }
    : c.teacherId
      ? String(c.teacherId)
      : null
  const subjects = Array.isArray(c.subjectTeachers)
    ? c.subjectTeachers.map((t) =>
        t && typeof t === 'object'
          ? { _id: String(t._id), name: t.name, email: t.email }
          : String(t),
      )
    : []
  return {
    _id: c._id,
    name: c.name,
    grade: c.grade,
    teacherId: c.teacherId,
    mainTeacher: main,
    subjectTeachers: subjects,
    studentCount,
    subjectTeacherCount: subjects.length,
    teacherCount: 1 + subjects.length,
    isMainTeacher: mainId === String(viewerUserId),
    createdAt: c.createdAt,
  }
}

export async function listClasses(req, res) {
  try {
    const classes = await ClassRoom.find(classScopeFilter(req.user.id))
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .sort({ name: 1 })
      .lean()

    const ids = classes.map((c) => c._id)
    const agg =
      ids.length === 0
        ? []
        : await Student.aggregate([
            { $match: { classId: { $in: ids } } },
            { $group: { _id: '$classId', count: { $sum: 1 } } },
          ])
    const countByClass = Object.fromEntries(
      agg.map((row) => [String(row._id), row.count]),
    )

    res.json(
      classes.map((c) =>
        serializeListClass(c, countByClass[String(c._id)] ?? 0, req.user.id),
      ),
    )
  } catch (err) {
    handleError(res, err)
  }
}

export async function createClass(req, res) {
  try {
    const { name, grade } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const doc = await ClassRoom.create({
      name: name.trim(),
      grade: grade !== undefined && grade !== '' ? grade : undefined,
      teacherId: req.user.id,
      subjectTeachers: [],
    })
    const populated = await ClassRoom.findById(doc._id)
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()
    res
      .status(201)
      .json(serializeListClass(populated, 0, req.user.id))
  } catch (err) {
    handleError(res, err)
  }
}

/** Full detail: teachers, students, parent counts per student */
export async function getClassById(req, res) {
  try {
    const cls = await ClassRoom.findOne({
      _id: req.params.id,
      ...classScopeFilter(req.user.id),
    })
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()

    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }

    const students = await Student.find({ classId: cls._id })
      .sort({ name: 1 })
      .lean()

    const { ParentStudent } = await import('../models/ParentStudent.js')
    const sids = students.map((s) => s._id)
    const parentAgg =
      sids.length === 0
        ? []
        : await ParentStudent.aggregate([
            { $match: { studentId: { $in: sids } } },
            { $group: { _id: '$studentId', parentCount: { $sum: 1 } } },
          ])
    const parentByStudent = Object.fromEntries(
      parentAgg.map((r) => [String(r._id), r.parentCount]),
    )

    const studentRows = students.map((s) => ({
      _id: s._id,
      name: s.name,
      age: s.age,
      gender: s.gender,
      classId: s.classId,
      parentCount: parentByStudent[String(s._id)] ?? 0,
    }))

    const main =
      cls.teacherId && typeof cls.teacherId === 'object'
        ? {
            _id: String(cls.teacherId._id),
            name: cls.teacherId.name,
            email: cls.teacherId.email,
          }
        : null
    const subjects = (cls.subjectTeachers || []).map((t) =>
      t && typeof t === 'object'
        ? { _id: String(t._id), name: t.name, email: t.email }
        : String(t),
    )

    res.json({
      _id: cls._id,
      name: cls.name,
      grade: cls.grade,
      mainTeacher: main,
      subjectTeachers: subjects,
      students: studentRows,
      isMainTeacher: isMainTeacher(cls, req.user.id),
    })
  } catch (err) {
    handleError(res, err)
  }
}

/**
 * PUT add-student: create new { name, age?, gender? } OR move existing { studentId }
 */
export async function addStudentToClass(req, res) {
  try {
    const classId = req.params.id
    const cls = await findClassForTeacher(classId, req.user.id)
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }

    const { studentId, name, age, gender, photoUrl } = req.body

    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ error: 'Invalid studentId' })
      }
      const student = await Student.findById(studentId).lean()
      if (!student) {
        return res.status(404).json({ error: 'Student not found' })
      }
      const fromClass = await findClassForTeacher(student.classId, req.user.id)
      if (!fromClass) {
        return res
          .status(403)
          .json({ error: 'Student is not in a class you manage' })
      }
      if (String(student.classId) === String(classId)) {
        return res.status(400).json({ error: 'Student is already in this class' })
      }
      const updated = await Student.findByIdAndUpdate(
        studentId,
        { classId },
        { new: true, runValidators: true },
      )
        .populate('classId', 'name grade')
        .lean()
      return res.json(updated)
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'name or studentId is required' })
    }

    const created = await Student.create({
      name: name.trim(),
      age,
      gender,
      photoUrl: photoUrl?.trim() || undefined,
      classId,
    })
    const populated = await Student.findById(created._id)
      .populate('classId', 'name grade')
      .lean()
    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

/** Only main teacher may invite subject teachers */
export async function addSubjectTeacher(req, res) {
  try {
    const classId = req.params.id
    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const { teacherUserId } = req.body
    if (!teacherUserId || !mongoose.Types.ObjectId.isValid(teacherUserId)) {
      return res.status(400).json({ error: 'teacherUserId is required' })
    }
    if (String(teacherUserId) === String(cls.teacherId)) {
      return res.status(400).json({ error: 'Main teacher is already assigned' })
    }

    const user = await User.findOne({
      _id: teacherUserId,
      role: 'teacher',
    }).lean()
    if (!user) {
      return res.status(400).json({ error: 'User is not a teacher' })
    }

    const existing = new Set(
      (cls.subjectTeachers || []).map((id) => String(id)),
    )
    if (existing.has(String(teacherUserId))) {
      return res.status(400).json({ error: 'Teacher already invited' })
    }

    const updated = await ClassRoom.findByIdAndUpdate(
      classId,
      { $addToSet: { subjectTeachers: teacherUserId } },
      { new: true },
    )
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()

    const count = await Student.countDocuments({ classId })
    res.json(serializeListClass(updated, count, req.user.id))
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateClass(req, res) {
  try {
    const { name, grade } = req.body
    if (name === undefined && grade === undefined) {
      const existing = await findMainTeacherClass(req.params.id, req.user.id).lean()
      if (!existing) {
        return res.status(404).json({ error: 'Class not found' })
      }
      return res.json(existing)
    }
    const updates = {}
    if (name != null) updates.name = String(name).trim()
    if (grade !== undefined) updates.grade = grade

    const cls = await ClassRoom.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user.id },
      updates,
      { new: true, runValidators: true },
    )
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }
    const count = await Student.countDocuments({ classId: cls._id })
    res.json(serializeListClass(cls, count, req.user.id))
  } catch (err) {
    handleError(res, err)
  }
}

export async function deleteClass(req, res) {
  try {
    const count = await Student.countDocuments({ classId: req.params.id })
    if (count > 0) {
      return res
        .status(400)
        .json({ error: 'Cannot delete class that still has students' })
    }
    const cls = await ClassRoom.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.id,
    }).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }
    res.json({ deleted: true, id: cls._id })
  } catch (err) {
    handleError(res, err)
  }
}
