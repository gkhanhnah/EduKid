import { Router } from 'express'
import {
  createStudent,
  getAllStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller.js'

const router = Router()

router.post('/', createStudent)
router.get('/', getAllStudents)
router.put('/:id', updateStudent)
router.delete('/:id', deleteStudent)

export default router
