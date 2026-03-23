import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { Message } from '../models/Message.js'

/**
 * Find a ParentStudent link where parent is linked to a student in this teacher's class.
 * If studentId is set, that student must be used.
 */
export async function findTeacherParentLink(teacherId, parentId, studentIdOptional) {
  const teacherOid = new mongoose.Types.ObjectId(teacherId)
  const parentOid = new mongoose.Types.ObjectId(parentId)

  const query = { parentUserId: parentOid }
  if (studentIdOptional) {
    query.studentId = new mongoose.Types.ObjectId(studentIdOptional)
  }

  const links = await ParentStudent.find(query)
    .populate({
      path: 'studentId',
      select: 'name classId',
      populate: { path: 'classId', select: 'teacherId name' },
    })
    .lean()

  for (const link of links) {
    const stud = link.studentId
    if (!stud?.classId?.teacherId) continue
    if (String(stud.classId.teacherId) !== String(teacherOid)) continue
    return { studentId: stud._id, student: stud }
  }
  return null
}

export async function assertTeacherParentPair(userAId, userBId) {
  const [a, b] = await Promise.all([
    User.findById(userAId).lean(),
    User.findById(userBId).lean(),
  ])
  if (!a || !b) return { error: 'User not found' }
  const roles = new Set([a.role, b.role])
  if (!roles.has('teacher') || !roles.has('parent')) {
    return { error: 'Messages are only between teachers and parents' }
  }
  if (a.role === b.role) return { error: 'Invalid conversation' }

  const teacherId = a.role === 'teacher' ? a._id : b._id
  const parentId = a.role === 'parent' ? a._id : b._id
  return { teacherId, parentId }
}

export async function assertMayExchangeMessages(userAId, userBId, studentIdOptional) {
  const pair = await assertTeacherParentPair(userAId, userBId)
  if (pair.error) return pair

  const link = await findTeacherParentLink(
    pair.teacherId,
    pair.parentId,
    studentIdOptional,
  )
  if (!link) {
    return {
      error: studentIdOptional
        ? 'No valid link for this student with this teacher/parent pair'
        : 'No student links this parent to your class (or theirs)',
    }
  }
  return {
    teacherId: pair.teacherId,
    parentId: pair.parentId,
    studentId: link.studentId,
  }
}

export async function createAndPopulateMessage({
  senderId,
  receiverId,
  content = '',
  studentId: studentIdOpt,
  attachmentUrl = null,
  attachmentMime = null,
  attachmentName = null,
}) {
  const text = typeof content === 'string' ? content.trim() : ''
  const hasFile = Boolean(attachmentUrl && String(attachmentUrl).trim())
  if (!text && !hasFile) {
    return { ok: false, error: 'Message must include text or an attachment' }
  }

  const ctx = await assertMayExchangeMessages(
    senderId,
    receiverId,
    studentIdOpt || undefined,
  )
  if (ctx.error) return { ok: false, error: ctx.error }

  const doc = await Message.create({
    senderId,
    receiverId,
    studentId: ctx.studentId,
    content: text,
    attachmentUrl: hasFile ? String(attachmentUrl).trim() : null,
    attachmentMime: hasFile ? (attachmentMime || null) : null,
    attachmentName: hasFile ? (attachmentName || null) : null,
  })

  const populated = await Message.findById(doc._id)
    .populate('senderId', 'name email role')
    .populate('receiverId', 'name email role')
    .populate('studentId', 'name')
    .lean()

  return { ok: true, message: serializeMessage(populated) }
}

export function serializeMessage(m) {
  if (!m) return m
  const out = { ...m }
  if (out._id) out._id = String(out._id)
  ;['senderId', 'receiverId', 'studentId'].forEach((k) => {
    const v = out[k]
    if (v && typeof v === 'object' && v._id) {
      const base = {
        _id: String(v._id),
        id: String(v._id),
        name: v.name,
      }
      if (v.email != null) base.email = v.email
      if (v.role != null) base.role = v.role
      out[k] = base
    } else if (v) {
      out[k] = String(v)
    }
  })
  if (out.createdAt) out.createdAt = new Date(out.createdAt).toISOString()
  if (out.attachmentUrl === undefined) out.attachmentUrl = null
  if (out.attachmentMime === undefined) out.attachmentMime = null
  if (out.attachmentName === undefined) out.attachmentName = null
  return out
}

export async function listMessagesBetween(meId, otherUserId) {
  const meOid = new mongoose.Types.ObjectId(meId)
  const otherOid = new mongoose.Types.ObjectId(otherUserId)

  const may = await assertMayExchangeMessages(meId, otherUserId, undefined)
  if (may.error) return { error: may.error }

  const rows = await Message.find({
    $or: [
      { senderId: meOid, receiverId: otherOid },
      { senderId: otherOid, receiverId: meOid },
    ],
  })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name email role')
    .populate('receiverId', 'name email role')
    .populate('studentId', 'name')
    .lean()

  return { messages: rows.map(serializeMessage) }
}
