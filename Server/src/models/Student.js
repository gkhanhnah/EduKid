import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  classId: { type: String },
  parentEmail: { type: String },
})

export const Student = mongoose.model('Student', studentSchema)
