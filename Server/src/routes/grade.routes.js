import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  putGrade,
  putGradeShow,
  getGradesForStudent,
  getGradesForClass,
  createSubject,
  getSubjects,
  updateSubject,
  addGradeToSubject,
  getGradesBySubject,
} from '../controllers/grade.controller.js'

const router = Router()

router.use(verifyToken)

// ---------------------------
// Subjects (literal paths before /:id)
// ---------------------------

router.post('/subjects', authorizeRole('teacher'), createSubject)
router.get('/subjects', authorizeRole('teacher'), getSubjects)
router.put('/subjects/:id', authorizeRole('teacher'), updateSubject)
router.post('/subjects/:subjectId/grades', authorizeRole('teacher'), addGradeToSubject)
router.get('/subjects/:subjectId/grades', authorizeRole('teacher'), getGradesBySubject)

// ---------------------------
// Grade rows (by grade id)
// ---------------------------

router.put('/:id', authorizeRole('teacher'), putGrade)
router.put('/:id/show', authorizeRole('teacher'), putGradeShow)

router.get(
  '/student/:studentId',
  authorizeRole('teacher', 'parent'),
  getGradesForStudent,
)

router.get('/class/:classId', authorizeRole('teacher'), getGradesForClass)

export default router
