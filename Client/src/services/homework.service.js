import { httpClient } from './httpClient.js'

export async function createHomework(data) {
  const { data: res } = await httpClient.post('/homeworks', data)
  return res
}

export async function getHomeworks(classId) {
  const { data } = await httpClient.get('/homeworks', { params: { classId } })
  return data
}

export async function getHomeworkById(id) {
  const { data } = await httpClient.get(`/homeworks/${id}`)
  return data
}

export async function getHomeworksForParent() {
  const { data } = await httpClient.get('/homeworks/for-parent')
  return data
}

export async function gradeHomework(homeworkId, payload) {
  const { data } = await httpClient.put(`/homeworks/${homeworkId}/grade`, payload)
  return data
}
