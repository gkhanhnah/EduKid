import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { createParentStudentLink } from '../controllers/parentStudent.controller.js'

const router = Router()

router.post('/', verifyToken, authorizeRole('teacher', 'admin'), createParentStudentLink)

export default router
