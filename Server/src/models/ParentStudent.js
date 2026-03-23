import mongoose from 'mongoose'

const parentStudentSchema = new mongoose.Schema({
  parentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  relationship: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
})

parentStudentSchema.index({ parentUserId: 1, studentId: 1 }, { unique: true })

export const ParentStudent = mongoose.model('ParentStudent', parentStudentSchema)
