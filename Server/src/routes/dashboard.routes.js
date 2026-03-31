import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  getParentDashboard,
  getTeacherDashboard,
  getAdminDashboard,
  getAdminInsights,
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

router.get(
  '/admin',
  verifyToken,
  authorizeRole('admin'),
  getAdminDashboard,
)

router.get(
  '/admin/insights',
  verifyToken,
  authorizeRole('admin'),
  getAdminInsights,
)

export default router
