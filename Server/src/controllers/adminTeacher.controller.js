import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import * as XLSX from 'xlsx'
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

function findRowValue(row, key) {
  const lower = String(key ?? '').toLowerCase()
  return Object.entries(row || {}).find(([k]) => String(k).toLowerCase() === lower)?.[1]
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
    if (!name?.trim()) return res.status(400).json({ code: 'NAME_REQUIRED', error: 'Name is required' })
    if (!email?.trim()) return res.status(400).json({ code: 'EMAIL_REQUIRED', error: 'Email is required' })
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ code: 'PASSWORD_MIN', error: 'Password must be at least 6 characters' })
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
    if (err?.code === 11000) return res.status(400).json({ code: 'EMAIL_EXISTS', error: 'Email already registered' })
    if (err?.name === 'ValidationError') return res.status(400).json({ code: 'VALIDATION_ERROR', error: err.message })
    res.status(500).json({ code: 'SERVER_ERROR', error: 'Server error' })
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

export async function importTeachers(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' })

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames?.[0]
    if (!sheetName) return res.status(400).json({ error: 'Spreadsheet has no sheets' })

    const sheet = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'No rows found' })
    }

    const created = []
    const errors = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const rowIndex = i + 2

      const name = String(findRowValue(row, 'name') ?? '').trim()
      const email = normalizeEmail(findRowValue(row, 'email'))
      const password = String(findRowValue(row, 'password') ?? '')

      if (!name && !email && !password) continue

      if (!name) {
        errors.push({ row: rowIndex, error: 'name is required' })
        continue
      }
      if (!email) {
        errors.push({ row: rowIndex, error: 'email is required' })
        continue
      }
      if (password.length < 6) {
        errors.push({ row: rowIndex, error: 'password must be at least 6 characters' })
        continue
      }

      try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS)
        const doc = await User.create({
          name,
          email,
          password: hashed,
          role: 'teacher',
        })
        created.push(doc._id)
      } catch (err) {
        if (err?.code === 11000) {
          errors.push({ row: rowIndex, error: 'Email already registered' })
          continue
        }
        errors.push({ row: rowIndex, error: err?.message || 'Invalid row' })
      }
    }

    res.json({
      createdCount: created.length,
      createdIds: created,
      errorsCount: errors.length,
      errors,
    })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function exportTeachersXlsx(req, res) {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('name email').sort({ name: 1 }).lean()

    const rows = []
    for (const teacher of teachers) {
      const teacherId = String(teacher._id)
      const classes = await ClassRoom.find(classScopeFilter(teacherId)).select('_id name').lean()
      const classIds = classes.map((c) => c._id)

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

      let performanceAvg = null
      if (classIds.length) {
        const agg = await Grade.aggregate([
          { $match: { class: { $in: classIds } } },
          { $group: { _id: null, avgScore: { $avg: '$score' } } },
        ])
        performanceAvg =
          agg?.[0]?.avgScore != null && Number.isFinite(agg[0].avgScore) ? agg[0].avgScore : null
      }

      rows.push({
        name: teacher.name ?? '',
        email: teacher.email ?? '',
        classesCount: classIds.length,
        classNames: classes.map((c) => c.name).join(', '),
        teachingHours: Math.round((teachingMinutes / 60) * 10) / 10,
        performanceAvg: performanceAvg != null ? Math.round(Number(performanceAvg) * 100) / 100 : '',
      })
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'teachers_export')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="teachers_export.xlsx"')
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

