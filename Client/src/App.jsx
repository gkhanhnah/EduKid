import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { ClassManagement as ClassManagementPage } from './pages/teacher/ClassManagement.jsx'
import { ClassDetail as ClassDetailPage } from './pages/teacher/ClassDetail.jsx'
import { Timetable as TimetablePage } from './pages/teacher/Timetable.jsx'
import { GroupChat as GroupChatPage } from './pages/teacher/GroupChat.jsx'
import { StudentManagement as StudentManagementPage } from './pages/teacher/StudentManagement.jsx'
import { StudentDetail as StudentDetailPage } from './pages/teacher/StudentDetail.jsx'
import { Behavior as BehaviorPage } from './pages/teacher/Behavior.jsx'
import { TeacherDashboard } from './pages/teacher/TeacherDashboard.jsx'
import { ParentLayout } from './pages/parent/ParentLayout.jsx'
import { ParentDashboardHome } from './pages/parent/ParentDashboard.jsx'
import { ParentHomework } from './pages/parent/ParentHomework.jsx'
import { Attendance as AttendancePage } from './pages/teacher/Attendance.jsx'
import { Evaluation as EvaluationPage } from './pages/teacher/Evaluation.jsx'
import { Games as GamesPage } from './pages/teacher/Games.jsx'
import { GamePlay as GamePlayPage } from './pages/teacher/GamePlay.jsx'
import { AILessonGenerator as AILessonGeneratorPage } from './pages/teacher/AILessonGenerator.jsx'
import { Messages as MessagesPage } from './pages/teacher/Messages.jsx'
import { Login as LoginPage } from './pages/Login.jsx'
import { Register as RegisterPage } from './pages/Register.jsx'
import { GradeManagement as GradeManagementPage } from './pages/teacher/GradeManagement.jsx'
import { StudentGradeView as StudentGradeViewPage } from './pages/teacher/StudentGradeView.jsx'
import { Documents as DocumentsPage } from './pages/teacher/Documents.jsx'
import { HomeworkManagement as HomeworkManagementPage } from './pages/teacher/HomeworkManagement.jsx'
import { RedirectHome } from './components/RedirectHome.jsx'
import { AdminRoute } from './components/AdminRoute.jsx'
import { Unauthorized } from './pages/Unauthorized.jsx'
import { AdminLayout } from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminStudents from './pages/admin/Students.jsx'
import AdminTeachers from './pages/admin/Teachers.jsx'
import AdminClasses from './pages/admin/Classes.jsx'
import AdminGrades from './pages/admin/Grades.jsx'
import AdminAttendance from './pages/admin/Attendance.jsx'
import AdminDocuments from './pages/admin/Documents.jsx'
import AdminReports from './pages/admin/Reports.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import AdminSchoolInfo from './pages/admin/SchoolInfo.jsx'
import { ToastViewport } from './components/ui/ToastViewport.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
        <ToastViewport />
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<RedirectHome />} />
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="classes" element={<ClassManagementPage />} />
            <Route path="classes/:id" element={<ClassDetailPage />} />
            <Route path="classes/:classId/timetable" element={<TimetablePage />} />
            <Route path="classes/:classId/chat" element={<GroupChatPage />} />
            <Route path="classes/:classId/grades" element={<GradeManagementPage />} />
            <Route path="classes/:classId/homework" element={<HomeworkManagementPage />} />
            <Route path="classes/:classId/attendance" element={<AttendancePage />} />
            <Route path="parent-dashboard" element={<ParentLayout />}>
              <Route index element={<ParentDashboardHome />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="homework" element={<ParentHomework />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
            <Route path="parent" element={<Navigate to="/parent-dashboard" replace />} />
            <Route path="behavior" element={<BehaviorPage />} />
            <Route path="behavior-history" element={<Navigate to="/behavior?tab=history" replace />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/:gameId" element={<GamePlayPage />} />
            <Route path="ai-lesson" element={<AILessonGeneratorPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="students/:studentId/grades" element={<StudentGradeViewPage />} />
            <Route path="students" element={<StudentManagementPage />} />
            <Route path="evaluations" element={<EvaluationPage />} />
            <Route path="behaviors" element={<Navigate to="/behavior?tab=history" replace />} />
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
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
