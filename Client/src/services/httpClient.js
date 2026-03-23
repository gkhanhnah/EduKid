import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'

export const httpClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

function isAuthPublicPath(url) {
  if (!url) return false
  const path = url.startsWith('http') ? new URL(url).pathname : url
  return path.includes('/auth/login') || path.includes('/auth/register')
}

httpClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  if (!isAuthPublicPath(config.url || '')) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})
