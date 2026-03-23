import { Router } from 'express'
import { verifyToken } from '../middleware/auth.middleware.js'
import {
  getGameLeaderboard,
  getMyGameProgress,
  postGameProgress,
} from '../controllers/game.controller.js'

const router = Router()

router.use(verifyToken)

router.post('/progress', postGameProgress)
router.get('/progress', getMyGameProgress)
router.get('/leaderboard', getGameLeaderboard)

export default router
