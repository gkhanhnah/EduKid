import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BehaviorTracking } from './BehaviorTracking.jsx'
import { BehaviorHistory } from './BehaviorHistory.jsx'

export function Behavior() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab = rawTab === 'history' ? 'history' : 'tracking'
  const tabs = [
    { id: 'tracking', label: t('teacherBehavior.tabs.tracking') },
    { id: 'history', label: t('teacherBehavior.tabs.history') },
  ]

  function switchTab(tabId) {
    if (tabId === 'tracking') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ tab: tabId }, { replace: true })
    }
  }

  return (
    <div>
      <div className="max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('teacherBehavior.title')}</h1>
            <p className="text-muted-foreground text-[1.05rem]">
              {t('teacherBehavior.subtitle')}
            </p>

            <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label={t('teacherBehavior.views')}>
              {tabs.map((tab) => (
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
  )
}
