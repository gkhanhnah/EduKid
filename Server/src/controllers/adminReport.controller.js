import mongoose from 'mongoose'
import * as XLSX from 'xlsx'
import { Attendance } from '../models/Attendance.js'
import { Grade } from '../models/Grade.js'
import { Student } from '../models/Student.js'

function normalizeDateInput(s) {
  if (!s) return null
  if (s instanceof Date) return s
  const d = new Date(String(s))
  if (!Number.isFinite(d.getTime())) return null
  return d
}

function startOfDay(d) {
  if (!d) return null
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  if (!d) return null
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function reduceGradesToLatestByComponent(grades = []) {
  const latest = new Map()
  for (const g of grades) {
    const studentId =
      g?.student && typeof g.student === 'object' ? String(g.student._id) : String(g?.student ?? '')
    const subjectId =
      g?.subject && typeof g.subject === 'object' ? String(g.subject._id) : String(g?.subject ?? '')
    const componentName = String(g?.componentName ?? '')
    const key = `${studentId}:${subjectId}:${componentName}`
    const nextTime = g?.createdAt ? new Date(g.createdAt).getTime() : -Infinity
    const prev = latest.get(key)
    const prevTime = prev?.createdAt ? new Date(prev.createdAt).getTime() : -Infinity
    if (!prev || nextTime >= prevTime) latest.set(key, g)
  }
  return Array.from(latest.values())
}

function writeXlsx(res, sheetName, rows, fallbackColumns = []) {
  const wb = XLSX.utils.book_new()
  const normalizedRows =
    Array.isArray(rows) && rows.length
      ? rows
      : fallbackColumns.length
        ? [Object.fromEntries(fallbackColumns.map((key) => [key, '']))]
        : []
  const ws = XLSX.utils.json_to_sheet(normalizedRows)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.xlsx"`)
  res.send(buf)
}

export async function getGradesReport(req, res) {
  try {
    const { classId, subjectId, from, to } = req.query || {}

    const filter = {}
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'Invalid classId' })
      filter.class = classId
    }
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ error: 'Invalid subjectId' })
      filter.subject = subjectId
    }

    const fromD = startOfDay(normalizeDateInput(from))
    const toD = endOfDay(normalizeDateInput(to))
    if (fromD || toD) {
      filter.createdAt = {}
      if (fromD) filter.createdAt.$gte = fromD
      if (toD) filter.createdAt.$lte = toD
    }

    const grades = await Grade.find(filter)
      .populate('student', 'name classId')
      .populate('subject', 'name components classId')
      .populate('createdBy', 'name email')
      .lean()

    const latest = reduceGradesToLatestByComponent(grades)

    const rows = latest.map((g) => ({
      studentName: g.student?.name ?? '',
      classId: g.class,
      subjectName: g.subject?.name ?? '',
      componentName: g.componentName ?? '',
      score: g.score ?? null,
      showToParent: Boolean(g.showToParent),
      source: g.source ?? '',
      updatedAt: g.createdAt ? new Date(g.createdAt).toISOString() : null,
    }))

    res.json({ rowsCount: rows.length, rows })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function exportGradesReportXlsxImpl(req, res) {
  try {
    const { classId, subjectId, from, to } = req.query || {}

    const filter = {}
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'Invalid classId' })
      filter.class = classId
    }
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) return res.status(400).json({ error: 'Invalid subjectId' })
      filter.subject = subjectId
    }

    const fromD = startOfDay(normalizeDateInput(from))
    const toD = endOfDay(normalizeDateInput(to))
    if (fromD || toD) {
      filter.createdAt = {}
      if (fromD) filter.createdAt.$gte = fromD
      if (toD) filter.createdAt.$lte = toD
    }

    const grades = await Grade.find(filter)
      .populate('student', 'name classId')
      .populate('subject', 'name components classId')
      .lean()

    const latest = reduceGradesToLatestByComponent(grades)

    const rows = latest.map((g) => ({
      studentName: g.student?.name ?? '',
      classId: g.class,
      subjectName: g.subject?.name ?? '',
      componentName: g.componentName ?? '',
      score: g.score ?? null,
      showToParent: Boolean(g.showToParent),
      source: g.source ?? '',
      updatedAt: g.createdAt ? new Date(g.createdAt).toISOString() : null,
    }))

    writeXlsx(res, 'grades_report', rows, [
      'studentName',
      'classId',
      'subjectName',
      'componentName',
      'score',
      'showToParent',
      'source',
      'updatedAt',
    ])
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getAttendanceReport(req, res) {
  try {
    const { classId, from, to, includeInsights } = req.query || {}

    const fromD = startOfDay(normalizeDateInput(from))
    const toD = endOfDay(normalizeDateInput(to))

    if (from && !fromD) return res.status(400).json({ error: 'Invalid from' })
    if (to && !toD) return res.status(400).json({ error: 'Invalid to' })

    const studentFilter = {}
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'Invalid classId' })
      studentFilter.classId = classId
    }

    const studentIds = studentFilter.classId
      ? (await Student.find(studentFilter).select('_id').lean()).map((s) => s._id)
      : null

    if (studentIds && !studentIds.length) return res.json({ rows: [], insights: null })

    const filter = {}
    if (studentIds) filter.studentId = { $in: studentIds }
    else filter.studentId = { $exists: true }

    if (fromD || toD) {
      filter.date = {}
      if (fromD) filter.date.$gte = fromD
      if (toD) filter.date.$lte = toD
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name classId')
      .lean()

    const rows = records.map((r) => ({
      studentName: r.studentId?.name ?? '',
      classId: r.studentId?.classId ?? null,
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : null,
      status: r.status ?? null,
      published: Boolean(r.published),
      note: r.note ?? '',
    }))

    if (!String(includeInsights).toLowerCase().includes('true')) {
      return res.json({ rowsCount: rows.length, rows, insights: null })
    }

    const insightsAgg = await Attendance.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$studentId',
          absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        },
      },
      { $sort: { absentCount: -1, lateCount: -1 } },
      { $limit: 10 },
    ])

    const idToStudent = new Map(
      (await Student.find({ _id: { $in: insightsAgg.map((x) => x._id) } }).select('_id name classId').lean()).map(
        (s) => [String(s._id), s],
      ),
    )

    const insights = {
      topAbsentStudents: insightsAgg.map((r) => ({
        student: idToStudent.get(String(r._id)) ?? null,
        absentCount: r.absentCount ?? 0,
      })),
      topLateStudents: insightsAgg.map((r) => ({
        student: idToStudent.get(String(r._id)) ?? null,
        lateCount: r.lateCount ?? 0,
      })),
    }

    res.json({ rowsCount: rows.length, rows, insights })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function exportAttendanceReportXlsx(req, res) {
  try {
    const { classId, from, to } = req.query || {}

    const fromD = startOfDay(normalizeDateInput(from))
    const toD = endOfDay(normalizeDateInput(to))
    if (from && !fromD) return res.status(400).json({ error: 'Invalid from' })
    if (to && !toD) return res.status(400).json({ error: 'Invalid to' })

    const studentFilter = {}
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) return res.status(400).json({ error: 'Invalid classId' })
      studentFilter.classId = classId
    }

    const studentIds = studentFilter.classId
      ? (await Student.find(studentFilter).select('_id').lean()).map((s) => s._id)
      : null
    if (studentIds && !studentIds.length) {
      return writeXlsx(res, 'attendance_export', [], [
        'studentName',
        'classId',
        'date',
        'status',
        'published',
        'note',
      ])
    }

    const filter = {}
    if (studentIds) filter.studentId = { $in: studentIds }
    else filter.studentId = { $exists: true }

    if (fromD || toD) {
      filter.date = {}
      if (fromD) filter.date.$gte = fromD
      if (toD) filter.date.$lte = toD
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name classId')
      .lean()

    const rows = records.map((r) => ({
      studentName: r.studentId?.name ?? '',
      classId: r.studentId?.classId ?? '',
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : '',
      status: r.status ?? '',
      published: Boolean(r.published),
      note: r.note ?? '',
    }))

    writeXlsx(res, 'attendance_export', rows, [
      'studentName',
      'classId',
      'date',
      'status',
      'published',
      'note',
    ])
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

