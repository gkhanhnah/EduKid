import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminNavItems } from '../config/navigation.js'

export function AdminSidebar() {
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-6 shrink-0">
        <h2 className="flex items-center gap-2">
          <span className="text-[2rem]">🎒</span>
          <span className="text-primary font-bold">{t('common.schoolAdmin')}</span>
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">{t('common.principalCms')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 custom-scrollbar">
        {adminNavItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all shrink-0 ${
                isActive
                  ? 'bg-primary/10 text-primary shadow-sm font-medium'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[0.9375rem]">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

