import mongoose from 'mongoose'
import { Homework } from '../models/Homework.js'
import { Grade } from '../models/Grade.js'
import { Subject } from '../models/GradeType.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { findClassForTeacher, findMainTeacherClass } from '../utils/teacherClassScope.js'

function handleError(res, err) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate grade for this component' })
  }
  return res.status(500).json({ error: 'Server error' })
}

function computeDisplayStatus(doc) {
  if (doc.status === 'DONE') return 'DONE'
  if (new Date(doc.dueDate).getTime() < Date.now()) return 'OVERDUE'
  return 'PENDING'
}

function withStatus(plain) {
  if (!plain) return plain
  return { ...plain, displayStatus: computeDisplayStatus(plain) }
}

export async function createHomework(req, res) {
  try {
    const { title, description, dueDate, studentIds, classId, attachments } = req.body || {}

    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' })
    }
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'Valid classId is required' })
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds must be a non-empty array' })
    }

    const cls = await findMainTeacherClass(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const due = new Date(dueDate)
    if (!Number.isFinite(due.getTime())) {
      return res.status(400).json({ error: 'dueDate must be a valid date' })
    }
    if (due.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'dueDate must be in the future' })
    }

    for (const sid of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(sid)) {
        return res.status(400).json({ error: 'Invalid student id in studentIds' })
      }
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      classId,
    }).lean()

    if (students.length !== studentIds.length) {
      return res.status(400).json({ error: 'All students must belong to the selected class' })
    }

    const att = Array.isArray(attachments)
      ? attachments.map((a) => String(a).trim()).filter(Boolean)
      : []

    const created = await Homework.create({
      title: title.trim(),
      description: description?.trim() ?? '',
      dueDate: due,
      classId,
      studentIds,
      attachments: att,
      createdBy: req.user.id,
    })

    const populated = await Homework.findById(created._id)
      .populate('studentIds', 'name classId')
      .populate('classId', 'name grade')
      .lean()

    res.status(201).json(withStatus(populated))
  } catch (err) {
    handleError(res, err)
  }
}

export async function getHomeworksForParent(req, res) {
  try {
    const links = await ParentStudent.find({ parentUserId: req.user.id })
      .select('studentId')
      .lean()
    const studentIds = links.map((l) => l.studentId).filter(Boolean)
    if (studentIds.length === 0) {
      return res.json({ homeworks: [] })
    }

    const list = await Homework.find({ studentIds: { $in: studentIds } })
      .populate('classId', 'name grade')
      .populate('studentIds', 'name')
      .sort({ dueDate: 1 })
      .lean()

    const parentSet = new Set(studentIds.map((id) => String(id)))
    const homeworks = list.map((h) => {
      const assigned = (h.studentIds || []).filter((s) =>
        parentSet.has(String(s._id ?? s)),
      )
      const myChildrenNames = assigned.map((s) => s.name || 'Student').filter(Boolean)
      return withStatus({
        ...h,
        myChildrenNames,
      })
    })

    res.json({ homeworks })
  } catch (err) {
    handleError(res, err)
  }
}

export async function getHomeworks(req, res) {
  try {
    const { classId } = req.query
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: 'classId query is required' })
    }

    const cls = await findClassForTeacher(classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Class not found or not your class' })
    }

    const list = await Homework.find({ classId })
      .populate('studentIds', 'name')
      .sort({ dueDate: 1 })
      .lean()

    res.json({
      homeworks: list.map((h) => withStatus(h)),
    })
  } catch (err) {
    handleError(res, err)
  }
}

export async function getHomeworkById(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid homework id' })
    }

    const doc = await Homework.findById(id)
      .populate('studentIds', 'name classId')
      .populate('classId', 'name grade')
      .lean()

    if (!doc) {
      return res.status(404).json({ error: 'Homework not found' })
    }

    const cls = await findClassForTeacher(doc.classId, req.user.id).lean()
    if (!cls) {
      return res.status(404).json({ error: 'Homework not found' })
    }

    res.json(withStatus(doc))
  } catch (err) {
    handleError(res, err)
  }
}

export async function gradeHomework(req, res) {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid homework id' })
    }

    const homework = await Homework.findById(id)
    if (!homework) return res.status(404).json({ error: 'Homework not found' })

    // Ensure the teacher owns this homework's class
    const cls = await findMainTeacherClass(homework.classId, req.user.id).lean()
    if (!cls) return res.status(404).json({ error: 'Homework not found' })

    const body = req.body || {}
    const isGraded = Boolean(body.isGraded)

    const { subjectId, gradeComponent, maxScore } = body || {}
    const scores = body.scores

    // Ungrade: remove all connected HOMEWORK grades.
    if (!isGraded) {
      homework.isGraded = false
      homework.subjectId = undefined
      homework.gradeComponent = undefined
      homework.maxScore = undefined
      await homework.save()

      await Grade.deleteMany({ source: 'HOMEWORK', sourceId: String(homework._id) })
      return res.json({ homework })
    }

    if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ error: 'Valid subjectId is required' })
    }
    if (!gradeComponent?.trim()) {
      return res.status(400).json({ error: 'gradeComponent is required' })
    }

    const mx = Number(maxScore)
    if (!Number.isFinite(mx) || mx <= 0) {
      return res.status(400).json({ error: 'maxScore must be a valid number > 0' })
    }

    // Validate subject/components belong to this homework class
    const subject = await Subject.findOne({ _id: subjectId, classId: homework.classId }).lean()
    if (!subject) return res.status(404).json({ error: 'Subject not found for this class' })

    const componentName = String(gradeComponent).trim()
    const validComponent = subject.components?.some((c) => c.name === componentName)
    if (!validComponent) {
      return res.status(400).json({ error: 'gradeComponent is not part of the selected subject' })
    }

    // Normalize scores input
    // Accept either:
    // - { scores: [{ studentId, score }, ...] }
    // - { scores: { [studentId]: score, ... } }
    let entries = []
    if (Array.isArray(scores)) {
      entries = scores.map((x) => ({
        studentId: x?.studentId,
        score: x?.score,
      }))
    } else if (scores && typeof scores === 'object') {
      entries = Object.entries(scores).map(([studentId, score]) => ({ studentId, score }))
    }

    if (!entries.length) {
      return res.status(400).json({ error: 'scores is required when isGraded=true' })
    }

    const homeworkStudentIds = new Set((homework.studentIds ?? []).map((sid) => String(sid)))
    for (const e of entries) {
      if (!e?.studentId || !mongoose.Types.ObjectId.isValid(e.studentId)) {
        return res.status(400).json({ error: 'Invalid studentId in scores' })
      }
      if (!homeworkStudentIds.has(String(e.studentId))) {
        return res.status(400).json({ error: 'All score studentIds must belong to this homework class' })
      }
      const n = Number(e.score)
      if (!Number.isFinite(n)) {
        return res.status(400).json({ error: 'Each score must be a valid number' })
      }
    }

    // Optional strictness: require one score per student.
    if (entries.length !== homework.studentIds.length) {
      return res.status(400).json({ error: 'scores must include every student in this homework' })
    }

    // Store grade metadata on Homework
    homework.isGraded = true
    homework.subjectId = subjectId
    homework.gradeComponent = componentName
    homework.maxScore = mx
    await homework.save()

    const homeworkSourceId = String(homework._id)

    // Remove any HOMEWORK grades tied to this homework that no longer match the
    // current (subject, componentName) — handles the "re-grade with different component" case.
    await Grade.deleteMany({
      source: 'HOMEWORK',
      sourceId: homeworkSourceId,
      $or: [
        { subject: { $ne: new mongoose.Types.ObjectId(subjectId) } },
        { componentName: { $ne: componentName } },
      ],
    })

    // Atomically upsert each student's grade to avoid duplicate-key errors from
    // concurrent requests or stale data.
    const bulkOps = entries.map((e) => ({
      updateOne: {
        filter: {
          student: new mongoose.Types.ObjectId(String(e.studentId)),
          class: homework.classId,
          subject: new mongoose.Types.ObjectId(subjectId),
          componentName,
          source: 'HOMEWORK',
          sourceId: homeworkSourceId,
        },
        update: {
          $set: {
            score: Number(e.score),
            createdBy: new mongoose.Types.ObjectId(String(req.user.id)),
            showToParent: false,
            source: 'HOMEWORK',
            sourceId: homeworkSourceId,
          },
        },
        upsert: true,
      },
    }))

    await Grade.bulkWrite(bulkOps, { ordered: false })
    res.json({ homework, created: bulkOps.length })
  } catch (err) {
    handleError(res, err)
  }
}
