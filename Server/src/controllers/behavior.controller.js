import { Behavior } from '../models/Behavior.js'

function handleError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid behavior id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

export async function createBehavior(req, res) {
  try {
    const behavior = await Behavior.create(req.body)
    res.status(201).json(behavior)
  } catch (err) {
    handleError(res, err)
  }
}

export async function getBehaviors(req, res) {
  try {
    const behaviors = await Behavior.find().sort({ createdAt: -1 }).lean()
    res.json(behaviors)
  } catch (err) {
    handleError(res, err)
  }
}
