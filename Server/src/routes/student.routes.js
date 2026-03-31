import { Router } from 'express'
import multer from 'multer'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  addParentToStudent,
  importStudents,
  exportStudentsXlsx,
} from '../controllers/student.controller.js'

const router = Router()

// Teacher manages their classes; admin can manage the whole school.
router.use(verifyToken, authorizeRole('teacher', 'admin'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

router.post('/', createStudent)
router.get('/', getAllStudents)
router.get('/:id', getStudentById)
router.put('/:id/add-parent', addParentToStudent)
router.put('/:id', updateStudent)
router.delete('/:id', deleteStudent)

// Admin bulk import/export.
router.post('/import', authorizeRole('admin'), upload.single('file'), importStudents)
router.get('/export/xlsx', authorizeRole('admin'), exportStudentsXlsx)

export default router
