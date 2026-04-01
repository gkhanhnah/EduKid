import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { ParentLayout } from './pages/parent/ParentLayout.jsx'
import { Login as LoginPage } from './pages/Login.jsx'
import { Register as RegisterPage } from './pages/Register.jsx'
import { RedirectHome } from './components/RedirectHome.jsx'
import { AdminRoute } from './components/AdminRoute.jsx'
import { Unauthorized } from './pages/Unauthorized.jsx'
import { AdminLayout } from './pages/admin/AdminLayout.jsx'
import { TeacherLayout } from './pages/teacher/TeacherLayout.jsx'
import { ToastViewport } from './components/ui/ToastViewport.jsx'

const ClassManagementPage = lazy(() => import('./pages/teacher/ClassManagement.jsx').then((module) => ({ default: module.ClassManagement })))
const ClassDetailPage = lazy(() => import('./pages/teacher/ClassDetail.jsx').then((module) => ({ default: module.ClassDetail })))
const TimetablePage = lazy(() => import('./pages/teacher/Timetable.jsx').then((module) => ({ default: module.Timetable })))
const GroupChatPage = lazy(() => import('./pages/teacher/GroupChat.jsx').then((module) => ({ default: module.GroupChat })))
const StudentManagementPage = lazy(() => import('./pages/teacher/StudentManagement.jsx').then((module) => ({ default: module.StudentManagement })))
const StudentDetailPage = lazy(() => import('./pages/teacher/StudentDetail.jsx').then((module) => ({ default: module.StudentDetail })))
const BehaviorPage = lazy(() => import('./pages/teacher/Behavior.jsx').then((module) => ({ default: module.Behavior })))
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard.jsx').then((module) => ({ default: module.TeacherDashboard })))
const ParentDashboardHome = lazy(() => import('./pages/parent/ParentDashboard.jsx').then((module) => ({ default: module.ParentDashboardHome })))
const ParentHomework = lazy(() => import('./pages/parent/ParentHomework.jsx').then((module) => ({ default: module.ParentHomework })))
const AttendancePage = lazy(() => import('./pages/teacher/Attendance.jsx').then((module) => ({ default: module.Attendance })))
const EvaluationPage = lazy(() => import('./pages/teacher/Evaluation.jsx').then((module) => ({ default: module.Evaluation })))
const GamesPage = lazy(() => import('./pages/teacher/Games.jsx').then((module) => ({ default: module.Games })))
const GamePlayPage = lazy(() => import('./pages/teacher/GamePlay.jsx').then((module) => ({ default: module.GamePlay })))
const AILessonGeneratorPage = lazy(() => import('./pages/teacher/AILessonGenerator.jsx').then((module) => ({ default: module.AILessonGenerator })))
const MessagesPage = lazy(() => import('./pages/teacher/Messages.jsx').then((module) => ({ default: module.Messages })))
const GradeManagementPage = lazy(() => import('./pages/teacher/GradeManagement.jsx').then((module) => ({ default: module.GradeManagement })))
const StudentGradeViewPage = lazy(() => import('./pages/teacher/StudentGradeView.jsx').then((module) => ({ default: module.StudentGradeView })))
const DocumentsPage = lazy(() => import('./pages/teacher/Documents.jsx').then((module) => ({ default: module.Documents })))
const HomeworkManagementPage = lazy(() => import('./pages/teacher/HomeworkManagement.jsx').then((module) => ({ default: module.HomeworkManagement })))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const AdminStudents = lazy(() => import('./pages/admin/Students.jsx'))
const AdminTeachers = lazy(() => import('./pages/admin/Teachers.jsx'))
const AdminClasses = lazy(() => import('./pages/admin/Classes.jsx'))
const AdminGrades = lazy(() => import('./pages/admin/Grades.jsx'))
const AdminAttendance = lazy(() => import('./pages/admin/Attendance.jsx'))
const AdminDocuments = lazy(() => import('./pages/admin/Documents.jsx'))
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'))
const AdminSchoolInfo = lazy(() => import('./pages/admin/SchoolInfo.jsx'))

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
        <ToastViewport />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<RedirectHome />} />
            <Route element={<TeacherLayout />}>
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="classes" element={<ClassManagementPage />} />
              <Route path="classes/:id" element={<ClassDetailPage />} />
              <Route path="classes/:classId/timetable" element={<TimetablePage />} />
              <Route path="classes/:classId/chat" element={<GroupChatPage />} />
              <Route path="classes/:classId/grades" element={<GradeManagementPage />} />
              <Route path="classes/:classId/homework" element={<HomeworkManagementPage />} />
              <Route path="classes/:classId/attendance" element={<AttendancePage />} />
              <Route path="behavior" element={<BehaviorPage />} />
              <Route path="behavior-history" element={<Navigate to="/behavior?tab=history" replace />} />
              <Route path="games" element={<GamesPage />} />
              <Route path="ai-lesson" element={<AILessonGeneratorPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="students/:studentId/grades" element={<StudentGradeViewPage />} />
              <Route path="students" element={<StudentManagementPage />} />
              <Route path="evaluations" element={<EvaluationPage />} />
              <Route path="behaviors" element={<Navigate to="/behavior?tab=history" replace />} />
            </Route>
            <Route path="parent-dashboard" element={<ParentLayout />}>
              <Route index element={<ParentDashboardHome />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="homework" element={<ParentHomework />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
            <Route path="parent" element={<Navigate to="/parent-dashboard" replace />} />
            <Route path="games/:gameId" element={<GamePlayPage />} />
          <Route path="unauthorized" element={<Unauthorized />} />

          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="classes/:classId/timetable" element={<TimetablePage />} />
              <Route path="grades" element={<AdminGrades />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="school-info" element={<AdminSchoolInfo />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
            <Route path="*" element={<RedirectHome />} />
          </Route>
        </Routes>
        </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
