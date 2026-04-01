import { Navigate, Outlet } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth.js'
import { AdminSidebar } from '../../components/AdminSidebar.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()

  if (user?.role && user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <AdminSidebar />
      <main className="min-h-0 flex-1 overflow-auto">
        <header className="border-b border-border bg-white sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 flex items-center justify-between gap-3">
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
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4 text-destructive" />
                {t('common.logout')}
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

