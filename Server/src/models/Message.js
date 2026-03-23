import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
  content: { type: String, default: '', trim: true, maxlength: 8000 },
  attachmentUrl: { type: String, default: null },
  attachmentMime: { type: String, default: null },
  attachmentName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
})

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 })
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 })

export const Message = mongoose.model('Message', messageSchema)
