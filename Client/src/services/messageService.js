import { httpClient } from './httpClient.js'

export async function uploadMessageFile(file) {
  const body = new FormData()
  body.append('file', file)
  const { data } = await httpClient.post('/messages/upload', body)
  return {
    url: data.url,
    mime: data.mime,
    name: data.name,
  }
}

export async function fetchMessageContacts() {
  const { data } = await httpClient.get('/messages/contacts')
  return Array.isArray(data?.contacts) ? data.contacts : []
}

/**
 * @param {string} otherUserId
 * @param {{ limit?: number, before?: string }} [options] - pass `limit` to enable pagination + `hasMore` in response
 */
export async function fetchMessageHistory(otherUserId, options = {}) {
  const params = { userId: otherUserId }
  if (options.limit != null) params.limit = options.limit
  if (options.before != null && options.before !== '') params.before = options.before

  const { data } = await httpClient.get('/messages', { params })
  const messages = Array.isArray(data?.messages) ? data.messages : []
  const hasMore = Boolean(data?.hasMore)
  return { messages, hasMore }
}
