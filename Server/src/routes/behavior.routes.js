import { Router } from 'express'
import { createBehavior, getBehaviors } from '../controllers/behavior.controller.js'

const router = Router()

router.post('/', createBehavior)
router.get('/', getBehaviors)

export default router
