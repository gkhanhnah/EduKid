import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../../components/Sidebar.jsx'
import { games } from '../../data/mockData.js'
import { Trophy, Clock, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { getMyGameProgress } from '../../services/api.js'

function getDifficultyStyle(difficulty, t) {
  switch (difficulty) {
    case 'easy':
      return { bg: 'bg-secondary/10', text: 'text-secondary', label: t('teacherGames.easy') }
    case 'medium':
      return { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: t('teacherGames.medium') }
    case 'hard':
      return { bg: 'bg-destructive/10', text: 'text-destructive', label: t('teacherGames.hard') }
    default:
      return { bg: 'bg-muted', text: 'text-foreground', label: difficulty }
  }
}

function titleForGameId(id) {
  return games.find((g) => g.id === id)?.title ?? id
}

export function Games() {
  const { t } = useTranslation()
  const [recentProgress, setRecentProgress] = useState([])
  const [progressLoading, setProgressLoading] = useState(true)

  const loadProgress = useCallback(async () => {
    setProgressLoading(true)
    try {
      const rows = await getMyGameProgress({ limit: 8 })
      setRecentProgress(Array.isArray(rows) ? rows : [])
    } catch {
      setRecentProgress([])
    } finally {
      setProgressLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const completedCount = recentProgress.length
  const totalSeconds = recentProgress.reduce(
    (acc, r) => acc + (r.durationSeconds ?? 0),
    0,
  )
  const hoursLabel =
    totalSeconds >= 3600
      ? `${(totalSeconds / 3600).toFixed(1)}h`
      : totalSeconds >= 60
        ? `${Math.round(totalSeconds / 60)} min`
        : `${totalSeconds}s`

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="mb-2">{t('teacherGames.title')}</h1>
            <p className="text-[1.125rem] text-muted-foreground">
              {t('teacherGames.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-[2rem] mb-1">{games.length}</h3>
                  <p className="text-[0.9375rem] text-muted-foreground">{t('teacherGames.availableGames')}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-2xl">
                  <Star className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-[2rem] mb-1">{completedCount}</h3>
                  <p className="text-[0.9375rem] text-muted-foreground">{t('teacherGames.sessionsLogged')}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#F59E0B]/10 rounded-2xl">
                  <Clock className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-[2rem] mb-1">{hoursLabel}</h3>
                  <p className="text-[0.9375rem] text-muted-foreground">{t('teacherGames.playTime')}</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, index) => {
              const difficultyStyle = getDifficultyStyle(game.difficulty, t)
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-3xl shadow-lg border border-border overflow-hidden"
                >
                  <div
                    className="h-40 flex items-center justify-center text-[5rem]"
                    style={{ backgroundColor: `${game.color}15` }}
                  >
                    {game.icon}
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <h3 className="text-[1.125rem] flex-1">{game.title}</h3>
                      <div
                        className={`px-3 py-1 rounded-full text-[0.75rem] shrink-0 ${difficultyStyle.bg} ${difficultyStyle.text}`}
                      >
                        {difficultyStyle.label}
                      </div>
                    </div>
                    <p className="text-[0.9375rem] text-muted-foreground mb-6">
                      {game.description}
                    </p>
                    <Link to={`/games/${game.id}`}>
                      <button
                        type="button"
                        className="w-full py-4 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all"
                        style={{ backgroundColor: game.color }}
                      >
                        {t('teacherGames.startGame')}
                      </button>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-8 bg-white rounded-3xl p-6 shadow-lg border border-border">
            <h3 className="mb-4 font-semibold text-lg">{t('teacherGames.recentActivity')}</h3>
            {progressLoading ? (
              <p className="text-sm text-muted-foreground py-4">{t('common.loading')}</p>
            ) : recentProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {t('teacherGames.noRecentActivity')}
              </p>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((row, index) => (
                  <motion.div
                    key={row._id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-accent transition-all border border-transparent hover:border-border"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[1.25rem]">
                      🎮
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.9375rem] font-medium truncate">
                        {titleForGameId(row.game)}
                      </p>
                      <p className="text-[0.875rem] text-muted-foreground">
                        {t('teacherGames.scoreDuration', { score: row.score, seconds: row.durationSeconds ?? 0 })}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : ''}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
