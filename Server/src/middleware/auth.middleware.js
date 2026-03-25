import jwt from 'jsonwebtoken'

export function verifyToken(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = header.slice(7).trim()
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const payload = jwt.verify(token, secret)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/** For iframe/file preview: accept Bearer header or `?token=` (iframes cannot send custom headers). */
export function verifyTokenQueryOrHeader(req, res, next) {
  const header = req.headers.authorization
  const q = req.query.token
  let token = null
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7).trim()
  } else if (typeof q === 'string' && q.length > 0) {
    token = q.trim()
  }
  if (!token) {
    return res.status(401).type('text/plain').send('Unauthorized')
  }
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).type('text/plain').send('Server configuration error')
  }
  try {
    const payload = jwt.verify(token, secret)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return res.status(401).type('text/plain').send('Invalid or expired token')
  }
}

export function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
