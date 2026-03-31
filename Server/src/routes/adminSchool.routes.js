import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { getSchoolInfo, upsertSchoolInfo } from '../controllers/systemSetting.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('admin'))

router.get('/', getSchoolInfo)
router.put('/', upsertSchoolInfo)

export default router
