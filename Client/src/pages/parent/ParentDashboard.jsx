import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Award,
  Calendar,
  Clock,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { useParentChild } from '../../context/ParentChildContext.jsx'
import { useBehaviors } from '../../hooks/useBehaviors.js'
import { useEvaluations } from '../../hooks/useEvaluations.js'
import i18n from '../../i18n/index.js'
import { formatDateTime } from '../../utils/locale.js'
function classLabel(student) {
  if (student?.classId && typeof student.classId === 'object') {
    return student.classId.name ?? '—'
  }
  return '—'
}

function classIdValue(student) {
  if (student?.classId && typeof student.classId === 'object') {
    return student.classId._id ?? null
  }
  return student?.classId ?? null
}

function startOfLocalDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function behaviorTimestamp(b) {
  return b.date ? new Date(b.date) : new Date(b.createdAt)
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getThisWeekMondayFriday() {
  const now = new Date()
  const day = now.getDay()
  const toMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + toMonday)
  monday.setHours(0, 0, 0, 0)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  friday.setHours(23, 59, 59, 999)
  return { monday, friday }
}

function weekdayIndexMon0(d) {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

/** Mon–Fri buckets: good vs active participation (ACTIVE / legacy NOTE) */
function weeklyProgressFromBehaviors(behaviors) {
  const { monday, friday } = getThisWeekMondayFriday()
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const buckets = labels.map((day) => ({ day, good: 0, active: 0 }))

  for (const b of behaviors) {
    const t = behaviorTimestamp(b)
    if (t < monday || t > friday) continue
    const idx = weekdayIndexMon0(t)
    if (idx < 0 || idx > 4) continue
    const type = (b.behaviorType ?? b.type ?? '').toString().toUpperCase()
    if (type === 'GOOD') buckets[idx].good += 1
    else if (type === 'ACTIVE' || type === 'NOTE') buckets[idx].active += 1
  }
  return buckets
}

function todayStats(behaviors) {
  const start = startOfLocalDay()
  const today = behaviors.filter((b) => isSameLocalDay(behaviorTimestamp(b), start))
  let good = 0
  let active = 0
  let tired = 0
  let bad = 0
  for (const b of today) {
    const type = (b.behaviorType ?? b.type ?? '').toString().toUpperCase()
    if (type === 'GOOD') good += 1
    else if (type === 'ACTIVE' || type === 'NOTE') active += 1
    else if (type === 'SLEEPY') tired += 1
    else if (type === 'BAD') bad += 1
  }
  return { good, active, tired, bad }
}

function overallBehaviorLabel({ good, active, bad, tired = 0 }) {
  const total = good + active + bad + tired
  if (total === 0) return i18n.t('parentDashboard.noReportsToday')
  if (bad > good && bad > 0) return i18n.t('parentDashboard.needsAttention')
  if (bad > 0 && good >= bad) return i18n.t('parentDashboard.goodOverall')
  if (good >= 4 || (good >= 2 && bad === 0)) return i18n.t('parentDashboard.excellent')
  if (good > 0 || active > 0) return i18n.t('parentDashboard.good')
  return i18n.t('parentDashboard.keepInTouch')
}

function achievementsLabel(evaluations) {
  if (!evaluations.length) return i18n.t('common.none')
  const n = Math.min(5, evaluations.length)
  return i18n.t('parentDashboard.stars', { count: n })
}

function behaviorText(b) {
  return (b.note ?? b.description ?? '').trim()
}

function latestTeacherNote(behaviors, childName) {
  const withText = [...behaviors]
    .filter((b) => behaviorText(b))
    .sort((a, b) => behaviorTimestamp(b) - behaviorTimestamp(a))
  if (withText.length) return behaviorText(withText[0])
  return i18n.t('parentDashboard.latestTeacherNoteFallback', { childName })
}

function activitiesFromTodayBehaviors(behaviors) {
  const start = startOfLocalDay()
  return [...behaviors]
    .filter((b) => isSameLocalDay(behaviorTimestamp(b), start))
    .sort((a, b) => behaviorTimestamp(b) - behaviorTimestamp(a))
    .map((b) => {
      const type = (b.behaviorType ?? b.type ?? '').toString().toUpperCase()
      const t = behaviorTimestamp(b)
      const timeStr = formatDateTime(t, {
        hour: 'numeric',
        minute: '2-digit',
      })
      let icon = '📝'
      let color = 'bg-primary'
      let activity = behaviorText(b) || type
      if (type === 'GOOD') {
        icon = '👍'
        color = 'bg-secondary'
        activity = behaviorText(b) || i18n.t('parentDashboard.goodBehaviorNoted')
      } else if (type === 'BAD') {
        icon = '👎'
        color = 'bg-destructive'
        activity = behaviorText(b) || i18n.t('parentDashboard.needsAttention')
      } else if (type === 'ACTIVE' || type === 'NOTE') {
        icon = '⭐'
        color = 'bg-primary'
        activity = behaviorText(b) || i18n.t('parentDashboard.activeParticipation')
      } else if (type === 'SLEEPY') {
        icon = '😴'
        color = 'bg-[#F59E0B]/30'
        activity = behaviorText(b) || i18n.t('parentDashboard.tiredLowEnergy')
      }
      return { time: timeStr, activity, icon, color }
    })
}

function scoreLine(scores) {
  if (!scores || typeof scores !== 'object') return null
  const parts = Object.entries(scores).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (!parts.length) return null
  return parts.map(([k, v]) => `${k}: ${v}`).join(' · ')
}

function EvaluationList({ evaluations, loading, error }) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-2">{i18n.t('parentDashboard.loadingEvaluations')}</p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>
  }
  if (!evaluations.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">{i18n.t('parentDashboard.noEvaluationsYet')}</p>
    )
  }
  return (
    <ul className="mt-4 space-y-3">
      {evaluations.slice(0, 15).map((ev) => {
        const scoresText = scoreLine(ev.scores)
        return (
          <li
            key={ev._id}
            className="text-sm rounded-2xl bg-muted/40 px-4 py-3 border border-border/60"
          >
            <div className="flex flex-wrap justify-between gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">
                {ev.period || i18n.t('parentDashboard.periodFallback')}
              </span>
              <span>
                {ev.createdAt ? formatDateTime(ev.createdAt, { dateStyle: 'short' }) : i18n.t('common.none')}
              </span>
            </div>
            {scoresText ? (
              <p className="text-primary font-medium mt-1">{scoresText}</p>
            ) : null}
            {ev.comment ? (
              <p className="mt-2 text-foreground">{ev.comment}</p>
            ) : null}
            {ev.teacherId &&
              typeof ev.teacherId === 'object' &&
              ev.teacherId.name ? (
              <p className="text-xs text-muted-foreground mt-2">
                {i18n.t('parentDashboard.teacherLabel')}: {ev.teacherId.name}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function BehaviorList({ behaviors, loading, error }) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {i18n.t('parentDashboard.loadingBehaviorHistory')}
      </p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>
  }
  if (!behaviors.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {i18n.t('parentDashboard.noBehaviorRecordsYet')}
      </p>
    )
  }
  return (
    <ul className="mt-4 space-y-2">
      {behaviors.slice(0, 20).map((b) => {
        const type = b.behaviorType ?? b.type ?? i18n.t('common.none')
        const when = b.date
          ? formatDateTime(b.date, { dateStyle: 'short' })
          : formatDateTime(b.createdAt, { dateStyle: 'short' })
        const text = behaviorText(b)
        return (
          <li
            key={b._id}
            className="text-sm flex flex-wrap gap-2 items-baseline rounded-2xl bg-muted/40 px-4 py-3 border border-border/60"
          >
            <span className="font-medium text-primary">{type}</span>
            <span className="text-muted-foreground">{when}</span>
            {text ? (
              <span className="text-foreground w-full">{text}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function ChildEmoji({ student }) {
  const g = (student?.gender || '').toLowerCase()
  if (g === 'male' || g === 'm' || g === 'boy') return '👦'
  if (g === 'female' || g === 'f' || g === 'girl') return '👧'
  return '🧒'
}

function WeeklyBars({ weeklyProgress }) {
  const maxVal = Math.max(
    1,
    ...weeklyProgress.map((d) => d.good + d.active),
  )
  const chartMaxPx = 200

  return (
    <div className="flex items-end justify-between gap-3 h-64 mb-6">
      {weeklyProgress.map((day, index) => {
        const activeH = Math.round((day.active / maxVal) * chartMaxPx)
        const goodH = Math.round((day.good / maxVal) * chartMaxPx)
        return (
          <div
            key={day.day}
            className="flex-1 flex flex-col items-center gap-2"
          >
            <div className="flex flex-col gap-1 w-full justify-end min-h-[200px]">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${activeH}px` }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-primary rounded-t-xl w-full min-h-0"
                title={i18n.t('parentDashboard.activeTitle', { count: day.active })}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${goodH}px` }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-secondary rounded-b-xl w-full min-h-0"
                title={i18n.t('parentDashboard.goodTitle', { count: day.good })}
              />
            </div>
            <span className="text-[0.875rem] text-muted-foreground">
              {day.day}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ChildDashboardPanels({ student, linkItem }) {
  const { t } = useTranslation()
  const sid = student._id ?? student.id
  const childName = student.name || t('common.yourChild')

  const {
    behaviors,
    loading: behLoading,
    error: behError,
  } = useBehaviors({ studentId: sid })
  const {
    evaluations,
    loading: evLoading,
    error: evError,
  } = useEvaluations({ studentId: sid })

  const stats = useMemo(() => todayStats(behaviors), [behaviors])
  const weeklyProgress = useMemo(
    () => weeklyProgressFromBehaviors(behaviors),
    [behaviors],
  )
  const note = useMemo(
    () => latestTeacherNote(behaviors, childName),
    [behaviors, childName],
  )
  const activities = useMemo(
    () => activitiesFromTodayBehaviors(behaviors),
    [behaviors],
  )
  const overall = overallBehaviorLabel(stats)
  const achievements = achievementsLabel(evaluations)

  const todayBehaviorCards = [
    {
      type: 'good',
      icon: '👍',
      label: t('parentDashboard.goodBehavior'),
      count: stats.good,
      color: 'text-secondary',
    },
    {
      type: 'active',
      icon: '⭐',
      label: t('parentDashboard.active'),
      count: stats.active,
      color: 'text-primary',
    },
    {
      type: 'sleepy',
      icon: '😴',
      label: t('parentDashboard.tired'),
      count: stats.tired,
      color: 'text-[#F59E0B]',
    },
    {
      type: 'bad',
      icon: '👎',
      label: t('parentDashboard.needsAttentionLabel'),
      count: stats.bad,
      color: 'text-destructive',
    },
  ]

  const dataLoading = behLoading || evLoading

  return (
    <>
      {linkItem?.relationship ? (
        <p className="text-sm text-muted-foreground mb-6">
          {t('parentDashboard.relationship')}:{' '}
          <span className="font-medium text-foreground">
            {linkItem.relationship}
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {todayBehaviorCards.map((item, index) => (
          <motion.div
            key={item.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-border"
          >
            {dataLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            ) : (
              <>
                <div className="text-[2.5rem] mb-2">{item.icon}</div>
                <h3 className={`text-[2rem] mb-1 ${item.color}`}>{item.count}</h3>
                <p className="text-[0.9375rem] text-muted-foreground">
                  {item.label}
                </p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {behError || evError ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm mb-8 space-y-1">
          {behError ? <p>Behavior: {behError}</p> : null}
          {evError ? <p>Evaluations: {evError}</p> : null}
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl p-8 shadow-lg border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold">{t('parentDashboard.todaySummary')}</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-secondary" />
                <span className="text-[0.9375rem]">{t('parentDashboard.overallBehavior')}</span>
              </div>
              <span className="text-[1.125rem] text-secondary font-medium">
                {dataLoading ? '…' : overall}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-[0.9375rem]">{t('parentDashboard.achievements')}</span>
              </div>
              <span className="text-[1.125rem] text-primary font-medium">
                {evLoading ? '…' : achievements}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-[0.9375rem]">{t('parentDashboard.class')}</span>
              </div>
              <div className="text-right">
                <span className="block text-[1.125rem] text-secondary font-medium truncate max-w-[240px]">
                  {classLabel(student)}
                </span>
                {classIdValue(student) ? (
                  <Link
                    to={`/classes/${classIdValue(student)}/timetable`}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('parentDashboard.viewTimetable')}
                  </Link>
                ) : null}
                {sid ? (
                  <Link
                    to={`/students/${sid}/grades`}
                    className="ml-3 text-xs text-primary hover:underline inline-block"
                  >
                    {t('parentDashboard.viewGrades')}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h4 className="mb-3 font-medium">{t('parentDashboard.teachersNote')}</h4>
            <p className="text-[0.9375rem] text-muted-foreground p-4 bg-[#FEF3C7] rounded-2xl">
              {dataLoading ? t('common.loading') : `“${note}”`}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-lg border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold">{t('parentDashboard.weeklyProgress')}</h2>
          </div>

          {dataLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              {t('parentDashboard.loadingChart')}
            </div>
          ) : (
            <WeeklyBars weeklyProgress={weeklyProgress} />
          )}

          <div className="flex items-center justify-center gap-6 text-[0.875rem]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>{t('parentDashboard.activeNotes')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-secondary" />
              <span>{t('parentDashboard.goodBehavior')}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-3xl p-8 shadow-lg border border-border mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold">{t('parentDashboard.todaysActivities')}</h2>
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t('parentDashboard.noBehaviorEntriesToday')}
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((row, index) => (
              <motion.div
                key={`${row.time}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="flex items-center gap-4 p-5 rounded-2xl hover:bg-accent transition-all"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${row.color} text-white flex items-center justify-center text-[1.5rem] shadow-lg`}
                >
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.9375rem]">{row.activity}</p>
                  <p className="text-[0.875rem] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {row.time}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid md:grid-cols-2 gap-6 mb-8"
      >
        <Link to="/messages" className="block">
          <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full">
            <MessageCircle className="w-12 h-12 mb-4" />
            <h3 className="text-[1.5rem] mb-2 font-semibold">{t('parentDashboard.messageTeacher')}</h3>
            <p className="text-[1rem] opacity-90">
              {t('parentDashboard.messageTeacherDescription')}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-[0.9375rem]">
              {t('parentDashboard.viewMessages')}
              <span aria-hidden>→</span>
            </div>
          </div>
        </Link>

        <div
          role="button"
          tabIndex={0}
          aria-label={t('parentDashboard.scrollToEvaluationHistory')}
          onClick={() =>
            document
              .getElementById('parent-full-evaluation-history')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            document
              .getElementById('parent-full-evaluation-history')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className="bg-gradient-to-br from-secondary to-[#22C55E]/70 text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
        >
          <Award className="w-12 h-12 mb-4" />
          <h3 className="text-[1.5rem] mb-2 font-semibold">{t('parentDashboard.teacherEvaluations')}</h3>
          <p className="text-[1rem] opacity-90">
            {t('parentDashboard.teacherEvaluationsDescription', { childName })}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-[0.9375rem]">
            {t('parentDashboard.seeDetailsBelow')}
            <span aria-hidden>↓</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="bg-white rounded-3xl p-8 shadow-lg border border-border mb-8 space-y-10"
      >
        <div id="parent-full-evaluation-history">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {t('parentDashboard.fullEvaluationHistory')}
          </h3>
          <EvaluationList
            evaluations={evaluations}
            loading={evLoading}
            error={evError}
          />
        </div>
        <div className="border-t border-border pt-10">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            {t('parentDashboard.fullBehaviorHistory')}
          </h3>
          <BehaviorList
            behaviors={behaviors}
            loading={behLoading}
            error={behError}
          />
        </div>
      </motion.div>
    </>
  )
}

function evalScoresLine(scores) {
  if (!scores || typeof scores !== 'object') return null
  const parts = Object.entries(scores).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (!parts.length) return null
  return parts.map(([k, v]) => `${k}: ${v}`).join(' · ')
}

function behaviorStudentId(b) {
  if (b?.student && typeof b.student === 'object' && b.student._id != null) {
    return String(b.student._id)
  }
  const sid = b?.studentId
  if (sid && typeof sid === 'object' && sid._id != null) return String(sid._id)
  if (sid != null) return String(sid)
  return ''
}

function evaluationStudentId(ev) {
  if (ev?.student && typeof ev.student === 'object' && ev.student._id != null) {
    return String(ev.student._id)
  }
  return ''
}

function ParentDashboardOverview() {
  const { t } = useTranslation()
  const { overview, selectedStudentId, selectedStudent } = useParentChild()
  const sid = selectedStudentId
  const childName = selectedStudent?.name || t('parentDashboard.thisChild')

  const summaryRaw = overview.behaviorSummaryByChild || []
  const evaluationsRaw = overview.latestEvaluations || []
  const recentRaw = overview.recentBehaviors || []

  const summary = sid
    ? summaryRaw.filter((s) => String(s.studentId) === sid)
    : summaryRaw
  const evaluations = sid
    ? evaluationsRaw.filter((ev) => evaluationStudentId(ev) === sid)
    : evaluationsRaw
  const recent = sid
    ? recentRaw.filter((b) => behaviorStudentId(b) === sid)
    : recentRaw

  const hasSummary = summary.length > 0
  const hasEval = evaluations.length > 0
  const hasRecent = recent.length > 0
  if (!hasSummary && !hasEval && !hasRecent) {
    return (
      <div className="mb-8 rounded-3xl border border-dashed border-border bg-white/90 p-6 text-sm text-muted-foreground shadow-sm">
        {sid
          ? t('parentDashboard.summaryEmptySingle', { childName })
          : t('parentDashboard.summaryEmptyAll')}
      </div>
    )
  }

  return (
    <div className="mb-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {hasSummary ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-border flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold text-lg">
                {sid ? t('parentDashboard.behaviorForChild', { childName }) : t('parentDashboard.behaviorSummaryByChild')}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('parentDashboard.behaviorSummaryHelp')}
            </p>
            <div className="space-y-3 overflow-y-auto">
              {summary.map((s) => (
                <div
                  key={s.studentId}
                  className="rounded-2xl bg-muted/40 border border-border/60 px-4 py-3"
                >
                  <p className="font-medium text-foreground">{s.studentName}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-secondary font-medium tabular-nums">
                      👍 {t('parentDashboard.good')} · {s.good ?? 0}
                    </span>
                    <span className="text-primary font-medium tabular-nums">
                      ⭐ {t('parentDashboard.active')} · {s.active ?? s.notes ?? 0}
                    </span>
                    <span className="text-[#F59E0B] font-medium tabular-nums">
                      😴 {t('parentDashboard.sleepy')} · {s.sleepy ?? 0}
                    </span>
                    <span className="text-destructive font-medium tabular-nums">
                      👎 {t('parentDashboard.attention')} · {s.bad ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {/* Bỏ điều kiện hasEval ở đây để Card luôn được render */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-3xl p-6 shadow-lg border border-border flex flex-col"
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">
              {sid ? t('parentDashboard.latestEvaluationsForChild', { childName }) : t('parentDashboard.latestEvaluations')}
            </h3>
          </div>

          {/* Kiểm tra điều kiện bên trong để render danh sách hoặc trạng thái trống */}
          {hasEval && evaluations?.length > 0 ? (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {evaluations.slice(0, sid ? 12 : 8).map((ev) => {
                const line = evalScoresLine(ev.scores)
                return (
                  <li
                    key={ev._id}
                    className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-1 text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {ev.student?.name ?? 'Student'}
                      </span>
                      <span className="text-xs">
                        {ev.createdAt
                          ? new Date(ev.createdAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-primary mt-1">
                      {ev.period || 'Period —'}
                      {ev.teacher?.name ? ` · ${ev.teacher.name}` : ''}
                    </p>
                    {line ? (
                      <p className="text-xs font-medium text-foreground mt-1">{line}</p>
                    ) : null}
                    {ev.comment ? (
                      <p className="text-muted-foreground mt-1 line-clamp-2">
                        {ev.comment}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            // Giao diện khi mảng rỗng hoặc không có evaluation
            <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
              {t('parentDashboard.noEvaluationsAvailable')}
            </div>
          )}
        </motion.div>
      </div>

      {hasRecent ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-lg border border-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">
              {sid ? t('parentDashboard.recentActivityForChild', { childName }) : t('parentDashboard.recentActivityAllChildren')}
            </h3>
          </div>
          <ul className="space-y-3">
            {recent.slice(0, sid ? 15 : 10).map((b) => (
              <li
                key={b._id}
                className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {b.behaviorType ?? b.type}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {b.student?.name}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {b.createdAt ? formatDateTime(b.createdAt, { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </span>
                </div>
                {behaviorText(b) ? (
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-foreground shadow-sm">
                    <span className="font-medium">{t('parentDashboard.teachersNoteLabel')}:</span> {behaviorText(b)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </div>
  )
}

export function ParentDashboardHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    linkedChildren: children,
    loading,
    error,
    reload,
    selectedLink,
    selectedStudent,
    selectedIndex,
  } = useParentChild()

  const displayName = selectedStudent?.name || t('common.yourChild')
  const clsId = selectedStudent ? classIdValue(selectedStudent) : null
  const clsName = selectedStudent ? classLabel(selectedStudent) : t('common.none')

  return (
    <div className="min-h-full bg-background">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-[2rem] font-bold mb-2">{t('parentDashboard.title')}</h1>
              <p className="text-[1.125rem] opacity-90">
                {t('parentDashboard.welcomeBack', { displayName })}
              </p>
              {/* {children.length > 1 ? (
                <p className="mt-3 max-w-xl text-sm text-white/85">
                  Use <span className="font-medium">Switch child</span> in the sidebar to
                  see another student&apos;s overview, homework, and class links.
                </p>
              ) : null} */}
            </div>
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-[3rem] shrink-0">
              <span aria-hidden>
                {selectedStudent ? (
                  <ChildEmoji student={selectedStudent} />
                ) : (
                  '👧'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="rounded-3xl border border-border bg-white p-12 text-center text-muted-foreground shadow-lg">
            {t('common.loading')}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="text-sm underline shrink-0"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-lg">
            <p className="text-muted-foreground mb-2">{t('parentDashboard.noChildrenLinked')}</p>
            <p className="text-sm text-muted-foreground">
              {t('parentDashboard.noChildrenLinkedHelpPrefix')} (
              <span className="font-medium text-foreground">{user?.email}</span>)
              {t('parentDashboard.noChildrenLinkedHelpSuffix')}
            </p>
          </div>
        ) : selectedStudent ? (
          <>
            <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-border bg-white p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('parentDashboard.classFor', { displayName })}
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-foreground">
                  {clsName}
                </p>
              </div>
              {clsId ? (
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Link
                    to={`/classes/${clsId}/timetable`}
                    className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    {t('parentDashboard.timetable')}
                  </Link>
                  <Link
                    to={`/classes/${clsId}/chat`}
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-primary/30 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
                  >
                    {t('parentDashboard.classChat')}
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('parentDashboard.noClassAssigned')}
                </p>
              )}
            </div>
            <ParentDashboardOverview />
            <ChildDashboardPanels
              key={selectedStudent._id ?? selectedStudent.id ?? selectedIndex}
              student={selectedStudent}
              linkItem={selectedLink}
            />
          </>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-lg">
            {t('parentDashboard.linkedChildIncomplete')}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-10">
          {t('parentDashboard.needHelp')}
        </p>
      </div>
    </div>
  )
}
