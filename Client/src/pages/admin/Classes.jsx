import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getClasses, createClass, updateClass, deleteClass } from '../../services/classService.js'
import { fetchAdminTeachers } from '../../services/adminService.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} role="button" tabIndex={-1} />
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm px-3 py-1 rounded-xl hover:bg-accent border border-border">
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function AdminClasses() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [teachers, setTeachers] = useState([])
  const [teachersLoading, setTeachersLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const EMPTY_FORM = useMemo(() => ({ name: '', grade: '', teacherId: '' }), [])
  const [form, setForm] = useState(EMPTY_FORM)

  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true)
    try {
      const d = await fetchAdminTeachers()
      setTeachers(Array.isArray(d?.teachers) ? d.teachers : [])
    } catch {
      setTeachers([])
    } finally {
      setTeachersLoading(false)
    }
  }, [])

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await getClasses()
      setClasses(Array.isArray(d) ? d : [])
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericLoad'))
      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeachers()
    loadClasses()
  }, [loadTeachers, loadClasses])

  const filteredClasses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return classes
    return classes.filter((classItem) => {
      const name = String(classItem.name ?? '').toLowerCase()
      const grade = String(classItem.grade ?? '').toLowerCase()
      const mainTeacher = String(classItem.mainTeacher?.name ?? '').toLowerCase()
      return name.includes(q) || grade.includes(q) || mainTeacher.includes(q)
    })
  }, [classes, searchTerm])

  function openCreate() {
    setMode('create')
    setEditingId(null)
    setFormError('')
    setForm({ name: '', grade: '', teacherId: teachers[0]?._id ?? '' })
    setModalOpen(true)
  }

  function openEdit(c) {
    setMode('edit')
    setEditingId(c._id)
    setFormError('')
    setForm({ name: c.name ?? '', grade: c.grade ?? '', teacherId: c?.mainTeacher?._id ?? '' })
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError('')
    if (!form.name.trim()) return setFormError(t('errors.nameRequired'))
    if (mode === 'create' && !form.teacherId) return setFormError(t('adminClasses.teacherRequired'))

    const payload = {
      name: form.name.trim(),
      grade: form.grade !== '' ? form.grade : undefined,
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        await createClass({
          ...payload,
          teacherId: form.teacherId,
        })
      } else {
        await updateClass(editingId, payload)
      }
      setModalOpen(false)
      await loadClasses()
    } catch (e) {
      setFormError(getUiErrorMessage(e, 'errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('adminClasses.deleteConfirm'))) return
    try {
      await deleteClass(id)
      await loadClasses()
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericDelete'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('common.classes')} & Timetable</h1>
          <p className="text-muted-foreground mt-1">{t('adminClasses.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 w-fit"
          disabled={teachersLoading}
        >
          <Plus className="w-4 h-4" />
          {t('common.addClass')}
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('adminClasses.searchPlaceholder')}
              className="w-full rounded-2xl border border-border bg-background pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{t('adminClasses.noClassesFound')}</div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filteredClasses.map((c) => (
              <div key={c._id} className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('adminClasses.grade')}: {c.grade ?? '—'}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {c.studentCount ?? 0} {t('common.students')}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{t('adminClasses.mainTeacher')}: {c.mainTeacher?.name ?? '—'}</p>
                  <p>{t('adminClasses.subjectTeachers')}: {c.subjectTeacherCount ?? c.subjectTeachers?.length ?? 0}</p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    to={`/admin/classes/${c._id}/timetable`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent bg-background"
                  >
                    {t('adminClasses.timetable')}
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c._id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-border px-3 py-2 text-sm text-destructive hover:bg-accent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden w-full border-collapse text-sm md:table min-w-[880px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold">{t('common.classes')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminClasses.grade')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminClasses.mainTeacher')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('common.students')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminClasses.subjectTeachers')}</th>
                <th className="text-right px-3 py-2 font-semibold">{t('adminClasses.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((c) => (
                <tr key={c._id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-3 py-3 font-medium">{c.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.grade ?? '—'}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.mainTeacher?.name ?? '—'}</td>
                  <td className="px-3 py-3">{c.studentCount ?? 0}</td>
                  <td className="px-3 py-3">{c.subjectTeacherCount ?? c.subjectTeachers?.length ?? 0}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/classes/${c._id}/timetable`}
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent bg-background"
                      >
                        {t('adminClasses.timetable')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c._id)}
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={mode === 'create' ? t('adminClasses.createClass') : t('adminClasses.editClass')}
        onClose={() => {
          if (saving) return
          setModalOpen(false)
          setFormError('')
        }}
      >
        <div className="space-y-4">
          {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

          <label className="block">
            <span className="text-sm font-medium">{t('adminClasses.name')}</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background" />
          </label>

          <label className="block">
            <span className="text-sm font-medium">{t('adminClasses.gradeOptional')}</span>
            <input value={form.grade} onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background" />
          </label>

          {mode === 'create' ? (
            <label className="block">
              <span className="text-sm font-medium">{t('adminClasses.mainTeacher')}</span>
              <select
                value={form.teacherId}
                onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
                className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
              >
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex gap-2 flex-wrap pt-2">
            <button type="button" className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="button" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60" onClick={handleSave} disabled={saving}>
              {saving ? t('adminClasses.saving') : mode === 'create' ? t('common.create') : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

