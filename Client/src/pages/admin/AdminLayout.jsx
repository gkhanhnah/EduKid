import { Navigate, Outlet } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../components/AppShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { AdminSidebar } from '../../components/AdminSidebar.jsx'
import { BottomNav } from '../../components/BottomNav.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'
import { adminNavItems } from '../../config/navigation.js'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()

  if (user?.role && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <AppShell
      sidebar={<AdminSidebar />}
      bottomNav={<BottomNav items={adminNavItems} />}
      contentClassName="mx-auto w-full max-w-7xl"
      header={
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <UserRound className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('common.signedIn')}</p>
                <p className="font-semibold truncate">{user?.name || user?.email || t('common.admin')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <LogOut className="w-4 h-4 text-destructive" />
                {t('common.logout')}
              </button>
            </div>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  )
}

