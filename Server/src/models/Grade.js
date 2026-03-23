import mongoose from 'mongoose'

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true,
  },
  // The grade type determines the weight for weighted-average calculations.
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GradeType',
    required: true,
  },
  score: { type: Number, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // When true, parents are allowed to view this grade.
  showToParent: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
})

// Data integrity: one grade per (student, class, grade type).
gradeSchema.index({ student: 1, class: 1, type: 1 }, { unique: true })

export const Grade = mongoose.model('Grade', gradeSchema)

