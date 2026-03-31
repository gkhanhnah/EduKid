import { ClassRoom } from '../models/Class.js'
import { classScopeFilter } from '../utils/teacherClassScope.js'
import { Student } from '../models/Student.js'
import { Behavior } from '../models/Behavior.js'
import { Evaluation } from '../models/Evaluation.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { User } from '../models/User.js'
import { Attendance } from '../models/Attendance.js'
import { Homework } from '../models/Homework.js'
import { Grade } from '../models/Grade.js'
import { Document as DocumentModel } from '../models/Document.js'
import { Subject } from '../models/GradeType.js'

function resolveGradeWeight(g) {
  const sub = g?.subject
  if (sub && typeof sub === 'object' && Array.isArray(sub.components)) {
    const c = sub.components.find((x) => x.name === g.componentName)
    const w = Number(c?.weight)
    if (Number.isFinite(w)) return w
  }
  const legacy = Number(g?.type?.weight)
  if (Number.isFinite(legacy)) return legacy
  return NaN
}

function calculateWeightedAverage({ grades = [] }) {
  let weightedSum = 0
  let weightSum = 0

  for (const g of grades) {
    const w = resolveGradeWeight(g)
    const score = Number(g?.score)
    if (!Number.isFinite(w) || !Number.isFinite(score)) continue
    weightedSum += score * w
    weightSum += w
  }

  if (weightSum <= 0) return { weightedAverage: null, weightSum: 0 }
  return { weightedAverage: weightedSum / weightSum, weightSum }
}

function reduceGradesToLatestByComponent(grades = []) {
  const latest = new Map()

  for (const g of grades) {
    const studentId =
      g?.student && typeof g.student === 'object' ? String(g.student._id) : String(g?.student ?? '')
    const subjectId =
      g?.subject && typeof g.subject === 'object' ? String(g.subject._id) : String(g?.subject ?? '')
    const componentName = String(g?.componentName ?? '')

    const key = `${studentId}:${subjectId}:${componentName}`
    const nextTime = g?.createdAt ? new Date(g.createdAt).getTime() : -Infinity
    const prev = latest.get(key)
    const prevTime = prev?.createdAt ? new Date(prev.createdAt).getTime() : -Infinity

    if (!prev || nextTime >= prevTime) latest.set(key, g)
  }

  return Array.from(latest.values())
}

function normalizeToMidnightUTC(d) {
  if (!d) return null
  const x = d instanceof Date ? d : new Date(d)
  if (!Number.isFinite(x.getTime())) return null
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()))
}

function startOfWeekUTC(d) {
  const x = normalizeToMidnightUTC(d)
  if (!x) return null
  const day = x.getUTCDay() // 0=Sun..6=Sat
  const toMonday = day === 0 ? -6 : 1 - day
  x.setUTCDate(x.getUTCDate() + toMonday)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

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

function serializeGradeDoc(g) {
  if (!g) return g
  const out = {
    _id: String(g._id),
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : null,
    score: g.score ?? null,
    componentName: g.componentName ?? null,
    source: g.source ?? null,
    student: g.student && typeof g.student === 'object' ? { _id: String(g.student._id), name: g.student.name } : null,
    subject:
      g.subject && typeof g.subject === 'object' ? { _id: String(g.subject._id), name: g.subject.name } : null,
  }
  return out
}

function serializeHomeworkDoc(hw) {
  if (!hw) return hw
  return {
    _id: String(hw._id),
    createdAt: hw.createdAt ? new Date(hw.createdAt).toISOString() : null,
    title: hw.title ?? null,
    status: hw.status ?? null,
    isGraded: Boolean(hw.isGraded),
    dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString() : null,
    class: hw.classId && typeof hw.classId === 'object' ? { _id: String(hw.classId._id), name: hw.classId.name } : null,
  }
}

function serializeDocumentDoc(doc) {
  if (!doc) return doc
  return {
    _id: String(doc._id),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    name: doc.name ?? null,
    fileType: doc.fileType ?? null,
    folderId: doc.folderId ?? null,
    uploadedBy:
      doc.uploadedBy && typeof doc.uploadedBy === 'object'
        ? { _id: String(doc.uploadedBy._id), name: doc.uploadedBy.name }
        : null,
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const [totalStudents, totalTeachers, totalClasses] = await Promise.all([
      Student.countDocuments({}),
      User.countDocuments({ role: 'teacher' }),
      ClassRoom.countDocuments({}),
    ])

    const now = new Date()
    const startLast30 = new Date(now)
    startLast30.setUTCDate(now.getUTCDate() - 30)
    startLast30.setUTCHours(0, 0, 0, 0)

    // Attendance rate: PRESENT / (PRESENT+ABSENT+LATE), ignoring EXCUSED.
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startLast30, $lte: now },
          published: true,
        },
      },
      {
        $project: {
          status: 1,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    const attendanceCounts = Object.fromEntries(
      (attendanceAgg || []).map((r) => [String(r._id), Number(r.count) || 0]),
    )

    const present = attendanceCounts.PRESENT ?? 0
    const absent = attendanceCounts.ABSENT ?? 0
    const late = attendanceCounts.LATE ?? 0
    const attendanceRate =
      present + absent + late > 0 ? present / (present + absent + late) : null

    // GPA per class and grade distribution.
    // Note: this is computed from latest grades per (student, subject, component).
    const classes = await ClassRoom.find({}).select('_id name').lean()
    const classIds = classes.map((c) => c._id)

    const gpaPerClass = []
    const weightedAverageValues = []

    // Pull subjects + grades per class; keep it simple/consistent for this MVP.
    for (const cls of classes) {
      const students = await Student.find({ classId: cls._id }).select('_id').lean()
      const studentIds = students.map((s) => s._id)
      if (!studentIds.length) {
        gpaPerClass.push({ classId: cls._id, className: cls.name, gpa: null })
        continue
      }

      const subjects = await Subject.find({ classId: cls._id })
        .select('_id name components')
        .lean()
      const subjectIds = subjects.map((s) => s._id)

      const grades = subjectIds.length
        ? await Grade.find({ class: cls._id, student: { $in: studentIds }, subject: { $in: subjectIds } })
            .populate('subject', 'name components')
            .populate('student', 'name classId')
            .lean()
        : []

      const latest = reduceGradesToLatestByComponent(grades)

      const byStudent = new Map()
      for (const sid of studentIds) byStudent.set(String(sid), [])
      for (const g of latest) {
        const sid = g?.student && typeof g.student === 'object' ? String(g.student._id) : String(g?.student ?? '')
        if (!sid) continue
        if (!byStudent.has(sid)) byStudent.set(sid, [])
        byStudent.get(sid).push(g)
      }

      const studentAvgs = []
      for (const [sid, gs] of byStudent.entries()) {
        if (!gs || !gs.length) continue
        const { weightedAverage } = calculateWeightedAverage({ grades: gs })
        if (weightedAverage == null) continue
        studentAvgs.push(weightedAverage)
        weightedAverageValues.push(weightedAverage)
      }

      const gpa = studentAvgs.length ? studentAvgs.reduce((a, b) => a + b, 0) / studentAvgs.length : null
      gpaPerClass.push({ classId: cls._id, className: cls.name, gpa })
    }

    // Grade distribution buckets (0..100). Adjust if your grading scale differs.
    const bins = [0, 50, 60, 70, 80, 90, 101]
    const binLabels = ['0-49', '50-59', '60-69', '70-79', '80-89', '90-100']
    const distribution = binLabels.map((label) => ({ label, value: 0 }))

    for (const v of weightedAverageValues) {
      if (v == null || !Number.isFinite(v)) continue
      let bucketIdx = -1
      for (let i = 0; i < bins.length - 1; i += 1) {
        const from = bins[i]
        const to = bins[i + 1]
        if (v >= from && v < to) {
          bucketIdx = i
          break
        }
      }
      if (bucketIdx >= 0) distribution[bucketIdx].value += 1
    }

    // Attendance trend: last 8 weeks.
    const trendWeeks = 8
    const startTrend = new Date(now)
    startTrend.setUTCDate(now.getUTCDate() - trendWeeks * 7)
    const startWeek = startOfWeekUTC(startTrend) || startTrend

    const weekAgg = await Attendance.aggregate([
      { $match: { date: { $gte: startWeek }, published: true } },
      {
        $project: {
          weekStart: {
            $dateTrunc: { date: '$date', unit: 'week', startOfWeek: 'monday' },
          },
          status: '$status',
        },
      },
      { $group: { _id: { weekStart: '$weekStart' }, count: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } }, absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } } } },
    ])

    const weekMap = new Map(
      (weekAgg || []).map((r) => [
        String(r._id.weekStart),
        { present: r.present ?? 0, absent: r.absent ?? 0, late: r.late ?? 0 },
      ]),
    )

    const attendanceTrend = []
    for (let i = 0; i < trendWeeks; i += 1) {
      const d = new Date(startWeek)
      d.setUTCDate(d.getUTCDate() + i * 7)
      const key = String(d)
      const row = weekMap.get(key) || { present: 0, absent: 0, late: 0 }
      const denom = row.present + row.absent + row.late
      const rate = denom > 0 ? row.present / denom : null
      attendanceTrend.push({
        weekStart: d.toISOString().slice(0, 10),
        rate,
      })
    }

    // Recent activities feed
    const [recentGradesRaw, recentHomeworksRaw, recentUploadsRaw] = await Promise.all([
      Grade.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('student', 'name classId')
        .populate('subject', 'name')
        .lean(),
      Homework.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .populate('classId', 'name')
        .lean(),
      DocumentModel.find({})
        .sort({ createdAt: -1 })
        .limit(4)
        .populate('uploadedBy', 'name email')
        .lean(),
    ])

    const recentActivities = [
      ...(recentGradesRaw || []).map((g) => ({
        type: 'NEW_GRADE',
        createdAt: g.createdAt,
        payload: serializeGradeDoc(g),
      })),
      ...(recentHomeworksRaw || []).map((hw) => ({
        type: 'HOMEWORK',
        createdAt: hw.createdAt,
        payload: serializeHomeworkDoc(hw),
      })),
      ...(recentUploadsRaw || []).map((d) => ({
        type: 'UPLOAD',
        createdAt: d.createdAt,
        payload: serializeDocumentDoc(d),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    res.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      attendanceRate,
      gpaPerClass,
      gradeDistribution: distribution,
      attendanceTrend,
      recentActivities: recentActivities.map((a) => ({
        type: a.type,
        createdAt: a.payload?.createdAt ?? null,
        payload: a.payload,
      })),
    })
  } catch (err) {
    console.error('getAdminDashboard', err)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getAdminInsights(req, res) {
  try {
    const now = new Date()
    const start30 = new Date(now)
    start30.setUTCDate(now.getUTCDate() - 30)
    start30.setUTCHours(0, 0, 0, 0)

    // Attendance-based risk
    const [attendanceByStudent, gradeAvgByStudent] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: { $gte: start30, $lte: now }, published: true } },
        {
          $group: {
            _id: '$studentId',
            absentCount: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
            lateCount: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
          },
        },
      ]),
      Grade.aggregate([
        { $group: { _id: '$student', avgScore: { $avg: '$score' }, gradeCount: { $sum: 1 } } },
      ]),
    ])

    const attendanceMap = new Map(
      (attendanceByStudent || []).map((r) => [String(r._id), r]),
    )
    const gradeMap = new Map((gradeAvgByStudent || []).map((r) => [String(r._id), r]))

    // Risk score heuristic: absences weigh more; low grades increase risk.
    const riskRows = []
    for (const [sid, g] of gradeMap.entries()) {
      const a = attendanceMap.get(sid)
      const absentCount = Number(a?.absentCount ?? 0)
      const lateCount = Number(a?.lateCount ?? 0)
      const avgScore = Number(g?.avgScore ?? NaN)
      if (!Number.isFinite(avgScore)) continue
      const gradeRisk = Math.max(0, (60 - avgScore) / 10) // 60 is an arbitrary threshold
      const riskScore = absentCount * 2 + lateCount * 1 + gradeRisk
      riskRows.push({ studentId: sid, riskScore, absentCount, lateCount, avgScore, gradeCount: g?.gradeCount ?? 0 })
    }

    riskRows.sort((a, b) => b.riskScore - a.riskScore)
    const topAtRisk = riskRows.slice(0, 10)
    const studentIds = topAtRisk.map((r) => r.studentId)
    const students = studentIds.length ? await Student.find({ _id: { $in: studentIds } }).select('name classId').lean() : []
    const studentMap = new Map(students.map((s) => [String(s._id), s]))

    const atRiskStudents = topAtRisk.map((r) => ({
      student: studentMap.get(String(r.studentId)) ?? null,
      riskScore: r.riskScore,
      absentCount: r.absentCount,
      lateCount: r.lateCount,
      avgScore: r.avgScore,
    }))

    // Missing grade heuristic:
    // Expected components = sum of subject.components sizes per class.
    const expectedByClass = await Subject.aggregate([
      { $project: { classId: '$classId', componentCount: { $size: '$components' } } },
      { $group: { _id: '$classId', expectedComponents: { $sum: '$componentCount' } } },
    ])

    const actualByStudentClass = await Grade.aggregate([
      { $group: { _id: { student: '$student', classId: '$class', subjectId: '$subject', componentName: '$componentName' } } },
      { $group: { _id: { student: '$_id.student', classId: '$_id.classId' }, actualComponents: { $sum: 1 } } },
    ])

    const expectedMap = new Map(expectedByClass.map((r) => [String(r._id), Number(r.expectedComponents ?? 0)]))
    const missingRows = []
    for (const r of actualByStudentClass) {
      const sid = String(r._id.student)
      const cid = String(r._id.classId)
      const expected = expectedMap.get(cid) ?? 0
      const actual = Number(r.actualComponents ?? 0)
      const missingCount = Math.max(0, expected - actual)
      if (missingCount > 0) missingRows.push({ studentId: sid, classId: cid, missingCount, actualComponents: actual, expectedComponents: expected })
    }

    missingRows.sort((a, b) => b.missingCount - a.missingCount)
    const topMissing = missingRows.slice(0, 10)
    const missingStudentIds = topMissing.map((r) => r.studentId)
    const missingStudents = missingStudentIds.length
      ? await Student.find({ _id: { $in: missingStudentIds } }).select('name classId').lean()
      : []
    const missingStudentMap = new Map(missingStudents.map((s) => [String(s._id), s]))

    const missingGrades = topMissing.map((r) => ({
      student: missingStudentMap.get(String(r.studentId)) ?? null,
      classId: r.classId,
      missingCount: r.missingCount,
      actualComponents: r.actualComponents,
      expectedComponents: r.expectedComponents,
    }))

    const lateHomeworks = await Homework.find({ status: 'OVERDUE' })
      .sort({ dueDate: -1 })
      .limit(10)
      .populate('classId', 'name grade')
      .lean()

    const lateSubmissions = lateHomeworks.map((h) => ({
      _id: h._id,
      title: h.title,
      dueDate: h.dueDate ? new Date(h.dueDate).toISOString().slice(0, 10) : null,
      status: h.status,
      class: h.classId ? { _id: h.classId._id, name: h.classId.name, grade: h.classId.grade } : null,
    }))

    res.json({ atRiskStudents, missingGrades, lateSubmissions })
  } catch (err) {
    console.error('getAdminInsights', err)
    res.status(500).json({ error: 'Server error' })
  }
}
