import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  listClasses,
  createClass,
  getClassById,
  addStudentToClass,
  addSubjectTeacher,
  updateClass,
  getPendingSubjectTeacherInvitations,
  acceptPendingSubjectTeacherInvitation,
  declinePendingSubjectTeacherInvitation,
  deleteClass,
} from '../controllers/class.controller.js'

const router = Router()

// Teacher manages their own classes; admin can manage all classes.
router.use(verifyToken, authorizeRole('teacher', 'admin'))

router.get('/', listClasses)
router.post('/', createClass)
// Literal paths before /:id to avoid "add-student" being parsed as id
router.put('/:id/add-student', addStudentToClass)
router.put('/:id/add-teacher', addSubjectTeacher)
// Invitation endpoints (must be above "/:id" routes)
router.get('/invitations', getPendingSubjectTeacherInvitations)
router.post('/:classId/invitations/accept', acceptPendingSubjectTeacherInvitation)
router.post('/:classId/invitations/decline', declinePendingSubjectTeacherInvitation)
router.get('/:id', getClassById)
router.patch('/:id', updateClass)
router.delete('/:id', deleteClass)

export default router
