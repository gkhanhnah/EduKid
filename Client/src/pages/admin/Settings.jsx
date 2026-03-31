import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { fetchAdminSettings, updateAdminSettings } from '../../services/adminService.js'
import { toastError, toastSuccess } from '../../components/ui/toast.js'

const DEFAULT_FORM = {
  gpaScale: '4',
  homeworkWeight: '20',
  midtermWeight: '30',
  finalWeight: '50',
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const d = await fetchAdminSettings()
        const setting = d?.setting ?? {}
        const rules = setting.gradingRules ?? {}
        const weights = rules.weights ?? {}
        if (cancelled) return
        setForm({
          gpaScale: String(rules.gpaScale ?? DEFAULT_FORM.gpaScale),
          homeworkWeight: String(
            weights.homework !== undefined ? Number(weights.homework) * 100 : DEFAULT_FORM.homeworkWeight,
          ),
          midtermWeight: String(
            weights.midterm !== undefined ? Number(weights.midterm) * 100 : DEFAULT_FORM.midtermWeight,
          ),
          finalWeight: String(
            weights.final !== undefined ? Number(weights.final) * 100 : DEFAULT_FORM.finalWeight,
          ),
        })
      } catch (e) {
        if (!cancelled) {
          const message = e?.response?.data?.error || e?.message || 'Failed to load settings'
          setError(message)
          toastError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setError('')
    const gpaScale = Number(form.gpaScale)
    const homeworkWeight = Number(form.homeworkWeight)
    const midtermWeight = Number(form.midtermWeight)
    const finalWeight = Number(form.finalWeight)

    if (!Number.isFinite(gpaScale) || gpaScale <= 0) {
      const message = 'GPA scale must be a number greater than 0'
      setError(message)
      toastError(message)
      return
    }

    const weights = [homeworkWeight, midtermWeight, finalWeight]
    if (weights.some((value) => !Number.isFinite(value) || value < 0)) {
      const message = 'All weight fields must be valid numbers from 0 to 100'
      setError(message)
      toastError(message)
      return
    }

    const totalWeight = homeworkWeight + midtermWeight + finalWeight
    if (Math.abs(totalWeight - 100) > 0.0001) {
      const message = 'Homework, Midterm, and Final weights must total 100%'
      setError(message)
      toastError(message)
      return
    }

    setSaving(true)
    try {
      await updateAdminSettings({
        gradingRules: {
          gpaScale,
          weights: {
            homework: homeworkWeight / 100,
            midterm: midtermWeight / 100,
            final: finalWeight / 100,
          },
        },
      })
      toastSuccess('Saved successfully')
    } catch (e) {
      const message = e?.response?.data?.error || e?.message || 'Save failed'
      setError(message)
      toastError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground mt-1">Manage grading rules and platform-level academic configuration.</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 w-fit"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">System Configuration</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure grading behavior using clear fields instead of raw JSON.
            </p>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">GPA Scale</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.gpaScale}
                  onChange={(e) => updateField('gpaScale', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3"
                />
              </label>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Define the GPA ceiling used for grade summaries and analytics.
              </div>

              <label className="block">
                <span className="text-sm font-medium">Homework Weight (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.homeworkWeight}
                  onChange={(e) => updateField('homeworkWeight', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Midterm Weight (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.midtermWeight}
                  onChange={(e) => updateField('midtermWeight', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Final Weight (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.finalWeight}
                  onChange={(e) => updateField('finalWeight', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3"
                />
              </label>
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-sm font-medium">Validation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Total weight: {Number(form.homeworkWeight || 0) + Number(form.midtermWeight || 0) + Number(form.finalWeight || 0)}%
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  The three weight fields should add up to exactly 100%.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Quick view of common values inside your JSON config.</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">GPA Scale</p>
              <p className="mt-1 text-lg font-semibold">{form.gpaScale || '—'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Weight Config</p>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Homework</span>
                  <span className="font-medium">{form.homeworkWeight || '—'}%</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Midterm</span>
                  <span className="font-medium">{form.midtermWeight || '—'}%</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Final</span>
                  <span className="font-medium">{form.finalWeight || '—'}%</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">How it works</p>
              <p className="mt-2 text-sm text-muted-foreground">
                These values are saved as grading rules for the system, but users only interact with simple numeric fields here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

