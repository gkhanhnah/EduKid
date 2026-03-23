import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { messageFileUpload } from '../middleware/messageUpload.middleware.js'
import {
  getContacts,
  getMessageHistory,
  uploadMessageAttachment,
} from '../controllers/message.controller.js'

const router = Router()

router.post(
  '/upload',
  verifyToken,
  authorizeRole('teacher', 'parent'),
  (req, res, next) => {
    messageFileUpload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.message || 'Upload failed',
        })
      }
      next()
    })
  },
  uploadMessageAttachment,
)

router.get(
  '/contacts',
  verifyToken,
  authorizeRole('teacher', 'parent'),
  getContacts,
)
router.get(
  '/',
  verifyToken,
  authorizeRole('teacher', 'parent'),
  getMessageHistory,
)

export default router
