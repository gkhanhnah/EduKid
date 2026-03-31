import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  putGrade,
  putGradeShow,
  getGradesForStudent,
  getGradesForClass,
  getGradesAverage,
  createSubject,
  getSubjects,
  updateSubject,
  addGradeToSubject,
  getGradesBySubject,
  submitGradesForSubject,
  approveGradesForSubject,
  rejectGradesForSubject,
  lockGradesForSubject,
  unlockGradesForSubject,
  getGradeAuditLogs,
} from '../controllers/grade.controller.js'

const router = Router()

router.use(verifyToken)

// ---------------------------
// Subjects (literal paths before /:id)
// ---------------------------

router.post('/subjects', authorizeRole('teacher', 'admin'), createSubject)
router.get('/subjects', authorizeRole('teacher', 'admin'), getSubjects)
router.put('/subjects/:id', authorizeRole('teacher', 'admin'), updateSubject)
router.post('/subjects/:subjectId/grades', authorizeRole('teacher', 'admin'), addGradeToSubject)
router.get('/subjects/:subjectId/grades', authorizeRole('teacher', 'admin'), getGradesBySubject)

// ---------------------------
// Grades averages (scoped by student access)
// ---------------------------
router.get('/average', authorizeRole('teacher', 'parent', 'admin'), getGradesAverage)

// ---------------------------
// Grade rows (by grade id)
// ---------------------------

router.put('/:id', authorizeRole('teacher', 'admin'), putGrade)
router.put('/:id/show', authorizeRole('teacher', 'admin'), putGradeShow)

router.get(
  '/student/:studentId',
  authorizeRole('teacher', 'parent', 'admin'),
  getGradesForStudent,
)

router.get('/class/:classId', authorizeRole('teacher', 'admin'), getGradesForClass)

// ---------------------------
// Admin/Workflow (submit/approve/reject/lock)
// ---------------------------
router.post('/workflow/submit', authorizeRole('teacher', 'admin'), submitGradesForSubject)
router.post('/workflow/approve', authorizeRole('admin'), approveGradesForSubject)
router.post('/workflow/reject', authorizeRole('admin'), rejectGradesForSubject)
router.post('/workflow/lock', authorizeRole('teacher', 'admin'), lockGradesForSubject)
router.post('/workflow/unlock', authorizeRole('teacher', 'admin'), unlockGradesForSubject)
router.get('/audit', authorizeRole('teacher', 'admin'), getGradeAuditLogs)

export default router
