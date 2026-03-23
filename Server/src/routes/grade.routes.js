import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  postGrade,
  putGrade,
  putGradeShow,
  getGradesForStudent,
  getGradesForClass,
  getGradeTypesByClass,
  postGradeType,
  putGradeType,
} from '../controllers/grade.controller.js'

const router = Router()

router.use(verifyToken)

// ---------------------------
// Grade endpoints
// ---------------------------

// Teacher: add grade (or update existing grade for same (student, class, type)).
router.post('/', authorizeRole('teacher'), postGrade)

// Teacher: edit grade (score and/or showToParent).
router.put('/:id', authorizeRole('teacher'), putGrade)

// Teacher: make a grade visible to parents.
router.put('/:id/show', authorizeRole('teacher'), putGradeShow)

// Teacher: view all grades of student.
// Parent: view grades only if showToParent=true.
router.get(
  '/student/:studentId',
  authorizeRole('teacher', 'parent'),
  getGradesForStudent,
)

// Teacher: view all students + grades in a class.
router.get('/class/:classId', authorizeRole('teacher'), getGradesForClass)

// ---------------------------
// GradeType endpoints
// (used to edit weights)
// ---------------------------

router.get('/types/class/:classId', authorizeRole('teacher'), getGradeTypesByClass)

router.post('/types', authorizeRole('teacher'), postGradeType)

router.put('/types/:id', authorizeRole('teacher'), putGradeType)

export default router

