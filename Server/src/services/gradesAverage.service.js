import { Grade } from '../models/Grade.js'
import { Subject } from '../models/GradeType.js'
import { Student } from '../models/Student.js'

function toKey(str) {
  // Normalize subject names into stable keys for storing evaluation snapshots.
  // Example: "Math" -> "math", "Reading Comprehension" -> "reading_comprehension".
  return String(str ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function computeGradesAverageForStudent({ studentId, classId: passedClassId }) {
  const student =
    passedClassId != null
      ? null
      : await Student.findById(studentId).select('classId').lean()

  const classId = passedClassId ?? student?.classId
  if (!classId) {
    throw new Error('Could not resolve classId for student')
  }

  const subjects = await Subject.find({ classId }).lean()
  const subjectIds = subjects.map((s) => s._id)

  // Pick the latest grade row per (subject, componentName)
  const grades = subjectIds.length
    ? await Grade.find({ student: studentId, class: classId, subject: { $in: subjectIds } }).lean()
    : []

  const latestByComponent = new Map()
  for (const g of grades) {
    const key = `${String(g.subject)}:${String(g.componentName)}`
    const prev = latestByComponent.get(key)
    const prevTime = prev?.createdAt ? new Date(prev.createdAt).getTime() : -Infinity
    const nextTime = g?.createdAt ? new Date(g.createdAt).getTime() : -Infinity
    if (!prev || nextTime >= prevTime) {
      latestByComponent.set(key, g)
    }
  }

  const subjectsPayload = []
  const summaryScores = {}

  for (const sub of subjects) {
    let weightedSum = 0
    let weightSum = 0

    for (const c of sub.components ?? []) {
      const componentName = c?.name
      const weight = Number(c?.weight)
      if (!Number.isFinite(weight) || weight < 0) continue

      const key = `${String(sub._id)}:${String(componentName)}`
      const latest = latestByComponent.get(key)
      const score = Number(latest?.score)
      if (!Number.isFinite(score)) continue

      weightedSum += score * weight
      weightSum += weight
    }

    const averageScore = weightSum > 0 ? weightedSum / weightSum : null
    subjectsPayload.push({
      subjectName: sub.name,
      averageScore,
    })

    summaryScores[toKey(sub.name)] = averageScore
  }

  return { subjects: subjectsPayload, summaryScores }
}

