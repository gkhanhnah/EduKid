import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { Router } from 'express'
import { verifyToken, authorizeRole, verifyTokenQueryOrHeader } from '../middleware/auth.middleware.js'
import {
  createFolder,
  getFolders,
  uploadDocument,
  getDocumentsByFolder,
  previewDocument,
} from '../controllers/document.controller.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCUMENTS_DIR = path.join(__dirname, '../../uploads/documents')

fs.mkdirSync(DOCUMENTS_DIR, { recursive: true })

const allowedMime = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, DOCUMENTS_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').slice(0, 16)
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    cb(null, name)
  },
})

const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (allowedMime.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported file type'))
    }
  },
})

function uploadSingle(req, res, next) {
  documentUpload.single('file')(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File must be under 10MB' })
    }
    if (err.message === 'Unsupported file type') {
      return res.status(400).json({
        error: 'Only PDF, Word, PowerPoint, and Excel files are allowed',
      })
    }
    return res.status(400).json({ error: err.message || 'Upload failed' })
  })
}

const router = Router()

router.get(
  '/preview/:id',
  verifyTokenQueryOrHeader,
  authorizeRole('teacher', 'admin'),
  previewDocument,
)

router.use(verifyToken)

router.post('/folders', authorizeRole('teacher', 'admin'), createFolder)
router.get('/folders', authorizeRole('teacher', 'admin'), getFolders)
router.post('/upload', authorizeRole('teacher', 'admin'), uploadSingle, uploadDocument)
router.get('/', authorizeRole('teacher', 'admin'), getDocumentsByFolder)

export default router
