import {
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Gamepad2,
  LayoutDashboard,
  MessageCircle,
  School,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

export const teacherNavItems = [
  { path: '/teacher', icon: LayoutDashboard, labelKey: 'nav.dashboard', showInBottomNav: true },
  { path: '/classes', icon: School, labelKey: 'nav.classes', showInBottomNav: true },
  { path: '/students', icon: Users, labelKey: 'nav.students', showInBottomNav: true },
  { path: '/documents', icon: FolderOpen, labelKey: 'nav.documents', showInBottomNav: true },
  { path: '/evaluations', icon: ClipboardCheck, labelKey: 'nav.evaluations' },
  {
    path: '/behavior',
    icon: Activity,
    labelKey: 'nav.behavior',
    isActive: (pathname) => pathname === '/behavior' || pathname.startsWith('/behavior'),
  },
  { path: '/games', icon: Gamepad2, labelKey: 'nav.games' },
  { path: '/ai-lesson', icon: Sparkles, labelKey: 'nav.aiLesson' },
  { path: '/messages', icon: MessageCircle, labelKey: 'nav.messages', showInBottomNav: true },
]

export const parentNavItems = [
  {
    path: '/parent-dashboard',
    icon: LayoutDashboard,
    labelKey: 'nav.myChildren',
    showInBottomNav: true,
    isActive: (pathname) => pathname === '/parent-dashboard' || pathname === '/parent',
  },
  {
    path: '/parent-dashboard/homework',
    icon: BookOpen,
    labelKey: 'nav.homework',
    showInBottomNav: true,
    isActive: (pathname) => pathname.startsWith('/parent-dashboard/homework'),
  },
  {
    path: '/parent-dashboard/messages',
    icon: MessageCircle,
    labelKey: 'nav.messages',
    showInBottomNav: true,
    isActive: (pathname) => pathname.startsWith('/parent-dashboard/messages'),
  },
  {
    path: '/parent-dashboard/attendance',
    icon: CalendarDays,
    labelKey: 'nav.attendance',
    showInBottomNav: true,
    isActive: (pathname) => pathname.startsWith('/parent-dashboard/attendance'),
  },
]

export const adminNavItems = [
  { path: '/admin', icon: LayoutDashboard, labelKey: 'nav.dashboard', showInBottomNav: true },
  { path: '/admin/students', icon: Users, labelKey: 'nav.students', showInBottomNav: true },
  { path: '/admin/teachers', icon: Activity, labelKey: 'nav.teachers', showInBottomNav: true },
  { path: '/admin/classes', icon: School, labelKey: 'nav.classes', showInBottomNav: true },
  { path: '/admin/grades', icon: ClipboardCheck, labelKey: 'nav.grades' },
  { path: '/admin/attendance', icon: CalendarDays, labelKey: 'nav.attendance' },
  { path: '/admin/documents', icon: FolderOpen, labelKey: 'nav.documents', showInBottomNav: true },
  { path: '/admin/reports', icon: FileText, labelKey: 'nav.reports' },
  { path: '/admin/school-info', icon: School, labelKey: 'nav.schoolInfo' },
  { path: '/admin/settings', icon: Settings, labelKey: 'nav.settings' },
]
