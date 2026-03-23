import mongoose from 'mongoose'
import { ClassRoom } from '../models/Class.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { GroupMessage } from '../models/GroupMessage.js'

function serializeUser(u) {
  if (!u) return null
  return {
    _id: String(u._id ?? u.id),
    name: u.name,
    email: u.email,
    role: u.role,
  }
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

async function fetchClassTeachers(cls) {
  const teacherIds = [cls.teacherId, ...(cls.subjectTeachers || [])].filter(Boolean)
  return teacherIds.map((id) => String(id))
}

async function fetchAllowedMentionsUserIds(classId, cls) {
  const teacherIds = await fetchClassTeachers(cls)
  const studentIds = await Student.distinct('_id', { classId })
  const parentIds = await ParentStudent.distinct('parentUserId', {
    studentId: { $in: studentIds },
  })

  const allowed = new Set([...teacherIds, ...(parentIds || []).map(String)])
  return allowed
}

async function assertUserMayAccessClass(userId, classId, cls) {
  const uid = String(userId)
  const teacherIds = [cls.teacherId, ...(cls.subjectTeachers || [])].map(String)
  if (teacherIds.includes(uid)) return { role: 'teacher' }

  const childIds = await ParentStudent.distinct('studentId', { parentUserId: userId })
  if (!childIds.length) return null

  const exists = await Student.exists({
    classId,
    _id: { $in: childIds },
  })
  if (!exists) return null
  return { role: 'parent' }
}

export function registerGroupChatHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.data.userId
    const userRole = socket.data.userRole

    socket.on('JOIN_CLASS_ROOM', async (payload, cb) => {
      const { classId } = payload || {}
      const respond = typeof cb === 'function' ? cb : undefined

      try {
        if (userRole !== 'teacher' && userRole !== 'parent') {
          if (respond) respond({ ok: false, error: 'Forbidden' })
          return
        }
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          if (respond) respond({ ok: false, error: 'Invalid classId' })
          return
        }

        const cls = await ClassRoom.findById(classId)
          .select('teacherId subjectTeachers')
          .lean()
        if (!cls) {
          if (respond) respond({ ok: false, error: 'Class not found' })
          return
        }

        const allowed = await assertUserMayAccessClass(userId, classId, cls)
        if (!allowed) {
          if (respond) respond({ ok: false, error: 'Forbidden' })
          return
        }

        socket.join(String(classId))
        if (respond) respond({ ok: true })
      } catch {
        if (respond) respond({ ok: false, error: 'Server error' })
      }
    })

    socket.on('SEND_GROUP_MESSAGE', async (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : undefined
      try {
        if (userRole !== 'teacher' && userRole !== 'parent') {
          if (respond) respond({ ok: false, error: 'Forbidden' })
          return
        }
        const { classId, message, mentions, isTagAll, clientMessageId } = payload || {}
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          if (respond) respond({ ok: false, error: 'Invalid classId' })
          return
        }

        const cls = await ClassRoom.findById(classId)
          .select('teacherId subjectTeachers')
          .lean()
        if (!cls) {
          if (respond) respond({ ok: false, error: 'Class not found' })
          return
        }

        // 1) Validate user belongs to class (teacher/main/subject or parent child of class).
        const allowedAccess = await assertUserMayAccessClass(userId, classId, cls)
        if (!allowedAccess) {
          if (respond) respond({ ok: false, error: 'Forbidden' })
          return
        }

        const text = typeof message === 'string' ? message.trim() : ''
        if (!text) {
          if (respond) respond({ ok: false, error: 'message is required' })
          return
        }

        // 2) Tag-all permission: only main teacher.
        const viewerIsMainTeacher = String(cls.teacherId) === String(userId)
        const tagAll = Boolean(isTagAll)
        if (tagAll) {
          if (!viewerIsMainTeacher) {
            if (respond) respond({ ok: false, error: 'Only main teacher can tag @all' })
            return
          }
        }

        // 3) Validate mention ids belong to participants of this class.
        const mentionsIds = Array.isArray(mentions) ? mentions : []
        const allowedIds = await fetchAllowedMentionsUserIds(classId, cls)

        const mentionOids = mentionsIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => String(id))

        // Prevent "fake mentions": reject if any requested mention is outside the allowed set.
        for (const mid of mentionOids) {
          if (!allowedIds.has(mid)) {
            if (respond) respond({ ok: false, error: 'Invalid mention' })
            return
          }
        }

        // If @all is true, mentions must be empty by design.
        // Sort mentions to make "identical message" checks stable.
        const finalMentions = tagAll
          ? []
          : [...new Set(mentionOids)].sort((a, b) => a.localeCompare(b))

        // Fallback server-side dedupe:
        // If the same sender/class sends the exact same content+mentions within a short window,
        // treat it as already created. This protects against rare double-send cases.
        const now = Date.now()
        const dedupeWindowMs = 3000
        const identical = await GroupMessage.findOne({
          class: classId,
          sender: userId,
          message: text,
          isTagAll: tagAll,
          mentions: { $all: finalMentions, $size: finalMentions.length },
          createdAt: { $gte: new Date(now - dedupeWindowMs) },
        })
          .populate('sender', 'name email role')
          .populate('mentions', 'name email role')
          .lean()

        if (identical) {
          const serialized = serializeGroupMessage(identical)
          io.to(String(classId)).emit('RECEIVE_GROUP_MESSAGE', serialized)
          if (respond) respond({ ok: true, message: serialized })
          return
        }

        // 4) Save message.
        // Idempotency: the client sends a `clientMessageId` (UUID) so that if
        // the event is triggered twice we don't create duplicate rows.
        const normalizedClientMessageId =
          typeof clientMessageId === 'string' && clientMessageId.trim()
            ? clientMessageId.trim()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`

        let created
        try {
          created = await GroupMessage.create({
            class: classId,
            sender: userId,
            message: text,
            mentions: finalMentions,
            isTagAll: tagAll,
            clientMessageId: normalizedClientMessageId,
          })
        } catch (err) {
          if (err?.code === 11000) {
            // Same clientMessageId already exists: fetch existing.
            const existing = await GroupMessage.findOne({
              class: classId,
              clientMessageId: normalizedClientMessageId,
            })
              .populate('sender', 'name email role')
              .populate('mentions', 'name email role')
              .lean()

            if (existing) {
              const serialized = serializeGroupMessage(existing)
              io.to(String(classId)).emit('RECEIVE_GROUP_MESSAGE', serialized)
              if (respond) respond({ ok: true, message: serialized })
              return
            }
          }
          throw err
        }

        // 5) Populate for consistent frontend rendering.
        const populated = await GroupMessage.findById(created._id)
          .populate('sender', 'name email role')
          .populate('mentions', 'name email role')
          .lean()

        const serialized = serializeGroupMessage(populated)

        io.to(String(classId)).emit('RECEIVE_GROUP_MESSAGE', serialized)
        if (respond) respond({ ok: true, message: serialized })
      } catch {
        if (respond) respond({ ok: false, error: 'Server error' })
      }
    })
  })
}

