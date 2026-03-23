import { useCallback, useEffect, useState } from 'react'
import { createStudent, getStudents } from '../services/api.js'

export function useStudents(options = {}) {
  const { classId } = options
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = classId ? { classId } : {}
      const data = await getStudents(params)
      setStudents(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg =
        e?.response?.data?.error || e?.message || 'Failed to load students'
      setError(msg)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addStudent = useCallback(async (payload) => {
    const created = await createStudent(payload)
    const cid = String(created.classId?._id ?? created.classId ?? '')
    setStudents((prev) => {
      if (classId && cid !== String(classId)) {
        return prev
      }
      return [...prev, created].sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''),
      )
    })
    return created
  }, [classId])

  return { students, loading, error, refresh, addStudent }
}
