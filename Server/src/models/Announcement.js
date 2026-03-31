import mongoose from 'mongoose'

const ANNOUNCEMENT_TARGET_TYPES = ['WHOLE_SCHOOL', 'CLASSES']

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, default: '' },

  targetType: {
    type: String,
    enum: ANNOUNCEMENT_TARGET_TYPES,
    required: true,
  },

  // Used when targetType = CLASSES
  targetClassIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class', index: true }],

  // Scheduling: publish only when publishAt <= now.
  publishAt: { type: Date, required: true, index: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
})

announcementSchema.index({ targetType: 1, publishAt: 1 })

export const Announcement = mongoose.model('Announcement', announcementSchema)

