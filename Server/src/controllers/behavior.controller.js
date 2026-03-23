import { Behavior } from '../models/Behavior.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import {
  distinctClassIdsForTeacher,
  findClassForTeacher,
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

const ALLOWED_TYPES = ['GOOD', 'BAD', 'ACTIVE', 'SLEEPY']

function mapIncomingType(raw) {
  if (!raw) return null
  const u = String(raw).toUpperCase()
  if (u === 'NOTE') return 'ACTIVE'
  if (ALLOWED_TYPES.includes(u)) return u
  return null
}

async function assertStudentOwnedByTeacher(studentId, teacherUserId) {
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  const cls = await findClassForTeacher(student.classId, teacherUserId).lean()
  if (!cls) return null
  return student
}

async function getTeacherStudentIds(teacherUserId) {
  const classIds = await distinctClassIdsForTeacher(teacherUserId)
  return Student.find({ classId: { $in: classIds } }).distinct('_id')
}

/**
 * Build Mongo filter for behaviors the user may see. Returns { filter, errorStatus, error }.
 */
async function buildAccessFilter(req, extra = {}) {
  const role = req.user.role
  let filter = { ...extra }

  if (role === 'teacher') {
    const studentIds = await getTeacherStudentIds(req.user.id)
    if (!studentIds.length) {
      return { filter: { _id: null }, empty: true }
    }
    const allowed = new Set(studentIds.map(String))
    if (req.query.studentId) {
      if (!allowed.has(String(req.query.studentId))) {
        return { filter: { _id: null }, empty: true }
      }
      filter.student = req.query.studentId
    } else {
      filter.student = { $in: studentIds }
    }
    return { filter, empty: false }
  }

  if (role === 'parent') {
    const links = await ParentStudent.find({ parentUserId: req.user.id }).distinct(
      'studentId',
    )
    if (!links.length) {
      return { filter: { _id: null }, empty: true }
    }
    const allowed = new Set(links.map(String))
    if (req.query.studentId) {
      if (!allowed.has(String(req.query.studentId))) {
        return {
          errorStatus: 403,
          error: 'Not authorized for this student',
        }
      }
      filter.student = req.query.studentId
    } else {
      filter.student = { $in: links }
    }
    return { filter, empty: false }
  }

  return { errorStatus: 403, error: 'Forbidden' }
}

function applyDateRange(filter, query) {
  const out = { ...filter }
  if (query.date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(query.date).trim())
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2])
      const d = Number(m[3])
      const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0))
      const end = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999))
      out.createdAt = { $gte: start, $lte: end }
    }
  }
  return out
}

function applyTypeAndDateFilter(filter, query) {
  const out = applyDateRange(filter, query)
  if (query.type) {
    const t = mapIncomingType(query.type)
    if (t) out.type = t
  }
  return out
}

export function serializeBehavior(b) {
  if (!b) return b
  const student =
    b.student && typeof b.student === 'object'
      ? { _id: String(b.student._id), name: b.student.name }
      : b.student
        ? String(b.student)
        : null
  const teacher =
    b.teacher && typeof b.teacher === 'object'
      ? { _id: String(b.teacher._id), name: b.teacher.name }
      : b.teacher
        ? String(b.teacher)
        : null
  return {
    _id: String(b._id),
    type: b.type,
    note: b.note ?? '',
    date: b.date ? new Date(b.date).toISOString() : null,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
    student,
    teacher,
  }
}

export async function createBehavior(req, res) {
  try {
    const studentRef = req.body.student || req.body.studentId
    if (!studentRef) {
      return res.status(400).json({ error: 'student or studentId is required' })
    }
    const owned = await assertStudentOwnedByTeacher(studentRef, req.user.id)
    if (!owned) {
      return res
        .status(404)
        .json({ error: 'Student not found or not in your classes' })
    }

    const type = mapIncomingType(req.body.type || req.body.behaviorType)
    if (!type) {
      return res.status(400).json({
        error: `type must be one of: ${ALLOWED_TYPES.join(', ')} (NOTE maps to ACTIVE)`,
      })
    }

    const note = (req.body.note ?? req.body.description ?? '').toString().trim()
    const date = req.body.date ? new Date(req.body.date) : undefined

    const doc = await Behavior.create({
      student: studentRef,
      teacher: req.user.id,
      type,
      note,
      date: Number.isNaN(date?.getTime()) ? undefined : date,
    })

    const populated = await Behavior.findById(doc._id)
      .populate('student', 'name')
      .populate('teacher', 'name')
      .lean()

    res.status(201).json(serializeBehavior(populated))
  } catch (err) {
    handleError(res, err)
  }
}

export async function getBehaviors(req, res) {
  try {
    const base = await buildAccessFilter(req)
    if (base.errorStatus) {
      return res.status(base.errorStatus).json({ error: base.error })
    }
    if (base.empty) {
      return res.json([])
    }

    const filter = applyTypeAndDateFilter(base.filter, req.query)

    const behaviors = await Behavior.find(filter)
      .sort({ createdAt: -1 })
      .populate('student', 'name')
      .populate('teacher', 'name')
      .lean()

    res.json(behaviors.map(serializeBehavior))
  } catch (err) {
    handleError(res, err)
  }
}

export async function getBehaviorStats(req, res) {
  try {
    const role = req.user.role
    let studentScopeIds = []

    if (role === 'teacher') {
      const teacherStuds = await getTeacherStudentIds(req.user.id)
      const set = new Set(teacherStuds.map(String))
      if (!teacherStuds.length) {
        return res.json({ good: 0, bad: 0, active: 0, sleepy: 0 })
      }

      if (req.query.classId) {
        const cls = await findClassForTeacher(req.query.classId, req.user.id).lean()
        if (!cls) {
          return res.status(404).json({ error: 'Class not found' })
        }
        const inClass = await Student.find({ classId: cls._id }).distinct('_id')
        studentScopeIds = inClass.filter((id) => set.has(String(id)))
      } else {
        studentScopeIds = [...teacherStuds]
      }

      if (req.query.studentId) {
        if (!set.has(String(req.query.studentId))) {
          return res.json({ good: 0, bad: 0, active: 0, sleepy: 0 })
        }
        studentScopeIds = [req.query.studentId]
      }
    } else if (role === 'parent') {
      const links = await ParentStudent.find({ parentUserId: req.user.id }).distinct(
        'studentId',
      )
      if (!links.length) {
        return res.json({ good: 0, bad: 0, active: 0, sleepy: 0 })
      }
      const set = new Set(links.map(String))
      if (req.query.studentId) {
        if (!set.has(String(req.query.studentId))) {
          return res.status(403).json({ error: 'Not authorized for this student' })
        }
        studentScopeIds = [req.query.studentId]
      } else {
        studentScopeIds = [...links]
      }
      if (req.query.classId) {
        const inClass = await Student.find({
          classId: req.query.classId,
          _id: { $in: links },
        }).distinct('_id')
        studentScopeIds = inClass.filter((id) => set.has(String(id)))
      }
    } else {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!studentScopeIds.length) {
      return res.json({ good: 0, bad: 0, active: 0, sleepy: 0 })
    }

    let filter = { student: { $in: studentScopeIds } }
    filter = applyDateRange(filter, req.query)

    const agg = await Behavior.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ])

    const counts = { GOOD: 0, BAD: 0, ACTIVE: 0, SLEEPY: 0 }
    for (const row of agg) {
      if (row._id && counts[row._id] !== undefined) {
        counts[row._id] = row.count
      }
    }

    res.json({
      good: counts.GOOD,
      bad: counts.BAD,
      active: counts.ACTIVE,
      sleepy: counts.SLEEPY,
    })
  } catch (err) {
    handleError(res, err)
  }
}
