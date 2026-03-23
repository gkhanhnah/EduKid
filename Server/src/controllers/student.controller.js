import { Student } from '../models/Student.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid student id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

export async function createStudent(req, res) {
  try {
    const student = await Student.create(req.body)
    res.status(201).json(student)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getAllStudents(req, res) {
  try {
    const students = await Student.find().sort({ name: 1 }).lean()
    res.json(students)
  } catch (err) {
    handleError(res, err)
  }
}

export async function updateStudent(req, res) {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean()
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(student)
  } catch (err) {
    handleError(res, err)
  }
}

export async function deleteStudent(req, res) {
  try {
    const student = await Student.findByIdAndDelete(req.params.id).lean()
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json({ deleted: true, id: student._id })
  } catch (err) {
    handleError(res, err)
  }
}
