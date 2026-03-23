import { httpClient } from './httpClient.js'

export async function fetchClassChat(classId) {
  const { data } = await httpClient.get(`/chat/${classId}`)
  return data
}

