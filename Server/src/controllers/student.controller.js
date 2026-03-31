import mongoose from 'mongoose'
import * as XLSX from 'xlsx'
import { Student } from '../models/Student.js'
import { ClassRoom } from '../models/Class.js'
import { ParentStudent } from '../models/ParentStudent.js'
import {
  distinctClassIdsForTeacher,
  findClassForTeacher,
} from '../utils/teacherClassScope.js'
import { createParentStudentLink } from './parentStudent.controller.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid student id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

async function assertStudentOwnedByTeacher(studentId, userId) {
  const student = await Student.findById(studentId).lean()
  if (!student) return null
  const cls = await findClassForTeacher(student.classId, userId).lean()
  if (!cls) return null
  return student
}

export async function createStudent(req, res) {
  try {
    const { name, age, gender, classId, photoUrl, status } = req.body
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' })
    }
    const isAdmin = req.user?.role === 'admin'
    const cls = isAdmin ? await ClassRoom.findById(classId).lean() : await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) return res.status(400).json({ error: isAdmin ? 'Invalid class' : 'Invalid class or not your class' })
    const student = await Student.create({
      name: name.trim(),
      age,
      gender,
      status,
      photoUrl: photoUrl?.trim() || undefined,
      classId,
    })
    const populated = await Student.findById(student._id)
      .populate('classId', 'name grade')
      .lean()
    res.status(201).json(populated)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getAllStudents(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin'
    if (isAdmin) {
      const { classId } = req.query || {}
      const filter = {}
      if (classId != null && classId !== '') {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          return res.status(400).json({ error: 'Invalid classId' })
        }
        filter.classId = classId
      }

      const students = await Student.find(filter)
        .populate('classId', 'name grade')
        .sort({ name: 1 })
        .lean()
      return res.json(students)
    }

    const classIds = await distinctClassIdsForTeacher(req.user.id)
    const filter = { classId: { $in: classIds } }
    if (req.query.classId) {
      const qid = String(req.query.classId)
      const allowed = classIds.some((id) => String(id) === qid)
      if (!allowed) {
        return res.json([])
      }
      filter.classId = qid
    }

    const students = await Student.find(filter)
      .populate('classId', 'name grade')
      .sort({ name: 1 })
      .lean()
    res.json(students)
  } catch (err) {
    handleError(res, err)
  }
}

/** GET /students/:id — full profile for teachers who can access the student's class */
export async function getStudentById(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid student id' })
    }

    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const owned = await assertStudentOwnedByTeacher(id, req.user.id)
      if (!owned) {
        return res.status(404).json({ error: 'Student not found' })
      }
    }

    const student = await Student.findById(id)
      .populate('classId', 'name grade')
      .lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })
    const links = await ParentStudent.find({ studentId: id })
      .populate('parentUserId', 'name email')
      .lean()
    const parents = links
      .map((l) => ({
        _id: l._id,
        relationship: l.relationship,
        parent: l.parentUserId
          ? {
              _id: l.parentUserId._id,
              name: l.parentUserId.name,
              email: l.parentUserId.email,
            }
          : null,
      }))
      .filter((p) => p.parent)
    res.json({ ...student, parents })
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateStudent(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const owned = await assertStudentOwnedByTeacher(req.params.id, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
    }

    const body = { ...req.body }
    delete body.className
    if (body.classId != null) {
      const cls = isAdmin ? await ClassRoom.findById(body.classId).lean() : await findClassForTeacher(body.classId, req.user.id).lean()
      if (!cls) return res.status(400).json({ error: isAdmin ? 'Invalid class' : 'Invalid class or not your class' })
    }
    const student = await Student.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    })
      .populate('classId', 'name grade')
      .lean()
    res.json(student)
  } catch (err) {
    handleError(res, err)
  }
}

export async function deleteStudent(req, res) {
  try {
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin) {
      const owned = await assertStudentOwnedByTeacher(req.params.id, req.user.id)
      if (!owned) return res.status(404).json({ error: 'Student not found' })
    }
    const student = await Student.findByIdAndDelete(req.params.id).lean()
    if (!student) return res.status(404).json({ error: 'Student not found' })
    res.json({ deleted: true, id: student._id })
  } catch (err) {
    handleError(res, err)
  }
}

/** PUT /students/:id/add-parent — same rules as POST /parent-students */
export async function addParentToStudent(req, res) {
  req.body = { ...req.body, studentId: req.params.id }
  return createParentStudentLink(req, res)
}

function normalizeGender(g) {
  const v = String(g ?? '').trim().toLowerCase()
  if (!v) return undefined
  if (v === 'male' || v === 'm') return 'Male'
  if (v === 'female' || v === 'f') return 'Female'
  if (v === 'other' || v === 'o') return 'Other'
  return undefined
}

function normalizeStatus(s) {
  const v = String(s ?? '').trim().toUpperCase()
  if (!v) return undefined
  if (v === 'ACTIVE' || v === 'SUSPENDED' || v === 'GRADUATED') return v
  return undefined
}

function findRowValue(row, key) {
  const lower = String(key ?? '').toLowerCase()
  return Object.entries(row || {}).find(([k]) => String(k).toLowerCase() === lower)?.[1]
}

export async function importStudents(req, res) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    if (!req.file) return res.status(400).json({ error: 'Missing file' })
    const buffer = req.file.buffer
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames?.[0]
    if (!sheetName) return res.status(400).json({ error: 'Spreadsheet has no sheets' })
    const sheet = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'No rows found' })

    const fallbackClassId = req.body?.classId
    if (fallbackClassId && !mongoose.Types.ObjectId.isValid(fallbackClassId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const created = []
    const errors = []

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]
      const rowIndex = i + 2 // header row assumed at 1

      const name = String(findRowValue(row, 'name') ?? '').trim()
      if (!name) {
        // Skip blank rows.
        continue
      }

      const classIdRaw = findRowValue(row, 'classId') ?? fallbackClassId
      if (!classIdRaw) {
        errors.push({ row: rowIndex, error: 'classId is required' })
        continue
      }
      const classId = String(classIdRaw)
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        errors.push({ row: rowIndex, error: 'Invalid classId' })
        continue
      }

      const age = Number(findRowValue(row, 'age'))
      const gender = normalizeGender(findRowValue(row, 'gender') ?? findRowValue(row, 'sex'))
      const photoUrl = String(findRowValue(row, 'photoUrl') ?? '').trim() || undefined
      const status = normalizeStatus(findRowValue(row, 'status'))

      const clsExists = await ClassRoom.findById(classId).lean()
      if (!clsExists) {
        errors.push({ row: rowIndex, error: 'Class not found' })
        continue
      }

      try {
        const doc = await Student.create({
          name,
          age: Number.isFinite(age) ? age : undefined,
          gender,
          photoUrl,
          classId,
          status,
        })
        created.push(doc._id)
      } catch (e) {
        errors.push({ row: rowIndex, error: e?.message || 'Invalid row' })
      }
    }

    res.json({ createdCount: created.length, createdIds: created, errorsCount: errors.length, errors })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function exportStudentsXlsx(req, res) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { classId } = req.query || {}

    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Invalid classId' })
    }

    const filter = {}
    if (classId) filter.classId = classId

    const students = await Student.find(filter)
      .populate('classId', 'name grade')
      .sort({ name: 1 })
      .lean()

    const rows = students.map((s) => ({
      name: s.name ?? '',
      age: s.age ?? '',
      gender: s.gender ?? '',
      status: s.status ?? 'ACTIVE',
      photoUrl: s.photoUrl ?? '',
      className: s.classId?.name ?? '',
      classGrade: s.classId?.grade ?? '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'students_export')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="students_export.xlsx"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}
