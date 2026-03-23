import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion as m } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { getAuthErrorMessage } from '../services/authService.js'
import { FormField, TextInput } from '../components/auth/FormField.jsx'
import { pathAfterAuth } from '../utils/authPaths.js'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, token, user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const fromPath =
    location.state?.from?.pathname && location.state.from.pathname !== '/login'
      ? location.state.from.pathname
      : null

  if (token) {
    const to = pathAfterAuth(user?.role, fromPath)
    return <Navigate to={to} replace />
  }

  function validate() {
    let ok = true
    setEmailError('')
    setPasswordError('')
    if (!email.trim()) {
      setEmailError('Email is required.')
      ok = false
    }
    if (!password) {
      setPasswordError('Password is required.')
      ok = false
    }
    return ok
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)
    try {
      const data = await login(email.trim(), password)
      const role = data.user?.role
      navigate(pathAfterAuth(role, fromPath), { replace: true })
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
        className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center"
      >
        <div className="text-center md:text-left">
          <m.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[8rem] mb-6"
          >
            🎓
          </m.div>
          <h1 className="text-[2.5rem] mb-4">
            Welcome to <span className="text-primary">EduKid</span>
          </h1>
          <p className="text-[1.125rem] text-muted-foreground">
            Classroom management for Grade 1 teachers and parents
          </p>
        </div>

        <m.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl p-8 border border-border/60"
        >
          <h2 className="text-center text-xl font-semibold mb-6">Log in</h2>

          {apiError ? (
            <div
              className="mb-4 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm border border-destructive/20"
              role="alert"
            >
              {apiError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormField id="login-email" label="Email" required error={emailError}>
              <TextInput
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@example.com"
                error={emailError}
              />
            </FormField>

            <FormField id="login-password" label="Password" required error={passwordError}>
              <TextInput
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Your password"
                error={passwordError}
              />
            </FormField>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-2xl font-medium shadow-lg hover:bg-primary/90 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? 'Signing in…' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Register
            </Link>
          </p>
        </m.div>
      </m.div>
    </div>
  )
}
