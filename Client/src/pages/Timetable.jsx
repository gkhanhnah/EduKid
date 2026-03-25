import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getTimetable, saveTimetable } from '../services/timetable.service.js'
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function sortByStart(a, b) {
  return (a.startTime || '').localeCompare(b.startTime || '')
}

function mapScheduleByDay(schedule) {
  const map = Object.fromEntries(DAYS.map((d) => [d, []]))
  for (const row of schedule || []) {
    if (!row?.day || !DAYS.includes(row.day)) continue
    map[row.day] = Array.isArray(row.periods) ? [...row.periods].sort(sortByStart) : []
  }
  return map
}

function formatTeacherName(value) {
  if (!value) return '—'
  if (typeof value === 'string') return value
  return value.name || value.email || 'Teacher'
}

export function Timetable() {
  const { classId } = useParams()
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const isParent = user?.role === 'parent'
  const backHref = isParent ? '/parent-dashboard' : `/classes/${classId}`
  const userId = user?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [detail, setDetail] = useState(null)
  const [scheduleByDay, setScheduleByDay] = useState(() => mapScheduleByDay([]))
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getTimetable(classId)
      setDetail(data)
      setScheduleByDay(mapScheduleByDay(data?.schedule || []))
      const mainTeacherId =
        data?.class?.teacherId?._id ?? data?.class?.teacherId ?? null
      const isMainTeacher =
        Boolean(isTeacher && userId && mainTeacherId && String(mainTeacherId) === String(userId))
      setEditing(Boolean(isMainTeacher && (!data?.schedule || data.schedule.length === 0)))
    } catch (e) {
      setDetail(null)
      setError(e?.response?.data?.error || e?.message || 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [classId, isTeacher, userId])

  useEffect(() => {
    load()
  }, [load])

  const teachers = useMemo(() => {
    if (!detail?.class) return []
    const list = [detail.class.teacherId, ...(detail.class.subjectTeachers || [])].filter(Boolean)
    const byId = new Map()
    for (const t of list) {
      const id = typeof t === 'object' ? t._id : t
      if (!id || byId.has(String(id))) continue
      byId.set(String(id), {
        _id: String(id),
        name: typeof t === 'object' ? t.name : String(t),
        email: typeof t === 'object' ? t.email : undefined,
      })
    }
    return [...byId.values()]
  }, [detail])

  const canEdit = useMemo(() => {
    if (!detail?.class?.teacherId) return false
    if (!isTeacher || !userId) return false
    const mainTeacherId = detail.class.teacherId?._id ?? detail.class.teacherId
    return Boolean(mainTeacherId && String(mainTeacherId) === String(userId))
  }, [detail, isTeacher, userId])

  const maxPeriods = useMemo(() => {
    return Math.max(
      1,
      ...DAYS.map((day) => (Array.isArray(scheduleByDay[day]) ? scheduleByDay[day].length : 0)),
    )
  }, [scheduleByDay])
  // In edit mode, always render one extra column so each day can add more periods.
  const displayColumns = editing && canEdit ? maxPeriods + 1 : maxPeriods

  function setDayPeriods(day, periods) {
    setScheduleByDay((prev) => ({ ...prev, [day]: [...periods].sort(sortByStart) }))
  }

  function handleAddPeriod(day) {
    const fallbackTeacherId = teachers[0]?._id || ''
    const next = [
      ...(scheduleByDay[day] || []),
      { subject: '', teacher: fallbackTeacherId, startTime: '08:00', endTime: '08:45' },
    ]
    setDayPeriods(day, next)
  }

  function handleChangePeriod(day, idx, field, value) {
    const next = [...(scheduleByDay[day] || [])]
    next[idx] = { ...next[idx], [field]: value }
    setDayPeriods(day, next)
  }

  function handleDeletePeriod(day, idx) {
    const next = [...(scheduleByDay[day] || [])]
    next.splice(idx, 1)
    setDayPeriods(day, next)
  }

  async function handleSave() {
    if (!canEdit) return
    setFormError('')
    setSaving(true)
    try {
      const schedule = DAYS.map((day) => ({
        day,
        periods: (scheduleByDay[day] || []).map((p) => ({
          subject: p.subject?.trim?.() || '',
          teacher: typeof p.teacher === 'object' ? p.teacher._id : p.teacher,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      })).filter((r) => r.periods.length > 0)

      const saved = await saveTimetable({ classId, schedule })
      setDetail(saved)
      setScheduleByDay(mapScheduleByDay(saved?.schedule || []))
      setEditing(false)
    } catch (e) {
      setFormError(e?.response?.data?.error || e?.message || 'Could not save timetable')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {isParent ? 'Back to dashboard' : 'Back to class'}
          </Link>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading timetable…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
              <p>{error}</p>
              <button type="button" onClick={load} className="mt-3 underline text-sm">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold">Class Timetable</h1>
                  <p className="text-muted-foreground mt-1">
                    {detail?.class?.name || 'Class'}
                    {detail?.class?.grade !== undefined &&
                    detail?.class?.grade !== null &&
                    detail?.class?.grade !== ''
                      ? ` · Grade ${detail.class.grade}`
                      : ''}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    {!editing ? (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 rounded-xl border border-border text-sm"
                      >
                        {detail?.schedule?.length ? 'Edit Timetable' : 'Create Timetable'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleByDay(mapScheduleByDay(detail?.schedule || []))
                            setEditing(false)
                            setFormError('')
                          }}
                          className="px-4 py-2 rounded-xl border border-border text-sm"
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {!detail?.schedule?.length && !editing ? (
                <div className="rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">
                  No timetable yet
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-4 font-medium w-40">Day</th>
                        {Array.from({ length: displayColumns }).map((_, i) => (
                          <th key={i} className="text-left p-4 font-medium min-w-[260px]">
                            Period {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day) => (
                        <tr key={day} className="border-t border-border align-top">
                          <td className="p-4 font-medium">{day}</td>
                          {Array.from({ length: displayColumns }).map((_, periodIdx) => {
                            const period = scheduleByDay[day]?.[periodIdx]
                            return (
                              <td key={`${day}-${periodIdx}`} className="p-4 border-l border-border">
                                {!period ? (
                                  editing && canEdit ? (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 text-primary hover:underline"
                                      onClick={() => handleAddPeriod(day)}
                                    >
                                      <Plus className="w-4 h-4" />
                                      Add Period
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )
                                ) : editing && canEdit ? (
                                  <div className="space-y-2">
                                    <input
                                      value={period.subject || ''}
                                      onChange={(e) =>
                                        handleChangePeriod(day, periodIdx, 'subject', e.target.value)
                                      }
                                      placeholder="Subject"
                                      className="w-full px-3 py-2 border border-border rounded-lg"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="time"
                                        value={period.startTime || ''}
                                        onChange={(e) =>
                                          handleChangePeriod(day, periodIdx, 'startTime', e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-lg"
                                      />
                                      <input
                                        type="time"
                                        value={period.endTime || ''}
                                        onChange={(e) =>
                                          handleChangePeriod(day, periodIdx, 'endTime', e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-lg"
                                      />
                                    </div>
                                    <select
                                      value={
                                        typeof period.teacher === 'object'
                                          ? period.teacher._id
                                          : period.teacher || ''
                                      }
                                      onChange={(e) =>
                                        handleChangePeriod(day, periodIdx, 'teacher', e.target.value)
                                      }
                                      className="w-full px-3 py-2 border border-border rounded-lg bg-white"
                                    >
                                      <option value="">Choose teacher</option>
                                      {teachers.map((t) => (
                                        <option key={t._id} value={t._id}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePeriod(day, periodIdx)}
                                      className="inline-flex items-center gap-1 text-destructive hover:underline text-xs"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                                    <p className="font-medium">{period.subject}</p>
                                    <p className="text-muted-foreground text-xs mt-1">
                                      {period.startTime} - {period.endTime}
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-1">
                                      {formatTeacherName(period.teacher)}
                                    </p>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {formError ? (
                <p className="mt-4 text-sm text-destructive">{formError}</p>
              ) : null}

              {isParent ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  View-only mode for parent accounts.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
