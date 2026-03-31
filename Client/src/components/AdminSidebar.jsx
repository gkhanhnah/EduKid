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

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/students', icon: Users, label: 'Students' },
  { path: '/admin/teachers', icon: Activity, label: 'Teachers' },
  { path: '/admin/classes', icon: School, label: 'Classes' },
  { path: '/admin/grades', icon: ClipboardCheck, label: 'Grades' },
  { path: '/admin/attendance', icon: CalendarDays, label: 'Attendance' },
  { path: '/admin/documents', icon: FolderOpen, label: 'Documents' },
  { path: '/admin/reports', icon: FileText, label: 'Reports' },
  { path: '/admin/school-info', icon: School, label: 'School Info' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
]

export function AdminSidebar() {
  const location = useLocation()

  return (
    <aside className="flex h-auto w-full shrink-0 flex-col border-b border-border bg-white md:h-screen md:w-64 md:border-b-0 md:border-r sticky top-0">
      <div className="border-b border-border p-6 shrink-0">
        <h2 className="flex items-center gap-2">
          <span className="text-[2rem]">🎒</span>
          <span className="text-primary font-bold">School Admin</span>
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">Principal CMS</p>
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

