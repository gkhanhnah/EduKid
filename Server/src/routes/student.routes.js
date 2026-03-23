import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  addParentToStudent,
} from '../controllers/student.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('teacher'))

router.post('/', createStudent)
router.get('/', getAllStudents)
router.get('/:id', getStudentById)
router.put('/:id/add-parent', addParentToStudent)
router.put('/:id', updateStudent)
router.delete('/:id', deleteStudent)

export default router
