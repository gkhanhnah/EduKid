import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { motion as m } from 'framer-motion'
import { FormField, TextInput, SelectInput } from '../components/auth/FormField.jsx'
import { registerUser, getAuthErrorMessage } from '../services/authService.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLES = [
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'PARENT', label: 'Parent' },
]

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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('TEACHER')
  const [fieldErrors, setFieldErrors] = useState(emptyErrors)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (token) {
    return <Navigate to={user?.role === 'parent' ? '/parent-dashboard' : '/teacher'} replace />
  }

  function validate() {
    const next = emptyErrors()
    let ok = true

    if (!name.trim()) {
      next.name = 'Name is required.'
      ok = false
    }
    if (!email.trim()) {
      next.email = 'Email is required.'
      ok = false
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = 'Enter a valid email address.'
      ok = false
    }
    if (!password) {
      next.password = 'Password is required.'
      ok = false
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.'
      ok = false
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password.'
      ok = false
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.'
      ok = false
    }
    if (!role) {
      next.role = 'Please select a role.'
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
          <h1 className="text-2xl font-semibold text-center mb-1">Create account</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Join EduKid as a teacher or parent
          </p>

          {success ? (
            <div
              className="mb-6 p-4 rounded-2xl bg-green-50 text-green-800 text-sm text-center border border-green-200"
              role="status"
            >
              Registration successful! Redirecting to login…
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
            <FormField id="reg-name" label="Full name" required error={fieldErrors.name}>
              <TextInput
                id="reg-name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || success}
                placeholder="Your name"
                error={fieldErrors.name}
              />
            </FormField>

            <FormField id="reg-email" label="Email" required error={fieldErrors.email}>
              <TextInput
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                placeholder="you@example.com"
                error={fieldErrors.email}
              />
            </FormField>

            <FormField id="reg-password" label="Password" required error={fieldErrors.password}>
              <TextInput
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                placeholder="At least 6 characters"
                error={fieldErrors.password}
              />
            </FormField>

            <FormField
              id="reg-confirm"
              label="Confirm password"
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
                placeholder="Re-enter password"
                error={fieldErrors.confirmPassword}
              />
            </FormField>

            <FormField id="reg-role" label="Role" required error={fieldErrors.role}>
              <SelectInput
                id="reg-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading || success}
                error={fieldErrors.role}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.value})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-primary text-white py-3.5 rounded-2xl font-medium shadow-lg hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? 'Registering…' : 'Register'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </m.div>
    </div>
  )
}
