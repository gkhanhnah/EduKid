import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { LoadingState } from '../components/LoadingState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import {
  addGradeToSubject,
  toggleShowGrade,
  updateGrade,
  createSubject,
  updateSubject,
  getClassGrades,
  getSubjects,
  getGradesBySubject,
} from '../services/grade.service.js'

function resolveWeightFromGrade(g, fallbackSubject) {
  const sub = (g && g.subject) || fallbackSubject
  const compName = g?.componentName
  if (sub?.components && compName) {
    const c = sub.components.find((x) => x.name === compName)
    const w = Number(c?.weight)
    if (Number.isFinite(w)) return w
  }
  return NaN
}

function calculateWeightedAverage({ grades, getWeight }) {
  let weightedSum = 0
  let weightSum = 0
  for (const g of grades) {
    const w = Number(getWeight(g))
    const score = Number(g?.score)
    if (!Number.isFinite(w) || !Number.isFinite(score)) continue
    weightedSum += score * w
    weightSum += w
  }
  if (weightSum <= 0) return null
  return weightedSum / weightSum
}

function formatNumberOrDash(v, digits = 2) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
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

const defaultComponentRows = () => [
  { name: 'Midterm', weight: '0.5' },
  { name: 'Final', weight: '0.5' },
]

export function GradeManagement() {
  const { user } = useAuth()
  const { classId } = useParams()

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to="/parent-dashboard" replace />
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classData, setClassData] = useState(null)
  const [subjects, setSubjects] = useState([])

  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [subjectGradesLoading, setSubjectGradesLoading] = useState(false)
  const [subjectGradesData, setSubjectGradesData] = useState(null)

  const [subjectModalOpen, setSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [subjectName, setSubjectName] = useState('')
  const [subjectDescription, setSubjectDescription] = useState('')
  const [componentRows, setComponentRows] = useState(defaultComponentRows)
  const [subjectBusy, setSubjectBusy] = useState(false)
  const [subjectError, setSubjectError] = useState('')

  const [gradeModal, setGradeModal] = useState({
    open: false,
    mode: 'add',
    studentId: null,
    gradeId: null,
    initialComponentName: null,
  })
  const [modalDraftScore, setModalDraftScore] = useState('')
  const [modalDraftShowToParent, setModalDraftShowToParent] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [subRes, classRes] = await Promise.all([getSubjects(classId), getClassGrades(classId)])
      setSubjects(subRes.subjects ?? [])
      setClassData(classRes)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load grades')
      setClassData(null)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null
    return (
      subjects.find((s) => String(s._id) === String(selectedSubjectId)) ||
      subjectGradesData?.subject ||
      null
    )
  }, [selectedSubjectId, subjects, subjectGradesData?.subject])

  const loadSubjectGrades = useCallback(async (subjectId) => {
    if (!subjectId) {
      setSubjectGradesData(null)
      return
    }
    setSubjectGradesLoading(true)
    try {
      const d = await getGradesBySubject(subjectId)
      setSubjectGradesData(d)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load subject grades')
      setSubjectGradesData(null)
    } finally {
      setSubjectGradesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectGrades(selectedSubjectId)
    } else {
      setSubjectGradesData(null)
    }
  }, [selectedSubjectId, loadSubjectGrades])

  const gradesByStudentId = useMemo(() => {
    const m = new Map()
    for (const g of subjectGradesData?.grades ?? []) {
      const sid = String(g.student?._id ?? g.student ?? '')
      if (!sid) continue
      if (!m.has(sid)) m.set(sid, [])
      m.get(sid).push(g)
    }
    return m
  }, [subjectGradesData?.grades])

  const openCreateSubject = useCallback(() => {
    setEditingSubject(null)
    setSubjectName('')
    setSubjectDescription('')
    setComponentRows(defaultComponentRows())
    setSubjectError('')
    setSubjectModalOpen(true)
  }, [])

  const openEditSubject = useCallback((sub) => {
    setEditingSubject(sub)
    setSubjectName(sub.name ?? '')
    setSubjectDescription(sub.description ?? '')
    setComponentRows(
      (sub.components ?? [{ name: 'Component', weight: 1 }]).map((c) => ({
        name: c.name,
        weight: String(c.weight),
      })),
    )
    setSubjectError('')
    setSubjectModalOpen(true)
  }, [])

  const submitSubject = useCallback(async () => {
    setSubjectBusy(true)
    setSubjectError('')
    try {
      const comps = componentRows
        .map((r) => ({
          name: String(r.name ?? '').trim(),
          weight: Number(r.weight),
        }))
        .filter((r) => r.name)
      if (!comps.length) throw new Error('Add at least one component with a name.')
      for (const c of comps) {
        if (!Number.isFinite(c.weight) || c.weight < 0 || c.weight > 1) {
          throw new Error('Each weight must be between 0 and 1.')
        }
      }
      if (!subjectName.trim()) throw new Error('Subject name is required.')

      if (editingSubject?._id) {
        await updateSubject(editingSubject._id, {
          name: subjectName.trim(),
          description: subjectDescription.trim() || undefined,
          components: comps,
        })
      } else {
        await createSubject({
          classId,
          name: subjectName.trim(),
          description: subjectDescription.trim() || undefined,
          components: comps,
        })
      }
      setSubjectModalOpen(false)
      await loadAll()
      if (selectedSubjectId && editingSubject && String(editingSubject._id) === String(selectedSubjectId)) {
        await loadSubjectGrades(selectedSubjectId)
      }
    } catch (e) {
      setSubjectError(e?.response?.data?.error || e?.message || 'Could not save subject')
    } finally {
      setSubjectBusy(false)
    }
  }, [
    classId,
    componentRows,
    editingSubject,
    loadAll,
    loadSubjectGrades,
    selectedSubjectId,
    subjectDescription,
    subjectName,
  ])

  const activeComponentName = gradeModal.initialComponentName

  const openAddGrade = useCallback(
    (studentId) => {
      const components = activeSubject?.components ?? []
      const studentGrades = gradesByStudentId.get(String(studentId)) ?? []
      const used = new Set(studentGrades.map((g) => g.componentName))
      const firstMissing = components.find((c) => !used.has(c.name)) ?? components[0]

      setModalDraftScore('')
      setModalDraftShowToParent(false)
      setModalError('')
      setGradeModal({
        open: true,
        mode: 'add',
        studentId,
        gradeId: null,
        initialComponentName: firstMissing?.name ?? null,
      })
    },
    [activeSubject?.components, gradesByStudentId],
  )

  const openEditGrade = useCallback((grade) => {
    setModalDraftScore(String(grade?.score ?? ''))
    setModalDraftShowToParent(Boolean(grade?.showToParent))
    setModalError('')
    setGradeModal({
      open: true,
      mode: 'edit',
      studentId: grade?.student?._id ? String(grade.student._id) : String(grade?.student ?? ''),
      gradeId: grade?._id ?? null,
      initialComponentName: grade?.componentName ?? null,
    })
  }, [])

  const previewWeightedAverage = useMemo(() => {
    if (!gradeModal.open || !classData || !activeSubject) return null
    const student = classData.students.find((s) => String(s.student._id) === String(gradeModal.studentId))
    if (!student) return null

    const scoreNumber = modalDraftScore === '' ? null : Number(modalDraftScore)
    const draftShow = Boolean(modalDraftShowToParent)
    const comp = activeComponentName

    const base = (gradesByStudentId.get(String(gradeModal.studentId)) ?? []).map((g) => ({ ...g }))
    const nextGrades = base.map((g) => ({ ...g, subject: g.subject || activeSubject }))

    const idx = nextGrades.findIndex((g) => g.componentName === comp)
    if (idx >= 0) {
      nextGrades[idx] = {
        ...nextGrades[idx],
        score: scoreNumber ?? nextGrades[idx].score,
        showToParent: draftShow,
      }
    } else if (scoreNumber != null && comp) {
      nextGrades.push({
        _id: 'preview',
        subject: activeSubject,
        componentName: comp,
        score: scoreNumber,
        showToParent: draftShow,
      })
    }

    return calculateWeightedAverage({
      grades: nextGrades,
      getWeight: (g) => resolveWeightFromGrade(g, activeSubject),
    })
  }, [
    activeComponentName,
    activeSubject,
    classData,
    gradeModal.open,
    gradeModal.studentId,
    gradesByStudentId,
    modalDraftScore,
    modalDraftShowToParent,
  ])

  const submitGrade = useCallback(async () => {
    if (!gradeModal.open || !selectedSubjectId) return
    setModalBusy(true)
    setModalError('')

    try {
      const studentId = gradeModal.studentId
      const mode = gradeModal.mode
      const componentName = gradeModal.initialComponentName
      const score = Number(modalDraftScore)
      if (!studentId || !componentName) throw new Error('Student and component are required.')
      if (!Number.isFinite(score)) throw new Error('Score must be a valid number.')

      if (mode === 'add') {
        await addGradeToSubject(selectedSubjectId, {
          studentId,
          classId,
          componentName,
          score,
          showToParent: modalDraftShowToParent,
        })
      } else {
        await updateGrade(gradeModal.gradeId, {
          score,
          showToParent: modalDraftShowToParent,
        })
      }

      setGradeModal((p) => ({ ...p, open: false }))
      await loadSubjectGrades(selectedSubjectId)
      await loadAll()
    } catch (e) {
      setModalError(e?.response?.data?.error || e?.message || 'Could not save grade')
    } finally {
      setModalBusy(false)
    }
  }, [
    classId,
    gradeModal.gradeId,
    gradeModal.initialComponentName,
    gradeModal.mode,
    gradeModal.open,
    gradeModal.studentId,
    loadAll,
    loadSubjectGrades,
    modalDraftScore,
    modalDraftShowToParent,
    selectedSubjectId,
  ])

  const toggleStudentShowToParents = useCallback(
    async (studentId) => {
      const grades = gradesByStudentId.get(String(studentId)) ?? []
      if (!grades.length) return

      const anyVisible = grades.some((g) => Boolean(g.showToParent))
      const nextVisible = !anyVisible

      try {
        if (nextVisible) {
          await Promise.all(
            grades.filter((g) => !g.showToParent).map((g) => toggleShowGrade(g._id)),
          )
        } else {
          await Promise.all(grades.map((g) => updateGrade(g._id, { showToParent: false })))
        }
        await loadSubjectGrades(selectedSubjectId)
        await loadAll()
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Could not update visibility')
      }
    },
    [gradesByStudentId, loadAll, loadSubjectGrades, selectedSubjectId],
  )

  const displayedStudents = useMemo(() => {
    if (!classData) return []
    const components = activeSubject?.components ?? []
    return classData.students.map((s) => {
      const studentGrades = (gradesByStudentId.get(String(s.student._id)) ?? []).map((g) => ({
        ...g,
        subject: g.subject || activeSubject,
      }))
      const weightedAverage = calculateWeightedAverage({
        grades: studentGrades,
        getWeight: (g) => resolveWeightFromGrade(g, activeSubject),
      })
      const weightSum = studentGrades.reduce((acc, g) => acc + resolveWeightFromGrade(g, activeSubject), 0)
      return {
        ...s,
        studentGrades,
        weightedAverage,
        weightSum,
        components,
      }
    })
  }, [activeSubject, classData, gradesByStudentId])

  const subjectWeightWarnings = classData?.subjectWeightWarnings ?? []
  const componentsSumForActiveSubject = useMemo(() => {
    const comps = activeSubject?.components ?? []
    return comps.reduce((a, c) => a + Number(c.weight || 0), 0)
  }, [activeSubject?.components])

  const activeSubjectWeightWarning = useMemo(() => {
    const EPS = 0.02
    const diff = Math.abs(componentsSumForActiveSubject - 1)
    if (diff <= EPS) return null
    return { componentsWeightSum: componentsSumForActiveSubject, expected: 1, diff }
  }, [componentsSumForActiveSubject])

  if (loading && !classData) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <LoadingState label="Loading grade management…" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !classData) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <ErrorBanner message={error} onRetry={loadAll} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Grade Management</h1>
            <p className="text-muted-foreground">
              Create subjects with weighted components, enter grades per student, and control parent visibility.
            </p>
          </div>

          {error ? (
            <div className="mb-4">
              <ErrorBanner message={error} onRetry={loadAll} />
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-lg">Subjects</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Each subject has components (e.g. Midterm, Final) with weights for the class average.
                  </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openCreateSubject}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add subject
                </button>
              </div>

              {subjectWeightWarnings.length ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-4 text-sm text-destructive">
                  <div className="font-semibold">Weight check (per subject)</div>
                  <ul className="mt-2 list-disc pl-5 space-y-1">
                    {subjectWeightWarnings.map((w) => (
                      <li key={String(w.subjectId)}>
                        {w.subjectName}: component weights sum to {formatNumberOrDash(w.typeWeightsSum, 2)}{' '}
                        (expected 1.0).
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!subjects.length ? (
                <p className="text-sm text-muted-foreground">No subjects yet. Add a subject to record grades.</p>
              ) : (
                <ul className="space-y-2">
                  {subjects.map((sub) => (
                    <li
                      key={sub._id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-3"
                    >
                      <div>
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {(sub.components ?? [])
                            .map((c) => `${c.name} (${formatNumberOrDash(c.weight, 2)})`)
                            .join(' · ') || 'No components'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary text-sm"
                        onClick={() => openEditSubject(sub)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-2">Visibility to parents</h2>
              <p className="text-sm text-muted-foreground">
                Use Show / Hide per student for the selected subject. Only visible grades appear in the parent
                view.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm mb-6">
            <h2 className="font-semibold text-lg mb-3">Grades by subject</h2>
            <label className="field max-w-md">
              <span>Subject</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-xl border border-border p-2"
              >
                <option value="">Select a subject…</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedSubjectId && subjectGradesLoading ? (
              <p className="text-sm text-muted-foreground mt-4">Loading grades…</p>
            ) : null}

            {selectedSubjectId && !subjectGradesLoading && activeSubjectWeightWarning ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 mt-4 text-sm text-amber-900">
                Component weights for <span className="font-medium">{activeSubject?.name}</span> sum to{' '}
                {formatNumberOrDash(activeSubjectWeightWarning.componentsWeightSum, 2)} (expected 1.0).
              </div>
            ) : null}

            {!selectedSubjectId ? (
              <p className="text-sm text-muted-foreground mt-4">Choose a subject to view and edit grades.</p>
            ) : null}
          </div>

          {selectedSubjectId && !subjectGradesLoading ? (
            <div className="space-y-4 md:space-y-6">
              {displayedStudents.map((s) => {
                const studentGrades = s.studentGrades
                const visibleCount = studentGrades.filter((g) => g.showToParent).length
                const totalCount = studentGrades.length
                const anyVisible = visibleCount > 0
                const avgText = s.weightedAverage == null ? '—' : formatNumberOrDash(s.weightedAverage, 2)
                const comps = s.components ?? []

                return (
                  <div
                    key={s.student._id}
                    className="bg-white rounded-3xl border border-border p-4 md:p-6 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{s.student.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Weighted average: <span className="font-semibold text-primary">{avgText}</span>
                        </p>
                        {totalCount ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Parents can see {visibleCount}/{totalCount} grades for this subject.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">No grades for this subject yet.</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => openAddGrade(s.student._id)}
                          disabled={!comps.length}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add grade
                        </button>
                        <button
                          type="button"
                          className={`btn ${anyVisible ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={!totalCount || loading || subjectGradesLoading}
                          onClick={() => toggleStudentShowToParents(s.student._id)}
                        >
                          {anyVisible ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Show
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {comps.length ? (
                      <div className="mt-4 overflow-x-auto">
                        <div className="min-w-[520px]">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {comps.map((c) => {
                              const g = studentGrades.find((x) => x.componentName === c.name)
                              const visible = Boolean(g?.showToParent)
                              return (
                                <div
                                  key={c.name}
                                  className="rounded-2xl border border-border/60 bg-background p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-medium">{c.name}</div>
                                      <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                        Weight: {formatNumberOrDash(c.weight, 2)}
                                      </div>
                                    </div>
                                    {g ? (
                                      <span
                                        className={`text-[0.75rem] px-2 py-1 rounded-xl border ${
                                          visible
                                            ? 'bg-secondary/15 border-secondary/30 text-secondary'
                                            : 'bg-muted/40 border-border text-muted-foreground'
                                        }`}
                                      >
                                        {visible ? 'Visible' : 'Hidden'}
                                      </span>
                                    ) : (
                                      <span className="text-[0.75rem] px-2 py-1 rounded-xl border bg-muted/30 border-border text-muted-foreground">
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-3">
                                    <div className="text-sm font-semibold tabular-nums">
                                      {g ? formatNumberOrDash(g.score, 0) : '—'}
                                    </div>
                                    {g ? (
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => openEditGrade(g)}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          setModalDraftScore('')
                                          setModalDraftShowToParent(false)
                                          setModalError('')
                                          setGradeModal({
                                            open: true,
                                            mode: 'add',
                                            studentId: s.student._id,
                                            gradeId: null,
                                            initialComponentName: c.name,
                                          })
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {!displayedStudents.length ? (
                <div className="bg-white rounded-3xl border border-border p-6 shadow-sm text-muted-foreground text-sm">
                  No students in this class.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={gradeModal.open}
        title={gradeModal.mode === 'add' ? 'Add grade' : 'Edit grade'}
        onClose={() => {
          if (modalBusy) return
          setGradeModal((p) => ({ ...p, open: false }))
        }}
      >
        <div className="space-y-3">
          {(activeSubject?.components ?? []).length ? (
            <label className="field">
              <span>Component</span>
              <select
                value={activeComponentName ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setGradeModal((p) => ({ ...p, initialComponentName: v }))
                }}
                className="w-full rounded-xl border border-border p-2"
                disabled={gradeModal.mode === 'edit'}
              >
                {(activeSubject?.components ?? []).map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-destructive">Select a subject with components first.</p>
          )}

          <label className="field">
            <span>Score</span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              value={modalDraftScore}
              onChange={(e) => setModalDraftScore(e.target.value)}
              placeholder="e.g. 85"
              className="w-full"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-3">
            <input
              type="checkbox"
              checked={modalDraftShowToParent}
              onChange={(e) => setModalDraftShowToParent(e.target.checked)}
            />
            <div className="text-sm">
              <div className="font-medium">Visible to parents</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Only visible grades appear in the parent view.
              </div>
            </div>
          </label>

          {previewWeightedAverage != null ? (
            <div className="rounded-2xl border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Preview weighted average</div>
              <div className="text-lg font-semibold text-primary tabular-nums">
                {formatNumberOrDash(previewWeightedAverage, 2)}
              </div>
            </div>
          ) : null}

          {modalError ? <ErrorBanner message={modalError} /> : null}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setGradeModal((p) => ({ ...p, open: false }))}
              disabled={modalBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitGrade}
              disabled={modalBusy || !activeComponentName}
            >
              {modalBusy ? 'Saving…' : gradeModal.mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={subjectModalOpen}
        title={editingSubject ? 'Edit subject' : 'Add subject'}
        onClose={() => {
          if (subjectBusy) return
          setSubjectModalOpen(false)
        }}
      >
        <div className="space-y-3">
          <label className="field">
            <span>Name</span>
            <input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Math, English…"
              className="w-full"
            />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <input
              value={subjectDescription}
              onChange={(e) => setSubjectDescription(e.target.value)}
              className="w-full"
            />
          </label>

          <div>
            <div className="text-sm font-medium mb-2">Components (name + weight 0–1)</div>
            <div className="space-y-2">
              {componentRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-end flex-wrap">
                  <label className="field flex-1 min-w-[120px]">
                    <span className="text-xs">Name</span>
                    <input
                      value={row.name}
                      onChange={(e) => {
                        const v = e.target.value
                        setComponentRows((prev) => prev.map((r, j) => (j === i ? { ...r, name: v } : r)))
                      }}
                      className="w-full"
                    />
                  </label>
                  <label className="field w-28">
                    <span className="text-xs">Weight</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="1"
                      value={row.weight}
                      onChange={(e) => {
                        const v = e.target.value
                        setComponentRows((prev) => prev.map((r, j) => (j === i ? { ...r, weight: v } : r)))
                      }}
                      className="w-full"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary text-sm mb-0.5"
                    disabled={componentRows.length <= 1}
                    onClick={() => setComponentRows((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary text-sm mt-2"
              onClick={() => setComponentRows((prev) => [...prev, { name: '', weight: '0.1' }])}
            >
              <Plus className="w-4 h-4 mr-1 inline" />
              Add component
            </button>
          </div>

          {subjectError ? <ErrorBanner message={subjectError} /> : null}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={subjectBusy}
              onClick={() => setSubjectModalOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn btn-primary" disabled={subjectBusy} onClick={submitSubject}>
              {subjectBusy ? 'Saving…' : editingSubject ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
