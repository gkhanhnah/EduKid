import { httpClient } from './httpClient.js'

export async function getTimetable(classId) {
  const { data } = await httpClient.get(`/timetable/${classId}`)
  return data
}

/** Teacher only: create or update class timetable */
export async function saveTimetable(payload) {
  const { data } = await httpClient.post('/timetable', payload)
  return data
}
