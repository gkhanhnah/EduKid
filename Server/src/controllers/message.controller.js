import { ClassRoom } from '../models/Class.js'
import { classScopeFilter } from '../utils/teacherClassScope.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { listMessagesBetween } from '../services/messaging.service.js'

export function uploadMessageAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' })
    }
    const rel = `/uploads/${req.file.filename}`
    const base = `${req.protocol}://${req.get('host')}`
    res.json({
      url: `${base}${rel}`,
      mime: req.file.mimetype,
      name: req.file.originalname || req.file.filename,
    })
  } catch {
    return res.status(500).json({ error: 'Upload failed' })
  }
}

export async function getContacts(req, res) {
  try {
    if (req.user.role === 'teacher') {
      const classes = await ClassRoom.find(classScopeFilter(req.user.id))
        .select('_id')
        .lean()
      const classIds = classes.map((c) => c._id)
      const students = await Student.find({ classId: { $in: classIds } })
        .select('_id')
        .lean()
      const studentIds = students.map((s) => s._id)
      const links = await ParentStudent.find({ studentId: { $in: studentIds } })
        .populate('parentUserId', 'name email role')
        .populate('studentId', 'name')
        .lean()

      const rows = new Map()
      for (const link of links) {
        if (!link.parentUserId || !link.studentId) continue
        const key = `${String(link.parentUserId._id)}:${String(link.studentId._id)}`
        if (!rows.has(key)) {
          rows.set(key, {
            peerUserId: String(link.parentUserId._id),
            peerName: link.parentUserId.name,
            peerEmail: link.parentUserId.email,
            peerRole: 'parent',
            studentId: String(link.studentId._id),
            studentName: link.studentId.name,
          })
        }
      }
      return res.json({ contacts: [...rows.values()] })
    }

    if (req.user.role === 'parent') {
      const links = await ParentStudent.find({ parentUserId: req.user.id })
        .populate({
          path: 'studentId',
          select: 'name',
          populate: {
            path: 'classId',
            select: 'name',
            populate: { path: 'teacherId', select: 'name email role' },
          },
        })
        .lean()

      const rows = new Map()
      for (const link of links) {
        const stud = link.studentId
        const teacher = stud?.classId?.teacherId
        if (!teacher || teacher.role !== 'teacher') continue
        const key = `${String(teacher._id)}:${String(stud._id)}`
        if (!rows.has(key)) {
          rows.set(key, {
            peerUserId: String(teacher._id),
            peerName: teacher.name,
            peerEmail: teacher.email,
            peerRole: 'teacher',
            studentId: String(stud._id),
            studentName: stud.name,
            className: stud.classId?.name,
          })
        }
      }
      return res.json({ contacts: [...rows.values()] })
    }

    return res.status(403).json({ error: 'Forbidden' })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function getMessageHistory(req, res) {
  try {
    const otherId = req.query.userId
    if (!otherId) {
      return res.status(400).json({ error: 'userId query is required' })
    }
    const result = await listMessagesBetween(req.user.id, otherId)
    if (result.error) {
      return res.status(403).json({ error: result.error })
    }
    res.json({ messages: result.messages })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}
