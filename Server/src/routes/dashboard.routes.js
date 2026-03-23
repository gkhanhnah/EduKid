import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  getParentDashboard,
  getTeacherDashboard,
} from '../controllers/dashboard.controller.js'

const router = Router()

router.get(
  '/teacher',
  verifyToken,
  authorizeRole('teacher'),
  getTeacherDashboard,
)
router.get(
  '/parent',
  verifyToken,
  authorizeRole('parent'),
  getParentDashboard,
)

export default router
