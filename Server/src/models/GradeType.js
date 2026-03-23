import mongoose from 'mongoose'

const gradeTypeSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  // 0.0 -> 1.0; teachers can edit at any time.
  weight: { type: Number, required: true, min: 0, max: 1 },
  createdAt: { type: Date, default: Date.now },
})

gradeTypeSchema.index({ classId: 1, name: 1 }, { unique: false })

export const GradeType = mongoose.model('GradeType', gradeTypeSchema)

