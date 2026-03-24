import { httpClient } from './httpClient.js'

/**
 * @param {string} classId
 * @param {{ limit?: number, before?: string }} [options] - pass `limit` for paginated history + `hasMore` on response
 */
export async function fetchClassChat(classId, options = {}) {
  const params = {}
  if (options.limit != null) params.limit = options.limit
  if (options.before != null && options.before !== '') params.before = options.before

  const { data } = await httpClient.get(`/chat/${classId}`, { params })
  return {
    ...data,
    messages: Array.isArray(data?.messages) ? data.messages : [],
    hasMore: Boolean(data?.hasMore),
  }
}

