import mongoose from 'mongoose'

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  dueDate: { type: Date, required: true, index: true },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true,
  },
  studentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
  ],
  attachments: [{ type: String, trim: true }],
  /**
   * When `isGraded=true`, this homework becomes a score source.
   * Individual student scores are stored as `Grade` rows with
   * `source=HOMEWORK` and `sourceId=homeworkId`.
   */
  isGraded: { type: Boolean, default: false, index: true },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    index: true,
  },
  gradeComponent: { type: String, trim: true },
  maxScore: { type: Number },
  status: {
    type: String,
    enum: ['PENDING', 'DONE', 'OVERDUE'],
    default: 'PENDING',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
})

homeworkSchema.index({ classId: 1, dueDate: 1 })

export const Homework = mongoose.model('Homework', homeworkSchema)
