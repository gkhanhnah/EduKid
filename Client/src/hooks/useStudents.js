import { useCallback, useEffect, useState } from "react";
import { createStudent, getStudents } from '../services/api.js'

export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getStudents()
      setStudents(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addStudent = useCallback(async (payload) => {
    const created = await createStudent(payload)
    setStudents((prev) => [...prev, created].sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    ))
    return created
  }, [])

  return { students, loading, error, refresh, addStudent }
}
