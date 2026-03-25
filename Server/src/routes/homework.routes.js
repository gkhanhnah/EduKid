import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  createHomework,
  getHomeworksForParent,
  getHomeworks,
  getHomeworkById,
  gradeHomework,
} from '../controllers/homework.controller.js'

const router = Router()

router.use(verifyToken)

router.post('/', authorizeRole('teacher'), createHomework)
router.get('/for-parent', authorizeRole('parent'), getHomeworksForParent)
router.get('/', authorizeRole('teacher'), getHomeworks)
router.get('/:id', authorizeRole('teacher'), getHomeworkById)
router.put('/:id/grade', authorizeRole('teacher'), gradeHomework)

export default router
