import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathForRole } from '../../utils/authPaths.js'
import { useStudents } from '../../hooks/useStudents.js'
import { useEvaluations } from '../../hooks/useEvaluations.js'
import { submitEvaluation } from '../../services/evaluationService.js'
import { getGradesAverage } from '../../services/grade.service.js'
import { getClasses } from '../../services/api.js'
import { ClipboardCheck } from 'lucide-react'

const EMPTY_FORM = {
  classId: '',
  studentId: '',
  comment: '',
  period: '',
}

function scoresSummary(scores) {
  if (!scores || typeof scores !== 'object') return '—'
  const parts = Object.entries(scores).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (!parts.length) return '—'
  return parts.map(([k, v]) => `${k}: ${v}`).join(' · ')
}

function studentName(ev) {
  if (ev.studentId && typeof ev.studentId === 'object') {
    return ev.studentId.name ?? '—'
  }
  return '—'
}

function toKey(str) {
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function Evaluation() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { students, loading: studentsLoading } = useStudents()
  const [filterStudentId, setFilterStudentId] = useState('')
  const { evaluations, loading, error, refresh } = useEvaluations({
    studentId: filterStudentId || undefined,
  })
  const [form, setForm] = useState(EMPTY_FORM)
  const [averagesLoading, setAveragesLoading] = useState(false)
  const [averagesError, setAveragesError] = useState('')
  const [averagesSubjects, setAveragesSubjects] = useState([])
  const [mainClasses, setMainClasses] = useState([])
  const [mainClassesResolved, setMainClassesResolved] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const mainClassIds = useMemo(
    () => mainClasses.map((c) => String(c._id)),
    [mainClasses],
  )

  const selectedStudent = students.find((s) => String(s._id) === String(form.studentId))
  const studentClassId = String(selectedStudent?.classId?._id ?? selectedStudent?.classId ?? '')
  const canManageEvaluations = Boolean(
    form.classId &&
      form.studentId &&
      mainClassIds.includes(String(form.classId)) &&
      studentClassId === String(form.classId),
  )
  const canUseSubmitForm = mainClassesResolved && mainClasses.length > 0

  const studentsInSelectedClass = useMemo(() => {
    if (!form.classId) return []
    const cid = String(form.classId)
    return students.filter(
      (s) => String(s.classId?._id ?? s.classId ?? '') === cid,
    )
  }, [students, form.classId])

  function handleFormChange(e) {
    const { name, value } = e.target
    if (name === 'classId') {
      setForm((prev) => ({ ...prev, classId: value, studentId: '' }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    let cancelled = false
    async function loadMainClasses() {
      if (user?.role !== 'teacher') return
      setMainClassesResolved(false)
      try {
        const d = await getClasses()
        if (cancelled) return
        const list = Array.isArray(d) ? d.filter((c) => c?.isMainTeacher) : []
        setMainClasses(list)
      } catch {
        if (cancelled) return
        setMainClasses([])
      } finally {
        if (!cancelled) setMainClassesResolved(true)
      }
    }
    loadMainClasses()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  useEffect(() => {
    let cancelled = false
    async function loadAverages() {
      if (!form.studentId) {
        setAveragesSubjects([])
        return
      }
      setAveragesLoading(true)
      setAveragesError('')
      try {
        const d = await getGradesAverage(form.studentId)
        if (cancelled) return
        setAveragesSubjects(d?.subjects ?? [])
      } catch (e) {
        if (cancelled) return
        setAveragesError(e?.response?.data?.error || e?.message || t('teacherEvaluation.loadAveragesFailed'))
        setAveragesSubjects([])
      } finally {
        if (!cancelled) setAveragesLoading(false)
      }
    }

    loadAverages()
    return () => {
      cancelled = true
    }
  }, [form.studentId])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSuccess(false)

    if (!form.classId) {
      setFormError(t('teacherEvaluation.selectClass'))
      return
    }

    if (!form.studentId) {
      setFormError(t('teacherEvaluation.selectStudent'))
      return
    }

    if (!canManageEvaluations) {
      setFormError(t('teacherEvaluation.mainTeacherOnly'))
      return
    }
    if (!form.period?.trim()) {
      setFormError(t('teacherEvaluation.periodRequired'))
      return
    }
    setSubmitting(true)
    try {
      const scores =
        averagesSubjects && Array.isArray(averagesSubjects)
          ? averagesSubjects.reduce((acc, s) => {
              acc[toKey(s?.subjectName)] = s?.averageScore
              return acc
            }, {})
          : {}

      await submitEvaluation({
        studentId: form.studentId,
        scores,
        comment: form.comment.trim() || undefined,
        period: form.period.trim(),
      })
      setForm(EMPTY_FORM)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      refresh()
    } catch (err) {
      setFormError(
        err?.response?.data?.error || err?.message || t('teacherEvaluation.saveFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== 'teacher') {
    return <Navigate to={homePathForRole(user?.role)} replace />
  }

  return (
    <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-semibold">{t('teacherEvaluation.title')}</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            {t('teacherEvaluation.subtitle')}
          </p>

          <section className="bg-white rounded-3xl border border-border shadow-lg p-6 mb-8">
            <h2 className="text-lg font-medium mb-4">{t('teacherEvaluation.newEvaluation')}</h2>
            {!mainClassesResolved ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !canUseSubmitForm ? (
              <p className="text-sm text-muted-foreground">
                {t('teacherEvaluation.readOnlyHelp')}
              </p>
            ) : (
              <>
                {success ? (
                  <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                    {t('teacherEvaluation.saved')}
                  </p>
                ) : null}
                {formError ? (
                  <p className="mb-4 text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                ) : null}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('teacherEvaluation.classLabel')}</label>
                    <select
                      name="classId"
                      value={form.classId}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">{t('teacherEvaluation.selectClassOption')}</option>
                      {mainClasses.map((c) => (
                        <option key={c._id} value={String(c._id)}>
                          {[c.name, c.grade].filter(Boolean).join(' · ') || t('common.classes')}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('teacherEvaluation.classHelp')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t('teacherEvaluation.studentLabel')}</label>
                    <select
                      name="studentId"
                      value={form.studentId}
                      onChange={handleFormChange}
                      disabled={studentsLoading || !form.classId}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                    >
                      <option value="">
                        {form.classId ? t('teacherEvaluation.selectStudentOption') : t('teacherEvaluation.chooseClassFirst')}
                      </option>
                      {studentsInSelectedClass.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {form.classId && !studentsInSelectedClass.length ? (
                      <p className="mt-1 text-xs text-muted-foreground">{t('teacherEvaluation.noStudentsInClass')}</p>
                    ) : null}
                  </div>

                  <div className="rounded-3xl border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-sm font-medium">{t('teacherEvaluation.averages')}</h2>
                      {averagesLoading ? (
                        <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
                      ) : null}
                    </div>
                    {averagesError ? (
                      <p className="text-sm text-destructive">{averagesError}</p>
                    ) : averagesSubjects.length ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {averagesSubjects.map((s) => (
                          <div key={s.subjectName}>
                            <div className="text-sm text-muted-foreground">{s.subjectName}</div>
                            <div className="text-lg font-semibold text-primary tabular-nums">
                              {s.averageScore == null ? t('common.none') : Number(s.averageScore).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('teacherEvaluation.noAverages')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('teacherEvaluation.periodLabel')}</label>
                    <input
                      name="period"
                      value={form.period}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={t('teacherEvaluation.periodPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('teacherEvaluation.commentLabel')}</label>
                    <textarea
                      name="comment"
                      value={form.comment}
                      onChange={handleFormChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                      placeholder={t('teacherEvaluation.commentPlaceholder')}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !canManageEvaluations}
                    className="bg-primary text-white px-6 py-3 rounded-xl disabled:opacity-60"
                  >
                    {submitting ? t('teacherEvaluation.saving') : t('teacherEvaluation.submit')}
                  </button>
                </form>
              </>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-border shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium">{t('teacherEvaluation.yourEvaluations')}</h2>
              <div>
                <label htmlFor="ev-filter" className="sr-only">
                  {t('teacherEvaluation.filterByStudent')}
                </label>
                <select
                  id="ev-filter"
                  value={filterStudentId}
                  onChange={(e) => setFilterStudentId(e.target.value)}
                  className="px-4 py-2 border border-border rounded-xl bg-white text-sm"
                >
                  <option value="">{t('teacherEvaluation.allStudents')}</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">{t('common.loading')}</p>
            ) : error ? (
              <p className="text-destructive py-4">{error}</p>
            ) : evaluations.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                {!mainClassesResolved
                  ? t('teacherEvaluation.noEvaluations')
                  : canUseSubmitForm
                    ? t('teacherEvaluation.noEvaluationsSubmitHint')
                    : t('teacherEvaluation.noEvaluationsReadOnlyHint')}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {evaluations.map((ev) => (
                  <li key={ev._id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{studentName(ev)}</span>
                      <span className="text-sm text-muted-foreground">
                        {ev.period || t('common.none')} ·{' '}
                        {ev.createdAt
                          ? new Date(ev.createdAt).toLocaleDateString()
                          : t('common.none')}
                      </span>
                    </div>
                    <p className="text-sm text-primary mt-1">{scoresSummary(ev.scores)}</p>
                    {ev.comment ? (
                      <p className="text-sm text-foreground mt-2">{ev.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
    </div>
  )
}
