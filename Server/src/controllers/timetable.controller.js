import mongoose from 'mongoose'
import { Timetable } from '../models/Timetable.js'
import { ClassRoom } from '../models/Class.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { Student } from '../models/Student.js'
import { findClassForTeacher } from '../utils/teacherClassScope.js'

const DAY_VALUES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(value) {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function normalizeSchedule(rawSchedule) {
  if (!Array.isArray(rawSchedule)) {
    throw new Error('schedule must be an array')
  }
  const normalized = rawSchedule.map((dayRow, dayIdx) => {
    const day = dayRow?.day
    if (!DAY_VALUES.includes(day)) {
      throw new Error(`Invalid day at schedule[${dayIdx}]`)
    }
    if (!Array.isArray(dayRow?.periods)) {
      throw new Error(`periods must be an array for ${day}`)
    }
    const periods = dayRow.periods.map((p, periodIdx) => {
      const subject = p?.subject?.trim?.()
      if (!subject) {
        throw new Error(`subject is required at ${day} period ${periodIdx + 1}`)
      }
      const teacher = p?.teacher
      if (!teacher || !mongoose.Types.ObjectId.isValid(teacher)) {
        throw new Error(`Invalid teacher id at ${day} period ${periodIdx + 1}`)
      }
      const startTime = p?.startTime
      const endTime = p?.endTime
      if (!TIME_RE.test(startTime || '') || !TIME_RE.test(endTime || '')) {
        throw new Error(`startTime/endTime must be HH:mm at ${day} period ${periodIdx + 1}`)
      }
      const startMin = toMinutes(startTime)
      const endMin = toMinutes(endTime)
      if (startMin >= endMin) {
        throw new Error(`startTime must be before endTime at ${day} period ${periodIdx + 1}`)
      }
      return {
        subject,
        teacher: teacher.toString(),
        startTime,
        endTime,
        _startMin: startMin,
        _endMin: endMin,
      }
    })

    // Validate no overlap for each day by sorting periods by start time.
    const sorted = [...periods].sort((a, b) => a._startMin - b._startMin)
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i]._startMin < sorted[i - 1]._endMin) {
        throw new Error(`Overlapping periods on ${day}`)
      }
    }

    return {
      day,
      periods: sorted.map(({ _startMin, _endMin, ...clean }) => clean),
    }
  })

  return normalized
}

function classTeacherIdSet(cls) {
  return new Set([
    String(cls.teacherId),
    ...(cls.subjectTeachers || []).map((id) => String(id)),
  ])
}

function validateTeachersBelongClass(schedule, cls) {
  const allowed = classTeacherIdSet(cls)
  for (const dayRow of schedule) {
    for (const period of dayRow.periods) {
      if (!allowed.has(String(period.teacher))) {
        throw new Error(`Teacher ${period.teacher} does not belong to this class`)
      }
    }
  }
}

async function assertParentCanViewClass(parentUserId, classId) {
  const childIds = await ParentStudent.find({ parentUserId }).distinct('studentId')
  if (!childIds.length) return false
  const count = await Student.countDocuments({
    _id: { $in: childIds },
    classId,
  })
  return count > 0
}

export async function saveTimetable(req, res) {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { classId, schedule } = req.body
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return badRequest(res, 'Invalid classId')
    }

    // Teacher can save timetable only for classes they belong to (main or subject).
    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) {
      return res.status(403).json({ error: 'You do not belong to this class' })
    }

    let normalized
    try {
      normalized = normalizeSchedule(schedule)
      validateTeachersBelongClass(normalized, cls)
    } catch (err) {
      return badRequest(res, err.message || 'Invalid timetable payload')
    }

    const doc = await Timetable.findOneAndUpdate(
      { class: classId },
      { class: classId, schedule: normalized },
      { upsert: true, new: true, runValidators: true },
    )
      .populate('class', 'name grade teacherId subjectTeachers')
      .populate('schedule.periods.teacher', 'name email')
      .lean()

    res.json(doc)
  } catch (err) {
    if (err.name === 'ValidationError') {
      return badRequest(res, err.message)
    }
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function getTimetableByClass(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return badRequest(res, 'Invalid classId')
    }

    if (req.user.role === 'teacher') {
      const cls = await findClassForTeacher(classId, req.user.id).lean()
      if (!cls) {
        return res.status(403).json({ error: 'You do not belong to this class' })
      }
    } else if (req.user.role === 'parent') {
      const canView = await assertParentCanViewClass(req.user.id, classId)
      if (!canView) {
        return res.status(403).json({ error: 'You are not linked to this class' })
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const cls = await ClassRoom.findById(classId)
      .populate('teacherId', 'name email')
      .populate('subjectTeachers', 'name email')
      .lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found' })
    }

    const timetable = await Timetable.findOne({ class: classId })
      .populate('schedule.periods.teacher', 'name email')
      .lean()

    if (!timetable) {
      return res.json({
        class: cls,
        schedule: [],
      })
    }

    res.json({
      ...timetable,
      class: cls,
    })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}
