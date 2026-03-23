import mongoose from 'mongoose'

const gameProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  game: { type: String, required: true, trim: true },
  score: { type: Number, required: true },
  durationSeconds: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
})

gameProgressSchema.index({ game: 1, score: -1 })
gameProgressSchema.index({ userId: 1, createdAt: -1 })

export const GameProgress = mongoose.model('GameProgress', gameProgressSchema)
