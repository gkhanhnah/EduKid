import mongoose from 'mongoose'

const evaluationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  scores: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  comment: { type: String, trim: true },
  period: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
})

export const Evaluation = mongoose.model('Evaluation', evaluationSchema)
