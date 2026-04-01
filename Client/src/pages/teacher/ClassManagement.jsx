import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../../components/Sidebar.jsx'
import {
  getClasses,
  createClass,
  deleteClass,
  addStudentToClass,
  addSubjectTeacherToClass,
  getPendingSubjectTeacherInvitations,
  acceptPendingSubjectTeacherInvitation,
  declinePendingSubjectTeacherInvitation,
} from '../../services/classService.js'
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
  const { t } = useTranslation()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [pendingLoading, setPendingLoading] = useState(true)

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
      setError(e?.response?.data?.error || e?.message || t('teacherClassManagement.loadFailed'))
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadPendingInvitations = useCallback(async () => {
    setPendingLoading(true)
    try {
      const data = await getPendingSubjectTeacherInvitations()
      setPendingInvitations(data?.invitations || [])
    } catch {
      // If server returns 403/404, treat as "no pending invitations" for UX purposes.
      setPendingInvitations([])
    } finally {
      setPendingLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPendingInvitations()
  }, [loadPendingInvitations])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError(t('teacherClassManagement.classNameRequired'))
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
      setFormError(e?.response?.data?.error || e?.message || t('teacherClassManagement.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('teacherClassManagement.deleteConfirm'))) return
    try {
      await deleteClass(id)
      setClasses((prev) => prev.filter((c) => String(c._id) !== String(id)))
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || t('teacherClassManagement.deleteFailed'))
    }
  }

  async function submitQuickStudent(e) {
    e.preventDefault()
    setQuickErr('')
    if (!quickStudent.name.trim()) {
      setQuickErr(t('teacherClassManagement.nameRequired'))
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
      setQuickErr(err?.response?.data?.error || err?.message || t('teacherClassManagement.actionFailed'))
    } finally {
      setQuickBusy(false)
    }
  }

  async function submitQuickTeacher(e) {
    e.preventDefault()
    setQuickErr('')
    if (!quickTeacherId.trim()) {
      setQuickErr(t('teacherClassManagement.teacherEmailRequired'))
      return
    }
    setQuickBusy(true)
    try {
      await addSubjectTeacherToClass(quickClassId, {
        teacherEmail: quickTeacherId.trim(),
      })
      setQuickTeacherId('')
      setQuickMode(null)
      setQuickClassId(null)
      load()
    } catch (err) {
      setQuickErr(err?.response?.data?.error || err?.message || t('teacherClassManagement.actionFailed'))
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
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-1">{t('teacherClassManagement.title')}</h1>
              <p className="text-muted-foreground">
                {t('teacherClassManagement.subtitle')}
              </p>
            </div>

            {pendingLoading ? null : pendingInvitations.length ? (
              <div className="mb-6 p-4 rounded-2xl border border-border bg-white">
                <h2 className="font-medium mb-2">{t('teacherClassManagement.pendingInvitations')}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('teacherClassManagement.pendingInvitationsHelp')}
                </p>
                <div className="space-y-3">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={`${inv.classId}-${inv.invite?.createdAt ?? 'na'}`}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-[200px]">
                        <p className="font-medium">{inv.className}</p>
                        {inv.invite?.email ? (
                          <p className="text-sm text-muted-foreground">
                            {t('teacherClassManagement.invited', { email: inv.invite.email })}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await acceptPendingSubjectTeacherInvitation(inv.classId)
                              await load()
                              await loadPendingInvitations()
                            } catch (e) {
                              alert(e?.response?.data?.error || e?.message || t('teacherClassManagement.acceptFailed'))
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-primary text-white text-sm"
                          disabled={quickBusy || pendingLoading}
                        >
                          {t('teacherClassManagement.accept')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await declinePendingSubjectTeacherInvitation(inv.classId)
                              await loadPendingInvitations()
                            } catch (e) {
                              alert(e?.response?.data?.error || e?.message || t('teacherClassManagement.declineFailed'))
                            }
                          }}
                          className="px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                          disabled={pendingLoading}
                        >
                          {t('teacherClassManagement.decline')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setFormError('')
                setCreateOpen(true)
              }}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl shadow-md hover:opacity-95"
            >
              <Plus className="w-5 h-5" />
              {t('teacherClassManagement.newClass')}
            </button>
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive flex justify-between items-center">
              <span>{error}</span>
              <button type="button" className="underline text-sm" onClick={load}>
                {t('common.tryAgain')}
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              {t('teacherClassManagement.loading')}
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-white/50">
              <p className="text-muted-foreground mb-4">{t('teacherClassManagement.noClasses')}</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="text-primary font-medium underline"
              >
                {t('teacherClassManagement.createFirstClass')}
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
                      {t('teacherClassManagement.gradeLabel')}{' '}
                      {c.grade !== undefined && c.grade !== null && c.grade !== ''
                        ? c.grade
                        : t('common.none')}
                    </p>
                    <p className="text-sm mt-2">
                      <span className="text-muted-foreground">{t('teacherClassManagement.mainTeacher')}</span>{' '}
                      {c.mainTeacher && typeof c.mainTeacher === 'object'
                        ? c.mainTeacher.name
                        : t('common.none')}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {t('teacherClassManagement.studentCount', { count: c.studentCount ?? 0 })}
                      </span>
                      <span>{t('teacherClassManagement.teacherCount', { count: c.teacherCount ?? 1 })}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-border">
                    <Link
                      to={`/classes/${c._id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      {t('teacherClassManagement.viewDetails')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => openQuickStudent(c._id)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                    >
                      <UserPlus className="w-4 h-4" />
                      {t('common.addStudent')}
                    </button>
                    {c.isMainTeacher ? (
                      <button
                        type="button"
                        onClick={() => openQuickTeacher(c._id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted"
                      >
                        <GraduationCap className="w-4 h-4" />
                        {t('teacherClassManagement.inviteTeacher')}
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
              <h2 className="text-lg font-semibold mb-4">{t('teacherClassManagement.createClass')}</h2>
              {formError ? (
                <p className="text-sm text-destructive mb-3" role="alert">
                  {formError}
                </p>
              ) : null}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('teacherClassManagement.nameLabel')}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('teacherClassManagement.namePlaceholder')}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('teacherClassManagement.grade')}</label>
                  <input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder={t('teacherClassManagement.gradePlaceholder')}
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
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-primary text-white disabled:opacity-60"
                  >
                    {submitting ? t('teacherClassManagement.saving') : t('common.create')}
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
              <h3 className="font-semibold mb-4">{t('common.addStudent')}</h3>
              {quickErr ? <p className="text-sm text-destructive mb-2">{quickErr}</p> : null}
              <form onSubmit={submitQuickStudent} className="space-y-3">
                <input
                  placeholder={t('teacherClassManagement.studentNamePlaceholder')}
                  value={quickStudent.name}
                  onChange={(e) =>
                    setQuickStudent((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <input
                  placeholder={t('teacherClassManagement.agePlaceholder')}
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
                  <option value="">{t('teacherClassManagement.gender')}</option>
                  <option value="Male">{t('teacherClassManagement.male')}</option>
                  <option value="Female">{t('teacherClassManagement.female')}</option>
                  <option value="Other">{t('teacherClassManagement.other')}</option>
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
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={quickBusy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {quickBusy ? t('teacherClassManagement.saving') : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {quickMode === 'teacher' && quickClassId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-2">{t('teacherClassManagement.inviteSubjectTeacher')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('teacherClassManagement.inviteTeacherHelp')}
              </p>
              {quickErr ? <p className="text-sm text-destructive mb-2">{quickErr}</p> : null}
              <form onSubmit={submitQuickTeacher} className="space-y-3">
                <input
                  placeholder={t('teacherClassManagement.teacherEmailPlaceholder')}
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
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={quickBusy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {quickBusy ? t('teacherClassManagement.inviting') : t('teacherClassManagement.invite')}
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
