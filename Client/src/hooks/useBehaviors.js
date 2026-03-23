import { useCallback, useEffect, useState } from 'react'
import { getBehaviors } from '../services/api.js'

export function useBehaviors(options = {}) {
  const { studentId, type, date, classId } = options
  const [behaviors, setBehaviors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (studentId) params.studentId = studentId
      if (classId) params.classId = classId
      if (type && type !== 'all') params.type = String(type).toUpperCase()
      if (date) params.date = date
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
    refresh()
  }, [refresh])

  return { behaviors, loading, error, refresh }
}
