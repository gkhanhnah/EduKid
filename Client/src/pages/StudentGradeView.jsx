import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { LoadingState } from '../components/LoadingState.jsx'
import { ErrorBanner } from '../components/ErrorBanner.jsx'
import { getStudentGrades } from '../services/grade.service.js'
import { homePathForRole } from '../utils/authPaths.js'

function formatNumberOrDash(v, digits = 2) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

export function StudentGradeView() {
  const { user } = useAuth()
  const { studentId } = useParams()

  if (user?.role && user.role !== 'parent') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

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
      setError(e?.response?.data?.error || e?.message || 'Could not load grades')
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
            <LoadingState label="Loading student grades…" />
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

  const studentName = data?.student?.name ?? 'Student'
  const weightedAverage = data?.weightedAverage
  const grades = data?.grades ?? []

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Student Grades</h1>
            <p className="text-muted-foreground">
              {studentName} - visible grades are shown only after your teacher clicks “Show”.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Weighted Average</div>
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {weightedAverage == null ? '—' : formatNumberOrDash(weightedAverage, 2)}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {grades.length ? `${grades.length} grade(s) visible` : 'No grades are visible yet'}
              </div>
            </div>
          </div>

          {grades.length ? (
            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-3">Visible Grades</h2>
              <div className="space-y-3">
                {grades
                  .slice()
                  .sort((a, b) => (a?.type?.name ?? '').localeCompare(b?.type?.name ?? ''))
                  .map((g) => (
                    <div key={g._id} className="rounded-2xl border border-border/60 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{g?.type?.name ?? 'Grade'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Weight: {formatNumberOrDash(g?.type?.weight, 2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary tabular-nums">
                            {formatNumberOrDash(g?.score, 0)}
                          </div>
                          <div className="text-xs text-secondary font-medium mt-1">
                            Visible
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-border p-5 md:p-6 shadow-sm text-muted-foreground">
              <p className="font-medium text-foreground">Grades aren’t available yet.</p>
              <p className="mt-1 text-sm">
                Your teacher will show grades to parents when they are ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

