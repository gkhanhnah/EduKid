import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, min: 1, max: 18 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'GRADUATED'],
    default: 'ACTIVE',
    index: true,
  },
  /** Optional profile image URL (e.g. CDN or uploaded file path). */
  photoUrl: { type: String, trim: true },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
})

export const Student = mongoose.model('Student', studentSchema)
