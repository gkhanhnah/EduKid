import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '../controllers/adminTeacher.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('admin'))

router.get('/', listTeachers)
router.post('/', createTeacher)
router.put('/:id', updateTeacher)
router.delete('/:id', deleteTeacher)

export default router

