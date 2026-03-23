import { httpClient } from './httpClient.js'

/**
 * Backend expects lowercase roles: teacher | parent | student
 */
export function normalizeRoleForApi(role) {
  const r = String(role).trim().toUpperCase()
  if (r === 'TEACHER') return 'teacher'
  if (r === 'PARENT') return 'parent'
  if (r === 'STUDENT') return 'student'
  return String(role).toLowerCase()
}

/**
 * @param {{ name: string, email: string, password: string, role: string }} payload
 */
export async function registerUser({ name, email, password, role }) {
  const { data } = await httpClient.post('/auth/register', {
    name,
    email,
    password,
    role: normalizeRoleForApi(role),
  })
  return data
}

/**
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function loginUser({ email, password }) {
  const { data } = await httpClient.post('/auth/login', { email, password })
  return data
}

/**
 * Extract error message from axios error (Express { error: string })
 */
export function getAuthErrorMessage(err) {
  const msg = err?.response?.data?.error
  if (typeof msg === 'string' && msg.trim()) return msg
  if (err?.message === 'Network Error') return 'Network error. Check your connection and API URL.'
  return 'Something went wrong. Please try again.'
}

export { httpClient }
