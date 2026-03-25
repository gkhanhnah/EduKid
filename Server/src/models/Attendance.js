import mongoose from 'mongoose'

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  /** Stored as midnight UTC for the day (normalized by controller). */
  date: { type: Date, required: true },
  status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  note: { type: String, trim: true, default: '' },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true })

export const Attendance = mongoose.model('Attendance', attendanceSchema)
export const ATTENDANCE_STATUS_ENUM = ATTENDANCE_STATUSES

