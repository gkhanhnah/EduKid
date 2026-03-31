import { useCallback, useEffect, useState } from 'react'
import { getBehaviors } from '../services/api.js'

export function useBehaviors(options = {}) {
  const { studentId, type, date, classId } = options
  const [behaviors, setBehaviors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async (overrides = {}) => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      const nextStudentId = overrides.studentId ?? studentId
      const nextClassId = overrides.classId ?? classId
      const nextType = overrides.type ?? type
      const nextDate = overrides.date ?? date
      if (nextStudentId) params.studentId = nextStudentId
      if (nextClassId) params.classId = nextClassId
      if (nextType && nextType !== 'all') params.type = String(nextType).toUpperCase()
      if (nextDate) params.date = nextDate
      const data = await getBehaviors(params)
      setBehaviors(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg =
        e?.response?.data?.error || e?.message || 'Failed to load behaviors'
      setError(msg)
      setBehaviors([])
    } finally {
      setLoading(false)
    }
  }, [studentId, type, date, classId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = {}
        if (studentId) params.studentId = studentId
        if (classId) params.classId = classId
        if (type && type !== 'all') params.type = String(type).toUpperCase()
        if (date) params.date = date
        const data = await getBehaviors(params)
        if (cancelled) return
        setBehaviors(Array.isArray(data) ? data : [])
      } catch (e) {
        if (cancelled) return
        const msg =
          e?.response?.data?.error || e?.message || 'Failed to load behaviors'
        setError(msg)
        setBehaviors([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [studentId, type, date, classId])

  return { behaviors, loading, error, refresh }
}
