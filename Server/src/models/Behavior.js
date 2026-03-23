import mongoose from 'mongoose'

const behaviorSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  type: {
    type: String,
    enum: ['GOOD', 'BAD', 'SLEEPY'],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
})

export const Behavior = mongoose.model('Behavior', behaviorSchema)
