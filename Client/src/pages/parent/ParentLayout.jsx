import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, LayoutDashboard, LogOut, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathForRole } from '../../utils/authPaths.js'
import {
  ParentChildProvider,
  studentIdFromLink,
  useParentChild,
} from '../../context/ParentChildContext.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'

function ParentChildSwitcher() {
  const { t } = useTranslation()
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

function ParentLayoutShell() {
  const location = useLocation()
  const { logout } = useAuth()
  const { t } = useTranslation()
  const parentNavItems = [
    {
      path: '/parent-dashboard',
      icon: LayoutDashboard,
      label: t('nav.myChildren'),
      isActive: (pathname) =>
        pathname === '/parent-dashboard' || pathname === '/parent',
    },
    {
      path: '/parent-dashboard/homework',
      icon: BookOpen,
      label: t('nav.homework'),
      isActive: (pathname) => pathname.startsWith('/parent-dashboard/homework'),
    },
    {
      path: '/parent-dashboard/messages',
      icon: MessageCircle,
      label: t('nav.messages'),
      isActive: (pathname) => pathname.startsWith('/parent-dashboard/messages'),
    },
    {
      path: '/parent-dashboard/attendance',
      icon: CalendarDays,
      label: t('nav.attendance'),
      isActive: (pathname) => pathname.startsWith('/parent-dashboard/attendance'),
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex h-screen w-full shrink-0 flex-col border-b border-border bg-white md:w-64 md:border-b-0 md:border-r sticky top-0">
        {/* Header: Cố định */}
        <div className="border-b border-border p-6 shrink-0">
          <h2 className="flex items-center gap-2">
            <span className="text-[2rem]">🎒</span>
            <span className="text-primary font-bold">{t('common.appName')}</span>
          </h2>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">{t('common.parent')}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Switcher: Cố định */}
        <div className="shrink-0 p-2">
          <ParentChildSwitcher />
        </div>

        {/* Navigation: Chỉ phần này được phép Scroll */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 custom-scrollbar">
          {parentNavItems.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all shrink-0 ${active
                    ? 'bg-primary/10 text-primary shadow-sm font-medium'
                    : 'text-foreground hover:bg-accent'
                  }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[0.9375rem]">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer: Logout luôn nằm ở đáy */}
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
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export function ParentLayout() {
  const { user } = useAuth()

  if (user?.role && user.role !== 'parent') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return (
    <ParentChildProvider>
      <ParentLayoutShell />
    </ParentChildProvider>
  )
}
