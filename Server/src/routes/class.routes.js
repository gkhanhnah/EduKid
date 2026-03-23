import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  listClasses,
  createClass,
  getClassById,
  addStudentToClass,
  addSubjectTeacher,
  updateClass,
  deleteClass,
} from '../controllers/class.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('teacher'))

router.get('/', listClasses)
router.post('/', createClass)
// Literal paths before /:id to avoid "add-student" being parsed as id
router.put('/:id/add-student', addStudentToClass)
router.put('/:id/add-teacher', addSubjectTeacher)
router.get('/:id', getClassById)
router.patch('/:id', updateClass)
router.delete('/:id', deleteClass)

export default router
