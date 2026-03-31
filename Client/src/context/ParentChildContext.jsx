import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { fetchParentDashboard } from '../services/dashboardService.js'

const ParentChildContext = createContext(null)

export function studentIdFromLink(item) {
  const s = item?.student
  if (!s) return ''
  return String(s._id ?? s.id ?? '')
}

export function ParentChildProvider({ children }) {
  const [linkedChildren, setLinkedChildren] = useState([])
  const [overview, setOverview] = useState({
    behaviorSummaryByChild: [],
    latestEvaluations: [],
    recentBehaviors: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudentId, setSelectedStudentIdState] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchParentDashboard()
      const list = Array.isArray(data.children) ? data.children : []
      setLinkedChildren(list)
      setOverview({
        behaviorSummaryByChild: data.behaviorSummaryByChild || [],
        latestEvaluations: data.latestEvaluations || [],
        recentBehaviors: data.recentBehaviors || [],
      })
      setSelectedStudentIdState((prev) => {
        const ids = list.map(studentIdFromLink).filter(Boolean)
        if (ids.length === 0) return ''
        if (prev && ids.includes(prev)) return prev
        return ids[0]
      })
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not load your children.')
      setLinkedChildren([])
      setOverview({
        behaviorSummaryByChild: [],
        latestEvaluations: [],
        recentBehaviors: [],
      })
      setSelectedStudentIdState('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setSelectedStudentId = useCallback((id) => {
    setSelectedStudentIdState(id == null ? '' : String(id))
  }, [])

  const value = useMemo(() => {
    const ids = linkedChildren.map(studentIdFromLink).filter(Boolean)
    const effectiveId =
      selectedStudentId && ids.includes(selectedStudentId)
        ? selectedStudentId
        : ids[0] ?? ''
    const idx = linkedChildren.findIndex(
      (item) => studentIdFromLink(item) === effectiveId,
    )
    const selectedIndex = idx >= 0 ? idx : 0
    const selectedLink =
      linkedChildren.length > 0
        ? linkedChildren[Math.min(selectedIndex, linkedChildren.length - 1)]
        : null
    const selectedStudent = selectedLink?.student ?? null

    return {
      linkedChildren,
      overview,
      loading,
      error,
      reload: load,
      selectedStudentId: effectiveId,
      setSelectedStudentId,
      selectedLink,
      selectedStudent,
      selectedIndex,
    }
  }, [
    linkedChildren,
    overview,
    loading,
    error,
    load,
    selectedStudentId,
    setSelectedStudentId,
  ])

  return (
    <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>
  )
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext)
  if (!ctx) {
    // Allow shared UI (e.g. Sidebar) to render on non-parent routes
    // that are not wrapped by ParentChildProvider.
    return {
      linkedChildren: [],
      overview: {
        behaviorSummaryByChild: [],
        latestEvaluations: [],
        recentBehaviors: [],
      },
      loading: false,
      error: '',
      reload: async () => undefined,
      selectedStudentId: '',
      setSelectedStudentId: () => undefined,
      selectedLink: null,
      selectedStudent: null,
      selectedIndex: 0,
    }
  }
  return ctx
}
