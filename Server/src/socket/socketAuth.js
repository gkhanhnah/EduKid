import jwt from 'jsonwebtoken'

export function createSocketAuthMiddleware() {
  return (socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.query?.token || null
    const secret = process.env.JWT_SECRET
    if (!token || typeof token !== 'string') {
      return next(new Error('auth_required'))
    }
    if (!secret) {
      return next(new Error('server_misconfigured'))
    }
    try {
      const payload = jwt.verify(token, secret)
      socket.data.userId = payload.sub
      socket.data.userRole = payload.role
      return next()
    } catch {
      return next(new Error('invalid_token'))
    }
  }
}
