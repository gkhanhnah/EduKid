import mongoose from 'mongoose'

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  grade: { type: mongoose.Schema.Types.Mixed },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /** Invited co-teachers (main teacher remains teacherId) */
  subjectTeachers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
})

export const ClassRoom = mongoose.model('Class', classSchema)
