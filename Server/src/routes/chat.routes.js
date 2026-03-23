import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { getClassChat } from '../controllers/groupChat.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('teacher', 'parent'))

// Returns message history + participants for mention autocomplete.
router.get('/:classId', getClassChat)

export default router

