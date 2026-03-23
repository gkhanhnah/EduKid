import { useCallback, useEffect, useState } from "react";
import { getBehaviors } from "../services/api.js";

export function useBehaviors() {
  const [behaviors, setBehaviors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBehaviors()
      setBehaviors(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load behaviors')
      setBehaviors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { behaviors, loading, error, refresh }
}
