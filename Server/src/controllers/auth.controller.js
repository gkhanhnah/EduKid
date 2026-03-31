import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const SALT_ROUNDS = 10

function signToken(userId, role) {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign({ sub: userId, role }, secret, { expiresIn })
}

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body

    if (!name?.trim() || !email?.trim() || password == null || password === '') {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (!['teacher', 'student', 'parent', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be teacher, student, parent, or admin' })
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role,
    })

    const token = signToken(user._id.toString(), user.role)
    res.status(201).json({ user: user.toJSON(), token })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message })
    }
    if (err.message === 'JWT_SECRET is not set') {
      return res.status(500).json({ error: 'Server configuration error' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email?.trim() || password == null || password === '') {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      '+password',
    )
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user._id.toString(), user.role)
    res.json({ user: user.toJSON(), token })
  } catch (err) {
    if (err.message === 'JWT_SECRET is not set') {
      return res.status(500).json({ error: 'Server configuration error' })
    }
    return res.status(500).json({ error: 'Server error' })
  }
}
