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
  /**
   * Connected academic pipeline:
   * - HOMEWORK grades are auto-synced from a graded Homework (sourceId=homeworkId)
   * - MANUAL grades are entered directly in GradeManagement
   */
  source: { type: String, enum: ['HOMEWORK', 'MANUAL'], default: 'MANUAL', index: true },
  sourceId: { type: String, default: 'MANUAL', index: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  showToParent: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
})

// Prevent duplicates coming from the same source record.
// (e.g. one homework => one grade row per student per subject component)
gradeSchema.index(
  { student: 1, class: 1, subject: 1, componentName: 1, source: 1, sourceId: 1 },
  { unique: true },
)

export const Grade = mongoose.model('Grade', gradeSchema)
