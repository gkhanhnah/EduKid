import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { createEvaluation, getEvaluations } from '../controllers/evaluation.controller.js'

const router = Router()

router.use(verifyToken)

router.get('/', getEvaluations)
router.post('/', authorizeRole('teacher'), createEvaluation)

export default router
