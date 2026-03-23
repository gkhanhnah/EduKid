import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { postLesson } from '../controllers/ai.controller.js'

const router = Router()

router.post('/lesson', verifyToken, authorizeRole('teacher'), postLesson)

export default router
