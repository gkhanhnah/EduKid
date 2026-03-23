import mongoose from 'mongoose'
import { ClassRoom } from '../models/Class.js'

/** Mongo filter: classes where user is main teacher OR subject teacher */
export function classScopeFilter(teacherUserId) {
  const id = teacherUserId?.toString?.() ?? teacherUserId
  return {
    $or: [{ teacherId: id }, { subjectTeachers: id }],
  }
}

export async function distinctClassIdsForTeacher(teacherUserId) {
  return ClassRoom.find(classScopeFilter(teacherUserId)).distinct('_id')
}

/** Query for class doc if teacher may access (main or subject). Chain .lean() / .exec(). */
export function findClassForTeacher(classId, teacherUserId) {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return ClassRoom.findOne({ _id: { $in: [] } })
  }
  return ClassRoom.findOne({
    _id: classId,
    ...classScopeFilter(teacherUserId),
  })
}

/** Query: class only if user is main teacher */
export function findMainTeacherClass(classId, mainTeacherUserId) {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return ClassRoom.findOne({ _id: { $in: [] } })
  }
  return ClassRoom.findOne({
    _id: classId,
    teacherId: mainTeacherUserId,
  })
}

export function isMainTeacher(cls, userId) {
  if (!cls?.teacherId) return false
  const tid =
    typeof cls.teacherId === 'object' && cls.teacherId._id != null
      ? cls.teacherId._id
      : cls.teacherId
  return String(tid) === String(userId)
}
