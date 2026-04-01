import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function getIsActive(item, pathname) {
  if (typeof item.isActive === 'function') {
    return item.isActive(pathname)
  }
  if (item.path === '/admin' || item.path === '/teacher' || item.path === '/parent-dashboard') {
    return pathname === item.path
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export function BottomNav({ items }) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const bottomItems = items

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="no-scrollbar flex gap-1 overflow-x-auto overscroll-x-contain pb-1">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = getIsActive(item, pathname)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-h-[56px] min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-center text-[0.7rem] font-medium transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="line-clamp-1">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
