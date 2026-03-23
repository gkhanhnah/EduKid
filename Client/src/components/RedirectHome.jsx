import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/** Default landing after login or visiting `/` while authenticated. */
export function RedirectHome() {
  const { user } = useAuth()
  if (user?.role === 'parent') {
    return <Navigate to="/parent-dashboard" replace />
  }
  return <Navigate to="/teacher" replace />
}
