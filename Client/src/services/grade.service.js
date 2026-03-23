import { httpClient } from './httpClient.js'

/**
 * Grade Management service layer.
 * Role-based restrictions are enforced on the backend:
 * - Teachers can create/update grades and edit GradeType weights.
 * - Parents can only view grades with showToParent=true.
 */

export async function getStudentGrades(studentId) {
  const { data } = await httpClient.get(`/grades/student/${studentId}`)
  return data
}

export async function getClassGrades(classId) {
  const { data } = await httpClient.get(`/grades/class/${classId}`)
  return data
}

export async function addGrade(payload) {
  const { data } = await httpClient.post('/grades', payload)
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

// ---------------------------
// GradeType endpoints (weights)
// ---------------------------

export async function getGradeTypesByClass(classId) {
  const { data } = await httpClient.get(`/grades/types/class/${classId}`)
  return data
}

export async function createGradeType(payload) {
  const { data } = await httpClient.post('/grades/types', payload)
  return data
}

export async function updateGradeType(id, payload) {
  const { data } = await httpClient.put(`/grades/types/${id}`, payload)
  return data
}

