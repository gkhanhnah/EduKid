import mongoose from 'mongoose'

const PERIOD_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

const periodSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PERIOD_RE.test(v),
        message: 'startTime must be HH:mm',
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (v) => PERIOD_RE.test(v),
        message: 'endTime must be HH:mm',
      },
    },
  },
  { _id: false },
)

const dayScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    periods: { type: [periodSchema], default: [] },
  },
  { _id: false },
)

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      unique: true,
      index: true,
    },
    schedule: { type: [dayScheduleSchema], default: [] },
  },
  { timestamps: true },
)

export const Timetable = mongoose.model('Timetable', timetableSchema)
