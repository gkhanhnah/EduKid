import { Router } from 'express'
import multer from 'multer'
import { verifyToken, authorizeRole } from '../middleware/auth.middleware.js'
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  importTeachers,
  exportTeachersXlsx,
} from '../controllers/adminTeacher.controller.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.use(verifyToken, authorizeRole('admin'))

router.get('/', listTeachers)
router.get('/export/xlsx', exportTeachersXlsx)
router.post('/import', upload.single('file'), importTeachers)
router.post('/', createTeacher)
router.put('/:id', updateTeacher)
router.delete('/:id', deleteTeacher)

export default router

