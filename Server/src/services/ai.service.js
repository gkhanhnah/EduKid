/**
 * OpenRouter chat completion for Grade 1 lesson plans.
 * Uses axios (not fetch) so Authorization is always sent reliably in Node.
 * Docs: https://openrouter.ai/docs
 */
import axios from 'axios'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
/** v0.1 slug often returns "No endpoints found"; v0.2 is still routed on OpenRouter. */
const DEFAULT_MODEL = 'mistralai/mistral-7b-instruct-v0.2'
const REQUEST_TIMEOUT_MS = 90_000

function resolveModel() {
  const fromEnv = process.env.AI_MODEL?.trim()
  return fromEnv || DEFAULT_MODEL
}

/** Strip BOM/CR/zero-width, optional quotes, accidental "Bearer " prefix */
function normalizeOpenRouterKey(raw) {
  if (raw == null) return ''
  let s = String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r/g, '')
    .trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  const low = s.toLowerCase()
  if (low.startsWith('bearer ')) {
    s = s.slice(7).trim()
  }
  return s
}

function resolveApiKey() {
  return normalizeOpenRouterKey(
    process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY,
  )
}

function buildUserPrompt(topic) {
  return `Generate a Grade 1 lesson plan for topic: ${topic}

Return JSON format ONLY (no markdown fences, no explanation before or after):

{
  "title": "",
  "objective": "",
  "materials": [],
  "warmup": "",
  "activities": [
    {
      "name": "",
      "description": ""
    }
  ],
  "assessment": "",
  "homework": ""
}`
}

function extractJsonString(raw) {
  if (!raw || typeof raw !== 'string') return null
  let s = raw.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s)
  if (fenced) {
    s = fenced[1].trim()
  } else {
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start !== -1 && end > start) {
      s = s.slice(start, end + 1)
    }
  }
  return s
}

function parseLessonJson(text) {
  const s = extractJsonString(text)
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function normalizeLesson(raw, topic) {
  const fallback = {
    title: `Grade 1: ${topic}`,
    objective: `Students will explore ${topic} through age-appropriate activities.`,
    materials: ['Whiteboard', 'Markers', 'Visual aids'],
    warmup: 'Brief greeting and connect to something students already know.',
    activities: [
      {
        name: 'Introduction',
        description: `Present ${topic} using simple language and visuals.`,
      },
      {
        name: 'Guided practice',
        description: 'Whole-group practice with teacher support.',
      },
    ],
    assessment: 'Observe engagement and use quick oral questions.',
    homework: 'Optional: share one thing learned with someone at home.',
  }

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const materials = Array.isArray(raw.materials)
    ? raw.materials.map((m) => String(m).trim()).filter(Boolean)
    : fallback.materials

  let activities = fallback.activities
  if (Array.isArray(raw.activities)) {
    const mapped = raw.activities
      .filter((a) => a && typeof a === 'object')
      .map((a) => ({
        name: String(a.name || 'Activity').trim() || 'Activity',
        description: String(a.description || '').trim(),
      }))
    if (mapped.length) activities = mapped
  }

  return {
    title: String(raw.title || fallback.title).trim() || fallback.title,
    objective:
      String(raw.objective || fallback.objective).trim() || fallback.objective,
    materials: materials.length ? materials : fallback.materials,
    warmup: String(raw.warmup || fallback.warmup).trim() || fallback.warmup,
    activities,
    assessment:
      String(raw.assessment || fallback.assessment).trim() ||
      fallback.assessment,
    homework:
      String(raw.homework || fallback.homework).trim() || fallback.homework,
  }
}

/**
 * Call OpenRouter and return a normalized lesson object.
 */
export async function generateStructuredLesson(topic) {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    const err = new Error('AI_API_KEY is not configured')
    err.code = 'NO_API_KEY'
    throw err
  }

  const model = resolveModel()

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You write concise Grade 1 lesson plans. Reply with a single valid JSON object only. No markdown.',
      },
      { role: 'user', content: buildUserPrompt(topic) },
    ],
    temperature: 0.35,
    max_tokens: 2048,
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'X-OpenRouter-Title': 'EduKid',
  }

  let body
  try {
    const res = await axios.post(OPENROUTER_URL, payload, {
      headers,
      timeout: REQUEST_TIMEOUT_MS,
    })
    body = res.data
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.code === 'ECONNABORTED') {
        const err = new Error('AI request timed out')
        err.code = 'TIMEOUT'
        throw err
      }
      const d = e.response?.data
      const ex = d?.error
      const msg =
        (typeof ex === 'string' ? ex : ex?.message) ||
        d?.message ||
        e.message ||
        'OpenRouter request failed'
      const err = new Error(msg)
      err.code = 'PROVIDER_ERROR'
      err.status = e.response?.status || 502
      throw err
    }
    throw e
  }

  const content = body?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    const err = new Error('Empty AI completion')
    err.code = 'EMPTY_COMPLETION'
    throw err
  }

  const parsed = parseLessonJson(content)
  const usedFallback = parsed == null
  const lesson = normalizeLesson(parsed, topic)

  return {
    ...lesson,
    _meta: {
      model,
      provider: 'openrouter',
      usedFallback,
    },
  }
}
