import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { Sidebar } from '../components/Sidebar.jsx'
import { getClassById } from '../services/api.js'
import {
  getAttendanceByDate,
  markAttendance,
  setAttendancePublishedForDate,
} from '../services/attendance.service.js'

const STATUS_META = {
  PRESENT: { label: 'PRESENT', emoji: '✅', tone: 'emerald' },
  ABSENT: { label: 'ABSENT', emoji: '❌', tone: 'destructive' },
  LATE: { label: 'LATE', emoji: '⏰', tone: 'amber' },
  EXCUSED: { label: 'EXCUSED', emoji: '📄', tone: 'primary' },
}

function dateInputValue(d = new Date()) {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

export function Attendance() {
  const { user } = useAuth()
  const { classId } = useParams()
  const navigate = useNavigate()

  const isTeacher = user?.role === 'teacher'
  const isParent = user?.role === 'parent'

  const [accessChecked, setAccessChecked] = useState(!isTeacher || !classId)
  const [isMainTeacher, setIsMainTeacher] = useState(true)

  const [dateStr, setDateStr] = useState(dateInputValue())
  const [students, setStudents] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [savingStudentId, setSavingStudentId] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [parentsVisible, setParentsVisible] = useState(false)

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    setError('')
    setActionError('')
    try {
      const data = await getAttendanceByDate(dateStr, isTeacher ? classId : undefined)
      setStudents(Array.isArray(data?.students) ? data.students : [])
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load attendance')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [classId, dateStr, isTeacher])

  useEffect(() => {
    if (!isTeacher || !classId) {
      setAccessChecked(true)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const detail = await getClassById(classId)
        if (cancelled) return
        const allowed = Boolean(detail?.isMainTeacher)
        setIsMainTeacher(allowed)
        if (!allowed) {
          navigate(`/classes/${classId}`, { replace: true })
        }
      } catch {
        if (cancelled) return
        setIsMainTeacher(false)
        navigate(`/classes/${classId}`, { replace: true })
      } finally {
        if (!cancelled) setAccessChecked(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [classId, isTeacher, navigate])

  useEffect(() => {
    if (!accessChecked) return
    // Subject teacher is blocked earlier; prevent extra API calls.
    if (isTeacher && !isMainTeacher) return
    loadAttendance()
  }, [accessChecked, isMainTeacher, isTeacher, loadAttendance])

  useEffect(() => {
    if (!isParent) return
    const t = setInterval(() => {
      loadAttendance()
    }, 5000)
    return () => clearInterval(t)
  }, [isParent, loadAttendance])

  useEffect(() => {
    if (!isTeacher) return
    setParentsVisible(students.some((s) => s?.published === true))
  }, [isTeacher, students])

  const totals = useMemo(() => {
    const res = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 }
    for (const r of students) {
      if (!r?.status) continue
      if (res[r.status] != null) res[r.status] += 1
    }
    return res
  }, [students])

  async function setStudentStatus(studentId, status) {
    if (!isTeacher) return
    if (!studentId) return

    setActionError('')

    const prev = students
    const prevStatus = prev.find((s) => String(s.studentId) === String(studentId))?.status ?? null

    // Optimistic update
    setStudents((prevRows) =>
      prevRows.map((r) =>
        String(r.studentId) === String(studentId)
          ? { ...r, status, published: r.published ?? null }
          : r,
      ),
    )

    setSavingStudentId(String(studentId))
    try {
      const updated = await markAttendance({
        studentId,
        date: dateStr,
        status,
      })

      setStudents((prevRows) =>
        prevRows.map((r) => {
          if (String(r.studentId) !== String(studentId)) return r
          return {
            ...r,
            status: updated?.status ?? status,
            note: updated?.note ?? r.note ?? null,
            published: updated?.published ?? r.published ?? null,
          }
        }),
      )
    } catch (e) {
      // Revert on failure
      setStudents((prevRows) =>
        prevRows.map((r) =>
          String(r.studentId) === String(studentId) ? { ...r, status: prevStatus } : r,
        ),
      )
      setActionError(e?.response?.data?.error || e?.message || 'Save failed')
    } finally {
      setSavingStudentId(null)
    }
  }

  async function toggleParentsVisibility() {
    if (!isTeacher) return
    if (!classId) return
    setActionError('')
    setPublishing(true)
    try {
      const nextVisible = !parentsVisible
      await setAttendancePublishedForDate({
        date: dateStr,
        classId,
        published: nextVisible,
      })
      setParentsVisible(nextVisible)
      await loadAttendance()
    } catch (e) {
      setActionError(e?.response?.data?.error || e?.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  if (isParent && !classId) {
    // In parent mode, classId is not required (API returns linked children automatically).
  }

  if (!isTeacher && !isParent) {
    navigate('/teacher')
    return null
  }

  if (isTeacher && !accessChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const content = (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Calendar className="w-7 h-7 text-primary" />
                Attendance
              </h1>
              <p className="text-muted-foreground mt-1">
                Mark daily attendance for the selected date.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Date</span>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              {isTeacher ? (
                <button
                  type="button"
                  onClick={toggleParentsVisibility}
                  disabled={publishing || loading || !classId}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      {parentsVisible ? 'Unshow to parents' : 'Show to parents'}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-destructive text-sm">
            {actionError}
          </div>
        ) : null}

        <div className="mb-6 rounded-3xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="text-sm text-muted-foreground">
              Totals (marked only) · <span className="text-foreground font-medium">{dateStr}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full px-3 py-1 bg-emerald-500/15 text-emerald-800">
                PRESENT: {totals.PRESENT}
              </span>
              <span className="rounded-full px-3 py-1 bg-destructive/10 text-destructive">
                ABSENT: {totals.ABSENT}
              </span>
              <span className="rounded-full px-3 py-1 bg-amber-500/15 text-amber-800">
                LATE: {totals.LATE}
              </span>
              <span className="rounded-full px-3 py-1 bg-primary/10 text-primary">
                EXCUSED: {totals.EXCUSED}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading attendance…
          </div>
        ) : (
          <div className="grid gap-4">
            {students.map((row) => {
              const studentName = row?.student?.name ?? 'Student'
              const sid = row?.studentId

              const disabled = !isTeacher || savingStudentId != null && String(savingStudentId) !== String(sid)

              return (
                <motion.div
                  key={sid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{studentName}</div>
                      {isTeacher && row?.student?.classId ? (
                        <div className="text-sm text-muted-foreground truncate mt-1">
                          Class: {row.student.classId?.name ?? '—'}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto md:min-w-[420px]">
                      {Object.keys(STATUS_META).map((statusKey) => {
                        const meta = STATUS_META[statusKey]
                        const active = row.status === statusKey
                        const isSavingThis = savingStudentId != null && String(savingStudentId) === String(sid)

                        return (
                          <button
                            key={statusKey}
                            type="button"
                            onClick={() => setStudentStatus(sid, statusKey)}
                            disabled={disabled || isSavingThis && !active}
                            className={`rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                              active
                                ? 'border-primary bg-primary text-white shadow-sm'
                                : `border-border bg-background hover:bg-muted/60 ${
                                    meta.tone === 'emerald'
                                      ? 'text-emerald-700'
                                      : meta.tone === 'destructive'
                                        ? 'text-destructive'
                                        : meta.tone === 'amber'
                                          ? 'text-amber-800'
                                          : 'text-primary'
                                  }`
                            } ${!isTeacher ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <span className="mr-1" aria-hidden>
                              {meta.emoji}
                            </span>
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {row?.note ? (
                    <div className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                      {row.note}
                    </div>
                  ) : null}
                </motion.div>
              )
            })}

            {students.length === 0 ? (
              <div className="rounded-3xl border border-border bg-white p-10 text-center text-muted-foreground">
                Teacher did not mark attendance for this date.
              </div>
            ) : null}
          </div>
        )}
    </div>
  )

  if (isTeacher) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">{content}</div>
      </div>
    )
  }

  return content
}

