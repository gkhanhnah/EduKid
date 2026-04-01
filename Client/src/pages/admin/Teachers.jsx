import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchAdminTeachers,
  createAdminTeacher,
  deleteAdminTeacher,
  importAdminTeachersXlsx,
  exportTeachersXlsx,
} from '../../services/adminService.js'
import { Plus, Trash2, Search, Upload, Download } from 'lucide-react'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} role="button" tabIndex={-1} />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-white shadow-2xl overflow-hidden">
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

export default function AdminTeachers() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [formError, setFormError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const d = await fetchAdminTeachers()
      setTeachers(Array.isArray(d?.teachers) ? d.teachers : [])
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericLoad'))
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return teachers
    return teachers.filter((teacher) => {
      const name = String(teacher.name ?? '').toLowerCase()
      const email = String(teacher.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [teachers, searchTerm])

  async function handleCreate() {
    setFormError('')
    if (!form.name.trim()) return setFormError(t('errors.nameRequired'))
    if (!form.email.trim()) return setFormError(t('errors.emailRequired'))
    if (!form.password || form.password.length < 6) return setFormError(t('errors.passwordMin'))

    setBusy(true)
    try {
      await createAdminTeacher(form)
      setModalOpen(false)
      setForm({ name: '', email: '', password: '' })
      await load()
    } catch (e) {
      setFormError(getUiErrorMessage(e, 'errors.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('adminTeachers.deleteConfirm'))) return
    try {
      await deleteAdminTeacher(id)
      await load()
    } catch (e) {
      setError(getUiErrorMessage(e, 'errors.genericDelete'))
    }
  }

  async function handleImport() {
    setImportError('')
    if (!importFile) return setImportError(t('adminTeachers.chooseFileFirst'))
    setImportBusy(true)
    try {
      const res = await importAdminTeachersXlsx(importFile)
      await load()
      setImportFile(null)
      alert(
        t('adminTeachers.importDone', {
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
      const blob = await exportTeachersXlsx()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'teachers_export.xlsx'
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
          <h1 className="text-2xl md:text-3xl font-bold">{t('common.teachers')}</h1>
          <p className="text-muted-foreground mt-1">{t('adminTeachers.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-accent bg-white"
          >
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setForm({ name: '', email: '', password: '' })
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 w-fit"
          >
            <Plus className="w-4 h-4" />
            {t('common.addTeacher')}
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
              placeholder={t('adminTeachers.searchPlaceholder')}
              className="w-full rounded-2xl border border-border bg-background pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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
        <div className="bg-white rounded-3xl border border-border p-5 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : filteredTeachers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t('adminTeachers.noTeachersFound')}</div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold">{t('common.teacher')}</th>
                  <th className="text-left px-3 py-2 font-semibold">{t('adminTeachers.email')}</th>
                  <th className="text-left px-3 py-2 font-semibold">{t('common.classes')}</th>
                  <th className="text-left px-3 py-2 font-semibold">{t('adminTeachers.teachingHours')}</th>
                  <th className="text-left px-3 py-2 font-semibold">{t('adminTeachers.performanceAvg')}</th>
                  <th className="text-right px-3 py-2 font-semibold">{t('adminTeachers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t._id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-3 font-medium">{t.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.email}</td>
                    <td className="px-3 py-3">{t.classesCount ?? 0}</td>
                    <td className="px-3 py-3">{t.teachingHours != null ? Math.round(Number(t.teachingHours) * 10) / 10 : t('common.none')}</td>
                    <td className="px-3 py-3">{t.performanceAvg != null ? Math.round(Number(t.performanceAvg) * 100) / 100 : t('common.none')}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(t._id)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-border hover:bg-accent text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>


      <Modal
        open={modalOpen}
        title={t('common.addTeacher')}
        onClose={() => {
          if (busy) return
          setModalOpen(false)
          setFormError('')
        }}
      >
        <div className="space-y-4">
          {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

          <label className="block">
            <span className="text-sm font-medium">{t('adminTeachers.name')}</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('adminTeachers.email')}</span>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">{t('adminTeachers.password')}</span>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>

          <div className="flex gap-2 flex-wrap pt-2">
            <button type="button" className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent" onClick={() => setModalOpen(false)} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button type="button" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60" onClick={handleCreate} disabled={busy}>
              {busy ? t('adminTeachers.creating') : t('common.create')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

