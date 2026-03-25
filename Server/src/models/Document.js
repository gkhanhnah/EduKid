import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  /** Normalized: pdf, doc, docx, ppt, pptx, xls, xlsx */
  fileType: { type: String, required: true, trim: true },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    required: true,
    index: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
})

export const Document = mongoose.model('Document', documentSchema)
