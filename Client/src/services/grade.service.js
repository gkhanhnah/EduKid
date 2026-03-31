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

export async function submitGradesForSubject({ classId, subjectId }) {
  const { data } = await httpClient.post('/grades/workflow/submit', { classId, subjectId })
  return data
}

export async function approveGradesForSubject({ classId, subjectId }) {
  const { data } = await httpClient.post('/grades/workflow/approve', { classId, subjectId })
  return data
}

export async function rejectGradesForSubject({ classId, subjectId, rejectionReason }) {
  const { data } = await httpClient.post('/grades/workflow/reject', {
    classId,
    subjectId,
    rejectionReason,
  })
  return data
}

export async function lockGradesForSubject({ classId, subjectId }) {
  const { data } = await httpClient.post('/grades/workflow/lock', { classId, subjectId })
  return data
}

export async function unlockGradesForSubject({ classId, subjectId }) {
  const { data } = await httpClient.post('/grades/workflow/unlock', { classId, subjectId })
  return data
}

export async function getGradeAuditLogs({ classId, subjectId, limit }) {
  const { data } = await httpClient.get('/grades/audit', {
    params: { classId, subjectId, limit },
  })
  return data
}
