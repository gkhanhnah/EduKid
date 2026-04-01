import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '../../components/Sidebar.jsx'
import {
  getClassById,
  addStudentToClass,
  addSubjectTeacherToClass,
  addParentToStudent,
} from '../../services/classService.js'
import {
  ArrowLeft,
  Loader2,
  UserPlus,
  Users,
  Mail,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  CalendarDays,
} from 'lucide-react'

export function ClassDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [studentOpen, setStudentOpen] = useState(false)
  const [teacherOpen, setTeacherOpen] = useState(false)
  const [parentModal, setParentModal] = useState(null)
  const [form, setForm] = useState({ name: '', age: '', gender: '' })
  const [teacherIdInput, setTeacherIdInput] = useState('')
  const [parentForm, setParentForm] = useState({ email: '', relationship: '' })
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getClassById(id)
      setDetail(data)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t('teacherClassDetail.loadFailed'))
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function submitStudent(e) {
    e.preventDefault()
    setFormErr('')
    if (!form.name.trim()) {
      setFormErr(t('teacherClassDetail.nameRequired'))
      return
    }
    setBusy(true)
    try {
      await addStudentToClass(id, {
        name: form.name.trim(),
        age: form.age === '' ? undefined : Number(form.age),
        gender: form.gender || undefined,
      })
      setForm({ name: '', age: '', gender: '' })
      setStudentOpen(false)
      load()
    } catch (err) {
      setFormErr(err?.response?.data?.error || err?.message || t('teacherClassDetail.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function submitTeacher(e) {
    e.preventDefault()
    setFormErr('')
    if (!teacherIdInput.trim()) {
      setFormErr(t('teacherClassDetail.teacherEmailRequired'))
      return
    }
    setBusy(true)
    try {
      await addSubjectTeacherToClass(id, { teacherEmail: teacherIdInput.trim() })
      setTeacherIdInput('')
      setTeacherOpen(false)
      load()
    } catch (err) {
      setFormErr(err?.response?.data?.error || err?.message || t('teacherClassDetail.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function submitParent(e) {
    e.preventDefault()
    if (!parentModal) return
    setFormErr('')
    if (!parentForm.email.trim()) {
      setFormErr(t('teacherClassDetail.parentEmailRequired'))
      return
    }
    setBusy(true)
    try {
      await addParentToStudent(parentModal, {
        parentEmail: parentForm.email.trim(),
        relationship: parentForm.relationship.trim() || undefined,
      })
      setParentForm({ email: '', relationship: '' })
      setParentModal(null)
      load()
    } catch (err) {
      setFormErr(err?.response?.data?.error || err?.message || t('teacherClassDetail.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/classes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('teacherClassDetail.backToClasses')}
          </Link>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
              {t('teacherClassDetail.loading')}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive">
              {error}
              <button
                type="button"
                className="block mt-4 underline text-sm"
                onClick={() => navigate('/classes')}
              >
                {t('teacherClassDetail.returnToList')}
              </button>
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-semibold">{detail.name}</h1>
                  <p className="text-muted-foreground mt-1">
                    {t('teacherClassDetail.gradeLabel')}{' '}
                    {detail.grade !== undefined &&
                      detail.grade !== null &&
                      detail.grade !== ''
                      ? detail.grade
                      : t('common.none')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/classes/${id}/timetable`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm"
                  >
                    {t('teacherClassDetail.viewTimetable')}
                  </Link>
                  <Link
                    to={`/classes/${id}/chat`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-sm"
                  >
                    {t('teacherClassDetail.openChat')}
                  </Link>
                  <Link
                    to={`/classes/${id}/grades`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm"
                  >
                    <ClipboardCheck className="w-4 h-4 text-primary" />
                    {t('common.grades')}
                  </Link>
                  <Link
                    to={`/classes/${id}/homework`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm"
                  >
                    <BookOpen className="w-4 h-4 text-primary" />
                    {t('common.homework')}
                  </Link>
                  {detail.isMainTeacher ? (
                    <Link
                      to={`/classes/${id}/attendance`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm"
                    >
                      <CalendarDays className="w-4 h-4 text-primary" />
                      {t('common.attendance')}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setFormErr('')
                      setStudentOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t('common.addStudent')}
                  </button>
                  {detail.isMainTeacher ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormErr('')
                        setTeacherOpen(true)
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm"
                    >
                      <GraduationCap className="w-4 h-4" />
                      {t('teacherClassDetail.inviteTeacher')}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h2 className="font-medium flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-primary" />
                    {t('teacherClassDetail.mainTeacher')}
                  </h2>
                  {/* Cập nhật font name cho Main teacher */}
                  <p className="text-base font-medium text-foreground">
                    {detail.mainTeacher?.name ?? t('common.none')}
                  </p>
                  {detail.mainTeacher?.email ? (
                    <p className="text-sm text-muted-foreground">
                      {detail.mainTeacher.email}
                    </p>
                  ) : null}
                </div>

                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h2 className="font-medium mb-3">{t('teacherClassDetail.subjectTeachers')}</h2>
                  {detail.subjectTeachers?.length ? (
                    <ul className="space-y-3">
                      {detail.subjectTeachers.map((t) => (
                        <li key={t._id || t}>
                          {/* Cập nhật font name cho Subject teacher bằng với Main teacher */}
                          <p className="text-base font-medium text-foreground">
                            {typeof t === 'object' ? t.name : t}
                          </p>
                          {/* Tách email xuống dòng và set size giống hệt Main teacher */}
                          {typeof t === 'object' && t.email ? (
                            <p className="text-sm text-muted-foreground">
                              {t.email}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('teacherClassDetail.noneYet')}</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <h2 className="font-medium p-6 border-b border-border">
                  {t('teacherClassDetail.students', { count: detail.students?.length ?? 0 })}
                </h2>
                <ul className="divide-y divide-border">
                  {(detail.students || []).map((s) => (
                    <li
                      key={s._id}
                      className="flex flex-wrap items-stretch gap-0"
                    >
                      <Link
                        to={`/students/${s._id}`}
                        className="flex-1 min-w-0 px-6 py-4 hover:bg-muted/40 transition-colors text-left"
                      >
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('teacherClassDetail.parentsLinked', { count: s.parentCount ?? 0 })}
                        </p>
                        <p className="text-xs text-primary mt-1">{t('teacherClassDetail.viewProfile')}</p>
                      </Link>
                      <div className="flex items-center px-6 py-4 shrink-0 border-l border-border">
                        <button
                          type="button"
                          onClick={() => {
                            setFormErr('')
                            setParentModal(s._id)
                          }}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Mail className="w-4 h-4" />
                          {t('teacherClassDetail.addParent')}
                        </button>
                      </div>
                    </li>
                  ))}
                  {!detail.students?.length ? (
                    <li className="px-6 py-8 text-center text-muted-foreground text-sm">
                      {t('teacherClassDetail.noStudents')}
                    </li>
                  ) : null}
                </ul>
              </div>
            </>
          ) : null}
        </div>

        {/* Add student */}
        {studentOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-4">{t('common.addStudent')}</h3>
              {formErr ? (
                <p className="text-sm text-destructive mb-3">{formErr}</p>
              ) : null}
              <form onSubmit={submitStudent} className="space-y-3">
                <input
                  placeholder={t('teacherClassDetail.namePlaceholder')}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <input
                  placeholder={t('teacherClassDetail.agePlaceholder')}
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <select
                  value={form.gender}
                  onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl"
                >
                  <option value="">{t('teacherClassDetail.gender')}</option>
                  <option value="Male">{t('teacherClassDetail.male')}</option>
                  <option value="Female">{t('teacherClassDetail.female')}</option>
                  <option value="Other">{t('teacherClassDetail.other')}</option>
                </select>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border"
                    onClick={() => setStudentOpen(false)}
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {busy ? t('teacherClassDetail.saving') : t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Invite teacher */}
        {teacherOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-2">{t('teacherClassDetail.inviteTeacher')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('teacherClassDetail.inviteTeacherHelp')}
              </p>
              {formErr ? (
                <p className="text-sm text-destructive mb-3">{formErr}</p>
              ) : null}
              <form onSubmit={submitTeacher} className="space-y-3">
                <input
                  placeholder={t('teacherClassDetail.teacherEmailPlaceholder')}
                  value={teacherIdInput}
                  onChange={(e) => setTeacherIdInput(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl font-mono text-sm"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border"
                    onClick={() => setTeacherOpen(false)}
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {busy ? t('teacherClassDetail.inviting') : t('teacherClassDetail.invite')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Add parent */}
        {parentModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <h3 className="font-semibold mb-4">{t('teacherClassDetail.linkParent')}</h3>
              {formErr ? (
                <p className="text-sm text-destructive mb-3">{formErr}</p>
              ) : null}
              <form onSubmit={submitParent} className="space-y-3">
                <input
                  placeholder={t('teacherClassDetail.parentEmailPlaceholder')}
                  type="email"
                  value={parentForm.email}
                  onChange={(e) =>
                    setParentForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <input
                  placeholder={t('teacherClassDetail.relationshipPlaceholder')}
                  value={parentForm.relationship}
                  onChange={(e) =>
                    setParentForm((p) => ({ ...p, relationship: e.target.value }))
                  }
                  className="w-full px-4 py-2 border rounded-xl"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl border"
                    onClick={() => setParentModal(null)}
                    disabled={busy}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-primary text-white disabled:opacity-50"
                  >
                    {busy ? t('teacherClassDetail.linking') : t('teacherClassDetail.linkParentAction')}
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
