import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  School,
  Activity,
  Gamepad2,
  Sparkles,
  MessageCircle,
  LogOut,
  ClipboardCheck,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'

export function Sidebar() {
  const location = useLocation()
  const { logout, user } = useAuth()

  const teacherNavItems = [
    { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/classes', icon: School, label: 'Classes' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/evaluations', icon: ClipboardCheck, label: 'Evaluations' },
    { path: '/behavior', icon: Activity, label: 'Behavior Tracking' },
    { path: '/behavior-history', icon: Activity, label: 'Behavior History' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/ai-lesson', icon: Sparkles, label: 'AI Lesson Generator' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
  ]

  const parentNavItems = [
    { path: '/parent-dashboard', icon: LayoutDashboard, label: 'My children' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
  ]

  const navItems = user?.role === 'parent' ? parentNavItems : teacherNavItems

  return (
    <div className="w-64 bg-white border-r border-border h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="flex items-center gap-2">
          <span className="text-[2rem]">🎒</span>
          <span className="text-primary">ClassRoom</span>
        </h2>
        <p className="text-[0.875rem] text-muted-foreground mt-1">Grade 1 Management</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[0.9375rem]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-left"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[0.9375rem]">Logout</span>
        </button>
      </div>
    </div>
  )
}
