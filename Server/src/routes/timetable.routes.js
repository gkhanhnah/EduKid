import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { getTimetableByClass, saveTimetable } from '../controllers/timetable.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('teacher', 'parent'))

router.post('/', saveTimetable)
router.get('/:classId', getTimetableByClass)

export default router
