import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { ClassRoom } from '../models/Class.js'
import { Timetable } from '../models/Timetable.js'
import { Grade } from '../models/Grade.js'
import { classScopeFilter } from '../utils/teacherClassScope.js'

const SALT_ROUNDS = 10

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function timeToMinutes(hhmm) {
  const [hStr, mStr] = String(hhmm ?? '').split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export async function listTeachers(req, res) {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('name email').lean()

    const enriched = []
    for (const t of teachers) {
      const teacherId = String(t._id)
      const classes = await ClassRoom.find(classScopeFilter(teacherId)).select('_id').lean()
      const classIds = classes.map((c) => c._id)

      // Teaching hours: sum durations in timetable where period.teacher == this teacher.
      let teachingMinutes = 0
      if (classIds.length) {
        const timetables = await Timetable.find({ class: { $in: classIds } }).lean()
        for (const tt of timetables) {
          for (const dayRow of tt.schedule || []) {
            for (const p of dayRow.periods || []) {
              const pid = p?.teacher ? String(p.teacher) : null
              if (!pid || pid !== teacherId) continue
              const startMin = timeToMinutes(p.startTime)
              const endMin = timeToMinutes(p.endTime)
              if (startMin == null || endMin == null) continue
              const diff = endMin - startMin
              if (diff > 0) teachingMinutes += diff
            }
          }
        }
      }

      // Performance: average of all grade scores in classes they teach.
      let performanceAvg = null
      if (classIds.length) {
        const agg = await Grade.aggregate([
          { $match: { class: { $in: classIds } } },
          { $group: { _id: null, avgScore: { $avg: '$score' } } },
        ])
        performanceAvg =
          agg?.[0]?.avgScore != null && Number.isFinite(agg[0].avgScore) ? agg[0].avgScore : null
      }

      enriched.push({
        _id: t._id,
        name: t.name,
        email: t.email,
        classesCount: classIds.length,
        teachingHours: teachingMinutes / 60,
        performanceAvg,
      })
    }

    res.json({ teachers: enriched })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function createTeacher(req, res) {
  try {
    const { name, email, password } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const normalizedEmail = normalizeEmail(email)
    const hashed = await bcrypt.hash(password, SALT_ROUNDS)

    const u = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: 'teacher',
    })

    res.status(201).json(u.toJSON())
  } catch (err) {
    if (err?.code === 11000) return res.status(400).json({ error: 'Email already registered' })
    if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message })
    res.status(500).json({ error: 'Server error' })
  }
}

export async function updateTeacher(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' })

    const { name, email } = req.body || {}

    const updates = {}
    if (name !== undefined) updates.name = String(name).trim()
    if (email !== undefined) updates.email = normalizeEmail(email)

    const updated = await User.findOneAndUpdate(
      { _id: id, role: 'teacher' },
      updates,
      { new: true, runValidators: true },
    )
      .select('name email role')
      .lean()

    if (!updated) return res.status(404).json({ error: 'Teacher not found' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' })

    const deleted = await User.findOneAndDelete({ _id: id, role: 'teacher' }).lean()
    if (!deleted) return res.status(404).json({ error: 'Teacher not found' })
    res.json({ deleted: true, id })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

