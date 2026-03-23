import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import multer from 'multer'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MESSAGE_UPLOAD_DIR = path.join(__dirname, '../../uploads')

fs.mkdirSync(MESSAGE_UPLOAD_DIR, { recursive: true })

const allowedMime = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MESSAGE_UPLOAD_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').slice(0, 16)
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    cb(null, name)
  },
})

export const messageFileUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (allowedMime.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type'))
    }
  },
})
