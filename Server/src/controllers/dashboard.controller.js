import { ClassRoom } from '../models/Class.js'
import { classScopeFilter } from '../utils/teacherClassScope.js'
import { Student } from '../models/Student.js'
import { Behavior } from '../models/Behavior.js'
import { Evaluation } from '../models/Evaluation.js'
import { ParentStudent } from '../models/ParentStudent.js'

function serializeBehaviorDoc(b) {
  if (!b) return b
  const out = {
    _id: String(b._id),
    type: b.type,
    behaviorType: b.type,
    note: b.note ?? '',
    description: b.note ?? '',
    date: b.date ? new Date(b.date).toISOString() : null,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
  }
  if (b.student && typeof b.student === 'object') {
    out.student = { _id: String(b.student._id), name: b.student.name }
    out.studentId = out.student
  } else if (b.student) {
    out.studentId = String(b.student)
  }
  return out
}

function serializeEvaluationDoc(ev) {
  if (!ev) return ev
  const out = {
    _id: String(ev._id),
    period: ev.period ?? null,
    comment: ev.comment ?? null,
    scores: ev.scores && typeof ev.scores === 'object' ? ev.scores : {},
    createdAt: ev.createdAt ? new Date(ev.createdAt).toISOString() : null,
  }
  if (ev.studentId && typeof ev.studentId === 'object') {
    out.student = { _id: String(ev.studentId._id), name: ev.studentId.name }
  }
  if (ev.teacherId && typeof ev.teacherId === 'object') {
    out.teacher = { _id: String(ev.teacherId._id), name: ev.teacherId.name }
  }
  return out
}

export async function getTeacherDashboard(req, res) {
  try {
    const classes = await ClassRoom.find(classScopeFilter(req.user.id))
      .select('_id name')
      .lean()
    const classIds = classes.map((c) => c._id)
    const students = await Student.find({ classId: { $in: classIds } })
      .select('_id name classId')
      .lean()
    const studentIds = students.map((s) => s._id)

    const counts = { GOOD: 0, BAD: 0, ACTIVE: 0, SLEEPY: 0 }
    if (studentIds.length) {
      const agg = await Behavior.aggregate([
        { $match: { student: { $in: studentIds } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      for (const row of agg) {
        if (row._id && counts[row._id] !== undefined) {
          counts[row._id] = row.count
        }
      }
    }

    const recentBehaviorsRaw = studentIds.length
      ? await Behavior.find({ student: { $in: studentIds } })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('student', 'name')
          .lean()
      : []

    const behaviorStats = {
      GOOD: counts.GOOD,
      BAD: counts.BAD,
      ACTIVE: counts.ACTIVE,
      SLEEPY: counts.SLEEPY,
      NOTE: counts.ACTIVE,
    }

    res.json({
      totalStudents: students.length,
      totalClasses: classes.length,
      behaviorStats,
      recentBehaviors: recentBehaviorsRaw.map(serializeBehaviorDoc),
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getParentDashboard(req, res) {
  try {
    const links = await ParentStudent.find({ parentUserId: req.user.id })
      .populate({
        path: 'studentId',
        populate: { path: 'classId', select: 'name grade' },
      })
      .sort({ createdAt: -1 })
      .lean()

    const children = links
      .filter((l) => l.studentId)
      .map((l) => ({
        linkId: l._id,
        relationship: l.relationship ?? null,
        student: l.studentId,
      }))

    const studentIds = children.map((c) => c.student._id)
    const idToName = new Map(
      children.map((c) => [String(c.student._id), c.student.name || 'Student']),
    )

    let recentBehaviors = []
    let latestEvaluations = []
    let behaviorSummaryByChild = []

    if (studentIds.length) {
      recentBehaviors = await Behavior.find({ student: { $in: studentIds } })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('student', 'name')
        .lean()

      latestEvaluations = await Evaluation.find({ studentId: { $in: studentIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('studentId', 'name')
        .populate('teacherId', 'name')
        .lean()

      const summaryAgg = await Behavior.aggregate([
        { $match: { student: { $in: studentIds } } },
        {
          $group: {
            _id: '$student',
            GOOD: {
              $sum: { $cond: [{ $eq: ['$type', 'GOOD'] }, 1, 0] },
            },
            BAD: {
              $sum: { $cond: [{ $eq: ['$type', 'BAD'] }, 1, 0] },
            },
            ACTIVE: {
              $sum: { $cond: [{ $eq: ['$type', 'ACTIVE'] }, 1, 0] },
            },
            SLEEPY: {
              $sum: { $cond: [{ $eq: ['$type', 'SLEEPY'] }, 1, 0] },
            },
          },
        },
      ])

      behaviorSummaryByChild = summaryAgg.map((row) => ({
        studentId: String(row._id),
        studentName: idToName.get(String(row._id)) ?? 'Student',
        good: row.GOOD,
        bad: row.BAD,
        active: row.ACTIVE,
        sleepy: row.SLEEPY,
        notes: row.ACTIVE,
      }))

      for (const c of children) {
        const sid = String(c.student._id)
        if (!behaviorSummaryByChild.some((s) => s.studentId === sid)) {
          behaviorSummaryByChild.push({
            studentId: sid,
            studentName: c.student.name || 'Student',
            good: 0,
            bad: 0,
            active: 0,
            sleepy: 0,
            notes: 0,
          })
        }
      }
    }

    res.json({
      children,
      recentBehaviors: recentBehaviors.map(serializeBehaviorDoc),
      latestEvaluations: latestEvaluations.map(serializeEvaluationDoc),
      behaviorSummaryByChild,
    })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
