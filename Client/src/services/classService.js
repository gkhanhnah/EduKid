import {
  getClasses as fetchClasses,
  createClass as postClass,
  updateClass as patchClass,
  deleteClass as removeClass,
  getClassById as fetchClassById,
  addStudentToClass as putAddStudent,
  addSubjectTeacherToClass as putAddTeacher,
  addParentToStudent as putAddParent,
} from './api.js'

/** List classes for the current teacher (main or subject); includes counts from API. */
export async function getClasses() {
  return fetchClasses()
}

export async function getClassById(id) {
  return fetchClassById(id)
}

export async function createClass(body) {
  return postClass(body)
}

export async function updateClass(id, body) {
  return patchClass(id, body)
}

export async function deleteClass(id) {
  return removeClass(id)
}

/** Create student in class or move existing { studentId } */
export async function addStudentToClass(classId, body) {
  return putAddStudent(classId, body)
}

/** Invite co-teacher { teacherUserId } — main teacher only */
export async function addSubjectTeacherToClass(classId, body) {
  return putAddTeacher(classId, body)
}

/** Link parent { parentUserId | parentEmail, relationship? } */
export async function addParentToStudent(studentId, body) {
  return putAddParent(studentId, body)
}
