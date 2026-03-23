import { getMyChildren as fetchMyChildren, createParentStudentLink as postParentLink } from './api.js'

/** Linked children for the logged-in parent (JWT). */
export async function getMyChildren() {
  return fetchMyChildren()
}

/** Teacher links a parent account to a student (by parentUserId and/or parentEmail). */
export async function createParentStudentLink(body) {
  return postParentLink(body)
}
