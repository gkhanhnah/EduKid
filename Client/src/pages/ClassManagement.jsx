import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import {
  getClasses,
  createClass,
  deleteClass,
  addStudentToClass,
  addSubjectTeacherToClass,
} from '../services/classService.js'
import {
  Plus,
  Trash2,
  Eye,
  UserPlus,
  GraduationCap,
  Loader2,
  Users,
} from 'lucide-react'

export function ClassManagement() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [quickClassId, setQuickClassId] = useState(null)
  const [quickMode, setQuickMode] = useState(null)
  const [quickStudent, setQuickStudent] = useState({ name: '', age: '', gender: '' })
  const [quickTeacherId, setQuickTeacherId] = useState('')
  const [quickErr, setQuickErr] = useState('')
  const [quickBusy, setQuickBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getClasses()
      setClasses(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load classes')
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError('Class name is required.')
      return
    }
    setSubmitting(true)
    try {
      const gradeVal =
        grade.trim() === ''
          ? undefined
          : Number.isNaN(Number(grade))
            ? grade.trim()
            : Number(grade)
      const created = await createClass({
        name: name.trim(),
        ...(gradeVal !== undefined && gradeVal !== '' ? { grade: gradeVal } : {}),
      })
      setClasses((prev) =>
        [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      )
      setName('')
      setGrade('')
      setCreateOpen(false)
    } catch (e) {
      setFormError(e?.response?.data?.error || e?.message || 'Could not create class')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this class? It must have no students.')) return
    try {
      await deleteClass(id)
      setClasses((prev) => prev.filter((c) => String(c._id) !== String(id)))
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Delete failed')
    }
  }

  async function submitQuickStudent(e) {
    e.preventDefault()
    setQuickErr('')
    if (!quickStudent.name.trim()) {
      setQuickErr('Name is required')
      return
    }
    setQuickBusy(true)
    try {
      await addStudentToClass(quickClassId, {
        name: quickStudent.name.trim(),
        age: quickStudent.age === '' ? undefined : Number(quickStudent.age),
        gender: quickStudent.gender || undefined,
      })
      setQuickStudent({ name: '', age: '', gender: '' })
      setQuickMode(null)
      setQuickClassId(null)
      load()
    } catch (err) {
      setQuickErr(err?.response?.data?.error || err?.message || 'Failed')
    } finally {
      setQuickBusy(false)
    }
  }

  async function submitQuickTeacher(e) {
    e.preventDefault()
    setQuickErr('')
    if (!quickTeacherId.trim()) {
      setQuickErr('Teacher user ID required')
      return
    }
    setQuickBusy(true)
    try {
      await addSubjectTeacherToClass(quickClassId, {
        teacherUserId: quickTeacherId.trim(),
      })
      setQuickTeacherId('')
      setQuickMode(null)
      setQuickClassId(null)
      load()
    } catch (err) {
      setQuickErr(err?.response?.data?.error || err?.message || 'Failed')
    } finally {
      setQuickBusy(false)
    }
  }

  function openQuickStudent(classId) {
    setQuickClassId(classId)
    setQuickMode('student')
    setQuickErr('')
    setQuickStudent({ name: '', age: '', gender: '' })
  }

  function openQuickTeacher(classId) {
    setQuickClassId(classId)
    setQuickMode('teacher')
    setQuickErr('')
    setQuickTeacherId('')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Class management</h1>
              <p className="text-muted-foreground">
                Your classes (as main or subject teacher). Open a class for full detail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormError('')
                setCreateOpen(true)
              }}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl shadow-md hover:opacity-95"
            >
              <Plus className="w-5 h-5" />
              New class
            </button>
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive flex justify-between items-center">
              <span>{error}</span>
              <button type="button" className="underline text-sm" onClick={load}>
                Retry
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading classes…
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-white/50">
              <p className="text-muted-foreground mb-4">No classes yet.</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="text-primary font-medium underline"
              >
                Create your first class
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
              {classes.map((c) => (
                <div
                  key={c._id}
                  className="bg-white rounded-3xl border border-border shadow-lg p-6 flex flex-col gap-4"
                >
                  <div>
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Grade:{' '}
                      {c.grade !== undefined && c.grade !== null && c.grade !== ''
                        ? c.grade
                        : '—'}
                    </p>
                    <p className="text-sm mt-2">
                      <span className="text-muted-foreground">Main teacher:</span>{' '}
                      {c.mainTeacher && typeof c.mainTeacher === 'object'
                        ? c.mainTeacher.name
                        : '—'}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {c.studentCount ?? 0} students
                      </span>
                      <span>{c.teacherCount ?? 1} teachers</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border">
                    <Link
                      to={`/classes/${c._id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => openQuickStudent(c._id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add student
                    </button>
                    {c.isMainTeacher ? (
                      <button
                        type="button"
                        onClick={() => openQuickTeacher(c._id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                      >
                        <GraduationCap className="w-4 h-4" />
                        Invite teacher
                      </button>
                    ) : null}
                    {c.isMainTeacher ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 text-sm ml-auto"
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create class modal */}
        {createOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-xl border border-border">
              <h2 className="text-lg font-semibold mb-4">Create class</h2>
              {formError ? (
                <p className="text-sm text-destructive mb-3" role="alert">
                  {formError}
                </p>
              ) : null}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Grade 1A"
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Grade</label>
                  <input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-3 rounded-xl border border-border"
                    onClick={() => setCreateOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-primary text-white disabled:opacity-60"
                  >
                    {submitting ? 'Saving…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Quick add student */}
        {quickMode === 'student' && quickClassId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-4">Add student</h3>
              {quickErr ? <p className="text-sm text-destructive mb-2">{quickErr}</p> : null}
              <form onSubmit={submitQuickStudent} className="space-y-3">
                <input
                  placeholder="Name *"
                  value={quickStudent.name}
                  onChange={(e) =>
                    setQuickStudent((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <input
                  placeholder="Age"
                  type="number"
                  value={quickStudent.age}
                  onChange={(e) =>
                    setQuickStudent((p) => ({ ...p, age: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <select
                  value={quickStudent.gender}
                  onChange={(e) =>
                    setQuickStudent((p) => ({ ...p, gender: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border"
                    onClick={() => {
                      setQuickMode(null)
                      setQuickClassId(null)
                    }}
                    disabled={quickBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickBusy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {quickBusy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {quickMode === 'teacher' && quickClassId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-2">Invite subject teacher</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Teacher&apos;s Mongo user ID (ObjectId).
              </p>
              {quickErr ? <p className="text-sm text-destructive mb-2">{quickErr}</p> : null}
              <form onSubmit={submitQuickTeacher} className="space-y-3">
                <input
                  placeholder="Teacher user ID"
                  value={quickTeacherId}
                  onChange={(e) => setQuickTeacherId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl font-mono text-sm"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border"
                    onClick={() => {
                      setQuickMode(null)
                      setQuickClassId(null)
                    }}
                    disabled={quickBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickBusy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {quickBusy ? 'Inviting…' : 'Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
