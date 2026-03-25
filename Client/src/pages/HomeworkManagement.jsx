import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Plus } from 'lucide-react'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { LoadingState } from '../components/LoadingState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { getClassById, getStudents } from '../services/api.js'
import { createHomework, getHomeworks, gradeHomework } from '../services/homework.service.js'
import { getSubjects } from '../services/grade.service.js'

function formatDue(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      <div className="relative w-full sm:max-w-lg bg-background border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-xl hover:bg-accent border border-border"
          >
            Close
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export function HomeworkManagement() {
  const { user } = useAuth()
  const { classId } = useParams()

  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState('')

  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [homeworks, setHomeworks] = useState([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const [classDetail, setClassDetail] = useState(null)
  const [classDetailLoading, setClassDetailLoading] = useState(true)
  const [classDetailError, setClassDetailError] = useState('')
  const canManageHomework = !classDetailLoading && !classDetailError && Boolean(classDetail?.isMainTeacher)

  // Homework grading (HOMEWORK -> Grades -> Evaluations)
  const [subjects, setSubjects] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState('')

  const [gradeModalOpen, setGradeModalOpen] = useState(false)
  const [gradingHomework, setGradingHomework] = useState(null)
  const [gradeBusy, setGradeBusy] = useState(false)
  const [gradeError, setGradeError] = useState('')
  const [gradeForm, setGradeForm] = useState({
    isGraded: false,
    subjectId: '',
    gradeComponent: '',
    maxScore: '',
    scores: {},
  })

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    setStudentsError('')
    try {
      const data = await getStudents({ classId })
      setStudents(Array.isArray(data) ? data : [])
    } catch (e) {
      setStudentsError(e?.response?.data?.error || e?.message || 'Could not load students')
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [classId])

  const loadHomeworks = useCallback(async () => {
    setListLoading(true)
    setListError('')
    try {
      const data = await getHomeworks(classId)
      setHomeworks(Array.isArray(data?.homeworks) ? data.homeworks : [])
    } catch (e) {
      setListError(e?.response?.data?.error || e?.message || 'Could not load homework')
      setHomeworks([])
    } finally {
      setListLoading(false)
    }
  }, [classId])

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true)
    setSubjectsError('')
    try {
      const d = await getSubjects(classId)
      setSubjects(Array.isArray(d?.subjects) ? d.subjects : [])
    } catch (e) {
      setSubjectsError(e?.response?.data?.error || e?.message || 'Could not load subjects')
      setSubjects([])
    } finally {
      setSubjectsLoading(false)
    }
  }, [classId])

  const openGradeModal = useCallback(
    (hw) => {
      if (!canManageHomework) return
      setGradeError('')
      setGradingHomework(hw)
      setGradeModalOpen(true)
      setGradeBusy(false)
      setGradeForm({
        isGraded: Boolean(hw?.isGraded),
        subjectId: hw?.subjectId ? String(hw.subjectId) : '',
        gradeComponent: hw?.gradeComponent ? String(hw.gradeComponent) : '',
        maxScore: hw?.maxScore != null ? String(hw.maxScore) : '',
        scores: {},
      })

      // Only fetch subjects if needed.
      if (!subjects.length && !subjectsLoading) loadSubjects()
    },
    [canManageHomework, loadSubjects, subjects.length, subjectsLoading],
  )

  const activeSubject = useMemo(() => {
    if (!gradeForm.subjectId) return null
    return subjects.find((s) => String(s._id) === String(gradeForm.subjectId)) || null
  }, [gradeForm.subjectId, subjects])

  const componentsForActiveSubject = activeSubject?.components ?? []

  async function handleGradeSubmit(e) {
    e.preventDefault()
    if (!gradingHomework) return
    setGradeError('')
    setGradeBusy(true)
    try {
      const hwId = String(gradingHomework._id)

      if (!gradeForm.isGraded) {
        await gradeHomework(hwId, { isGraded: false })
        setGradeModalOpen(false)
        setGradingHomework(null)
        await loadHomeworks()
        return
      }

      if (!gradeForm.subjectId) throw new Error('Subject is required.')
      if (!gradeForm.gradeComponent) throw new Error('Grade component is required.')

      const maxScoreNumber = Number(gradeForm.maxScore)
      if (!Number.isFinite(maxScoreNumber) || maxScoreNumber <= 0) {
        throw new Error('maxScore must be a valid number > 0.')
      }

      const studentIds = (gradingHomework.studentIds ?? []).map((s) => String(s._id ?? s))
      if (!studentIds.length) throw new Error('No students found on this homework.')

      // Require every student to have a score
      const scoresPayload = {}
      for (const sid of studentIds) {
        const raw = gradeForm.scores[sid]
        const n = raw === '' || raw == null ? NaN : Number(raw)
        if (!Number.isFinite(n)) {
          throw new Error(`Please enter a valid score for student ${sid}.`)
        }
        scoresPayload[sid] = n
      }

      await gradeHomework(hwId, {
        isGraded: true,
        subjectId: gradeForm.subjectId,
        gradeComponent: gradeForm.gradeComponent,
        maxScore: maxScoreNumber,
        scores: scoresPayload,
      })

      setGradeModalOpen(false)
      setGradingHomework(null)
      await loadHomeworks()
    } catch (err) {
      setGradeError(err?.response?.data?.error || err?.message || 'Could not save grading')
    } finally {
      setGradeBusy(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    loadHomeworks()
  }, [loadHomeworks])

  useEffect(() => {
    if (!classId) return
    let cancelled = false
    async function loadClass() {
      setClassDetailLoading(true)
      setClassDetailError('')
      try {
        const d = await getClassById(classId)
        if (cancelled) return
        setClassDetail(d ?? null)
      } catch (e) {
        if (cancelled) return
        setClassDetailError(e?.response?.data?.error || e?.message || 'Could not load class')
        setClassDetail(null)
      } finally {
        if (!cancelled) setClassDetailLoading(false)
      }
    }
    loadClass()
    return () => {
      cancelled = true
    }
  }, [classId])

  const toggleStudent = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(students.map((s) => String(s._id))))
  }, [students])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const t = title.trim()
    if (!t) {
      setFormError('Title is required.')
      return
    }
    if (!dueDate) {
      setFormError('Due date is required.')
      return
    }
    const chosen = [...selectedIds]
    if (chosen.length === 0) {
      setFormError('Select at least one student.')
      return
    }

    setSubmitBusy(true)
    try {
      await createHomework({
        title: t,
        description: description.trim(),
        dueDate: new Date(dueDate).toISOString(),
        studentIds: chosen,
        classId,
        attachments: [],
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      setSelectedIds(new Set())
      setFormOpen(false)
      await loadHomeworks()
    } catch (err) {
      setFormError(err?.response?.data?.error || err?.message || 'Could not create homework')
    } finally {
      setSubmitBusy(false)
    }
  }

  const minDueInput = useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }, [])

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to="/parent-dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              to={`/classes/${classId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to class
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="w-8 h-8 text-primary" />
                  Homework
                </h1>
                <p className="text-muted-foreground mt-1">
                  Assign work and remind parents automatically before the deadline.
                </p>
              </div>
              {canManageHomework ? (
                <button
                  type="button"
                  // Thêm whitespace-nowrap, inline-flex và items-center vào đây:
                  className="btn btn-primary shrink-0 inline-flex items-center whitespace-nowrap"
                  onClick={() => {
                    setFormError('')
                    setFormOpen((v) => !v)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> {formOpen ? 'Close form' : 'New homework'}
                </button>
              ) : null}
            </div>
          </div>

          {canManageHomework && formOpen ? (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm mb-8 space-y-4"
            >
              <h2 className="font-semibold text-lg">Create homework</h2>
              <label className="field">
                <span>Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                  placeholder="e.g. Math worksheet chapter 3"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] rounded-xl border border-border p-3"
                  placeholder="Instructions for students and parents…"
                />
              </label>
              <label className="field">
                <span>Due date</span>
                <input
                  type="datetime-local"
                  value={dueDate}
                  min={minDueInput}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full"
                />
              </label>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium">Students</span>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs text-primary hover:underline" onClick={selectAll}>
                      Select all
                    </button>
                    <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={clearSelection}>
                      Clear
                    </button>
                  </div>
                </div>
                {studentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading students…</p>
                ) : studentsError ? (
                  <ErrorBanner message={studentsError} onRetry={loadStudents} />
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students in this class.</p>
                ) : (
                  <ul className="max-h-48 overflow-auto rounded-xl border border-border divide-y divide-border">
                    {students.map((s) => {
                      const id = String(s._id)
                      const checked = selectedIds.has(id)
                      return (
                        <li key={id}>
                          <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/40">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStudent(id)}
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

              <button type="submit" className="btn btn-primary" disabled={submitBusy || studentsLoading}>
                {submitBusy ? 'Saving…' : 'Create homework'}
              </button>
            </form>
          ) : null}

          <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Assignments</h2>
            {listLoading ? (
              <LoadingState label="Loading homework…" />
            ) : listError ? (
              <ErrorBanner message={listError} onRetry={loadHomeworks} />
            ) : homeworks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No homework yet.</p>
            ) : (
              <ul className="space-y-3">
                {homeworks.map((h) => {
                  const st = h.displayStatus || 'PENDING'
                  const badgeClass =
                    st === 'DONE'
                      ? 'bg-secondary/20 text-secondary'
                      : st === 'OVERDUE'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                  return (
                    <li
                      key={h._id}
                      className="rounded-2xl border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{h.title}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          Due {formatDue(h.dueDate)}
                        </div>
                        {h.studentIds?.length ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {h.studentIds.map((s) => s.name || s).join(', ')}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-lg ${badgeClass}`}
                        >
                          {st}
                        </span>
                        {canManageHomework ? (
                          <button
                            type="button"
                            onClick={() => openGradeModal(h)}
                            className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-accent"
                          >
                            {h?.isGraded ? 'Edit grade' : 'Grade'}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <Modal
            open={gradeModalOpen}
            title={`Homework grading${gradingHomework?.title ? `: ${gradingHomework.title}` : ''}`}
            onClose={() => {
              if (gradeBusy) return
              setGradeModalOpen(false)
              setGradingHomework(null)
              setGradeError('')
            }}
          >
            <form onSubmit={handleGradeSubmit} className="space-y-4">
              {gradeError ? <p className="text-sm text-destructive">{gradeError}</p> : null}
              {subjectsError ? <p className="text-sm text-destructive">{subjectsError}</p> : null}

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={gradeForm.isGraded}
                  onChange={(e) =>
                    setGradeForm((prev) => ({
                      ...prev,
                      isGraded: e.target.checked,
                      subjectId: e.target.checked ? prev.subjectId : '',
                      gradeComponent: e.target.checked ? prev.gradeComponent : '',
                      maxScore: e.target.checked ? prev.maxScore : '',
                      scores: {},
                    }))
                  }
                  disabled={gradeBusy}
                />
                This homework is graded
              </label>

              {gradeForm.isGraded ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject *</label>
                    <select
                      value={gradeForm.subjectId}
                      onChange={(e) =>
                        setGradeForm((prev) => ({
                          ...prev,
                          subjectId: e.target.value,
                          gradeComponent: '',
                        }))
                      }
                      disabled={subjectsLoading || gradeBusy}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select subject…</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Grade component *</label>
                    <select
                      value={gradeForm.gradeComponent}
                      onChange={(e) =>
                        setGradeForm((prev) => ({
                          ...prev,
                          gradeComponent: e.target.value,
                        }))
                      }
                      disabled={gradeBusy || subjectsLoading || !componentsForActiveSubject.length}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select component…</option>
                      {componentsForActiveSubject.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Max score *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={gradeForm.maxScore}
                      onChange={(e) =>
                        setGradeForm((prev) => ({
                          ...prev,
                          maxScore: e.target.value,
                        }))
                      }
                      disabled={gradeBusy}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Scores</div>
                    {(gradingHomework?.studentIds ?? []).map((s) => {
                      const sid = String(s._id ?? s)
                      return (
                        <div key={sid} className="flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground shrink-0">{s.name || sid}</div>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={gradeForm.scores[sid] ?? ''}
                            onChange={(e) =>
                              setGradeForm((prev) => ({
                                ...prev,
                                scores: { ...prev.scores, [sid]: e.target.value },
                              }))
                            }
                            disabled={gradeBusy}
                            className="w-32 px-3 py-2 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary text-right"
                            placeholder="Score"
                          />
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Marking as not graded will remove connected HOMEWORK grade records.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (gradeBusy) return
                    setGradeModalOpen(false)
                    setGradingHomework(null)
                    setGradeError('')
                  }}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-accent text-sm"
                  disabled={gradeBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradeBusy || (gradeForm.isGraded && subjectsLoading)}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {gradeBusy ? 'Saving…' : gradeForm.isGraded ? 'Save grading' : 'Remove grades'}
                </button>
              </div>
            </form>
          </Modal>

        </div>
      </div>
    </div>
  )
}
