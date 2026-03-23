import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  createBehavior,
  getBehaviors,
  getBehaviorStats,
} from '../controllers/behavior.controller.js'

const router = Router()

router.use(verifyToken)

router.get('/stats', getBehaviorStats)
router.get('/', getBehaviors)
router.post('/', authorizeRole('teacher'), createBehavior)

export default router
