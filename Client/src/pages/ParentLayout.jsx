import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, LayoutDashboard, LogOut, MessageCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import {
  ParentChildProvider,
  studentIdFromLink,
  useParentChild,
} from '../context/ParentChildContext.jsx'

const parentNavItems = [
  {
    path: '/parent-dashboard',
    icon: LayoutDashboard,
    label: 'My children',
    isActive: (pathname) =>
      pathname === '/parent-dashboard' || pathname === '/parent',
  },
  {
    path: '/parent-dashboard/homework',
    icon: BookOpen,
    label: 'Homework',
    isActive: (pathname) => pathname.startsWith('/parent-dashboard/homework'),
  },
  {
    path: '/messages',
    icon: MessageCircle,
    label: 'Messages',
    isActive: (pathname) => pathname.startsWith('/messages'),
  },
  {
    path: '/parent-dashboard/attendance',
    icon: CalendarDays,
    label: 'Attendance',
    isActive: (pathname) => pathname.startsWith('/parent-dashboard/attendance'),
  },
]

function ParentChildSwitcher() {
  const { linkedChildren, selectedStudentId, setSelectedStudentId, loading } =
    useParentChild()

  if (loading) {
    return (
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">Children</p>
        <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (linkedChildren.length === 0) {
    return null
  }

  if (linkedChildren.length === 1) {
    const name = linkedChildren[0].student?.name || 'Your child'
    return (
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Viewing
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{name}</p>
      </div>
    )
  }

  return (
    <div className="border-b border-border px-4 py-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Switch child
      </p>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1">
        {linkedChildren.map((item) => {
          const sid = studentIdFromLink(item)
          const name = item.student?.name || 'Child'
          const active = sid === selectedStudentId
          return (
            <button
              key={item.linkId || sid}
              type="button"
              onClick={() => setSelectedStudentId(sid)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-all ${
                active
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

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex h-auto w-full shrink-0 flex-col border-b border-border bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="border-b border-border p-6">
          <h2 className="flex items-center gap-2">
            <span className="text-[2rem]">🎒</span>
            <span className="text-primary">ClassRoom</span>
          </h2>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">Parent</p>
        </div>
        <ParentChildSwitcher />
        <nav className="flex flex-1 flex-row flex-wrap gap-2 overflow-auto p-4 md:flex-col md:gap-0 md:space-y-2">
          {parentNavItems.map((item) => {
            const Icon = item.icon
            const active = item.isActive(location.pathname)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                  active
                    ? 'bg-primary/10 text-primary shadow-md'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[0.9375rem]">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-destructive transition-all hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[0.9375rem]">Logout</span>
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
    return <Navigate to="/teacher" replace />
  }

  return (
    <ParentChildProvider>
      <ParentLayoutShell />
    </ParentChildProvider>
  )
}
