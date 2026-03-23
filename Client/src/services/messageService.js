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

export async function fetchMessageHistory(otherUserId) {
  const { data } = await httpClient.get('/messages', {
    params: { userId: otherUserId },
  })
  return Array.isArray(data?.messages) ? data.messages : []
}
