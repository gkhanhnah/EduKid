import { Navigate, Outlet } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../components/AppShell.jsx'
import { BottomNav } from '../../components/BottomNav.jsx'
import { Sidebar } from '../../components/Sidebar.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { homePathForRole } from '../../utils/authPaths.js'
import { teacherNavItems } from '../../config/navigation.js'

export function TeacherLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()

  if (user?.role && user.role !== 'teacher') {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return (
    <AppShell
      sidebar={<Sidebar />}
      bottomNav={<BottomNav items={teacherNavItems} />}
      contentClassName="teacher-layout-content mx-auto w-full max-w-7xl"
      header={
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <UserRound className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('common.signedIn')}</p>
              <p className="truncate font-semibold">
                {user?.name || user?.email || t('common.teacher')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={logout}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4 text-destructive" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  )
}
