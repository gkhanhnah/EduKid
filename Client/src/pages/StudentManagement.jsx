import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudents } from '../hooks/useStudents.js'
import { getClasses } from '../services/classService.js'
import { Sidebar } from '../components/Sidebar.jsx'
import { Link2, Plus, Search, X } from 'lucide-react'
import { createParentStudentLink } from '../services/parentService.js'
import { AnimatePresence, motion as m } from 'framer-motion'

const GENDERS = ['Male', 'Female', 'Other']
const EMPTY_FORM = { name: '', age: '', gender: 'Male', classId: '' }
const AVATARS = ['👦', '👧', '🧒', '👶']

function getAvatar(student, index) {
  if (student.gender === 'Female') return '👧'
  if (student.gender === 'Male') return '👦'
  return AVATARS[index % AVATARS.length]
}

function getStudentClassName(student) {
  if (student.classId && typeof student.classId === 'object') {
    return student.classId.name
  }
  return null
}

export function StudentManagement() {
  const [classFilter, setClassFilter] = useState('')
  const { students, loading, error, refresh, addStudent } = useStudents({
    classId: classFilter || undefined,
  })
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkStudent, setLinkStudent] = useState(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkRelationship, setLinkRelationship] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)

  const loadClasses = useCallback(async () => {
    setClassesLoading(true)
    try {
      const data = await getClasses()
      setClasses(Array.isArray(data) ? data : [])
    } catch {
      setClasses([])
    } finally {
      setClassesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
  }

  function openLinkModal(student) {
    setLinkStudent(student)
    setLinkEmail('')
    setLinkRelationship('')
    setLinkError('')
    setShowLinkModal(true)
  }

  function closeLinkModal() {
    setShowLinkModal(false)
    setLinkStudent(null)
  }

  async function handleLinkSubmit(e) {
    e.preventDefault()
    if (!linkStudent) return
    if (!linkEmail.trim()) {
      setLinkError('Parent email is required.')
      return
    }
    setLinkError('')
    setLinkBusy(true)
    try {
      await createParentStudentLink({
        studentId: linkStudent._id,
        parentEmail: linkEmail.trim(),
        relationship: linkRelationship.trim() || undefined,
      })
      closeLinkModal()
    } catch (err) {
      setLinkError(
        err?.response?.data?.error || err?.message || 'Could not create link.',
      )
    } finally {
      setLinkBusy(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!form.classId) {
      setFormError('Please select a class.')
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      await addStudent({
        name: form.name.trim(),
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender,
        classId: form.classId,
      })
      closeModal()
    } catch (err) {
      setFormError(
        err?.response?.data?.error || err?.message || 'Failed to add student.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="mb-2">Student Management</h1>
              <p className="text-[1.125rem] text-muted-foreground">
                Manage your Grade 1 classroom students
              </p>
            </div>
            <button
              className="bg-primary text-white px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 w-fit"
              onClick={openModal}
            >
              <Plus className="w-5 h-5" />
              Add Student
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
              <div className="text-[2rem] mb-2">👥</div>
              <h3 className="text-[2rem] mb-1">{students.length}</h3>
              <p className="text-[0.9375rem] text-muted-foreground">Students (current filter)</p>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
              <div className="text-[2rem] mb-2">👦</div>
              <h3 className="text-[2rem] mb-1 text-primary">
                {students.filter((s) => s.gender === 'Male').length}
              </h3>
              <p className="text-[0.9375rem] text-muted-foreground">Male</p>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-border">
              <div className="text-[2rem] mb-2">👧</div>
              <h3 className="text-[2rem] mb-1 text-secondary">
                {students.filter((s) => s.gender === 'Female').length}
              </h3>
              <p className="text-[0.9375rem] text-muted-foreground">Female</p>
            </div>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row gap-4 max-w-3xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="sm:w-64">
              <label htmlFor="class-filter" className="sr-only">
                Filter by class
              </label>
              <select
                id="class-filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                disabled={classesLoading}
                className="w-full px-4 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-between">
              <span>{error}</span>
              <button onClick={refresh} className="text-sm underline">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading students…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchTerm
                ? 'No students match your search.'
                : 'No students yet. Add a class under Class management, then add students here.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((student, index) => (
                <m.div
                  key={student._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  className="bg-white rounded-3xl p-6 shadow-lg border border-border flex flex-col"
                >
                  <Link
                    to={`/students/${student._id}`}
                    className="flex flex-col items-center text-center flex-1 rounded-2xl -m-2 p-2 hover:bg-muted/30 transition-colors"
                  >
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt=""
                        className="w-20 h-20 rounded-3xl object-cover mb-4 shadow-lg border border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[3rem] mb-4 shadow-lg">
                        {getAvatar(student, index)}
                      </div>
                    )}
                    <h4 className="mb-1">{student.name}</h4>
                    {getStudentClassName(student) && (
                      <p className="text-sm text-muted-foreground">
                        {getStudentClassName(student)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                      {student.age && (
                        <span className="text-sm text-muted-foreground">
                          Age {student.age}
                        </span>
                      )}
                      {student.gender && (
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
                            student.gender === 'Female'
                              ? 'bg-pink-100 text-pink-600'
                              : student.gender === 'Male'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {student.gender}
                        </span>
                      )}
                    </div>
                    <span className="mt-3 text-xs text-primary font-medium">
                      View profile →
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openLinkModal(student)}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline"
                  >
                    <Link2 className="w-4 h-4" />
                    Link parent
                  </button>
                </m.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal()
            }}
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add New Student</h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Student name"
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input
                    name="age"
                    type="number"
                    min="1"
                    max="18"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="e.g. 6"
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Class <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="classId"
                    value={form.classId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    disabled={classesLoading || classes.length === 0}
                  >
                    <option value="">Select a class…</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {!classesLoading && classes.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a class under Class management first.
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 border border-border rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {submitting ? 'Saving…' : 'Add Student'}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLinkModal && linkStudent && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeLinkModal()
            }}
          >
            <m.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Link parent</h2>
                <button
                  type="button"
                  onClick={closeLinkModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Connect <span className="font-medium text-foreground">{linkStudent.name}</span> to a
                parent account by email (must match their registered email).
              </p>
              {linkError ? (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm">
                  {linkError}
                </div>
              ) : null}
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Parent email *</label>
                  <input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="parent@example.com"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Relationship (optional)</label>
                  <input
                    value={linkRelationship}
                    onChange={(e) => setLinkRelationship(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Mother, Guardian"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeLinkModal}
                    className="flex-1 px-4 py-3 border border-border rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linkBusy}
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl disabled:opacity-60"
                  >
                    {linkBusy ? 'Linking…' : 'Link parent'}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
