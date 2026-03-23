import { useCallback, useEffect, useState } from 'react'
import { getEvaluations } from '../services/api.js'

export function useEvaluations(options = {}) {
  const { studentId } = options
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = studentId ? { studentId } : {}
      const data = await getEvaluations(params)
      setEvaluations(Array.isArray(data) ? data : [])
    } catch (e) {
      const msg =
        e?.response?.data?.error || e?.message || 'Failed to load evaluations'
      setError(msg)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { evaluations, loading, error, refresh }
}
