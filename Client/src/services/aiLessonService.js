import { httpClient } from './httpClient.js'

/** POST /api/ai/lesson — OpenRouter-backed Grade 1 lesson (teachers only). */
export async function generateLessonPlan(topic) {
  const { data } = await httpClient.post(
    '/ai/lesson',
    { topic },
    { timeout: 120_000 },
  )
  return data
}
