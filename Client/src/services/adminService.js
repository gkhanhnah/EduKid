import { httpClient } from './httpClient.js'

export async function fetchAdminDashboard() {
  const { data } = await httpClient.get('/dashboard/admin')
  return data
}

export async function fetchAdminInsights() {
  const { data } = await httpClient.get('/dashboard/admin/insights')
  return data
}

export async function fetchAdminTeachers() {
  const { data } = await httpClient.get('/admin/teachers')
  return data
}

export async function createAdminTeacher({ name, email, password }) {
  const { data } = await httpClient.post('/admin/teachers', { name, email, password })
  return data
}

export async function importAdminTeachersXlsx(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await httpClient.post('/admin/teachers/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function exportTeachersXlsx() {
  const { data } = await httpClient.get('/admin/teachers/export/xlsx', {
    responseType: 'blob',
  })
  return data
}

export async function deleteAdminTeacher(id) {
  const { data } = await httpClient.delete(`/admin/teachers/${id}`)
  return data
}

export async function exportGradesReportXlsx(query) {
  const { data } = await httpClient.get('/admin/reports/grades/export/xlsx', {
    params: query || {},
    responseType: 'blob',
  })
  return data
}

export async function getAttendanceReport(query) {
  const { data } = await httpClient.get('/admin/reports/attendance', { params: query || {} })
  return data
}

export async function exportAttendanceReportXlsx(query) {
  const { data } = await httpClient.get('/admin/reports/attendance/export/xlsx', {
    params: query || {},
    responseType: 'blob',
  })
  return data
}

export async function exportStudentsXlsx(query) {
  const { data } = await httpClient.get('/students/export/xlsx', {
    params: query || {},
    responseType: 'blob',
  })
  return data
}

export async function fetchAdminSettings() {
  const { data } = await httpClient.get('/admin/settings')
  return data
}

export async function updateAdminSettings(body) {
  const { data } = await httpClient.put('/admin/settings', body)
  return data
}

export async function fetchAdminSchoolInfo() {
  const { data } = await httpClient.get('/admin/school')
  return data
}

export async function updateAdminSchoolInfo(body) {
  const { data } = await httpClient.put('/admin/school', body)
  return data
}

