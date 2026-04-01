import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { games } from '../../data/mockData.js'
import { GAME_COMPONENTS } from '../../games/gameRegistry.js'
import { X, Star, Trophy, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { postGameProgress } from '../../services/api.js'

/**
 * Shell: intro → play (registered mini-game) → summary.
 * Submits score to POST /api/games/progress when a round set completes.
 */
export function GamePlay() {
  const { t } = useTranslation()
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = games.find((g) => g.id === gameId)
  const GameCmp = gameId ? GAME_COMPONENTS[gameId] : null

  const [phase, setPhase] = useState('intro')
  const [playKey, setPlayKey] = useState(0)
  const [lastScore, setLastScore] = useState(0)
  const [lastDuration, setLastDuration] = useState(0)
  const [progressError, setProgressError] = useState('')
  const playStartedAt = useRef(null)

  const handleComplete = useCallback(
    async (score) => {
      const durationSec = playStartedAt.current
        ? Math.max(0, Math.floor((Date.now() - playStartedAt.current) / 1000))
        : 0
      setLastScore(score)
      setLastDuration(durationSec)
      setPhase('summary')
      setProgressError('')
      try {
        await postGameProgress({
          game: gameId,
          score,
          duration: durationSec,
        })
      } catch (e) {
        setProgressError(
          e?.response?.data?.error || e?.message || t('teacherGamePlay.saveProgressFailed'),
        )
      }
    },
    [gameId],
  )

  function startPlay() {
    playStartedAt.current = Date.now()
    setPlayKey((k) => k + 1)
    setPhase('play')
  }

  function playAgain() {
    setPhase('intro')
    setProgressError('')
  }

  if (!game || !GameCmp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-[4rem] mb-4">🎮</div>
          <h2 className="text-xl font-semibold">{t('teacherGamePlay.notFound')}</h2>
          <button
            type="button"
            onClick={() => navigate('/games')}
            className="mt-6 bg-primary text-white px-6 py-3 rounded-2xl"
          >
            {t('teacherGamePlay.backToGames')}
          </button>
        </div>
      </div>
    )
  }

  const color = game.color

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0E7FF] via-background to-[#FEF3C7] p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/games')}
              className="p-3 hover:bg-accent rounded-2xl transition-all"
              aria-label={t('teacherGamePlay.back')}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 md:gap-6 flex-wrap justify-center">
              <div className="flex items-center gap-2 text-[1.05rem]">
                <Trophy className="w-5 h-5 text-[#F59E0B]" />
                <span>
                  {phase === 'play' ? t('teacherGamePlay.playing') : t('teacherGamePlay.score')}:{' '}
                  {phase === 'summary' ? lastScore : t('common.none')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[1.05rem]">
                <Star className="w-5 h-5 text-primary" />
                <span>{game.title}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/games')}
              className="p-3 hover:bg-destructive/10 text-destructive rounded-2xl transition-all"
              aria-label={t('common.close')}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-border text-center min-h-[320px]"
        >
          <div className="mb-8">
            <div className="text-[4rem] md:text-[5rem] mb-2">{game.icon}</div>
            <h2 className="text-2xl font-bold">{game.title}</h2>
          </div>

          {phase === 'intro' && (
            <div className="space-y-6">
              <p className="text-muted-foreground max-w-md mx-auto">
                {t('teacherGamePlay.introDescription')}
              </p>
              <button
                type="button"
                onClick={startPlay}
                className="text-white px-10 py-4 rounded-2xl text-lg font-medium shadow-lg hover:opacity-95 transition-opacity"
                style={{ backgroundColor: color }}
              >
                {t('teacherGamePlay.startGame')}
              </button>
            </div>
          )}

          {phase === 'play' && (
            <GameCmp key={playKey} meta={game} onComplete={handleComplete} />
          )}

          {phase === 'summary' && (
            <div className="space-y-6">
              <p className="text-2xl font-semibold text-primary">{t('teacherGamePlay.niceWork')}</p>
              <p className="text-muted-foreground">
                {t('teacherGamePlay.score')}: <strong>{lastScore}</strong> · {t('teacherGamePlay.time')}:{' '}
                <strong>{lastDuration}s</strong>
              </p>
              {progressError ? (
                <p className="text-sm text-destructive">{progressError}</p>
              ) : (
                <p className="text-sm text-green-700">{t('teacherGamePlay.progressSaved')}</p>
              )}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={playAgain}
                  className="px-6 py-3 rounded-2xl border-2 border-border hover:bg-muted transition-colors"
                >
                  {t('teacherGamePlay.playAgain')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/games')}
                  className="text-white px-6 py-3 rounded-2xl shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {t('teacherGamePlay.allGames')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
