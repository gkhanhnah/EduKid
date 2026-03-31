import { httpClient } from './httpClient.js'

export async function getAdminStudents(params = {}) {
  const { data } = await httpClient.get('/students', { params })
  return data
}

export async function createAdminStudent(body) {
  const { data } = await httpClient.post('/students', body)
  return data
}

export async function updateAdminStudent(id, body) {
  const { data } = await httpClient.put(`/students/${id}`, body)
  return data
}

export async function deleteAdminStudent(id) {
  const { data } = await httpClient.delete(`/students/${id}`)
  return data
}

export async function importAdminStudentsXlsx(file, fallbackClassId) {
  const fd = new FormData()
  fd.append('file', file)
  if (fallbackClassId) fd.append('classId', fallbackClassId)
  const { data } = await httpClient.post('/students/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

