import { useSearchParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar.jsx'
import { BehaviorTracking } from './BehaviorTracking.jsx'
import { BehaviorHistory } from './BehaviorHistory.jsx'

const TABS = [
  { id: 'tracking', label: 'Tracking' },
  { id: 'history', label: 'History' },
]

export function Behavior() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab = rawTab === 'history' ? 'history' : 'tracking'

  function switchTab(tabId) {
    if (tabId === 'tracking') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: tabId }, { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="px-4 pt-4 md:px-8 md:pt-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Behavior</h1>
            <p className="text-muted-foreground text-[1.05rem]">
              Track and review student behavior in one place.
            </p>

            <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="Behavior views">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`px-5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border hover:bg-accent/60'
                  }`}
                  onClick={() => switchTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'tracking' ? (
          <BehaviorTracking embedded />
        ) : (
          <BehaviorHistory embedded />
        )}
      </div>
    </div>
  )
}
