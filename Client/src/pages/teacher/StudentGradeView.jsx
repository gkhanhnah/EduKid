import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../../components/Sidebar.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { LoadingState } from '../../components/LoadingState.jsx'
import { ErrorBanner } from '../../components/ErrorBanner.jsx'
import { getStudentGrades } from '../../services/grade.service.js'
import { homePathForRole } from '../../utils/authPaths.js'
import { ArrowLeft } from 'lucide-react'

function formatNumberOrDash(v, digits = 2) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

export function StudentGradeView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { studentId } = useParams()
  const isAdmin = user?.role === 'admin'
  const isParent = user?.role === 'parent'
  const backHref = isAdmin ? '/admin/classes' : isParent ? '/parent-dashboard' : '/classes'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await getStudentGrades(studentId)
      setData(d)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('teacherStudentGrades.loadFailed'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <LoadingState label={t('teacherStudentGrades.loading')} />
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
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <ErrorBanner message={error} onRetry={load} />
          </div>
        </div>
      </div>
    )
  }

  const studentName = data?.student?.name ?? t('common.student')
  const weightedAverage = data?.weightedAverage
  const grades = data?.grades ?? []

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAdmin ? t('teacherStudentGrades.backToClasses') : isParent ? t('teacherStudentGrades.backToDashboard') : t('teacherStudentGrades.backToClasses')}
          </Link>
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('teacherStudentGrades.title')}</h1>
            <p className="text-muted-foreground">
              {t('teacherStudentGrades.subtitle', { studentName })}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{t('teacherStudentGrades.weightedAverage')}</div>
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {weightedAverage == null ? t('common.none') : formatNumberOrDash(weightedAverage, 2)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {grades.length ? t('teacherStudentGrades.visibleGradesCount', { count: grades.length }) : t('teacherStudentGrades.noGradesVisible')}
              </div>
            </div>
          </div>

          {grades.length ? (
            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-3">{t('teacherStudentGrades.visibleGrades')}</h2>
              <div className="space-y-3">
                {grades
                  .slice()
                  .sort((a, b) => (a?.type?.name ?? '').localeCompare(b?.type?.name ?? ''))
                  .map((g) => (
                    <div key={g._id} className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{g?.type?.name ?? t('teacherStudentGrades.grade')}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('teacherStudentGrades.weight')}: {formatNumberOrDash(g?.type?.weight, 2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary tabular-nums">
                            {formatNumberOrDash(g?.score, 0)}
                          </div>
                          <div className="text-xs text-secondary font-medium mt-1">
                            {t('teacherStudentGrades.visible')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t('teacherStudentGrades.noGradesTitle')}</p>
              <p className="mt-1 text-sm">
                {t('teacherStudentGrades.noGradesDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

