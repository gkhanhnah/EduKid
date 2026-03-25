import mongoose from 'mongoose'
import { Attendance, ATTENDANCE_STATUS_ENUM } from '../models/Attendance.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { Student } from '../models/Student.js'
import {
  findClassForTeacher,
  findMainTeacherClass,
  distinctClassIdsForTeacher,
} from '../utils/teacherClassScope.js'

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function handleError(res, err) {
  if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message })
  if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid id' })
  return res.status(500).json({ error: 'Server error' })
}

function normalizeDay(dateInput) {
  if (!dateInput) {
    const d = new Date()
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }

  if (typeof dateInput === 'string') {
    // Date picker usually sends YYYY-MM-DD.
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
    }

    const parsed = new Date(dateInput)
    if (!Number.isFinite(parsed.getTime())) return null
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
  }

  if (dateInput instanceof Date) {
    if (!Number.isFinite(dateInput.getTime())) return null
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()))
  }

  return null
}

function normalizeStatus(statusInput) {
  const status = (statusInput ?? '').toString().trim().toUpperCase()
  if (!ATTENDANCE_STATUS_ENUM.includes(status)) return null
  return status
}

export async function upsertAttendance(req, res) {
  try {
    const { studentId, date, status, note } = req.body || {}

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return badRequest(res, 'Valid studentId is required')
    }

    const normalizedDate = normalizeDay(date)
    if (!normalizedDate) {
      return badRequest(res, 'date must be a valid day (YYYY-MM-DD)')
    }

    const normalizedStatus = normalizeStatus(status)
    if (!normalizedStatus) {
      return badRequest(
        res,
        `status must be one of: ${ATTENDANCE_STATUS_ENUM.join(', ')}`,
      )
    }

    const student = await Student.findById(studentId).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })

    // Only main teacher can save attendance.
    const cls = await findMainTeacherClass(student.classId, req.user.id).lean()
    if (!cls) {
      return res.status(403).json({ error: 'You do not belong to this class' })
    }

    const setFields = {
      status: normalizedStatus,
    }
    if (typeof note === 'string') {
      setFields.note = note.trim()
    }

    const updated = await Attendance.findOneAndUpdate(
      { studentId: student._id, date: normalizedDate },
      {
        $set: setFields,
        $setOnInsert: { published: false },
      },
      { upsert: true, new: true, runValidators: true },
    )
      .lean()

    res.json({ attendance: updated })
  } catch (err) {
    handleError(res, err)
  }
}

async function listStudentsForTeacher(req, classId) {
  if (classId) {
    if (!mongoose.Types.ObjectId.isValid(classId)) return []
    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) return null
    const students = await Student.find({ classId })
      .select('_id name classId')
      .populate('classId', 'name grade')
      .lean()
    return students
  }

  const classIds = await distinctClassIdsForTeacher(req.user.id)
  if (!classIds.length) return []
  const students = await Student.find({ classId: { $in: classIds } })
    .select('_id name classId')
    .populate('classId', 'name grade')
    .lean()
  return students
}

export async function getAttendanceByDate(req, res) {
  try {
    const normalizedDate = normalizeDay(req.query.date)
    if (!normalizedDate) return badRequest(res, 'date must be a valid day (YYYY-MM-DD)')
    const dateStr = normalizedDate.toISOString().slice(0, 10)

    const role = req.user.role

    if (role === 'teacher') {
      const { classId } = req.query
      if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
        return badRequest(res, 'Invalid classId')
      }

      // If classId is provided, require main-teacher access.
      const students = await listStudentsForTeacher(req, classId)
      if (classId && students === null) {
        return res.status(403).json({ error: 'You do not belong to this class' })
      }

      const studentIds = students.map((s) => s._id)
      const records = studentIds.length
        ? await Attendance.find({ studentId: { $in: studentIds }, date: normalizedDate }).lean()
        : []

      const recordMap = new Map(records.map((r) => [String(r.studentId), r]))

      const studentsWithStatus = students.map((s) => {
        const rec = recordMap.get(String(s._id))
        return {
          studentId: s._id,
          student: { _id: s._id, name: s.name, classId: s.classId },
          status: rec ? rec.status : null,
          published: rec ? rec.published : null,
          note: rec ? rec.note : null,
        }
      })

      return res.json({
        date: dateStr,
        students: studentsWithStatus,
      })
    }

    if (role === 'parent') {
      const links = await ParentStudent.find({ parentUserId: req.user.id })
        .select('studentId')
        .lean()

      const studentIds = links.map((l) => l.studentId).filter(Boolean)
      if (!studentIds.length) return res.json({ date: dateStr, students: [] })

      const records = await Attendance.find({
        studentId: { $in: studentIds },
        date: normalizedDate,
        published: true,
      }).lean()

      if (!records.length) {
        return res.json({ date: dateStr, students: [] })
      }

      const recordStudentIds = records.map((r) => r.studentId).filter(Boolean)

      const students = await Student.find({ _id: { $in: recordStudentIds } })
        .select('_id name classId')
        .lean()

      const recordMap = new Map(records.map((r) => [String(r.studentId), r]))

      const studentsWithStatus = students.map((s) => {
        const rec = recordMap.get(String(s._id))
        return {
          studentId: s._id,
          student: { _id: s._id, name: s.name, classId: s.classId },
          status: rec ? rec.status : null,
        }
      })

      return res.json({
        date: dateStr,
        students: studentsWithStatus,
      })
    }

    return res.status(403).json({ error: 'Forbidden' })
  } catch (err) {
    handleError(res, err)
  }
}

export async function publishAttendanceForDate(req, res) {
  try {
    const { date, classId, published } = req.body || {}

    const normalizedDate = normalizeDay(date)
    if (!normalizedDate) return badRequest(res, 'date must be a valid day (YYYY-MM-DD)')

    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return badRequest(res, 'Valid classId is required')
    }

    const nextPublished =
      published === undefined ? true : typeof published === 'boolean' ? published : null
    if (nextPublished === null) return badRequest(res, 'published must be boolean')

    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(403).json({ error: 'You do not belong to this class' })
    }

    const studentIds = await Student.find({ classId }).select('_id').lean()
    const ids = studentIds.map((s) => s._id)
    if (!ids.length) return res.json({ updated: 0 })

    const result = await Attendance.updateMany(
      { studentId: { $in: ids }, date: normalizedDate },
      { $set: { published: nextPublished } },
    )

    res.json({ updated: result.modifiedCount ?? result.nModified ?? 0 })
  } catch (err) {
    handleError(res, err)
  }
}

