import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  getGradesReport,
  exportGradesReportXlsxImpl,
  getAttendanceReport,
  exportAttendanceReportXlsx,
} from '../controllers/adminReport.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('admin'))

// Grades
router.get('/grades', getGradesReport)
router.get('/grades/export/xlsx', exportGradesReportXlsxImpl)

// Attendance
router.get('/attendance', getAttendanceReport)
router.get('/attendance/export/xlsx', exportAttendanceReportXlsx)

export default router

