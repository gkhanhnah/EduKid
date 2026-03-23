import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { getMyChildren } from '../controllers/parent.controller.js'

const router = Router()

router.get('/me/children', verifyToken, authorizeRole('parent'), getMyChildren)

export default router
