import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fetchAdminSchoolInfo, updateAdminSchoolInfo } from '../../services/adminService.js'
import { toastError, toastSuccess } from '../../components/ui/toast.js'
import { getUiErrorMessage } from '../../utils/errorMessages.js'

function dateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  schoolName: '',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  academicYear: '',
  semester: 'Semester 1',
  startDate: '',
  endDate: '',
  principalName: '',
  principalEmail: '',
}

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export default function AdminSchoolInfo() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchAdminSchoolInfo()
        const school = data?.school ?? {}
        if (cancelled) return
        setForm({
          schoolName: school.schoolName ?? '',
          logoUrl: school.logoUrl ?? '',
          address: school.address ?? '',
          phone: school.phone ?? '',
          email: school.email ?? '',
          website: school.website ?? '',
          academicYear: school.academicYear ?? '',
          semester: school.semester ?? 'Semester 1',
          startDate: dateInputValue(school.startDate),
          endDate: dateInputValue(school.endDate),
          principalName: school.principalName ?? '',
          principalEmail: school.principalEmail ?? '',
        })
      } catch (e) {
        if (cancelled) return
        const message = getUiErrorMessage(e, t('adminSchoolInfo.loadFailed'))
        setError(message)
        toastError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const logoPreview = useMemo(() => form.logoUrl?.trim() || '', [form.logoUrl])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleLogoFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      updateField('logoUrl', result)
    }
    reader.onerror = () => {
      toastError(t('adminSchoolInfo.readImageFailed'))
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setError('')
    if (!form.schoolName.trim()) {
      const message = t('adminSchoolInfo.schoolNameRequired')
      setError(message)
      toastError(message)
      return
    }
    if (form.startDate && form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      const message = t('adminSchoolInfo.invalidDateRange')
      setError(message)
      toastError(message)
      return
    }

    setSaving(true)
    try {
      await updateAdminSchoolInfo({
        schoolName: form.schoolName.trim(),
        logoUrl: form.logoUrl,
        address: form.address,
        phone: form.phone,
        email: form.email,
        website: form.website,
        academicYear: form.academicYear,
        semester: form.semester,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        principalName: form.principalName,
        principalEmail: form.principalEmail,
      })
      toastSuccess(t('adminSchoolInfo.savedSuccessfully'))
    } catch (e) {
      const message = getUiErrorMessage(e, t('adminSchoolInfo.saveFailed'))
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
            <h1 className="text-2xl md:text-3xl font-bold">{t('adminSchoolInfo.title')}</h1>
            <p className="mt-1 text-muted-foreground">{t('adminSchoolInfo.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('adminSchoolInfo.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="rounded-3xl border border-border bg-white p-12 text-center text-muted-foreground shadow-sm">{t('common.loading')}</div>
      ) : (
        <>
          <SectionCard title={t('adminSchoolInfo.schoolProfile')} description={t('adminSchoolInfo.schoolProfileDescription')}>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-dashed border-border bg-muted/20">
                  {logoPreview ? (
                    <img src={logoPreview} alt={t('adminSchoolInfo.schoolLogoPreview')} className="h-56 w-full object-contain bg-white p-6" />
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <p>{t('adminSchoolInfo.noLogoYet')}</p>
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.uploadLogo')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="mt-1 block w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.schoolName')}</span>
                  <input value={form.schoolName} onChange={(e) => updateField('schoolName', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.address')}</span>
                  <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.phone')}</span>
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.email')}</span>
                  <input value={form.email} onChange={(e) => updateField('email', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-medium">{t('adminSchoolInfo.website')}</span>
                  <input value={form.website} onChange={(e) => updateField('website', e.target.value)} placeholder={t('adminSchoolInfo.websitePlaceholder')} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('adminSchoolInfo.academicInfo')} description={t('adminSchoolInfo.academicInfoDescription')}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.academicYear')}</span>
                <input value={form.academicYear} onChange={(e) => updateField('academicYear', e.target.value)} placeholder={t('adminSchoolInfo.academicYearPlaceholder')} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.semester')}</span>
                <select value={form.semester} onChange={(e) => updateField('semester', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3">
                  <option value="Semester 1">{t('adminSchoolInfo.semester1')}</option>
                  <option value="Semester 2">{t('adminSchoolInfo.semester2')}</option>
                  <option value="Summer">{t('adminSchoolInfo.summer')}</option>
                  <option value="Custom">{t('adminSchoolInfo.custom')}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.startDate')}</span>
                <input type="date" value={form.startDate} onChange={(e) => updateField('startDate', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.endDate')}</span>
                <input type="date" value={form.endDate} onChange={(e) => updateField('endDate', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
              </label>
            </div>
          </SectionCard>

          <SectionCard title={t('adminSchoolInfo.adminInfo')} description={t('adminSchoolInfo.adminInfoDescription')}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.principalName')}</span>
                <input value={form.principalName} onChange={(e) => updateField('principalName', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
              </label>
              <label className="block">
                <span className="text-sm font-medium">{t('adminSchoolInfo.contactEmail')}</span>
                <input value={form.principalEmail} onChange={(e) => updateField('principalEmail', e.target.value)} className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3" />
              </label>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
