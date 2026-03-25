import { httpClient } from './httpClient.js'

export async function getFolders(params) {
  const { data } = await httpClient.get('/documents/folders', { params })
  return data
}

export async function createFolder(body) {
  const { data } = await httpClient.post('/documents/folders', body)
  return data
}

/** multipart: fields folderId + file (name "file") */
export async function uploadDocument(formData) {
  const { data } = await httpClient.post('/documents/upload', formData)
  return data
}

export async function getDocuments(folderId) {
  const { data } = await httpClient.get('/documents', { params: { folderId } })
  return data
}
