import { httpClient } from './httpClient.js'

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let mockClassStore = null
let mockStudentStore = null
let mockBehaviorStore = null
let mockParentLinkStore = null
let mockEvaluationStore = null

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function behaviorStudentId(b) {
  if (b.student && typeof b.student === 'object') return String(b.student._id)
  if (b.student) return String(b.student)
  if (b.studentId && typeof b.studentId === 'object') return String(b.studentId._id)
  return String(b.studentId ?? '')
}

function mockBehaviorType(b) {
  const t = (b.type ?? b.behaviorType ?? '').toString().toUpperCase()
  if (t === 'NOTE') return 'ACTIVE'
  return t
}

function evaluationStudentId(ev) {
  if (ev.studentId && typeof ev.studentId === 'object') return String(ev.studentId._id)
  return String(ev.studentId ?? '')
}

function populateStudentClass(student) {
  if (!mockClassStore || !student.classId) return student
  const cid = typeof student.classId === 'object' ? student.classId._id : student.classId
  const cls = mockClassStore.find((c) => String(c._id) === String(cid))
  return {
    ...student,
    classId: cls ? { _id: cls._id, name: cls.name, grade: cls.grade } : student.classId,
  }
}

async function initMockParentLinks() {
  if (mockParentLinkStore) return
  mockParentLinkStore = []
}

async function initMockEvaluations() {
  if (mockEvaluationStore) return
  mockEvaluationStore = []
}

async function initMockStores() {
  if (!mockClassStore) {
    const { mockClasses } = await import('../mock/classes.mock.js')
    mockClassStore = structuredClone(mockClasses)
  }
  await initMockParentLinks()
  await initMockEvaluations()
  if (mockStudentStore && mockBehaviorStore) return
  const [{ mockStudents }, { mockBehaviors }] = await Promise.all([
    import('../mock/students.mock.js'),
    import('../mock/behaviors.mock.js'),
  ])
  if (!mockStudentStore) {
    mockStudentStore = structuredClone(mockStudents)
  }
  if (!mockBehaviorStore) {
    mockBehaviorStore = structuredClone(mockBehaviors)
  }
}

export async function getClasses() {
  if (USE_MOCK) {
    await initMockStores()
    const user = getStoredUser()
    return mockClassStore.map((c) => {
      const studentCount = mockStudentStore.filter(
        (s) => String(s.classId) === String(c._id),
      ).length
      const subs = c.subjectTeachers || []
      return {
        ...structuredClone(c),
        mainTeacher:
          c.mainTeacher ||
          (user ? { _id: user.id, name: user.name, email: user.email } : null),
        subjectTeachers: subs,
        studentCount,
        subjectTeacherCount: subs.length,
        teacherCount: 1 + subs.length,
      }
    })
  }
  const { data } = await httpClient.get('/classes')
  return data
}

export async function createClass(body) {
  if (USE_MOCK) {
    await initMockStores()
    const user = getStoredUser()
    const created = {
      _id: `mockc${Date.now().toString(36)}`,
      name: body.name,
      grade: body.grade ?? undefined,
      teacherId: user?.id || 'mock-teacher',
      mainTeacher: { _id: user?.id, name: user?.name || 'You', email: user?.email },
      subjectTeachers: [],
      studentCount: 0,
      subjectTeacherCount: 0,
      teacherCount: 1,
    }
    mockClassStore.push(created)
    return structuredClone(created)
  }
  const { data } = await httpClient.post('/classes', body)
  return data
}

export async function getClassById(id) {
  if (USE_MOCK) {
    await initMockStores()
    const c = mockClassStore.find((x) => String(x._id) === String(id))
    if (!c) throw new Error('Class not found')
    const studs = mockStudentStore.filter((s) => String(s.classId) === String(id))
    return {
      _id: c._id,
      name: c.name,
      grade: c.grade,
      mainTeacher: c.mainTeacher || { name: 'Teacher' },
      subjectTeachers: c.subjectTeachers || [],
      students: studs.map((s) => ({
        _id: s._id,
        name: s.name,
        age: s.age,
        gender: s.gender,
        parentCount: 0,
      })),
      isMainTeacher: true,
    }
  }
  const { data } = await httpClient.get(`/classes/${id}`)
  return data
}

export async function addStudentToClass(classId, body) {
  if (USE_MOCK) {
    await initMockStores()
    if (body.studentId) {
      const s = mockStudentStore.find((x) => String(x._id) === String(body.studentId))
      if (!s) throw new Error('Student not found')
      s.classId = classId
      return populateStudentClass(structuredClone(s))
    }
    const created = {
      _id: `mocks${Date.now().toString(36)}`,
      name: body.name,
      age: body.age,
      gender: body.gender,
      classId,
    }
    mockStudentStore.push(created)
    return populateStudentClass(structuredClone(created))
  }
  const { data } = await httpClient.put(`/classes/${classId}/add-student`, body)
  return data
}

export async function addSubjectTeacherToClass(classId, body) {
  if (USE_MOCK) {
    await initMockStores()
    const c = mockClassStore.find((x) => String(x._id) === String(classId))
    if (!c) throw new Error('Class not found')
    if (!c.subjectTeachers) c.subjectTeachers = []
    c.subjectTeachers.push({
      _id: body.teacherUserId || 'mock-sub',
      name: 'Invited teacher',
      email: 'teacher@mock',
    })
    c.subjectTeacherCount = c.subjectTeachers.length
    c.teacherCount = 1 + c.subjectTeacherCount
    return structuredClone(c)
  }
  const { data } = await httpClient.put(`/classes/${classId}/add-teacher`, body)
  return data
}

export async function addParentToStudent(studentId, body) {
  if (USE_MOCK) {
    return { ok: true, studentId }
  }
  const { data } = await httpClient.put(`/students/${studentId}/add-parent`, body)
  return data
}

export async function updateClass(id, body) {
  if (USE_MOCK) {
    await initMockStores()
    const idx = mockClassStore.findIndex((c) => String(c._id) === String(id))
    if (idx === -1) throw new Error('Class not found')
    mockClassStore[idx] = { ...mockClassStore[idx], ...body, _id: mockClassStore[idx]._id }
    return structuredClone(mockClassStore[idx])
  }
  const { data } = await httpClient.patch(`/classes/${id}`, body)
  return data
}

export async function deleteClass(id) {
  if (USE_MOCK) {
    await initMockStores()
    const hasStudents = mockStudentStore.some((s) => String(s.classId) === String(id))
    if (hasStudents) {
      throw new Error('Cannot delete class that still has students')
    }
    const idx = mockClassStore.findIndex((c) => String(c._id) === String(id))
    if (idx === -1) throw new Error('Class not found')
    mockClassStore.splice(idx, 1)
    return { deleted: true, id }
  }
  const { data } = await httpClient.delete(`/classes/${id}`)
  return data
}

export async function getStudents(params = {}) {
  if (USE_MOCK) {
    await initMockStores()
    let list = structuredClone(mockStudentStore)
    if (params.classId) {
      list = list.filter((s) => String(s.classId) === String(params.classId))
    }
    return list.map((s) => populateStudentClass(s))
  }
  const { data } = await httpClient.get('/students', { params })
  return data
}

/** Full student row + populated class + parents[] for teacher detail view */
export async function getStudentById(id) {
  if (USE_MOCK) {
    await initMockStores()
    const raw = mockStudentStore.find((s) => String(s._id) === String(id))
    if (!raw) {
      const err = new Error('Student not found')
      err.response = { status: 404, data: { error: 'Student not found' } }
      throw err
    }
    const student = populateStudentClass(structuredClone(raw))
    const links = mockParentLinkStore.filter(
      (l) => String(l.studentId) === String(id),
    )
    const parents = links.map((l) => ({
      _id: l.linkId || l._id,
      relationship: l.relationship,
      parent:
        l.parentUserId && typeof l.parentUserId === 'object'
          ? {
              _id: l.parentUserId._id,
              name: l.parentUserId.name,
              email: l.parentUserId.email,
            }
          : {
              name: (l.parentEmail || '').split('@')[0] || 'Parent',
              email: l.parentEmail || '',
            },
    }))
    return { ...student, parents }
  }
  const { data } = await httpClient.get(`/students/${id}`)
  return data
}

export async function createStudent(body) {
  if (USE_MOCK) {
    await initMockStores()
    if (!body.classId) throw new Error('classId is required')
    const cls = mockClassStore.find((c) => String(c._id) === String(body.classId))
    if (!cls) throw new Error('Invalid class')
    const created = {
      _id: `mock${Date.now().toString(36)}`,
      name: body.name,
      age: body.age ?? null,
      gender: body.gender ?? '',
      photoUrl: body.photoUrl?.trim() || undefined,
      classId: body.classId,
    }
    mockStudentStore.push(created)
    return populateStudentClass(created)
  }
  const { data } = await httpClient.post('/students', body)
  return data
}

export async function getMyChildren() {
  if (USE_MOCK) {
    await initMockStores()
    const user = getStoredUser()
    if (user?.role !== 'parent') {
      return []
    }
    const pid = user.id
    const email = user.email?.toLowerCase()
    const links = mockParentLinkStore.filter(
      (l) =>
        (pid && l.parentUserId && String(l.parentUserId) === String(pid)) ||
        (email && l.parentEmail && l.parentEmail === email),
    )
    return links.map((l) => {
      const raw = mockStudentStore.find((s) => String(s._id) === String(l.studentId))
      const student = raw ? populateStudentClass(structuredClone(raw)) : null
      return {
        linkId: l.linkId || l._id || `link-${l.studentId}`,
        relationship: l.relationship ?? null,
        student,
      }
    }).filter((c) => c.student)
  }
  const { data } = await httpClient.get('/parents/me/children')
  return data
}

export async function createParentStudentLink(body) {
  if (USE_MOCK) {
    await initMockStores()
    const { studentId, parentEmail, parentUserId, relationship } = body
    if (!studentId) throw new Error('studentId is required')
    const student = mockStudentStore.find((s) => String(s._id) === String(studentId))
    if (!student) throw new Error('Student not found')
    const emailNorm = parentEmail?.trim().toLowerCase() || null
    if (!parentUserId && !emailNorm) {
      throw new Error('parentUserId or parentEmail is required')
    }
    const exists = mockParentLinkStore.some(
      (l) =>
        String(l.studentId) === String(studentId) &&
        ((emailNorm && l.parentEmail === emailNorm) ||
          (parentUserId && String(l.parentUserId) === String(parentUserId))),
    )
    if (exists) throw new Error('This parent is already linked to this student')
    const link = {
      linkId: `plink${Date.now().toString(36)}`,
      parentUserId: parentUserId || null,
      parentEmail: emailNorm,
      studentId,
      relationship: relationship?.trim() || undefined,
    }
    mockParentLinkStore.push(link)
    const populated = populateStudentClass(structuredClone(student))
    return {
      _id: link.linkId,
      parentUserId: { _id: parentUserId, email: parentEmail, name: 'Parent' },
      studentId: populated,
      relationship: link.relationship,
    }
  }
  const { data } = await httpClient.post('/parent-students', body)
  return data
}

export async function getBehaviors(params = {}) {
  if (USE_MOCK) {
    await initMockStores()
    let list = structuredClone(mockBehaviorStore).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    const user = getStoredUser()
    if (user?.role === 'parent') {
      const pid = user.id
      const email = user.email?.toLowerCase()
      const linked = mockParentLinkStore
        .filter(
          (l) =>
            (pid && l.parentUserId && String(l.parentUserId) === String(pid)) ||
            (email && l.parentEmail === email),
        )
        .map((l) => String(l.studentId))
      if (params.studentId) {
        if (!linked.includes(String(params.studentId))) {
          const err = new Error('Not authorized for this student')
          err.response = { data: { error: err.message } }
          throw err
        }
        list = list.filter((b) => behaviorStudentId(b) === String(params.studentId))
      } else {
        list = list.filter((b) => linked.includes(behaviorStudentId(b)))
      }
    } else if (params.studentId) {
      list = list.filter((b) => behaviorStudentId(b) === String(params.studentId))
    }
    if (params.classId) {
      const inClass = new Set(
        mockStudentStore
          .filter((s) => String(s.classId) === String(params.classId))
          .map((s) => String(s._id)),
      )
      list = list.filter((b) => inClass.has(behaviorStudentId(b)))
    }
    if (params.type) {
      const want = String(params.type).toUpperCase()
      const mapped = want === 'NOTE' ? 'ACTIVE' : want
      list = list.filter((b) => mockBehaviorType(b) === mapped)
    }
    if (params.date) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(params.date).trim())
      if (m) {
        const y = Number(m[1])
        const mo = Number(m[2])
        const d = Number(m[3])
        const start = new Date(y, mo - 1, d, 0, 0, 0, 0)
        const end = new Date(y, mo - 1, d, 23, 59, 59, 999)
        list = list.filter((b) => {
          const ts = new Date(b.createdAt || b.date)
          return ts >= start && ts <= end
        })
      }
    }
    return list
  }
  const { data } = await httpClient.get('/behaviors', { params })
  return data
}

export async function getBehaviorStats(params = {}) {
  if (USE_MOCK) {
    await initMockStores()
    const list = await getBehaviors({
      studentId: params.studentId,
      classId: params.classId,
      date: params.date,
    })
    const counts = { GOOD: 0, BAD: 0, ACTIVE: 0, SLEEPY: 0 }
    for (const b of list) {
      const t = mockBehaviorType(b)
      if (counts[t] !== undefined) counts[t] += 1
    }
    return {
      good: counts.GOOD,
      bad: counts.BAD,
      active: counts.ACTIVE,
      sleepy: counts.SLEEPY,
    }
  }
  const { data } = await httpClient.get('/behaviors/stats', { params })
  return data
}

export async function createBehavior(body) {
  if (USE_MOCK) {
    await initMockStores()
    const list = mockStudentStore.map((s) => populateStudentClass(s))
    const sid = body.studentId ?? body.student
    const student = list.find((s) => String(s._id) === String(sid))
    const rawType = (body.type ?? body.behaviorType ?? 'GOOD').toString().toUpperCase()
    const type = rawType === 'NOTE' ? 'ACTIVE' : rawType
    const created = {
      _id: `mockb${Date.now().toString(36)}`,
      student: student ? { _id: student._id, name: student.name } : sid,
      studentId: student ? { _id: student._id, name: student.name } : sid,
      type,
      behaviorType: type,
      note: (body.note ?? body.description ?? '').toString(),
      description: (body.note ?? body.description ?? '').toString(),
      date: body.date ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    mockBehaviorStore.unshift(created)
    return structuredClone(created)
  }
  const { data } = await httpClient.post('/behaviors', body)
  return data
}

export async function postGameProgress(body) {
  if (USE_MOCK) {
    return {
      ok: true,
      _id: `mockgp${Date.now().toString(36)}`,
      game: String(body.game),
      score: Number(body.score),
      durationSeconds: Math.max(0, Math.floor(Number(body.duration) || 0)),
      createdAt: new Date().toISOString(),
    }
  }
  const { data } = await httpClient.post('/games/progress', body)
  return data
}

export async function getMyGameProgress(params = {}) {
  if (USE_MOCK) {
    return []
  }
  const { data } = await httpClient.get('/games/progress', { params })
  return data
}

export async function getGameLeaderboard(params) {
  if (USE_MOCK) {
    return []
  }
  const { data } = await httpClient.get('/games/leaderboard', { params })
  return data
}

export async function getEvaluations(params = {}) {
  if (USE_MOCK) {
    await initMockStores()
    let list = structuredClone(mockEvaluationStore).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    const user = getStoredUser()
    if (user?.role === 'parent') {
      const pid = user.id
      const email = user.email?.toLowerCase()
      const linked = mockParentLinkStore
        .filter(
          (l) =>
            (pid && l.parentUserId && String(l.parentUserId) === String(pid)) ||
            (email && l.parentEmail === email),
        )
        .map((l) => String(l.studentId))
      if (params.studentId) {
        if (!linked.includes(String(params.studentId))) {
          const err = new Error('Not authorized for this student')
          err.response = { data: { error: err.message } }
          throw err
        }
        list = list.filter((ev) => evaluationStudentId(ev) === String(params.studentId))
      } else {
        list = list.filter((ev) => linked.includes(evaluationStudentId(ev)))
      }
    } else if (user?.role === 'teacher') {
      const tid = user.id
      list = list.filter((ev) => String(ev.teacherId?._id ?? ev.teacherId) === String(tid))
      if (params.studentId) {
        list = list.filter((ev) => evaluationStudentId(ev) === String(params.studentId))
      }
    } else {
      list = []
    }
    return list
  }
  const { data } = await httpClient.get('/evaluations', { params })
  return data
}

export async function createEvaluation(body) {
  if (USE_MOCK) {
    await initMockStores()
    const user = getStoredUser()
    const list = mockStudentStore.map((s) => populateStudentClass(s))
    const student = list.find((s) => String(s._id) === String(body.studentId))
    if (!student) throw new Error('Student not found')
    const scores =
      body.scores && typeof body.scores === 'object' && !Array.isArray(body.scores)
        ? body.scores
        : {}
    const created = {
      _id: `mockev${Date.now().toString(36)}`,
      studentId: { _id: student._id, name: student.name },
      teacherId: { _id: user?.id, name: user?.name || 'Teacher', email: user?.email },
      scores,
      comment: body.comment?.trim() || '',
      period: body.period?.trim() || '',
      createdAt: new Date().toISOString(),
    }
    mockEvaluationStore.unshift(created)
    return structuredClone(created)
  }
  const { data } = await httpClient.post('/evaluations', body)
  return data
}

export { API_BASE }
