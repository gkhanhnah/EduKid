import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Upload, Download, Search, Edit } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getClasses } from '../../services/classService.js'
import {
  deleteAdminStudent,
  getAdminStudents,
  createAdminStudent,
  updateAdminStudent,
  importAdminStudentsXlsx,
} from '../../services/adminStudents.service.js'
import { exportStudentsXlsx } from '../../services/adminService.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

const GENDERS = ['Male', 'Female', 'Other']
const STATUSES = ['ACTIVE', 'SUSPENDED', 'GRADUATED']

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

export default function AdminStudents() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [students, setStudents] = useState([])

  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)

  const [classFilter, setClassFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('create')
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const EMPTY_FORM = useMemo(
    () => ({ name: '', age: '', gender: 'Male', status: 'ACTIVE', classId: '', photoUrl: '' }),
    [],
  )
  const [form, setForm] = useState(EMPTY_FORM)

  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [importFile, setImportFile] = useState(null)

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

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = classFilter ? { classId: classFilter } : {}
      const data = await getAdminStudents(params)
      setStudents(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericLoad'))
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [classFilter])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return students.filter((s) => {
      const name = String(s.name ?? '').toLowerCase()
      return !q || name.includes(q)
    })
  }, [students, searchTerm])

  function openCreate() {
    setMode('create')
    setEditingId(null)
    setFormError('')
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(s) {
    setMode('edit')
    setEditingId(s._id)
    setFormError('')
    setForm({
      name: s.name ?? '',
      age: s.age ?? '',
      gender: s.gender ?? 'Male',
      status: s.status ?? 'ACTIVE',
      classId: s.classId?._id ?? s.classId ?? '',
      photoUrl: s.photoUrl ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError('')
    if (!form.name.trim()) return setFormError(t('errors.nameRequired'))
    if (!form.classId) return setFormError(t('adminStudents.classRequired'))

    const payload = {
      name: form.name.trim(),
      age: form.age !== '' ? Number(form.age) : undefined,
      gender: form.gender,
      status: form.status,
      photoUrl: form.photoUrl?.trim() || undefined,
      classId: form.classId,
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        await createAdminStudent(payload)
      } else {
        await updateAdminStudent(editingId, payload)
      }
      setModalOpen(false)
      await loadStudents()
    } catch (e) {
      setFormError(getUiErrorMessage(e, 'errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(studentId) {
    if (!confirm(t('common.delete') + ' this student?')) return
    try {
      await deleteAdminStudent(studentId)
      await loadStudents()
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericDelete'))
    }
  }

  async function handleImport() {
    setImportError('')
    if (!importFile) return setImportError(t('adminStudents.chooseFileFirst'))
    setImportBusy(true)
    try {
      const res = await importAdminStudentsXlsx(importFile, classFilter || undefined)
      await loadStudents()
      setImportFile(null)
      alert(
        t('adminStudents.importDone', {
          createdCount: res?.createdCount ?? 0,
          errorsCount: res?.errorsCount ?? 0,
        }),
      )
    } catch (e) {
      setImportError(getUiErrorMessage(e, 'errors.somethingWentWrong'))
    } finally {
      setImportBusy(false)
    }
  }

  async function handleExport() {
    try {
      const blob = await exportStudentsXlsx({ classId: classFilter || undefined })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students_export.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.somethingWentWrong'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('common.students')}</h1>
          <p className="text-muted-foreground mt-1">{t('adminStudents.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-accent bg-white">
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            {t('common.addStudent')}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('adminStudents.searchByName')}
              className="w-full rounded-2xl border border-border bg-background pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            disabled={classesLoading}
            className="w-full sm:w-64 rounded-2xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('adminStudents.allClasses')}</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white cursor-pointer hover:bg-accent">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{importBusy ? `${t('common.import')}…` : t('common.bulkImport')}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              disabled={importBusy}
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="button"
            onClick={handleImport}
            disabled={importBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {t('common.import')}
          </button>

          {importError ? <div className="text-sm text-destructive">{importError}</div> : null}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground md:hidden">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground md:hidden">{t('adminStudents.noStudentsFound')}</div>
          ) : (
            <div className="space-y-3 md:hidden">
              {filtered.map((s) => {
                const sid = s._id
                const className = s.classId?.name ?? ''
                const status = s.status ?? 'ACTIVE'
                const statusTone =
                  status === 'ACTIVE'
                    ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                    : status === 'SUSPENDED'
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                return (
                  <div key={sid} className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/20 font-medium">
                        {s.gender === 'Female' ? '👧' : s.gender === 'Male' ? '👦' : '🧒'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">#{sid?.slice?.(-6) ?? ''}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusTone}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('adminStudents.class')}</p>
                        <p className="mt-1 font-medium">{className || t('common.none')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('adminStudents.age')}</p>
                        <p className="mt-1 font-medium">{s.age ?? t('common.none')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('adminStudents.gender')}</p>
                        <p className="mt-1 font-medium">{s.gender ?? t('common.none')}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Edit className="w-4 h-4" />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sid)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-destructive hover:bg-accent"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <table className="hidden w-full border-collapse text-sm md:table min-w-[780px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold">{t('common.student')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminStudents.class')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminStudents.age')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminStudents.gender')}</th>
                <th className="text-left px-3 py-2 font-semibold">{t('adminStudents.status')}</th>
                <th className="text-right px-3 py-2 font-semibold">{t('adminStudents.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {t('adminStudents.noStudentsFound')}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const sid = s._id
                  const className = s.classId?.name ?? ''
                  const status = s.status ?? 'ACTIVE'
                  const statusTone =
                    status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                      : status === 'SUSPENDED'
                        ? 'bg-destructive/10 text-destructive border-destructive/30'
                        : 'bg-primary/10 text-primary border-primary/30'
                  return (
                    <tr key={sid} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl border border-border bg-muted/20 flex items-center justify-center font-medium">
                            {s.gender === 'Female' ? '👧' : s.gender === 'Male' ? '👦' : '🧒'}
                          </div>
                          <div>
                            <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">#{sid?.slice?.(-6) ?? ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{className || t('common.none')}</td>
                      <td className="px-3 py-3">{s.age ?? t('common.none')}</td>
                      <td className="px-3 py-3">{s.gender ?? t('common.none')}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${statusTone}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="p-2 rounded-xl border border-border hover:bg-accent"
                            aria-label={t('adminStudents.editStudent')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sid)}
                            className="p-2 rounded-xl border border-border hover:bg-accent text-destructive"
                            aria-label={t('adminStudents.deleteStudent')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={mode === 'create' ? t('common.addStudent') : t('adminStudents.editStudentTitle')}
        onClose={() => {
          if (saving) return
          setModalOpen(false)
          setFormError('')
        }}
      >
        <div className="space-y-4">
          {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

          <label className="block">
            <span className="text-sm font-medium">{t('adminStudents.name')}</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">{t('adminStudents.age')}</span>
              <input type="number" min={1} max={18} value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
            </label>

            <label className="block">
              <span className="text-sm font-medium">{t('adminStudents.gender')}</span>
              <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background">
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">{t('adminStudents.status')}</span>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background">
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">{t('adminStudents.class')}</span>
              <select
                value={form.classId}
                onChange={(e) => setForm((p) => ({ ...p, classId: e.target.value }))}
                className="w-full mt-1 rounded-2xl border border-border px-4 py-3 bg-background"
              >
                <option value="">{t('adminStudents.selectClass')}</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">{t('adminStudents.photoUrlOptional')}</span>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value }))}
              placeholder={t('adminStudents.photoUrlPlaceholder')}
              className="w-full mt-1 rounded-2xl border border-border px-4 py-3"
            />
          </label>

          <div className="flex gap-2 flex-wrap pt-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? t('adminStudents.saving') : mode === 'create' ? t('common.create') : t('common.save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

