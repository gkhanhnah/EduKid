import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Users,
  School,
  Activity,
  CalendarDays,
  TrendingUp,
  FileText,
  ClipboardCheck,
  FolderOpen,
} from 'lucide-react'
import { fetchAdminDashboard, fetchAdminInsights } from '../../services/adminService.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

const CHART_COLORS = {
  passed: '#22c55e',
  mid: '#6366f1',
  late: '#f59e0b',
  bad: '#ef4444',
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const [d, i] = await Promise.all([fetchAdminDashboard(), fetchAdminInsights().catch(() => null)])
        if (!cancelled) {
          setData(d)
          setInsights(i)
        }
      } catch (e) {
        if (!cancelled) setError(getUiErrorMessage(e, 'adminDashboard.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const avgGpa = useMemo(() => {
    const list = data?.gpaPerClass?.filter((x) => x?.gpa != null && Number.isFinite(x.gpa)) || []
    if (!list.length) return null
    const sum = list.reduce((acc, x) => acc + Number(x.gpa), 0)
    return sum / list.length
  }, [data])

  const attendanceRatePct = useMemo(() => {
    if (data?.attendanceRate == null) return null
    const r = Number(data.attendanceRate)
    if (!Number.isFinite(r)) return null
    return `${Math.round(r * 100)}%`
  }, [data])

  const gradeDistribution = useMemo(() => data?.gradeDistribution ?? [], [data])
  const attendanceTrend = useMemo(() => data?.attendanceTrend ?? [], [data])
  const recentActivities = useMemo(() => data?.recentActivities ?? [], [data])

  const atRiskStudents = useMemo(() => insights?.atRiskStudents ?? [], [insights])
  const missingGrades = useMemo(() => insights?.missingGrades ?? [], [insights])
  const lateSubmissions = useMemo(() => insights?.lateSubmissions ?? [], [insights])

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold">{t('adminDashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('adminDashboard.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-border bg-white p-12 text-center text-muted-foreground shadow-lg">
          {t('adminDashboard.loading')}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
          <p className="font-medium">{t('adminDashboard.loadFailed')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">{data?.totalStudents ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.totalStudents')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-secondary/10 rounded-2xl">
                  <School className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">{data?.totalClasses ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.classes')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-accent/10 rounded-2xl">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">{data?.totalTeachers ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.teachers')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">{attendanceRatePct ?? '—'}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.attendanceRate')}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border sm:col-span-2 lg:col-span-2"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-secondary/10 rounded-2xl">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {avgGpa != null ? Math.round(Number(avgGpa) * 100) / 100 : '—'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t('adminDashboard.averageGpaPerClass')}</p>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t('adminDashboard.gradeDistribution')}</h2>
              </div>
              {gradeDistribution.length ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {gradeDistribution.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              i < 2
                                ? CHART_COLORS.bad
                                : i < 4
                                  ? CHART_COLORS.mid
                                  : CHART_COLORS.passed
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('adminDashboard.noGradeDistribution')}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t('adminDashboard.attendanceTrends')}</h2>
              </div>
              {attendanceTrend.length ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="weekStart" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke={CHART_COLORS.mid} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('adminDashboard.noAttendanceTrend')}</p>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('adminDashboard.recentActivities')}</h2>
            </div>

            {recentActivities.length ? (
              <ul className="space-y-2">
                {recentActivities.map((a, idx) => {
                  const icon =
                    a.type === 'NEW_GRADE'
                      ? <ClipboardCheck className="w-4 h-4 text-primary" />
                      : a.type === 'HOMEWORK'
                        ? <FileText className="w-4 h-4 text-secondary" />
                        : a.type === 'UPLOAD'
                          ? <FolderOpen className="w-4 h-4 text-primary" />
                          : <Activity className="w-4 h-4 text-muted-foreground" />
                  return (
                    <li key={`${a.type}-${idx}`} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 flex items-start gap-3">
                      <div className="mt-0.5">{icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">
                            {a.payload?.student?.name
                              ? t('adminDashboard.gradeForStudent', { name: a.payload.student.name })
                              : a.payload?.title
                                ? a.payload.title
                                : a.payload?.name
                                  ? a.payload.name
                                  : a.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : t('common.none')}
                          </span>
                        </div>
                        {a.payload?.subject?.name ? (
                          <div className="text-sm text-muted-foreground mt-1">
                            {a.payload.subject.name}
                          </div>
                        ) : null}
                        {a.payload?.score != null ? (
                          <div className="text-sm text-primary font-medium mt-1">
                            {t('adminDashboard.score', { value: a.payload.score })}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('adminDashboard.noRecentActivities')}</p>
            )}
          </motion.div>

          {insights ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white rounded-3xl p-6 shadow-lg border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{t('adminDashboard.smartAlerts')}</h2>
              </div>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-semibold mb-2">{t('adminDashboard.atRiskStudents')}</p>
                  {atRiskStudents.length ? (
                    <ul className="space-y-2">
                      {atRiskStudents.slice(0, 5).map((r) => (
                        <li key={r.student?._id ?? r.student?.id} className="text-sm">
                          <span className="font-medium">{r.student?.name ?? t('common.none')}</span>{' '}
                          <span className="text-muted-foreground">{t('adminDashboard.absLate', { absent: r.absentCount, late: r.lateCount })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('adminDashboard.noAlerts')}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-semibold mb-2">{t('adminDashboard.missingGrades')}</p>
                  {missingGrades.length ? (
                    <ul className="space-y-2">
                      {missingGrades.slice(0, 5).map((r) => (
                        <li key={r.student?._id ?? r.student?.id} className="text-sm">
                          <span className="font-medium">{r.student?.name ?? t('common.none')}</span>{' '}
                          <span className="text-muted-foreground">{t('adminDashboard.missingCount', { count: r.missingCount })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('adminDashboard.noAlerts')}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-semibold mb-2">{t('adminDashboard.lateSubmissions')}</p>
                  {lateSubmissions.length ? (
                    <ul className="space-y-2">
                      {lateSubmissions.slice(0, 5).map((h) => (
                        <li key={h._id} className="text-sm">
                          <span className="font-medium">{h.title ?? t('common.homework')}</span>{' '}
                          <span className="text-muted-foreground">· {h.class?.name ?? t('common.none')}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('adminDashboard.noAlerts')}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

