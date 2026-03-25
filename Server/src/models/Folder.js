import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
})

export const Folder = mongoose.model('Folder', folderSchema)
