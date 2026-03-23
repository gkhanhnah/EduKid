/**
 * Load `.env` from the Server package root (next to package.json).
 * `import 'dotenv/config'` only reads from process.cwd(), which breaks when
 * Node is started from another directory — then AI_API_KEY is empty and
 * OpenRouter can respond with "Missing Authentication header".
 */
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.join(__dirname, '..')
const envPath = path.join(serverRoot, '.env')

const result = dotenv.config({ path: envPath })
if (result.error) {
  console.warn('[loadEnv] Could not read .env at', envPath, result.error.message)
}

const raw =
  process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || ''
const key = normalizeKeyForLog(raw)
console.log(
  '[loadEnv] OpenRouter API key:',
  key
    ? `loaded (${key.length} chars)`
    : 'MISSING — set AI_API_KEY or OPENROUTER_API_KEY in Server/.env',
)
if (key && !key.startsWith('sk-or-v1-')) {
  console.warn(
    '[loadEnv] Warning: OpenRouter keys normally start with sk-or-v1-. Check for typos, quotes, or spaces in .env.',
  )
}

function normalizeKeyForLog(raw) {
  if (raw == null || typeof raw !== 'string') return ''
  return raw.replace(/^\uFEFF/, '').replace(/\r/g, '').trim()
}
