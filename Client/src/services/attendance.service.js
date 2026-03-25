import { httpClient } from './httpClient.js'

export async function markAttendance(data) {
  const { data: res } = await httpClient.post('/attendance', data)
  return res?.attendance ?? res
}

export async function getAttendanceByDate(date, classId) {
  const { data } = await httpClient.get('/attendance', {
    params: {
      date,
      ...(classId ? { classId } : {}),
    },
  })
  return data
}

export async function publishAttendanceForDate({ date, classId }) {
  const { data } = await httpClient.post('/attendance/publish', {
    date,
    classId,
    published: true,
  })
  return data
}

export async function setAttendancePublishedForDate({ date, classId, published }) {
  const { data } = await httpClient.post('/attendance/publish', {
    date,
    classId,
    published,
  })
  return data
}

