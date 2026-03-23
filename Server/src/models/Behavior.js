import mongoose from 'mongoose'

const behaviorSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['GOOD', 'BAD', 'ACTIVE', 'SLEEPY'],
    required: true,
  },
  note: { type: String, default: '', trim: true },
  date: { type: Date },
  createdAt: { type: Date, default: Date.now },
})

behaviorSchema.index({ student: 1, createdAt: -1 })
behaviorSchema.index({ teacher: 1, createdAt: -1 })

export const Behavior = mongoose.model('Behavior', behaviorSchema)
