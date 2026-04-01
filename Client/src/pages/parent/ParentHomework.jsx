import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Calendar, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getHomeworksForParent } from '../../services/homework.service.js'
import { useParentChild } from '../../context/ParentChildContext.jsx'
import { formatDateTime } from '../../utils/locale.js'

function formatDue(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return formatDateTime(d, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusLabel(displayStatus, t) {
  if (displayStatus === 'DONE') return { text: t('parentHomework.done'), className: 'bg-emerald-500/15 text-emerald-700' }
  if (displayStatus === 'OVERDUE')
    return { text: t('parentHomework.overdue'), className: 'bg-destructive/15 text-destructive' }
  return { text: t('parentHomework.pending'), className: 'bg-amber-500/15 text-amber-800' }
}

export function ParentHomework() {
  const { t } = useTranslation()
  const { selectedStudentId, selectedStudent, linkedChildren } = useParentChild()
  const [homeworks, setHomeworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const visibleHomeworks = useMemo(() => {
    if (!selectedStudentId) return homeworks
    return homeworks.filter((hw) => {
      const ids = (hw.studentIds || []).map((s) => String(s._id ?? s))
      return ids.includes(selectedStudentId)
    })
  }, [homeworks, selectedStudentId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getHomeworksForParent()
        if (!cancelled) setHomeworks(Array.isArray(data.homeworks) ? data.homeworks : [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.error || e?.message || t('parentHomework.loadFailed'))
          setHomeworks([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-full bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <BookOpen className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('common.homework')}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {linkedChildren.length > 1 && selectedStudent
                  ? t('parentHomework.assignmentsForSelectedChild', { name: selectedStudent.name || t('parentHomework.selectedChild') })
                  : t('parentHomework.assignmentsForLinkedChildren')}
                {t('parentHomework.emailReminderHint')}
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-16 text-muted-foreground shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>{t('parentHomework.loadingAssignments')}</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
            {error}
          </div>
        ) : visibleHomeworks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground shadow-sm">
            <p>
              {homeworks.length > 0 && linkedChildren.length > 1
                ? t('parentHomework.noHomeworkForSelectedChild')
                : t('parentHomework.noHomeworkForChildren')}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleHomeworks.map((hw) => {
              const cls =
                hw.classId && typeof hw.classId === 'object'
                  ? hw.classId
                  : null
              const className = cls?.name ?? t('parentHomework.classFallback')
              const kids =
                Array.isArray(hw.myChildrenNames) && hw.myChildrenNames.length
                  ? hw.myChildrenNames.join(', ')
                  : t('common.yourChild')
              const st = statusLabel(hw.displayStatus, t)
              return (
                <li
                  key={hw._id}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-foreground">{hw.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {className} · {kids}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${st.className}`}
                    >
                      {st.text}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                      {t('parentHomework.due')} {formatDue(hw.dueDate)}
                    </span>
                  </div>
                  {hw.description?.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                      {hw.description.trim()}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
