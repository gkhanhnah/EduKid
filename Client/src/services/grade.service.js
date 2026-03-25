import { httpClient } from './httpClient.js'

/**
 * Grade management. Backend enforces roles: teachers manage subjects/grades;
 * parents only see grades with showToParent=true.
 */

export async function getStudentGrades(studentId) {
  const { data } = await httpClient.get(`/grades/student/${studentId}`)
  return data
}

export async function getClassGrades(classId) {
  const { data } = await httpClient.get(`/grades/class/${classId}`)
  return data
}

export async function getSubjects(classId) {
  const { data } = await httpClient.get('/grades/subjects', { params: { classId } })
  return data
}

export async function createSubject(payload) {
  const { data } = await httpClient.post('/grades/subjects', payload)
  return data
}

export async function updateSubject(id, payload) {
  const { data } = await httpClient.put(`/grades/subjects/${id}`, payload)
  return data
}

export async function addGradeToSubject(subjectId, payload) {
  const { data } = await httpClient.post(`/grades/subjects/${subjectId}/grades`, payload)
  return data
}

export async function getGradesBySubject(subjectId, params) {
  const { data } = await httpClient.get(`/grades/subjects/${subjectId}/grades`, { params })
  return data
}

export async function updateGrade(id, payload) {
  const { data } = await httpClient.put(`/grades/${id}`, payload)
  return data
}

export async function toggleShowGrade(id) {
  const { data } = await httpClient.put(`/grades/${id}/show`)
  return data
}

export async function getGradesAverage(studentId) {
  const { data } = await httpClient.get('/grades/average', { params: { studentId } })
  return data
}
