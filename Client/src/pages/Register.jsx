import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { motion as m } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FormField, TextInput, SelectInput } from '../components/auth/FormField.jsx'
import { registerUser, getAuthErrorMessage } from '../services/authService.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emptyErrors = () => ({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
})

export function Register() {
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('TEACHER')
  const [fieldErrors, setFieldErrors] = useState(emptyErrors)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const roles = [
    { value: 'TEACHER', label: t('auth.teacherRole') },
    { value: 'PARENT', label: t('auth.parentRole') },
  ]

  if (token) {
    return <Navigate to={user?.role === 'parent' ? '/parent-dashboard' : '/teacher'} replace />
  }

  function validate() {
    const next = emptyErrors()
    let ok = true

    if (!name.trim()) {
      next.name = t('auth.errors.nameRequired')
      ok = false
    }
    if (!email.trim()) {
      next.email = t('auth.errors.emailRequired')
      ok = false
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = t('auth.errors.invalidEmail')
      ok = false
    }
    if (!password) {
      next.password = t('auth.errors.passwordRequired')
      ok = false
    } else if (password.length < 6) {
      next.password = t('auth.errors.passwordMin')
      ok = false
    }
    if (!confirmPassword) {
      next.confirmPassword = t('auth.errors.confirmPasswordRequired')
      ok = false
    } else if (password !== confirmPassword) {
      next.confirmPassword = t('auth.errors.passwordMismatch')
      ok = false
    }
    if (!role) {
      next.role = t('auth.errors.roleRequired')
      ok = false
    }

    setFieldErrors(next)
    return ok
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      setApiError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0E7FF] via-background to-[#FEF3C7] flex items-center justify-center p-6">
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-border/60">
          <h1 className="text-2xl font-semibold text-center mb-1">{t('auth.registerTitle')}</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">
            {t('auth.registerSubtitle')}
          </p>

          {success ? (
            <div
              className="mb-6 p-4 rounded-2xl bg-green-50 text-green-800 text-sm text-center border border-green-200"
              role="status"
            >
              {t('auth.registrationSuccess')}
            </div>
          ) : null}

          {apiError && !success ? (
            <div
              className="mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm border border-destructive/20"
              role="alert"
            >
              {apiError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormField id="reg-name" label={t('auth.fullName')} required error={fieldErrors.name}>
              <TextInput
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || success}
                placeholder={t('auth.fullNamePlaceholder')}
                error={fieldErrors.name}
              />
            </FormField>

            <FormField id="reg-email" label={t('auth.email')} required error={fieldErrors.email}>
              <TextInput
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                placeholder={t('auth.emailPlaceholder')}
                error={fieldErrors.email}
              />
            </FormField>

            <FormField id="reg-password" label={t('auth.password')} required error={fieldErrors.password}>
              <TextInput
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                placeholder={t('auth.passwordMinPlaceholder')}
                error={fieldErrors.password}
              />
            </FormField>

            <FormField
              id="reg-confirm"
              label={t('auth.confirmPassword')}
              required
              error={fieldErrors.confirmPassword}
            >
              <TextInput
                id="reg-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                error={fieldErrors.confirmPassword}
              />
            </FormField>

            <FormField id="reg-role" label={t('auth.role')} required error={fieldErrors.role}>
              <SelectInput
                id="reg-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading || success}
                error={fieldErrors.role}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-primary text-white py-3.5 rounded-2xl font-medium shadow-lg hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? t('auth.registering') : t('auth.registerButton')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t('auth.loginLink')}
            </Link>
          </p>
        </div>
      </m.div>
    </div>
  )
}
