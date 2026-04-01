import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Unlock, ThumbsUp, ThumbsDown, ClipboardCheck, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getClasses } from '../../services/classService.js'
import {
  getClassGrades,
  submitGradesForSubject,
  approveGradesForSubject,
  rejectGradesForSubject,
  lockGradesForSubject,
  unlockGradesForSubject,
  getGradeAuditLogs,
} from '../../services/grade.service.js'

function emptyAudit() {
  return { rowsCount: 0, rows: [] }
}

export default function AdminGrades() {
  const { t } = useTranslation()
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)

  const [classId, setClassId] = useState('')
  const [dataLoading, setDataLoading] = useState(false)
  const [error, setError] = useState('')

  const [classData, setClassData] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')

  const [audit, setAudit] = useState(emptyAudit())
  const [auditLoading, setAuditLoading] = useState(false)

  const activeSubject = useMemo(() => subjects.find((s) => String(s._id) === String(subjectId)) || null, [subjects, subjectId])

  const workflowState = useMemo(() => {
    if (!classData || !subjectId) return null
    const students = classData?.students ?? []
    for (const row of students) {
      const g = (row.grades ?? []).find((x) => String(x.subject?._id ?? x.subject) === String(subjectId))
      if (!g) continue
      return { locked: Boolean(g.locked), approvalStatus: g.approvalStatus ?? 'DRAFT' }
    }
    return { locked: false, approvalStatus: 'DRAFT' }
  }, [classData, subjectId])

  const loadClasses = useCallback(async () => {
    setClassesLoading(true)
    try {
      const d = await getClasses()
      setClasses(Array.isArray(d) ? d : [])
    } finally {
      setClassesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const reloadClassGrades = useCallback(async () => {
    if (!classId) return
    setDataLoading(true)
    setError('')
    try {
      const d = await getClassGrades(classId)
      setClassData(d)
      setSubjects(Array.isArray(d?.subjects) ? d.subjects : [])
      const nextSubjectId = d?.subjects?.[0]?._id ?? ''
      setSubjectId(nextSubjectId)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load grades')
      setClassData(null)
      setSubjects([])
      setSubjectId('')
    } finally {
      setDataLoading(false)
    }
  }, [classId])

  useEffect(() => {
    if (!classId) return
    reloadClassGrades()
  }, [classId, reloadClassGrades])

  const loadAudit = useCallback(async () => {
    if (!classId || !subjectId) return
    setAuditLoading(true)
    try {
      const d = await getGradeAuditLogs({ classId, subjectId, limit: 50 })
      setAudit(d ?? emptyAudit())
    } catch {
      setAudit(emptyAudit())
    } finally {
      setAuditLoading(false)
    }
  }, [classId, subjectId])

  useEffect(() => {
    if (classId && subjectId) loadAudit()
  }, [classId, subjectId, loadAudit])

  const componentColumns = useMemo(() => activeSubject?.components ?? [], [activeSubject])

  async function handleWorkflow(action) {
    if (!classId || !subjectId) return
    setError('')
    try {
      if (action === 'submit') {
        await submitGradesForSubject({ classId, subjectId })
      } else if (action === 'approve') {
        await approveGradesForSubject({ classId, subjectId })
      } else if (action === 'reject') {
        const reason = prompt(t('adminGrades.rejectionReasonPrompt')) || ''
        await rejectGradesForSubject({ classId, subjectId, rejectionReason: reason })
      } else if (action === 'lock') {
        await lockGradesForSubject({ classId, subjectId })
      } else if (action === 'unlock') {
        await unlockGradesForSubject({ classId, subjectId })
      }
      await reloadClassGrades()
      await loadAudit()
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('adminGrades.workflowFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('adminGrades.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('adminGrades.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/classes"
            className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
          >
            {t('adminGrades.manageClasses')}
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex-1">
            <span className="text-sm font-medium">{t('common.classes')}</span>
            <select
              value={classId}
              disabled={classesLoading}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
            >
              <option value="">{classesLoading ? t('common.loading') : t('adminGrades.selectClass')}</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1">
            <span className="text-sm font-medium">{t('adminReports.subject')}</span>
            <select
              value={subjectId}
              disabled={dataLoading || !classData}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
            >
              {(subjects ?? []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {dataLoading ? (
          <div className="py-10 text-center text-muted-foreground">{t('adminGrades.loadingGradebook')}</div>
        ) : !classData || !activeSubject ? (
          <div className="rounded-2xl border border-border bg-muted/10 p-6 text-sm text-muted-foreground">
            {t('adminGrades.chooseClassAndSubject')}
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('adminGrades.workflowStatus')}</p>
                <p className="mt-1 text-lg font-semibold">
                  {workflowState?.approvalStatus ?? t('common.none')} {workflowState?.locked ? t('adminGrades.locked') : t('adminGrades.editable')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                  onClick={() => handleWorkflow('submit')}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {t('adminGrades.submit')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                  onClick={() => handleWorkflow('approve')}
                  disabled={workflowState?.approvalStatus === 'APPROVED'}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {t('adminGrades.approve')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                  onClick={() => handleWorkflow('reject')}
                  disabled={workflowState?.approvalStatus === 'REJECTED'}
                >
                  <ThumbsDown className="w-4 h-4" />
                  {t('adminGrades.reject')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                  onClick={() => handleWorkflow('lock')}
                >
                  <Lock className="w-4 h-4" />
                  {t('adminGrades.lock')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                  onClick={() => handleWorkflow('unlock')}
                >
                  <Unlock className="w-4 h-4" />
                  {t('adminGrades.unlock')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60">
              <div className="space-y-3 p-3 md:hidden">
                {(classData.students ?? []).map((row) => {
                  const grades = row.grades ?? []
                  return (
                    <div key={row.student?._id ?? row.student?.id} className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                      <p className="font-semibold">{row.student?.name ?? t('common.none')}</p>
                      <div className="mt-3 space-y-2">
                        {componentColumns.map((c) => {
                          const g = grades.find((x) => String(x.componentName) === String(c.name) && String(x.subject?._id ?? x.subject) === String(subjectId))
                          return (
                            <div key={c.name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2 text-sm">
                              <div>
                                <p className="font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground">w={Number(c.weight).toFixed(2)}</p>
                              </div>
                              <span className="font-semibold">{g?.score != null ? g.score : t('common.none')}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold border-r border-border min-w-[180px]">
                      {t('common.student')}
                    </th>
                    {componentColumns.map((c) => (
                      <th key={c.name} className="px-3 py-2 text-center font-semibold border-r border-border/40 last:border-r-0">
                        <div className="text-xs leading-tight">{c.name}</div>
                        <div className="text-[0.7rem] text-muted-foreground font-normal mt-0.5">
                          w={Number(c.weight).toFixed(2)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(classData.students ?? []).map((row) => {
                    const grades = row.grades ?? []
                    return (
                      <tr key={row.student?._id ?? row.student?.id} className="border-b border-border/60 last:border-b-0">
                        <th className="sticky left-0 z-5 bg-background px-3 py-3 text-left font-medium border-r border-border">
                          {row.student?.name ?? t('common.none')}
                        </th>
                        {componentColumns.map((c) => {
                          const g = grades.find((x) => String(x.componentName) === String(c.name) && String(x.subject?._id ?? x.subject) === String(subjectId))
                          return (
                            <td key={c.name} className="px-3 py-3 text-center border-r border-border/40 last:border-r-0">
                              {g?.score != null ? g.score : t('common.none')}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 pt-2">
              <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
                <p className="font-semibold mb-3">{t('adminGrades.auditLog')}</p>
                {auditLoading ? (
                  <p className="text-sm text-muted-foreground">{t('adminGrades.loadingAudit')}</p>
                ) : audit?.rows?.length ? (
                  <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                    {audit.rows.map((r, idx) => (
                      <li key={`${r._id ?? idx}-${idx}`} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{r.action}</span>
                          <span className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : t('common.none')}</span>
                        </div>
                        {r.to?.approvalStatus ? <div className="text-sm text-primary mt-1">{t('adminGrades.toStatus', { status: r.to.approvalStatus })}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('adminGrades.noAuditLogs')}</p>
                )}
              </div>
              <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
                <p className="font-semibold mb-3">{t('adminGrades.tip')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('adminGrades.tipText')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

