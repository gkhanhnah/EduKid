import mongoose from 'mongoose'

const componentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false },
)

const subjectSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  /** Midterm / Final / … with weights for weighted-average (per subject). */
  components: {
    type: [componentSchema],
    required: true,
    validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one component is required'],
  },
  createdAt: { type: Date, default: Date.now },
})

subjectSchema.index({ classId: 1, name: 1 }, { unique: true })

export const Subject = mongoose.model('Subject', subjectSchema)
