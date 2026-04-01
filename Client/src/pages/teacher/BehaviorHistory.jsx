import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../../components/Sidebar.jsx'
import { Calendar, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { getBehaviors, getBehaviorStats } from '../../services/behaviorService.js'

function todayDateParam() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function studentDisplayName(b) {
  if (b.student && typeof b.student === 'object') return b.student.name ?? 'Student'
  return 'Student'
}

function behaviorNote(b) {
  return (b.note ?? b.description ?? '').trim()
}

function normalizeUiType(apiType) {
  const u = String(apiType ?? '').toUpperCase()
  if (u === 'NOTE') return 'active'
  return u.toLowerCase()
}

const FILTER_CONFIG = [
  { type: 'all', key: 'all', icon: '📋', color: 'bg-muted' },
  { type: 'good', key: 'good', icon: '👍', color: 'bg-secondary' },
  { type: 'active', key: 'active', icon: '⭐', color: 'bg-primary' },
  { type: 'sleepy', key: 'sleepy', icon: '😴', color: 'bg-[#F59E0B]' },
  { type: 'bad', key: 'bad', icon: '👎', color: 'bg-destructive' },
]

function getBehaviorStyle(uiType) {
  switch (uiType) {
    case 'good':
      return { bg: 'bg-secondary/10', text: 'text-secondary', icon: '👍' }
    case 'bad':
      return { bg: 'bg-destructive/10', text: 'text-destructive', icon: '👎' }
    case 'sleepy':
      return { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', icon: '😴' }
    case 'active':
      return { bg: 'bg-primary/10', text: 'text-primary', icon: '⭐' }
    default:
      return { bg: 'bg-muted', text: 'text-foreground', icon: '📋' }
  }
}

function avatarForName(name) {
  const n = (name || '').toLowerCase()
  return n.charCodeAt(0) % 2 === 0 ? '👧' : '👦'
}

export function BehaviorHistory({ embedded = false }) {
  const { t, i18n } = useTranslation()
  const [filterType, setFilterType] = useState('all')
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({ good: 0, bad: 0, active: 0, sleepy: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dateStr = useMemo(() => todayDateParam(), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const listParams = { date: dateStr }
      if (filterType !== 'all') {
        listParams.type = filterType.toUpperCase()
      }
      const [list, statRow] = await Promise.all([
        getBehaviors(listParams),
        getBehaviorStats({ date: dateStr }),
      ])
      setRecords(Array.isArray(list) ? list : [])
      setStats({
        good: statRow.good ?? 0,
        bad: statRow.bad ?? 0,
        active: statRow.active ?? 0,
        sleepy: statRow.sleepy ?? 0,
      })
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('teacherBehaviorHistory.loadFailed'))
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [dateStr, filterType])

  useEffect(() => {
    load()
  }, [load])

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records
    return records.filter((r) => normalizeUiType(r.type) === filterType)
  }, [records, filterType])

  const statCards = FILTER_CONFIG.slice(1)

  const content = (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {!embedded && (
        <div className="mb-8">
          <h1 className="mb-2">{t('teacherBehaviorHistory.title')}</h1>
          <p className="text-[1.125rem] text-muted-foreground">
            {t('teacherBehaviorHistory.subtitle', { date: dateStr })}
          </p>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={load}
            className="text-sm underline shrink-0"
          >
            {t('common.tryAgain')}
          </button>
        </div>
      ) : null}

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-border mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3>{t('teacherBehaviorHistory.filterByType')}</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {FILTER_CONFIG.map((behavior) => (
            <button
              key={behavior.type}
              type="button"
              onClick={() => setFilterType(behavior.type)}
              className={`px-6 py-3 rounded-2xl transition-all ${
                filterType === behavior.type
                  ? `${behavior.color} text-white shadow-lg`
                  : 'bg-muted text-foreground hover:bg-muted/70'
              }`}
            >
              <span className="text-[1.25rem] mr-2">{behavior.icon}</span>
              {t(`teacherBehaviorHistory.types.${behavior.key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <p className="col-span-full text-center text-muted-foreground py-8">
            {t('teacherBehaviorHistory.loadingStats')}
          </p>
        ) : (
          statCards.map((behavior, index) => {
            const key = behavior.type
            const count =
              key === 'good'
                ? stats.good
                : key === 'bad'
                  ? stats.bad
                  : key === 'active'
                    ? stats.active
                    : stats.sleepy
            return (
              <motion.div
                key={behavior.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-border"
              >
                <div className="text-[2rem] mb-2">{behavior.icon}</div>
                <h3 className="text-[2rem] mb-1">{count}</h3>
                <p className="text-[0.9375rem] text-muted-foreground">{t(`teacherBehaviorHistory.types.${behavior.key}`)}</p>
              </motion.div>
            )
          })
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h3>{t('teacherBehaviorHistory.todayRecords')}</h3>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">{t('teacherBehaviorHistory.loadingRecords')}</p>
        ) : (
          <>
            <div className="space-y-4">
              {filteredRecords.map((record, index) => {
                const uiType = normalizeUiType(record.type)
                const style = getBehaviorStyle(uiType)
                const name = studentDisplayName(record)
                const ts = record.createdAt
                  ? new Date(record.createdAt)
                  : record.date
                    ? new Date(record.date)
                    : new Date()
                const timeLabel = ts.toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
                const label =
                  uiType === 'good'
                    ? t('teacherBehaviorHistory.types.good')
                    : uiType === 'bad'
                      ? t('teacherBehaviorHistory.types.bad')
                      : uiType === 'sleepy'
                        ? t('teacherBehaviorHistory.types.sleepy')
                        : uiType === 'active'
                          ? t('teacherBehaviorHistory.types.active')
                          : String(record.type ?? '—')

                return (
                  <motion.div
                    key={record._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4 p-5 rounded-2xl hover:bg-accent transition-all border border-transparent hover:border-primary/20"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center text-[1.5rem]`}
                      >
                        {style.icon}
                      </div>
                      {index < filteredRecords.length - 1 ? (
                        <div className="w-0.5 h-12 bg-border mt-2" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[1.5rem] shrink-0">
                            {avatarForName(name)}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-[1rem] truncate">{name}</h4>
                            <p className="text-[0.875rem] text-muted-foreground">
                              {timeLabel}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-4 py-2 rounded-full text-[0.875rem] shrink-0 ${style.bg} ${style.text}`}
                        >
                          {label}
                        </div>
                      </div>
                      {behaviorNote(record) ? (
                        <p className="text-[0.9375rem] text-muted-foreground pl-11">
                          {behaviorNote(record)}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-[4rem] mb-4">📭</div>
                <p className="text-[1.125rem] text-muted-foreground">
                  {t('teacherBehaviorHistory.noRecordsForFilter')}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )

  if (embedded) return content

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">{content}</div>
    </div>
  )
}
