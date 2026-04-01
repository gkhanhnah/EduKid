import { Link, useLocation } from 'react-router-dom'
import {
  LogOut,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { studentIdFromLink, useParentChild } from '../context/ParentChildContext.jsx'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import { parentNavItems, teacherNavItems } from '../config/navigation.js'
export function Sidebar() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const { t } = useTranslation()

  function ParentChildSwitcher() {
    const { linkedChildren, selectedStudentId, setSelectedStudentId, loading } =
      useParentChild()
  
    if (loading) {
      return (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{t('common.children')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      )
    }
  
    if (linkedChildren.length === 0) {
      return null
    }
  
    if (linkedChildren.length === 1) {
      const name = linkedChildren[0].student?.name || t('common.yourChild')
      return (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('common.viewing')}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{name}</p>
        </div>
      )
    }
  
    return (
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('common.switchChild')}
        </p>
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
          {linkedChildren.map((item) => {
            const sid = studentIdFromLink(item)
            const name = item.student?.name || t('common.child')
            const active = sid === selectedStudentId
            return (
              <button
                key={item.linkId || sid}
                type="button"
                onClick={() => setSelectedStudentId(sid)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-all ${active
                    ? 'bg-primary/15 font-medium text-primary shadow-sm'
                    : 'text-foreground hover:bg-muted/80'
                  }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const navItems = user?.role === 'parent' ? parentNavItems : teacherNavItems

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border p-6 shrink-0">
        <h2 className="flex items-center gap-2">
          <span className="text-[2rem]">🎒</span>
          <span className="text-primary font-bold">{t('common.appName')}</span>
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          {user?.role === 'parent' ? t('common.parent') : 'Grade 1 Management'}
        </p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </div>

      {user?.role === 'parent' ? (
        <div className="shrink-0 p-2">
          <ParentChildSwitcher />
        </div>
      ) : null}

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive
            ? item.isActive(location.pathname)
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

      <div className="mt-auto border-t border-border p-4 shrink-0 bg-white">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-destructive transition-all hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[0.9375rem]">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
