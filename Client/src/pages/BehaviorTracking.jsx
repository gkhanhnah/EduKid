import { useEffect, useState } from 'react'
import { useStudents } from '../hooks/useStudents.js'
import { useBehaviors } from '../hooks/useBehaviors.js'
import { createBehavior } from '../services/api.js'
import { getClasses } from '../services/api.js'
import { Sidebar } from '../components/Sidebar.jsx'
import { motion as m } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'

const BEHAVIOR_TYPES = [
  { value: 'GOOD', label: 'Good', emoji: '👍', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  { value: 'BAD', label: 'Bad', emoji: '👎', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
  { value: 'ACTIVE', label: 'Active', emoji: '⭐', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  { value: 'SLEEPY', label: 'Sleepy', emoji: '😴', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
]

const today = new Date().toISOString().split('T')[0]
const EMPTY_FORM = { studentId: '', behaviorType: 'GOOD', description: '', date: today }

function getBehaviorMeta(type) {
  const u = String(type ?? '').toUpperCase()
  return BEHAVIOR_TYPES.find((bt) => bt.value === u) ?? BEHAVIOR_TYPES[0]
}

function resolveStudentName(record) {
  if (record.student && typeof record.student === 'object') {
    return record.student.name ?? '—'
  }
  if (record.studentId && typeof record.studentId === 'object') {
    return record.studentId.name ?? '—'
  }
  return '—'
}

function recordNote(record) {
  return (record.note ?? record.description ?? '').trim()
}

export function BehaviorTracking({ embedded = false }) {
  const { user } = useAuth()
  const { students, loading: studentsLoading } = useStudents()
  const { behaviors, loading: behaviorsLoading, error: behaviorsError, refresh } = useBehaviors()

  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [mainClassIds, setMainClassIds] = useState([])

  const selectedStudent = students.find((s) => String(s._id) === String(form.studentId))
  const selectedClassId = String(selectedStudent?.classId?._id ?? selectedStudent?.classId ?? '')
  const canCreateBehavior = Boolean(
    user?.role === 'teacher' && selectedClassId && mainClassIds.includes(selectedClassId),
  )

  useEffect(() => {
    let cancelled = false
    async function loadMainClasses() {
      if (user?.role !== 'teacher') return
      try {
        const d = await getClasses()
        if (cancelled) return
        const ids = Array.isArray(d) ? d.filter((c) => c?.isMainTeacher).map((c) => String(c._id)) : []
        setMainClassIds(ids)
      } catch {
        if (cancelled) return
        setMainClassIds([])
      }
    }
    loadMainClasses()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  const totalGood = behaviors.filter((b) => (b.behaviorType ?? b.type) === 'GOOD').length
  const totalBad = behaviors.filter((b) => (b.behaviorType ?? b.type) === 'BAD').length
  const totalActive = behaviors.filter((b) => (b.behaviorType ?? b.type) === 'ACTIVE').length
  const totalSleepy = behaviors.filter((b) => (b.behaviorType ?? b.type) === 'SLEEPY').length

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canCreateBehavior) {
      setFormError('Read-only: only Main teacher can create behavior records for this student.')
      return
    }
    if (!form.studentId) {
      setFormError('Please select a student.')
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      await createBehavior({
        studentId: form.studentId,
        type: form.behaviorType,
        behaviorType: form.behaviorType,
        note: form.description.trim() || undefined,
        description: form.description.trim() || undefined,
        date: form.date || undefined,
      })
      setForm(EMPTY_FORM)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 2500)
      refresh()
    } catch (err) {
      setFormError(err.message || 'Failed to save behavior record.')
    } finally {
      setSubmitting(false)
    }
  }

  const statTiles = [
    { ...BEHAVIOR_TYPES[0], count: totalGood },
    { ...BEHAVIOR_TYPES[1], count: totalBad },
    { ...BEHAVIOR_TYPES[2], count: totalActive },
    { ...BEHAVIOR_TYPES[3], count: totalSleepy },
  ]

  const content = (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {!embedded && (
        <div className="mb-8">
          <h1 className="mb-2">Behavior Tracking</h1>
          <p className="text-[1.125rem] text-muted-foreground">
            Record and review student behavior evaluations
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statTiles.map((bt, i) => (
          <m.div
            key={bt.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-border"
          >
            <div className="text-[2.5rem] mb-2">{bt.emoji}</div>
            <h3 className={`text-[2rem] mb-1 ${bt.text}`}>{bt.count}</h3>
            <p className="text-[0.9375rem] text-muted-foreground">{bt.label} Behaviors</p>
          </m.div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-lg border border-border mb-8">
        <h2 className="text-lg font-semibold mb-6">New Behavior Record</h2>

        {user?.role === 'teacher' && form.studentId && !canCreateBehavior ? (
          <p className="mb-4 p-3 bg-muted/40 text-sm text-muted-foreground rounded-xl">
            Read-only: only Main teacher can create behavior records for the selected student.
          </p>
        ) : null}

        {formError && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
            {formError}
          </div>
        )}
        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
            ✅ Behavior record saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Student <span className="text-destructive">*</span>
              </label>
              <select
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                disabled={studentsLoading}
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">Select a student…</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Behavior Type</label>
              <div className="grid grid-cols-2 gap-2">
                {BEHAVIOR_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, behaviorType: bt.value }))}
                    disabled={!canCreateBehavior}
                    className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                      form.behaviorType === bt.value
                        ? `${bt.bg} ${bt.border} ${bt.text} font-medium`
                        : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{bt.emoji}</span>
                    <span className="text-xs mt-1">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What happened? (optional)"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!canCreateBehavior}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!canCreateBehavior}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !canCreateBehavior}
            className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Behavior Record'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-lg border border-border">
        <h2 className="text-lg font-semibold mb-6">Recent Records</h2>

        {behaviorsLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading records…</p>
        ) : behaviorsError ? (
          <p className="text-center py-8 text-destructive">{behaviorsError}</p>
        ) : behaviors.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No behavior records yet.
          </p>
        ) : (
          <div className="space-y-3">
            {behaviors.map((record) => {
              const bt = getBehaviorMeta(record.behaviorType ?? record.type)
              const studentName = resolveStudentName(record)
              const dateStr = record.date
                ? new Date(record.date).toLocaleDateString()
                : new Date(record.createdAt).toLocaleDateString()
              const text = recordNote(record)
              return (
                <m.div
                  key={record._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl">{bt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{studentName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${bt.bg} ${bt.border} ${bt.text}`}
                      >
                        {bt.label}
                      </span>
                    </div>
                    {text ? (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{text}</p>
                    ) : null}
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">{dateStr}</span>
                </m.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  if (embedded) return content

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">{content}</div>
    </div>
  )
}
