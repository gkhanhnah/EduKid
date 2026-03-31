import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  publishAttendanceForDate,
  getAttendanceByDate,
  upsertAttendance,
} from '../controllers/attendance.controller.js'

const router = Router()

router.use(verifyToken)

router.post('/', authorizeRole('teacher', 'admin'), upsertAttendance)
router.post('/publish', authorizeRole('teacher', 'admin'), publishAttendanceForDate)
router.get('/', authorizeRole('teacher', 'parent', 'admin'), getAttendanceByDate)

export default router

