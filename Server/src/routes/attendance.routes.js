import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  publishAttendanceForDate,
  getAttendanceByDate,
  upsertAttendance,
} from '../controllers/attendance.controller.js'

const router = Router()

router.use(verifyToken)

router.post('/', authorizeRole('teacher'), upsertAttendance)
router.post('/publish', authorizeRole('teacher'), publishAttendanceForDate)
router.get('/', authorizeRole('teacher', 'parent'), getAttendanceByDate)

export default router

