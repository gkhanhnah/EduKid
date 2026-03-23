/** Base URL for Socket.IO (no `/api` path). */
export function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL
  if (explicit) return String(explicit).replace(/\/$/, '')
  const api =
    import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'
  const base = api.replace(/\/api$/, '')
  return base || 'http://localhost:3000'
}
