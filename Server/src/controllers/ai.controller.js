import { generateStructuredLesson } from '../services/ai.service.js'

const MAX_TOPIC_LEN = 500

export async function postLesson(req, res) {
  const topic = req.body?.topic
  if (topic == null || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required' })
  }
  const trimmed = topic.trim()
  if (trimmed.length > MAX_TOPIC_LEN) {
    return res
      .status(400)
      .json({ error: `topic must be at most ${MAX_TOPIC_LEN} characters` })
  }

  try {
    const lesson = await generateStructuredLesson(trimmed)
    res.json(lesson)
  } catch (err) {
    if (err.code === 'NO_API_KEY') {
      return res.status(503).json({
        error:
          'AI is not configured. Set AI_API_KEY or OPENROUTER_API_KEY in Server/.env and restart the API.',
      })
    }
    if (err.code === 'TIMEOUT') {
      return res.status(504).json({ error: 'AI request timed out. Try again.' })
    }

    // OpenRouter often returns 401 "Missing Authentication header" when the *server* API key
    // is wrong — browsers then show 401 on /api/ai/lesson even though the *teacher JWT* is fine.
    if (err.code === 'PROVIDER_ERROR') {
      const msg = (err.message || '').toLowerCase()
      const looksLikeKeyProblem =
        err.status === 401 ||
        err.status === 403 ||
        msg.includes('authentication') ||
        msg.includes('unauthorized') ||
        msg.includes('api key') ||
        msg.includes('invalid key')
      if (looksLikeKeyProblem) {
        return res.status(502).json({
          error:
            'OpenRouter rejected the server API key (not your login). Set a valid AI_API_KEY in Server/.env, restart the API (npm run dev in Server), or create a new key at https://openrouter.ai/keys',
        })
      }
      return res.status(502).json({
        error: err.message || 'AI provider error',
      })
    }

    return res.status(500).json({
      error: err.message || 'Failed to generate lesson',
    })
  }
}
