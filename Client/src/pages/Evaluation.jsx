import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useStudents } from '../hooks/useStudents.js'
import { useEvaluations } from '../hooks/useEvaluations.js'
import { submitEvaluation } from '../services/evaluationService.js'
import { Sidebar } from '../components/Sidebar.jsx'
import { ClipboardCheck } from 'lucide-react'

const EMPTY_FORM = {
  studentId: '',
  math: '',
  reading: '',
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

export function Evaluation() {
  const { user } = useAuth()
  const { students, loading: studentsLoading } = useStudents()
  const [filterStudentId, setFilterStudentId] = useState('')
  const { evaluations, loading, error, refresh } = useEvaluations({
    studentId: filterStudentId || undefined,
  })
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (user?.role !== 'teacher') {
    return <Navigate to="/parent-dashboard" replace />
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSuccess(false)
    if (!form.studentId) {
      setFormError('Select a student.')
      return
    }
    if (!form.period?.trim()) {
      setFormError('Period is required (e.g. Week 1, Q1).')
      return
    }
    setSubmitting(true)
    try {
      const scores = {}
      if (form.math !== '' && !Number.isNaN(Number(form.math))) {
        scores.math = Number(form.math)
      }
      if (form.reading !== '' && !Number.isNaN(Number(form.reading))) {
        scores.reading = Number(form.reading)
      }
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
        err?.response?.data?.error || err?.message || 'Could not save evaluation.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-semibold">Student evaluations</h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Record scores and comments for students in your classes.
          </p>

          <section className="bg-white rounded-3xl border border-border shadow-lg p-6 mb-8">
            <h2 className="text-lg font-medium mb-4">New evaluation</h2>
            {success ? (
              <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                Evaluation saved.
              </p>
            ) : null}
            {formError ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student *</label>
                <select
                  name="studentId"
                  value={form.studentId}
                  onChange={handleFormChange}
                  disabled={studentsLoading}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select student…</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Math score</label>
                  <input
                    name="math"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.math}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 85"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reading score</label>
                  <input
                    name="reading"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.reading}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 90"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Period *</label>
                <input
                  name="period"
                  value={form.period}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Week 3, Q1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comment</label>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Notes for parents…"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary text-white px-6 py-3 rounded-xl disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Submit evaluation'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-3xl border border-border shadow-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-medium">Your evaluations</h2>
              <div>
                <label htmlFor="ev-filter" className="sr-only">
                  Filter by student
                </label>
                <select
                  id="ev-filter"
                  value={filterStudentId}
                  onChange={(e) => setFilterStudentId(e.target.value)}
                  className="px-4 py-2 border border-border rounded-xl bg-white text-sm"
                >
                  <option value="">All students</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading…</p>
            ) : error ? (
              <p className="text-destructive py-4">{error}</p>
            ) : evaluations.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No evaluations yet. Submit one using the form above.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {evaluations.map((ev) => (
                  <li key={ev._id} className="py-4 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{studentName(ev)}</span>
                      <span className="text-sm text-muted-foreground">
                        {ev.period || '—'} ·{' '}
                        {ev.createdAt
                          ? new Date(ev.createdAt).toLocaleDateString()
                          : '—'}
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
      </div>
    </div>
  )
}
