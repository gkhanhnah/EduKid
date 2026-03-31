import mongoose from 'mongoose'
import { Announcement } from '../models/Announcement.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { Student } from '../models/Student.js'
import { ClassRoom } from '../models/Class.js'
import { distinctClassIdsForTeacher } from '../utils/teacherClassScope.js'

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function normalizeDate(d) {
  if (!d) return null
  const x = d instanceof Date ? d : new Date(d)
  if (!Number.isFinite(x.getTime())) return null
  return x
}

export async function createAnnouncement(req, res) {
  try {
    const { title, content, targetType, targetClassIds, publishAt } = req.body || {}
    if (!title?.trim()) return badRequest(res, 'title is required')
    if (!targetType || (targetType !== 'WHOLE_SCHOOL' && targetType !== 'CLASSES')) {
      return badRequest(res, 'targetType must be WHOLE_SCHOOL or CLASSES')
    }

    const publish = normalizeDate(publishAt) || new Date()

    const parsedTargetClassIds =
      targetType === 'CLASSES'
        ? (Array.isArray(targetClassIds) ? targetClassIds : []).filter(Boolean)
        : []

    for (const id of parsedTargetClassIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) return badRequest(res, 'Invalid targetClassIds')
    }

    // Optional: validate class ids exist.
    if (targetType === 'CLASSES' && parsedTargetClassIds.length) {
      const count = await ClassRoom.countDocuments({ _id: { $in: parsedTargetClassIds } })
      if (count !== parsedTargetClassIds.length) {
        return res.status(404).json({ error: 'One or more target classes not found' })
      }
    }

    const created = await Announcement.create({
      title: title.trim(),
      content: content ?? '',
      targetType,
      targetClassIds: parsedTargetClassIds,
      publishAt: publish,
      createdBy: req.user.id,
    })

    res.status(201).json(created)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function listAnnouncements(req, res) {
  try {
    const now = new Date()
    const role = req.user?.role
    const includeScheduled = Boolean(req.query?.includeScheduled) && role === 'admin'

    let classIds = []

    if (role === 'teacher') {
      classIds = await distinctClassIdsForTeacher(req.user.id)
    } else if (role === 'parent') {
      const links = await ParentStudent.find({ parentUserId: req.user.id }).select('studentId').lean()
      const studentIds = links.map((l) => l.studentId).filter(Boolean)
      classIds = studentIds.length
        ? (await Student.distinct('classId', { _id: { $in: studentIds } }))
        : []
    } else if (role === 'admin') {
      // Admin sees everything.
    } else {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const filter = includeScheduled ? {} : { publishAt: { $lte: now } }

    if (role === 'admin') {
      const announcements = await Announcement.find(filter).sort({ publishAt: -1 }).lean()
      return res.json({ announcements })
    }

    // Targeted: WHOLE_SCHOOL + CLASSES matching any of classIds.
    const or = [{ targetType: 'WHOLE_SCHOOL' }]
    if (classIds.length) or.push({ targetType: 'CLASSES', targetClassIds: { $in: classIds } })

    const announcements = await Announcement.find({
      ...filter,
      $or: or,
    }).sort({ publishAt: -1 }).lean()

    res.json({ announcements })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return badRequest(res, 'Invalid id')

    const { title, content, targetType, targetClassIds, publishAt } = req.body || {}

    const updates = {}
    if (title !== undefined) updates.title = String(title).trim()
    if (content !== undefined) updates.content = content
    if (targetType !== undefined) {
      if (targetType !== 'WHOLE_SCHOOL' && targetType !== 'CLASSES') {
        return badRequest(res, 'targetType must be WHOLE_SCHOOL or CLASSES')
      }
      updates.targetType = targetType
    }
    if (publishAt !== undefined) {
      const d = normalizeDate(publishAt)
      if (!d) return badRequest(res, 'publishAt must be a valid date')
      updates.publishAt = d
    }
    if (targetClassIds !== undefined) {
      const ids = Array.isArray(targetClassIds) ? targetClassIds.filter(Boolean) : []
      for (const cid of ids) {
        if (!mongoose.Types.ObjectId.isValid(cid)) return badRequest(res, 'Invalid targetClassIds')
      }
      updates.targetClassIds = ids
    }

    const updated = await Announcement.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean()
    if (!updated) return res.status(404).json({ error: 'Announcement not found' })
    res.json({ announcement: updated })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return badRequest(res, 'Invalid id')
    const deleted = await Announcement.findByIdAndDelete(id).lean()
    if (!deleted) return res.status(404).json({ error: 'Announcement not found' })
    res.json({ deleted: true, id })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

