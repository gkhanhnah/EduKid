import mongoose from 'mongoose'

const reminderLogSchema = new mongoose.Schema({
  homeworkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true,
    index: true,
  },
  sentTo: { type: String, required: true, trim: true, lowercase: true },
  sentAt: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ['BEFORE_1_DAY', 'BEFORE_2_HOURS'],
    required: true,
  },
})

reminderLogSchema.index({ homeworkId: 1, sentTo: 1, type: 1 }, { unique: true })

export const ReminderLog = mongoose.model('ReminderLog', reminderLogSchema)
