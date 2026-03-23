import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { LoadingState } from '../components/LoadingState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import {
  addGrade,
  toggleShowGrade,
  updateGrade,
  createGradeType,
  updateGradeType,
  getClassGrades,
} from '../services/grade.service.js'

function calculateWeightedAverage({ grades, getWeight }) {
  // Frontend mirrors backend formula for instant feedback:
  // weighted_avg = sum(score * weight) / sum(weights)
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

export function GradeManagement() {
  const { user } = useAuth()
  const { classId } = useParams()

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to="/parent-dashboard" replace />
  }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  // Teacher can edit weights anytime; draft weights provide instant UI feedback.
  const [draftWeightsByTypeId, setDraftWeightsByTypeId] = useState({})
  const dirty = useMemo(() => Object.keys(draftWeightsByTypeId).length > 0, [draftWeightsByTypeId])

  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [typeName, setTypeName] = useState('')
  const [typeWeight, setTypeWeight] = useState('0.1')
  const [typeBusy, setTypeBusy] = useState(false)
  const [typeError, setTypeError] = useState('')

  const [gradeModal, setGradeModal] = useState({
    open: false,
    mode: 'add', // add | edit
    studentId: null,
    gradeId: null,
    initialTypeId: null,
  })

  const [modalDraftScore, setModalDraftScore] = useState('')
  const [modalDraftShowToParent, setModalDraftShowToParent] = useState(false)
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState('')

  const load = useCallback(async ({ resetDraft = true } = {}) => {
    setLoading(true)
    setError('')
    try {
      const d = await getClassGrades(classId)
      setData(d)
      if (resetDraft) setDraftWeightsByTypeId({})
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load grades')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    load()
  }, [load])

  const gradeTypes = data?.gradeTypes ?? []

  const getDraftWeightForType = useCallback(
    (gradeOrType) => {
      const typeId =
        typeof gradeOrType?.type?._id !== 'undefined'
          ? String(gradeOrType.type._id)
          : String(gradeOrType?._id ?? gradeOrType?.typeId ?? '')
      if (!typeId) return 0
      const base = gradeTypes.find((t) => String(t._id) === typeId)?.weight
      const draft = draftWeightsByTypeId[typeId]
      return draft !== undefined ? Number(draft) : Number(base ?? 0)
    },
    [draftWeightsByTypeId, gradeTypes],
  )

  const displayedTypeWeightsSum = useMemo(() => {
    let sum = 0
    for (const t of gradeTypes) {
      const w = draftWeightsByTypeId[t._id] ?? t.weight
      sum += Number(w || 0)
    }
    return sum
  }, [draftWeightsByTypeId, gradeTypes])

  const weightWarning = useMemo(() => {
    const EPS = 0.02
    const diff = Math.abs(displayedTypeWeightsSum - 1)
    if (!dirty) return data?.weightWarning ?? null
    if (diff <= EPS) return null
    return { expected: 1, typeWeightsSum: displayedTypeWeightsSum, diff }
  }, [data?.weightWarning, displayedTypeWeightsSum, dirty])

  const openAddGrade = useCallback(
    (studentId) => {
      const student = data?.students?.find((s) => String(s.student._id) === String(studentId))
      const existingTypeIds = new Set((student?.grades ?? []).map((g) => String(g.type._id)))
      const firstMissing = gradeTypes.find((t) => !existingTypeIds.has(String(t._id))) ?? gradeTypes[0]

      setModalDraftScore('')
      setModalDraftShowToParent(false)
      setModalError('')
      setGradeModal({
        open: true,
        mode: 'add',
        studentId,
        gradeId: null,
        initialTypeId: firstMissing?._id ?? null,
      })
    },
    [data?.students, gradeTypes],
  )

  const openEditGrade = useCallback((grade) => {
    setModalDraftScore(String(grade?.score ?? ''))
    setModalDraftShowToParent(Boolean(grade?.showToParent))
    setModalError('')
    setGradeModal({
      open: true,
      mode: 'edit',
      // Backend returns `student` as an ObjectId (not populated), so use it directly.
      studentId: grade?.student ? String(grade.student) : null,
      gradeId: grade?._id ?? null,
      initialTypeId: grade?.type?._id ?? null,
    })
  }, [])

  const activeGradeTypeId = gradeModal.initialTypeId

  useEffect(() => {
    if (!gradeModal.open) return
    // When editing, the gradeModal.initialTypeId is already set.
    // No additional sync needed for draft score because modalDraftScore is controlled above.
  }, [gradeModal.open])

  const previewWeightedAverage = useMemo(() => {
    if (!gradeModal.open || !data) return null
    const student = data.students.find((s) => String(s.student._id) === String(gradeModal.studentId))
    if (!student) return null

    const scoreNumber = modalDraftScore === '' ? null : Number(modalDraftScore)
    const draftShow = Boolean(modalDraftShowToParent)

    const nextGrades = student.grades.map((g) => ({ ...g }))
    const targetTypeId = activeGradeTypeId ? String(activeGradeTypeId) : null
    if (!targetTypeId) return student.weightedAverage

    // Replace score for the edited/added type (preview only).
    const idx = nextGrades.findIndex((g) => String(g.type._id) === targetTypeId)
    if (idx >= 0) {
      nextGrades[idx] = {
        ...nextGrades[idx],
        score: scoreNumber ?? nextGrades[idx].score,
        showToParent: draftShow,
      }
    } else if (scoreNumber != null) {
      nextGrades.push({
        _id: 'preview',
        type: gradeTypes.find((t) => String(t._id) === targetTypeId),
        score: scoreNumber,
        showToParent: draftShow,
      })
    }

    return calculateWeightedAverage({
      grades: nextGrades,
      getWeight: (g) => {
        const typeId = String(g?.type?._id ?? '')
        return draftWeightsByTypeId[typeId] ?? g?.type?.weight ?? 0
      },
    })
  }, [
    activeGradeTypeId,
    data,
    draftWeightsByTypeId,
    gradeModal.open,
    gradeModal.studentId,
    gradeTypes,
    modalDraftScore,
    modalDraftShowToParent,
  ])

  const submitGrade = useCallback(async () => {
    if (!gradeModal.open) return
    setModalBusy(true)
    setModalError('')

    try {
      const studentId = gradeModal.studentId
      const mode = gradeModal.mode
      const typeId = gradeModal.initialTypeId
      const score = Number(modalDraftScore)
      if (!studentId || !typeId) throw new Error('Student and grade type are required.')
      if (!Number.isFinite(score)) throw new Error('Score must be a valid number.')

      if (mode === 'add') {
        await addGrade({
          studentId,
          classId,
          typeId,
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
      load({ resetDraft: false })
    } catch (e) {
      setModalError(e?.response?.data?.error || e?.message || 'Could not save grade')
    } finally {
      setModalBusy(false)
    }
  }, [
    classId,
    gradeModal.gradeId,
    gradeModal.initialTypeId,
    gradeModal.mode,
    gradeModal.open,
    gradeModal.studentId,
    load,
    modalDraftScore,
    modalDraftShowToParent,
  ])

  const toggleStudentShowToParents = useCallback(
    async (student) => {
      const grades = student?.grades ?? []
      if (!grades.length) return

      const anyVisible = grades.some((g) => Boolean(g.showToParent))
      const nextVisible = !anyVisible

      try {
        // showToParent logic:
        // - If turning "on": set showToParent=true for each grade.
        // - If turning "off": set showToParent=false for each grade.
        if (nextVisible) {
          await Promise.all(
            grades
              .filter((g) => !g.showToParent)
              .map((g) => toggleShowGrade(g._id)),
          )
        } else {
          await Promise.all(grades.map((g) => updateGrade(g._id, { showToParent: false })))
        }
        load({ resetDraft: false })
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'Could not update visibility')
      }
    },
    [load],
  )

  const displayedStudents = useMemo(() => {
    if (!data) return []
    return data.students.map((s) => {
      const weightedAverage = calculateWeightedAverage({
        grades: s.grades,
        getWeight: (g) => {
          const typeId = String(g?.type?._id ?? '')
          return draftWeightsByTypeId[typeId] ?? g?.type?.weight ?? 0
        },
      })
      const weightSum = s.grades.reduce((acc, g) => {
        const typeId = String(g?.type?._id ?? '')
        const w = draftWeightsByTypeId[typeId] ?? g?.type?.weight ?? 0
        return acc + Number(w || 0)
      }, 0)
      return {
        ...s,
        weightedAverage,
        weightSum,
      }
    })
  }, [data, draftWeightsByTypeId])

  const saveWeights = useCallback(async () => {
    if (!dirty) return
    try {
      setError('')
      setLoading(true)
      const updates = gradeTypes
        .map((t) => ({ id: t._id, weight: draftWeightsByTypeId[t._id] }))
        .filter((u) => u.weight !== undefined && Number.isFinite(Number(u.weight)))

      for (const u of updates) {
        await updateGradeType(u.id, { weight: Number(u.weight) })
      }

      await load({ resetDraft: true })
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not save weights')
      setLoading(false)
      await load({ resetDraft: true })
    } finally {
      setLoading(false)
    }
  }, [dirty, draftWeightsByTypeId, gradeTypes, load, updateGradeType])

  const openCreateType = useCallback(() => {
    setTypeError('')
    setTypeName('')
    setTypeWeight('0.1')
    setTypeModalOpen(true)
  }, [])

  const submitCreateType = useCallback(async () => {
    setTypeBusy(true)
    setTypeError('')
    try {
      await createGradeType({
        classId,
        name: typeName,
        weight: Number(typeWeight),
      })
      setTypeModalOpen(false)
      await load({ resetDraft: true })
    } catch (e) {
      setTypeError(e?.response?.data?.error || e?.message || 'Could not create grade type')
    } finally {
      setTypeBusy(false)
    }
  }, [classId, createGradeType, load, typeName, typeWeight])

  if (loading && !data) {
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

  if (error) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <ErrorBanner message={error} onRetry={load} />
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
              Enter grades, adjust grade-type weights, and control when grades become visible to parents.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-lg">Grade Type Weights</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    These weights are used for weighted average calculation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openCreateType}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Type
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!dirty || loading}
                    onClick={saveWeights}
                  >
                    Save Weights
                  </button>
                </div>
              </div>

              {dirty ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Weight changes are not applied to the parent view until you click <span className="font-medium">Save Weights</span>.
                </p>
              ) : null}

              {weightWarning ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-4 text-sm text-destructive">
                  <div className="font-semibold">Optional check</div>
                  <div className="mt-1">
                    Total type weights sum to {formatNumberOrDash(displayedTypeWeightsSum, 2)} (expected 1.0).
                    Weighted average still works; this is just a warning.
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gradeTypes.map((t) => {
                  const value = draftWeightsByTypeId[t._id] ?? t.weight
                  return (
                    <label
                      key={t._id}
                      className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{formatNumberOrDash(value, 2)}</span>
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="1"
                        value={value}
                        onChange={(e) => {
                          const v = e.target.value
                          const n = v === '' ? '' : Number(v)
                          setDraftWeightsByTypeId((prev) => ({
                            ...prev,
                            [t._id]: n,
                          }))
                        }}
                        className="w-full"
                      />
                    </label>
                  )
                })}
              </div>

              {!gradeTypes.length ? (
                <p className="text-sm text-muted-foreground mt-4">No grade types yet. Add a type to begin.</p>
              ) : null}
            </div>

            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-2">Visibility to Parents</h2>
              <p className="text-sm text-muted-foreground">
                Teachers control whether each grade is visible to parents via the “Show” toggle on every student.
              </p>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {displayedStudents.map((s) => {
              const visibleCount = s.grades.filter((g) => g.showToParent).length
              const totalCount = s.grades.length
              const anyVisible = visibleCount > 0
              const avgText = s.weightedAverage == null ? '—' : formatNumberOrDash(s.weightedAverage, 2)

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
                          Parents can see {visibleCount}/{totalCount} grades.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No grades added yet.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openAddGrade(s.student._id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Grade
                      </button>
                      <button
                        type="button"
                        className={`btn ${anyVisible ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={!totalCount || loading}
                        onClick={() => toggleStudentShowToParents(s)}
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

                  {gradeTypes.length ? (
                    <div className="mt-4 overflow-x-auto">
                      <div className="min-w-[520px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {gradeTypes.map((t) => {
                            const g = s.grades.find((x) => String(x.type._id) === String(t._id))
                            const visible = Boolean(g?.showToParent)
                            return (
                              <div
                                key={t._id}
                                className="rounded-2xl border border-border/60 bg-background p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-medium">{t.name}</div>
                                    <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                      Weight: {formatNumberOrDash(getDraftWeightForType({ type: { _id: t._id } }), 2)}
                                    </div>
                                  </div>
                                  {g ? (
                                    <span
                                      className={`text-[0.75rem] px-2 py-1 rounded-xl border ${
                                        visible ? 'bg-secondary/15 border-secondary/30 text-secondary' : 'bg-muted/40 border-border text-muted-foreground'
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
                                        // Open add modal with the missing type pre-selected.
                                        setModalDraftScore('')
                                        setModalDraftShowToParent(false)
                                        setModalError('')
                                        setGradeModal({
                                          open: true,
                                          mode: 'add',
                                          studentId: s.student._id,
                                          gradeId: null,
                                          initialTypeId: t._id,
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
                No students found in this class.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add/Edit Grade Modal */}
      <Modal
        open={gradeModal.open}
        title={gradeModal.mode === 'add' ? 'Add Grade' : 'Edit Grade'}
        onClose={() => {
          if (modalBusy) return
          setGradeModal((p) => ({ ...p, open: false }))
        }}
      >
        <div className="space-y-3">
          {gradeTypes.length ? (
            <label className="field">
              <span>Grade Type</span>
              <select
                value={activeGradeTypeId ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setGradeModal((p) => ({ ...p, initialTypeId: v }))
                }}
                className="w-full rounded-xl border border-border p-2"
                disabled={gradeModal.mode === 'edit'}
              >
                {gradeTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-destructive">Add at least one grade type before creating grades.</p>
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
                Only visible grades are shown in the parent view.
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
              disabled={modalBusy || !activeGradeTypeId}
            >
              {modalBusy ? 'Saving…' : gradeModal.mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Grade Type Modal */}
      <Modal
        open={typeModalOpen}
        title="Add Grade Type"
        onClose={() => {
          if (typeBusy) return
          setTypeModalOpen(false)
        }}
      >
        <div className="space-y-3">
          <label className="field">
            <span>Name</span>
            <input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Quiz, Midterm, Final..."
              className="w-full"
            />
          </label>
          <label className="field">
            <span>Weight (0.0 - 1.0)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="1"
              value={typeWeight}
              onChange={(e) => setTypeWeight(e.target.value)}
              className="w-full"
            />
          </label>

          {typeError ? <ErrorBanner message={typeError} /> : null}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={typeBusy}
              onClick={() => setTypeModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={typeBusy}
              onClick={submitCreateType}
            >
              {typeBusy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

