import { Router } from 'express'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import { getSystemSettings, upsertSystemSettings } from '../controllers/systemSetting.controller.js'

const router = Router()

router.use(verifyToken, authorizeRole('admin'))

router.get('/', getSystemSettings)
router.put('/', upsertSystemSettings)

export default router

