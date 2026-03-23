const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000/api'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

let mockStudentStore = null
let mockBehaviorStore = null

async function initMockStores() {
  if (mockStudentStore && mockBehaviorStore) return
  const [{ mockStudents }, { mockBehaviors }] = await Promise.all([
    import('../mock/students.mock.js'),
    import('../mock/behaviors.mock.js'),
  ])
  mockStudentStore = structuredClone(mockStudents)
  mockBehaviorStore = structuredClone(mockBehaviors)
}

async function readErrorMessage(res) {
  try {
    const data = await res.json()
    if (data && typeof data.error === "string") return data.error
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed"
}

async function getJson(res) {
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

export async function getStudents() {
  if (USE_MOCK) {
    await initMockStores()
    return structuredClone(mockStudentStore)
  }
  const res = await fetch(`${API_BASE}/students`)
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return getJson(res)
}

export async function createStudent(body) {
  if (USE_MOCK) {
    await initMockStores()
    const created = {
      _id: `mock${Date.now().toString(36)}`,
      name: body.name,
      classId: body.classId ?? '',
      parentEmail: body.parentEmail ?? '',
    }
    mockStudentStore.push(created)
    return structuredClone(created)
  }
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return getJson(res)
}

export async function getBehaviors() {
  if (USE_MOCK) {
    await initMockStores()
    return structuredClone(mockBehaviorStore).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
  }
  const res = await fetch(`${API_BASE}/behaviors`)
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return getJson(res)
}

export async function createBehavior(body) {
  if (USE_MOCK) {
    await initMockStores()
    const created = {
      _id: `mockb${Date.now().toString(36)}`,
      studentId: body.studentId,
      type: body.type,
      createdAt: new Date().toISOString(),
    }
    mockBehaviorStore.unshift(created)
    return structuredClone(created)
  }
  const res = await fetch(`${API_BASE}/behaviors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return getJson(res)
}

export { API_BASE }
