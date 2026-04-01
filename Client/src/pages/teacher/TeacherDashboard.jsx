import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  School,
  Star,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Sidebar } from '../../components/Sidebar.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { fetchTeacherDashboard } from '../../services/dashboardService.js'
import { homePathForRole } from '../../utils/authPaths.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

const CHART_COLORS = {
  good: '#22c55e',
  bad: '#ef4444',
  active: '#6366f1',
  sleepy: '#f59e0b',
}

export function TeacherDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await fetchTeacherDashboard()
      setData(d)
    } catch (e) {
      setError(getUiErrorMessage(e, 'teacherDashboard.loadFailed'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = data?.behaviorStats
  const chartData =
    stats != null
      ? [
          { name: t('teacherDashboard.good'), value: stats.GOOD ?? 0, fill: CHART_COLORS.good },
          { name: t('teacherDashboard.bad'), value: stats.BAD ?? 0, fill: CHART_COLORS.bad },
          { name: t('teacherDashboard.active'), value: stats.ACTIVE ?? stats.NOTE ?? 0, fill: CHART_COLORS.active },
          { name: t('teacherDashboard.sleepy'), value: stats.SLEEPY ?? 0, fill: CHART_COLORS.sleepy },
        ]
      : []

  const quickActions = [
    { label: t('nav.students'), icon: '👥', color: 'bg-primary', path: '/students' },
    { label: t('nav.classes'), icon: '🏫', color: 'bg-secondary', path: '/classes' },
    { label: t('nav.behavior'), icon: '👍', color: 'bg-[#F59E0B]', path: '/behavior' },
    { label: t('nav.evaluations'), icon: '📋', color: 'bg-[#8B5CF6]', path: '/evaluations' },
  ]

  const greetingName = user?.name?.split(' ')[0] || t('common.teacher')

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {t('teacherDashboard.greeting', { name: greetingName })}
            </h1>
            <p className="text-muted-foreground text-[1.05rem]">
              {t('teacherDashboard.subtitle')}
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-border bg-white p-12 text-center text-muted-foreground shadow-lg">
              {t('teacherDashboard.loading')}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={load}
                className="text-sm underline shrink-0"
              >
                {t('common.tryAgain')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    {data?.totalStudents ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t('teacherDashboard.totalStudents')}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-secondary/10 rounded-2xl">
                      <School className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    {data?.totalClasses ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t('teacherDashboard.classes')}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border sm:col-span-2 lg:col-span-2"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{t('teacherDashboard.behaviorTotals')}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-2xl bg-secondary/10 py-3">
                      <p className="text-2xl font-bold text-secondary tabular-nums">
                        {stats?.GOOD ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">GOOD</p>
                    </div>
                    <div className="rounded-2xl bg-destructive/10 py-3">
                      <p className="text-2xl font-bold text-destructive tabular-nums">
                        {stats?.BAD ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">BAD</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 py-3">
                      <p className="text-2xl font-bold text-primary tabular-nums">
                        {stats?.ACTIVE ?? stats?.NOTE ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">ACTIVE</p>
                    </div>
                    <div className="rounded-2xl bg-[#F59E0B]/10 py-3">
                      <p className="text-2xl font-bold text-[#F59E0B] tabular-nums">
                        {stats?.SLEEPY ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">SLEEPY</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border min-h-[280px]"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold">{t('teacherDashboard.behaviorDistribution')}</h2>
                  </div>
                  {chartData.every((d) => d.value === 0) ? (
                    <p className="text-sm text-muted-foreground py-12 text-center">
                      {t('teacherDashboard.noBehaviorRecords')}
                    </p>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid var(--border, #e5e7eb)',
                            }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold">{t('teacherDashboard.recentBehaviors')}</h2>
                  </div>
                  {!data?.recentBehaviors?.length ? (
                    <p className="text-sm text-muted-foreground">{t('teacherDashboard.noRecentEntries')}</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.recentBehaviors.map((b) => {
                        const when = b.createdAt
                          ? new Date(b.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'
                        const typeLabel = b.behaviorType ?? b.type ?? '—'
                        const noteText = (b.note ?? b.description ?? '').trim()
                        return (
                          <li
                            key={b._id}
                            className="rounded-2xl border border-border/80 bg-muted/30 px-4 py-3 text-sm"
                          >
                            <div className="flex justify-between gap-2 flex-wrap">
                              <span className="font-medium text-primary">
                                {typeLabel}
                              </span>
                              <span className="text-xs text-muted-foreground">{when}</span>
                            </div>
                            <p className="text-muted-foreground mt-1">
                              {b.student?.name ?? 'Student'}
                            </p>
                            {noteText ? (
                              <p className="mt-1 text-foreground">{noteText}</p>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </motion.div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">{t('teacherDashboard.quickActions')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Link key={action.path} to={action.path}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`${action.color} text-white rounded-3xl p-6 cursor-pointer shadow-lg hover:shadow-xl transition-shadow min-h-[120px] flex flex-col justify-end`}
                      >
                        <div className="text-3xl mb-2">{action.icon}</div>
                        <p className="font-medium">{action.label}</p>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-border flex flex-wrap items-center gap-4"
              >
                <Calendar className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <p className="font-medium">{t('teacherDashboard.planWeek')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('teacherDashboard.planWeekDescription')}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    to="/ai-lesson"
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 text-primary-foreground px-4 py-2 text-sm font-medium"
                  >
                    <Star className="w-4 h-4" />
                    {t('teacherDashboard.aiLesson')}
                  </Link>
                  <Link
                    to="/behavior?tab=history"
                    className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-medium"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('teacherDashboard.history')}
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
