import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  School,
  ClipboardCheck,
  FolderOpen,
  CalendarDays,
  FileText,
  Settings,
  Activity,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AdminSidebar() {
  const location = useLocation()
  const { t } = useTranslation()
  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/admin/students', icon: Users, label: t('nav.students') },
    { path: '/admin/teachers', icon: Activity, label: t('nav.teachers') },
    { path: '/admin/classes', icon: School, label: t('nav.classes') },
    { path: '/admin/grades', icon: ClipboardCheck, label: t('nav.grades') },
    { path: '/admin/attendance', icon: CalendarDays, label: t('nav.attendance') },
    { path: '/admin/documents', icon: FolderOpen, label: t('nav.documents') },
    { path: '/admin/reports', icon: FileText, label: t('nav.reports') },
    { path: '/admin/school-info', icon: School, label: t('nav.schoolInfo') },
    { path: '/admin/settings', icon: Settings, label: t('nav.settings') },
  ]

  return (
    <aside className="flex h-auto w-full shrink-0 flex-col border-b border-border bg-white md:h-screen md:w-64 md:border-b-0 md:border-r sticky top-0">
      <div className="border-b border-border p-6 shrink-0">
        <h2 className="flex items-center gap-2">
          <span className="text-[2rem]">🎒</span>
          <span className="text-primary font-bold">{t('common.schoolAdmin')}</span>
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">{t('common.principalCms')}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4 custom-scrollbar">
        {navItems.map((item) => {
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
              <span className="text-[0.9375rem]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

