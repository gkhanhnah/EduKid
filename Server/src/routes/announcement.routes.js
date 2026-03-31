import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  createAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js'

const router = Router()

router.get('/', verifyToken, authorizeRole('teacher', 'parent', 'admin'), listAnnouncements)
router.post('/', verifyToken, authorizeRole('admin'), createAnnouncement)
router.put('/:id', verifyToken, authorizeRole('admin'), updateAnnouncement)
router.delete('/:id', verifyToken, authorizeRole('admin'), deleteAnnouncement)

export default router

