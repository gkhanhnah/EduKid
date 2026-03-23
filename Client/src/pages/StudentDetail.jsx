import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import { getStudentById } from '../services/api.js'
import { ArrowLeft, Loader2, Mail, User } from 'lucide-react'

function displayInitials(name) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function genderEmoji(gender) {
  if (gender === 'Female') return '👧'
  if (gender === 'Male') return '👦'
  return '🧒'
}

export function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getStudentById(id)
      setStudent(data)
    } catch (e) {
      setStudent(null)
      setError(
        e?.response?.data?.error || e?.message || 'Could not load student',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const classId =
    student?.classId && typeof student.classId === 'object'
      ? student.classId._id
      : student?.classId
  const className =
    student?.classId && typeof student.classId === 'object'
      ? student.classId.name
      : null
  const grade =
    student?.classId && typeof student.classId === 'object'
      ? student.classId.grade
      : null

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
              {error}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="underline text-sm"
                  onClick={() => navigate('/classes')}
                >
                  Class list
                </button>
                <button
                  type="button"
                  className="underline text-sm"
                  onClick={() => navigate('/students')}
                >
                  Students
                </button>
              </div>
            </div>
          ) : student ? (
            <>
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
                <div className="p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                  <div className="shrink-0">
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt=""
                        className="w-28 h-28 rounded-2xl object-cover border border-border shadow-md"
                      />
                    ) : (
                      <div
                        className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-secondary flex flex-col items-center justify-center text-white shadow-md border border-border/20"
                        aria-hidden
                      >
                        <span className="text-3xl leading-none mb-1">
                          {genderEmoji(student.gender)}
                        </span>
                        <span className="text-lg font-semibold tracking-wide">
                          {displayInitials(student.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold">{student.name}</h1>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                      {student.age != null && student.age !== '' ? (
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                          Age {student.age}
                        </span>
                      ) : null}
                      {student.gender ? (
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                          {student.gender}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 text-sm">
                      <span className="text-muted-foreground">Class: </span>
                      {classId && className ? (
                        <Link
                          to={`/classes/${classId}`}
                          className="text-primary font-medium hover:underline"
                        >
                          {className}
                          {grade !== undefined &&
                          grade !== null &&
                          grade !== '' ? (
                            <span className="text-muted-foreground font-normal">
                              {' '}
                              · Grade {grade}
                            </span>
                          ) : null}
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
                <h2 className="font-medium flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  Parents ({student.parents?.length ?? 0})
                </h2>
                {student.parents?.length ? (
                  <ul className="space-y-3">
                    {student.parents.map((row) => (
                      <li
                        key={row._id}
                        className="flex flex-wrap items-start gap-3 p-4 rounded-xl border border-border bg-muted/20"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {row.parent?.name ?? 'Parent'}
                          </p>
                          {row.parent?.email ? (
                            <p className="text-sm text-muted-foreground break-all">
                              {row.parent.email}
                            </p>
                          ) : null}
                          {row.relationship ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Relationship: {row.relationship}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No parents linked yet. Use &quot;Add parent&quot; on the
                    class page or Students list.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
