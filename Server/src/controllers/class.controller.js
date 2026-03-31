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
    const isAdmin = req.user?.role === 'admin'
    const query = isAdmin ? {} : classScopeFilter(req.user.id)
    const classes = await ClassRoom.find(query)
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
    const isAdmin = req.user?.role === 'admin'

    let teacherId = req.user.id
    if (isAdmin && req.body.teacherId) teacherId = req.body.teacherId

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ error: 'Invalid teacherId' })
    }

    if (isAdmin) {
      const teacher = await User.findOne({ _id: teacherId, role: 'teacher' }).lean()
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
    }

    const subjectTeachers = Array.isArray(req.body.subjectTeachers)
      ? req.body.subjectTeachers
      : []
    const doc = await ClassRoom.create({
      name: name.trim(),
      grade: grade !== undefined && grade !== '' ? grade : undefined,
      teacherId,
      subjectTeachers,
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
    const isAdmin = req.user?.role === 'admin'
    const scope = isAdmin ? {} : classScopeFilter(req.user.id)
    const cls = await ClassRoom.findOne({
      _id: req.params.id,
      ...scope,
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
    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin
      ? await ClassRoom.findById(classId).lean()
      : await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found' })

    const { studentId, name, age, gender, photoUrl } = req.body

    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ error: 'Invalid studentId' })
      }
      const student = await Student.findById(studentId).lean()
      if (!student) {
        return res.status(404).json({ error: 'Student not found' })
      }
      if (!isAdmin) {
        const fromClass = await findClassForTeacher(student.classId, req.user.id)
        if (!fromClass) {
          return res.status(403).json({ error: 'Student is not in a class you manage' })
        }
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
    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin
      ? await ClassRoom.findById(classId).lean()
      : await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const { teacherEmail, teacherUserId } = req.body || {}

    let targetUser = null
    if (teacherEmail?.trim()) {
      targetUser = await User.findOne({
        email: String(teacherEmail).trim().toLowerCase(),
        role: 'teacher',
      }).lean()
      if (!targetUser) {
        return res.status(404).json({ error: 'No teacher account found for this email' })
      }
    } else {
      if (!teacherUserId || !mongoose.Types.ObjectId.isValid(teacherUserId)) {
        return res.status(400).json({ error: 'teacherEmail is required' })
      }
      targetUser = await User.findOne({
        _id: teacherUserId,
        role: 'teacher',
      }).lean()
      if (!targetUser) {
        return res.status(400).json({ error: 'User is not a teacher' })
      }
    }

    if (String(targetUser._id) === String(cls.teacherId)) {
      return res.status(400).json({ error: 'Main teacher is already assigned' })
    }

    const alreadySubjectTeachers = new Set(
      (cls.subjectTeachers || []).map((id) => String(id)),
    )
    if (alreadySubjectTeachers.has(String(targetUser._id))) {
      return res.status(400).json({ error: 'Teacher already joined this class' })
    }

    const existingInvites = new Set(
      (cls.subjectTeacherInvites || [])
        .filter((i) => i?.status === 'PENDING')
        .map((i) => String(i.teacherId)),
    )
    if (existingInvites.has(String(targetUser._id))) {
      return res.status(400).json({ error: 'Teacher already has a pending invite' })
    }

    await ClassRoom.findByIdAndUpdate(classId, {
      $push: {
        subjectTeacherInvites: {
          teacherId: targetUser._id,
          email: targetUser.email,
          status: 'PENDING',
          invitedBy: req.user.id,
          createdAt: new Date(),
        },
      },
    })

    const updated = await ClassRoom.findById(classId)
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()

    const count = await Student.countDocuments({ classId })
    res.json(serializeListClass(updated, count, req.user.id))
  } catch (err) {
    handleError(res, err)
  }
}

export async function getPendingSubjectTeacherInvitations(req, res) {
  try {
    const teacherId = req.user.id
    const classes = await ClassRoom.find({
      'subjectTeacherInvites.teacherId': teacherId,
      'subjectTeacherInvites.status': 'PENDING',
    })
      .populate('teacherId', 'name email')
      .lean()

    const payload = classes.map((c) => {
      const invite = (c.subjectTeacherInvites || []).find(
        (i) => String(i.teacherId) === String(teacherId) && i.status === 'PENDING',
      )
      return {
        classId: c._id,
        className: c.name,
        invitedBy: c.teacherId
          ? { _id: c.teacherId._id, name: c.teacherId.name, email: c.teacherId.email }
          : null,
        invite: invite
          ? {
              email: invite.email,
              status: invite.status,
              createdAt: invite.createdAt,
            }
          : null,
      }
    })

    res.json({ invitations: payload })
  } catch (err) {
    handleError(res, err)
  }
}

export async function acceptPendingSubjectTeacherInvitation(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const cls = await ClassRoom.findById(classId).lean()
    if (!cls) return res.status(404).json({ error: 'Class not found' })

    const inviteIdx = (cls.subjectTeacherInvites || []).findIndex(
      (i) => String(i.teacherId) === String(req.user.id) && i.status === 'PENDING',
    )
    if (inviteIdx === -1) {
      return res.status(404).json({ error: 'No pending invitation found for this class' })
    }

    const invite = cls.subjectTeacherInvites[inviteIdx]
    const targetTeacherId = invite.teacherId

    const updated = await ClassRoom.findByIdAndUpdate(
      classId,
      {
        $addToSet: { subjectTeachers: targetTeacherId },
        $set: {
          'subjectTeacherInvites.$[elem].status': 'ACCEPTED',
        },
      },
      {
        new: true,
        arrayFilters: [
          { 'elem.teacherId': targetTeacherId, 'elem.status': 'PENDING' },
        ],
      },
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

export async function declinePendingSubjectTeacherInvitation(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const updated = await ClassRoom.findOneAndUpdate(
      {
        _id: classId,
        'subjectTeacherInvites.teacherId': req.user.id,
        'subjectTeacherInvites.status': 'PENDING',
      },
      {
        $set: {
          'subjectTeacherInvites.$[elem].status': 'DECLINED',
        },
      },
      {
        arrayFilters: [{ 'elem.teacherId': req.user.id, 'elem.status': 'PENDING' }],
        new: true,
      },
    ).lean()

    if (!updated) {
      return res.status(404).json({ error: 'No pending invitation found for this class' })
    }

    res.json({ ok: true })
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateClass(req, res) {
  try {
    const { name, grade } = req.body
    if (name === undefined && grade === undefined) {
      const existing = req.user?.role === 'admin'
        ? await ClassRoom.findById(req.params.id).lean()
        : await findMainTeacherClass(req.params.id, req.user.id).lean()
      if (!existing) {
        return res.status(404).json({ error: 'Class not found' })
      }
      return res.json(existing)
    }
    const updates = {}
    if (name != null) updates.name = String(name).trim()
    if (grade !== undefined) updates.grade = grade

    const isAdmin = req.user?.role === 'admin'
    const cls = await ClassRoom.findOneAndUpdate(
      isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherId: req.user.id },
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
    const isAdmin = req.user?.role === 'admin'
    const cls = await ClassRoom.findOneAndDelete(
      isAdmin ? { _id: req.params.id } : { _id: req.params.id, teacherId: req.user.id },
    ).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }
    res.json({ deleted: true, id: cls._id })
  } catch (err) {
    handleError(res, err)
  }
}
