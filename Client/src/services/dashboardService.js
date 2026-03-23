import { httpClient } from './httpClient.js'

export async function fetchTeacherDashboard() {
  const { data } = await httpClient.get('/dashboard/teacher')
  return data
}

export async function fetchParentDashboard() {
  const { data } = await httpClient.get('/dashboard/parent')
  return data
}
