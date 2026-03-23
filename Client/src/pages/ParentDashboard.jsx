import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  MessageCircle,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useBehaviors } from '../hooks/useBehaviors.js'
import { useEvaluations } from '../hooks/useEvaluations.js'
import { fetchParentDashboard } from '../services/dashboardService.js'

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
  if (total === 0) return 'No reports today'
  if (bad > good && bad > 0) return 'Needs attention'
  if (bad > 0 && good >= bad) return 'Good overall'
  if (good >= 4 || (good >= 2 && bad === 0)) return 'Excellent'
  if (good > 0 || active > 0) return 'Good'
  return 'Keep in touch'
}

function achievementsLabel(evaluations) {
  if (!evaluations.length) return '—'
  const n = Math.min(5, evaluations.length)
  return n === 1 ? '1 Star' : `${n} Stars`
}

function behaviorText(b) {
  return (b.note ?? b.description ?? '').trim()
}

function latestTeacherNote(behaviors, childName) {
  const withText = [...behaviors]
    .filter((b) => behaviorText(b))
    .sort((a, b) => behaviorTimestamp(b) - behaviorTimestamp(a))
  if (withText.length) return behaviorText(withText[0])
  return `${childName} is doing well. Teachers will add notes here when they log behavior or observations.`
}

function activitiesFromTodayBehaviors(behaviors) {
  const start = startOfLocalDay()
  return [...behaviors]
    .filter((b) => isSameLocalDay(behaviorTimestamp(b), start))
    .sort((a, b) => behaviorTimestamp(b) - behaviorTimestamp(a))
    .map((b) => {
      const type = (b.behaviorType ?? b.type ?? '').toString().toUpperCase()
      const t = behaviorTimestamp(b)
      const timeStr = t.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
      let icon = '📝'
      let color = 'bg-primary'
      let activity = behaviorText(b) || type
      if (type === 'GOOD') {
        icon = '👍'
        color = 'bg-secondary'
        activity = behaviorText(b) || 'Good behavior noted'
      } else if (type === 'BAD') {
        icon = '👎'
        color = 'bg-destructive'
        activity = behaviorText(b) || 'Needs attention'
      } else if (type === 'ACTIVE' || type === 'NOTE') {
        icon = '⭐'
        color = 'bg-primary'
        activity = behaviorText(b) || 'Active participation'
      } else if (type === 'SLEEPY') {
        icon = '😴'
        color = 'bg-[#F59E0B]/30'
        activity = behaviorText(b) || 'Tired / low energy'
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
      <p className="text-sm text-muted-foreground py-2">Loading evaluations…</p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>
  }
  if (!evaluations.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">No evaluations yet.</p>
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
                {ev.period || 'Period —'}
              </span>
              <span>
                {ev.createdAt
                  ? new Date(ev.createdAt).toLocaleDateString()
                  : '—'}
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
                Teacher: {ev.teacherId.name}
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
        Loading behavior history…
      </p>
    )
  }
  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>
  }
  if (!behaviors.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No behavior records yet.
      </p>
    )
  }
  return (
    <ul className="mt-4 space-y-2">
      {behaviors.slice(0, 20).map((b) => {
        const type = b.behaviorType ?? b.type ?? '—'
        const when = b.date
          ? new Date(b.date).toLocaleDateString()
          : new Date(b.createdAt).toLocaleDateString()
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
                title={`Active: ${day.active}`}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${goodH}px` }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-secondary rounded-b-xl w-full min-h-0"
                title={`Good: ${day.good}`}
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
  const sid = student._id ?? student.id
  const childName = student.name || 'Your child'

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
      label: 'Good Behavior',
      count: stats.good,
      color: 'text-secondary',
    },
    {
      type: 'active',
      icon: '⭐',
      label: 'Active',
      count: stats.active,
      color: 'text-primary',
    },
    {
      type: 'sleepy',
      icon: '😴',
      label: 'Tired',
      count: stats.tired,
      color: 'text-[#F59E0B]',
    },
    {
      type: 'bad',
      icon: '👎',
      label: 'Needs Attention',
      count: stats.bad,
      color: 'text-destructive',
    },
  ]

  const dataLoading = behLoading || evLoading

  return (
    <>
      {linkItem?.relationship ? (
        <p className="text-sm text-muted-foreground mb-6">
          Relationship:{' '}
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
            <h2 className="text-lg font-semibold">Today&apos;s Summary</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-secondary" />
                <span className="text-[0.9375rem]">Overall Behavior</span>
              </div>
              <span className="text-[1.125rem] text-secondary font-medium">
                {dataLoading ? '…' : overall}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-[0.9375rem]">Achievements</span>
              </div>
              <span className="text-[1.125rem] text-primary font-medium">
                {evLoading ? '…' : achievements}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-accent">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-[0.9375rem]">Class</span>
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
                    View timetable
                  </Link>
                ) : null}
                {sid ? (
                  <Link
                    to={`/students/${sid}/grades`}
                    className="ml-3 text-xs text-primary hover:underline inline-block"
                  >
                    View grades
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <h4 className="mb-3 font-medium">Teacher&apos;s Note</h4>
            <p className="text-[0.9375rem] text-muted-foreground p-4 bg-[#FEF3C7] rounded-2xl">
              {dataLoading ? 'Loading…' : `“${note}”`}
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
            <h2 className="text-lg font-semibold">Weekly Progress</h2>
          </div>

          {dataLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Loading chart…
            </div>
          ) : (
            <WeeklyBars weeklyProgress={weeklyProgress} />
          )}

          <div className="flex items-center justify-center gap-6 text-[0.875rem]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Active (notes)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-secondary" />
              <span>Good Behavior</span>
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
          <h2 className="text-lg font-semibold">Today&apos;s Activities</h2>
        </div>

        {dataLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No behavior entries for today yet. When teachers log activities, they
            will show up here.
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
            <h3 className="text-[1.5rem] mb-2 font-semibold">Message Teacher</h3>
            <p className="text-[1rem] opacity-90">
              Have questions? Send a message to your child&apos;s teacher.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-[0.9375rem]">
              View Messages
              <span aria-hidden>→</span>
            </div>
          </div>
        </Link>

        <div className="bg-gradient-to-br from-secondary to-[#22C55E]/70 text-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full">
          <Award className="w-12 h-12 mb-4" />
          <h3 className="text-[1.5rem] mb-2 font-semibold">Teacher evaluations</h3>
          <p className="text-[1rem] opacity-90">
            Scores and comments from recent terms are listed below for{' '}
            {childName}.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-[0.9375rem]">
            See details below
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
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Full evaluation history
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
            Full behavior history
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

function ParentDashboardOverview({ summary, evaluations, recent }) {
  const hasSummary = summary?.length > 0
  const hasEval = evaluations?.length > 0
  const hasRecent = recent?.length > 0
  if (!hasSummary && !hasEval && !hasRecent) {
    return (
      <div className="mb-8 rounded-3xl border border-dashed border-border bg-white/90 p-6 text-sm text-muted-foreground shadow-sm">
        When teachers add behaviors and evaluations, a summary for all your children
        will show here.
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
            className="bg-white rounded-3xl p-6 shadow-lg border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-secondary" />
              <h3 className="font-semibold text-lg">Behavior summary by child</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Totals from all logged behaviors (good, active, sleepy, needs attention).
            </p>
            <div className="space-y-3">
              {summary.map((s) => (
                <div
                  key={s.studentId}
                  className="rounded-2xl bg-muted/40 border border-border/60 px-4 py-3"
                >
                  <p className="font-medium text-foreground">{s.studentName}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="text-secondary font-medium tabular-nums">
                      👍 Good · {s.good ?? 0}
                    </span>
                    <span className="text-primary font-medium tabular-nums">
                      ⭐ Active · {s.active ?? s.notes ?? 0}
                    </span>
                    <span className="text-[#F59E0B] font-medium tabular-nums">
                      😴 Sleepy · {s.sleepy ?? 0}
                    </span>
                    <span className="text-destructive font-medium tabular-nums">
                      👎 Attention · {s.bad ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {hasEval ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Latest evaluations</h3>
            </div>
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {evaluations.slice(0, 8).map((ev) => {
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
          </motion.div>
        ) : null}
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
            <h3 className="font-semibold text-lg">Recent activity (all children)</h3>
          </div>
          <ul className="space-y-2 divide-y divide-border/60">
            {recent.slice(0, 10).map((b) => (
              <li key={b._id} className="pt-2 first:pt-0 text-sm flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-medium text-primary">
                  {b.behaviorType ?? b.type}
                </span>
                <span className="text-muted-foreground">{b.student?.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {b.createdAt
                    ? new Date(b.createdAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : ''}
                </span>
                {behaviorText(b) ? (
                  <span className="w-full text-foreground">{behaviorText(b)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </div>
  )
}

function ParentDashboardContent() {
  const { user, logout } = useAuth()
  const [children, setChildren] = useState([])
  const [overview, setOverview] = useState({
    behaviorSummaryByChild: [],
    latestEvaluations: [],
    recentBehaviors: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchParentDashboard()
      const list = Array.isArray(data.children) ? data.children : []
      setChildren(list)
      setOverview({
        behaviorSummaryByChild: data.behaviorSummaryByChild || [],
        latestEvaluations: data.latestEvaluations || [],
        recentBehaviors: data.recentBehaviors || [],
      })
      setSelectedIndex(0)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load your children.')
      setChildren([])
      setOverview({
        behaviorSummaryByChild: [],
        latestEvaluations: [],
        recentBehaviors: [],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selectedLink =
    children.length > 0 ? children[Math.min(selectedIndex, children.length - 1)] : null
  const selectedStudent = selectedLink?.student
  const displayName = selectedStudent?.name || 'your child'

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-all text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Login
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-white/80 hover:text-white underline-offset-4 hover:underline"
            >
              Log out ({user?.name || user?.email || 'parent'})
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-[2rem] font-bold mb-2">Parent Dashboard</h1>
              <p className="text-[1.125rem] opacity-90">
                Welcome back! Here&apos;s how {displayName} is doing
              </p>
              {children.length > 1 ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {children.map((item, i) => {
                    const name = item.student?.name || `Child ${i + 1}`
                    const active = i === Math.min(selectedIndex, children.length - 1)
                    return (
                      <button
                        key={item.linkId || item.student?._id || i}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'bg-white text-primary shadow-md'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              ) : null}
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
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-destructive flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="text-sm underline shrink-0"
            >
              Try again
            </button>
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-12 text-center shadow-lg">
            <p className="text-muted-foreground mb-2">No children linked yet.</p>
            <p className="text-sm text-muted-foreground">
              Your teacher will connect your account to your child&apos;s profile. If
              you just registered, ask the teacher to use your email (
              <span className="font-medium text-foreground">{user?.email}</span>)
              when linking.
            </p>
          </div>
        ) : selectedStudent ? (
          <>
            <div className="rounded-3xl border border-border bg-white p-6 shadow-lg mb-8">
              <h3 className="font-semibold text-lg mb-4">Timetable by child</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {children.map((item, idx) => {
                  const student = item.student
                  const childName = student?.name || `Child ${idx + 1}`
                  const clsName = classLabel(student)
                  const clsId = classIdValue(student)
                  return (
                    <div
                      key={item.linkId || student?._id || idx}
                      className="rounded-2xl border border-border p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{childName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Class: {clsName}
                        </p>
                      </div>
                      {clsId ? (
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Link
                            to={`/classes/${clsId}/timetable`}
                            className="text-sm text-primary hover:underline"
                          >
                            View timetable
                          </Link>
                          <Link
                            to={`/classes/${clsId}/chat`}
                            className="text-sm text-primary hover:underline"
                          >
                            View chat
                          </Link>
                        </div>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          No class
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <ParentDashboardOverview
              summary={overview.behaviorSummaryByChild}
              evaluations={overview.latestEvaluations}
              recent={overview.recentBehaviors}
            />
            <ChildDashboardPanels
              key={selectedStudent._id ?? selectedStudent.id ?? selectedIndex}
              student={selectedStudent}
              linkItem={selectedLink}
            />
          </>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground shadow-lg">
            Linked child record is incomplete. Please contact support.
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-10">
          Need help? Contact your child&apos;s teacher.
        </p>
      </div>
    </div>
  )
}

export function ParentDashboard() {
  const { user } = useAuth()
  if (user?.role && user.role !== 'parent') {
    return <Navigate to="/teacher" replace />
  }
  return <ParentDashboardContent />
}
