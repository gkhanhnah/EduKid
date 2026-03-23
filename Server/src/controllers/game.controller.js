import { GameProgress } from '../models/GameProgress.js'

export async function postGameProgress(req, res) {
  try {
    const { game, score, duration } = req.body
    if (game == null || String(game).trim() === '') {
      return res.status(400).json({ error: 'game is required' })
    }
    if (score == null || Number.isNaN(Number(score))) {
      return res.status(400).json({ error: 'score is required' })
    }
    const durationSeconds = Math.max(0, Math.floor(Number(duration) || 0))
    const doc = await GameProgress.create({
      userId: req.user.id,
      game: String(game).trim(),
      score: Number(score),
      durationSeconds,
    })
    res.status(201).json({
      ok: true,
      _id: String(doc._id),
      game: doc.game,
      score: doc.score,
      durationSeconds: doc.durationSeconds,
      createdAt: doc.createdAt,
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getMyGameProgress(req, res) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const rows = await GameProgress.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    res.json(
      rows.map((r) => ({
        _id: String(r._id),
        game: r.game,
        score: r.score,
        durationSeconds: r.durationSeconds,
        createdAt: r.createdAt,
      })),
    )
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getGameLeaderboard(req, res) {
  try {
    const game = req.query.game
    if (!game || String(game).trim() === '') {
      return res.status(400).json({ error: 'game query parameter is required' })
    }
    const rows = await GameProgress.find({ game: String(game).trim() })
      .sort({ score: -1, createdAt: -1 })
      .limit(10)
      .populate('userId', 'name')
      .lean()
    res.json(
      rows.map((r, i) => ({
        rank: i + 1,
        score: r.score,
        durationSeconds: r.durationSeconds,
        createdAt: r.createdAt,
        userName:
          r.userId && typeof r.userId === 'object' ? r.userId.name : 'Player',
      })),
    )
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
