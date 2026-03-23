import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './authContext.js'
import { loginUser } from '../services/authService.js'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function readStoredAuth() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    const user = raw ? JSON.parse(raw) : null
    return { token: token || null, user }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [{ token, user }, setState] = useState(readStoredAuth)

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setState({ token: data.token, user: data.user })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({ token: null, user: null })
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
