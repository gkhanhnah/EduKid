import mongoose from 'mongoose'
import { ClassRoom } from '../models/Class.js'
import { User } from '../models/User.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { GroupMessage } from '../models/GroupMessage.js'
import { findClassForTeacher } from '../utils/teacherClassScope.js'

function handleBadId(res) {
  return res.status(400).json({ error: 'Invalid classId' })
}

function serializeUser(u) {
  if (!u) return null
  return {
    _id: String(u._id ?? u.id),
    name: u.name,
    email: u.email,
    role: u.role,
  }
}

const DEFAULT_CHAT_PAGE_LIMIT = 50
const MAX_CHAT_PAGE_LIMIT = 100

function clampChatLimit(raw) {
  const n = Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CHAT_PAGE_LIMIT
  return Math.min(n, MAX_CHAT_PAGE_LIMIT)
}

function serializeGroupMessage(m) {
  if (!m) return m
  return {
    ...m,
    _id: String(m._id),
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
    sender: serializeUser(m.sender),
    mentions: Array.isArray(m.mentions) ? m.mentions.map(serializeUser) : [],
    class: String(m.class),
  }
}

async function assertTeacherMayAccessClass(classId, teacherUserId) {
  const cls = await findClassForTeacher(classId, teacherUserId).lean()
  if (!cls) return false
  return true
}

async function assertParentMayAccessClass(classId, parentUserId) {
  const childIds = await ParentStudent.distinct('studentId', {
    parentUserId,
  })
  if (!childIds.length) return false
  const exists = await Student.exists({
    classId,
    _id: { $in: childIds },
  })
  return Boolean(exists)
}

async function fetchParticipantsForClass(cls) {
  const teacherIds = [cls.teacherId, ...(cls.subjectTeachers || [])]
    .filter(Boolean)
    .map(String)

  const teachers = await User.find({
    _id: { $in: teacherIds },
    role: 'teacher',
  })
    .select('name email role')
    .lean()

  const studentIds = await Student.distinct('_id', { classId: cls._id })
  const parentIds = await ParentStudent.distinct('parentUserId', {
    studentId: { $in: studentIds },
  })

  const parents = await User.find({
    _id: { $in: parentIds },
    role: 'parent',
  })
    .select('name email role')
    .lean()

  return [...teachers, ...parents].map(serializeUser)
}

export async function getClassChat(req, res) {
  try {
    const { classId } = req.params
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return handleBadId(res)
    }

    const cls = await ClassRoom.findById(classId)
      .select('name grade teacherId subjectTeachers')
      .lean()
    if (!cls) return res.status(404).json({ error: 'Class not found' })

    // Strict access:
    // - teacher: main OR subject
    // - parent: must have at least one child in this class
    if (req.user.role === 'teacher') {
      const ok = await assertTeacherMayAccessClass(classId, req.user.id)
      if (!ok) return res.status(403).json({ error: 'Forbidden' })
    } else if (req.user.role === 'parent') {
      const ok = await assertParentMayAccessClass(classId, req.user.id)
      if (!ok) return res.status(403).json({ error: 'Forbidden' })
    } else {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const viewerIsMainTeacher = String(cls.teacherId) === String(req.user.id)

    const participants = await fetchParticipantsForClass(cls)

    const hasLimit =
      req.query.limit !== undefined && String(req.query.limit).trim() !== ''

    let messagesPayload
    let hasMore = false

    if (hasLimit) {
      const limit = clampChatLimit(req.query.limit)
      const beforeRaw = req.query.before
      let filter = { class: classId }
      if (beforeRaw != null && String(beforeRaw).trim() !== '') {
        const beforeDate = new Date(beforeRaw)
        if (Number.isNaN(beforeDate.getTime())) {
          return res.status(400).json({ error: 'Invalid before cursor' })
        }
        filter = { class: classId, createdAt: { $lt: beforeDate } }
      }
      const rows = await GroupMessage.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name email role')
        .populate('mentions', 'name email role')
        .lean()
      hasMore = rows.length === limit
      messagesPayload = [...rows].reverse().map(serializeGroupMessage)
    } else {
      const messages = await GroupMessage.find({ class: classId })
        .sort({ createdAt: 1 })
        .populate('sender', 'name email role')
        .populate('mentions', 'name email role')
        .lean()
      messagesPayload = messages.map(serializeGroupMessage)
    }

    res.json({
      class: {
        _id: String(cls._id),
        name: cls.name,
        grade: cls.grade,
      },
      viewer: { isMainTeacher: viewerIsMainTeacher },
      participants,
      messages: messagesPayload,
      ...(hasLimit ? { hasMore } : {}),
    })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid classId' })
    return res.status(500).json({ error: 'Server error' })
  }
}

