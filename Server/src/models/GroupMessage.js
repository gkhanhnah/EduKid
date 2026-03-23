import mongoose from 'mongoose'

const groupMessageSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /** Client-generated idempotency key to prevent duplicated inserts. */
  clientMessageId: {
    type: String,
    required: false,
    trim: true,
  },
  message: { type: String, required: true, trim: true, maxlength: 8000 },
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  isTagAll: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

groupMessageSchema.index({ class: 1, createdAt: -1 })
groupMessageSchema.index({ sender: 1, class: 1, createdAt: -1 })
// Unique idempotency key only when clientMessageId exists.
// This avoids breaking older rows created before this field existed.
groupMessageSchema.index(
  { class: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } },
)

export const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema)
