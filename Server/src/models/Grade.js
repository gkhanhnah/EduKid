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
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true,
  },
  /** Must match subject.components[].name */
  componentName: { type: String, required: true, trim: true },
  score: { type: Number, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  showToParent: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
})

gradeSchema.index({ student: 1, class: 1, subject: 1, componentName: 1 }, { unique: true })

export const Grade = mongoose.model('Grade', gradeSchema)
