import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchAdminTeachers, createAdminTeacher, deleteAdminTeacher } from '../../services/adminService.js'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teachers, setTeachers] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
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
      setError(e?.response?.data?.error || e?.message || 'Failed to load teachers')
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setFormError('')
    if (!form.name.trim()) return setFormError('Name is required')
    if (!form.email.trim()) return setFormError('Email is required')
    if (!form.password || form.password.length < 6) return setFormError('Password must be at least 6 chars')

    setBusy(true)
    try {
      await createAdminTeacher(form)
      setModalOpen(false)
      setForm({ name: '', email: '', password: '' })
      await load()
    } catch (e) {
      setFormError(e?.response?.data?.error || e?.message || 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this teacher account?')) return
    try {
      await deleteAdminTeacher(id)
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground mt-1">Workload and performance snapshots.</p>
        </div>
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
          Add Teacher
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="bg-white rounded-3xl border border-border p-5 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">Loading…</div>
        ) : teachers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No teachers found.</div>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold">Teacher</th>
                <th className="text-left px-3 py-2 font-semibold">Email</th>
                <th className="text-left px-3 py-2 font-semibold">Classes</th>
                <th className="text-left px-3 py-2 font-semibold">Teaching hours</th>
                <th className="text-left px-3 py-2 font-semibold">Performance avg</th>
                <th className="text-right px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t._id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-3 py-3 font-medium">{t.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-3 py-3">{t.classesCount ?? 0}</td>
                  <td className="px-3 py-3">{t.teachingHours != null ? Math.round(Number(t.teachingHours) * 10) / 10 : '—'}</td>
                  <td className="px-3 py-3">{t.performanceAvg != null ? Math.round(Number(t.performanceAvg) * 100) / 100 : '—'}</td>
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

      <Modal
        open={modalOpen}
        title="Add teacher"
        onClose={() => {
          if (busy) return
          setModalOpen(false)
          setFormError('')
        }}
      >
        <div className="space-y-4">
          {formError ? <div className="text-sm text-destructive">{formError}</div> : null}

          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} className="w-full mt-1 rounded-2xl border border-border px-4 py-3" />
          </label>

          <div className="flex gap-2 flex-wrap pt-2">
            <button type="button" className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60" onClick={handleCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

