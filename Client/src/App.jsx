import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { ClassManagement as ClassManagementPage } from './pages/ClassManagement.jsx'
import { ClassDetail as ClassDetailPage } from './pages/ClassDetail.jsx'
import { Timetable as TimetablePage } from './pages/Timetable.jsx'
import { GroupChat as GroupChatPage } from './pages/GroupChat.jsx'
import { StudentManagement as StudentManagementPage } from './pages/StudentManagement.jsx'
import { StudentDetail as StudentDetailPage } from './pages/StudentDetail.jsx'
import { BehaviorHistory as BehaviorHistoryPage } from './pages/BehaviorHistory.jsx'
import { TeacherDashboard } from './pages/TeacherDashboard.jsx'
import { ParentLayout } from './pages/ParentLayout.jsx'
import { ParentDashboardHome } from './pages/ParentDashboard.jsx'
import { ParentHomework } from './pages/ParentHomework.jsx'
import { Attendance as AttendancePage } from './pages/Attendance.jsx'
import { Evaluation as EvaluationPage } from './pages/Evaluation.jsx'
import { BehaviorTracking as BehaviorTrackingPage } from './pages/BehaviorTracking.jsx'
import { Games as GamesPage } from './pages/Games.jsx'
import { GamePlay as GamePlayPage } from './pages/GamePlay.jsx'
import { AILessonGenerator as AILessonGeneratorPage } from './pages/AILessonGenerator.jsx'
import { Messages as MessagesPage } from './pages/Messages.jsx'
import { Login as LoginPage } from './pages/Login.jsx'
import { Register as RegisterPage } from './pages/Register.jsx'
import { GradeManagement as GradeManagementPage } from './pages/GradeManagement.jsx'
import { StudentGradeView as StudentGradeViewPage } from './pages/StudentGradeView.jsx'
import { Documents as DocumentsPage } from './pages/Documents.jsx'
import { HomeworkManagement as HomeworkManagementPage } from './pages/HomeworkManagement.jsx'
import { RedirectHome } from './components/RedirectHome.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
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
              <Route path="homework" element={<ParentHomework />} />
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
            <Route path="parent" element={<Navigate to="/parent-dashboard" replace />} />
            <Route path="behavior" element={<BehaviorTrackingPage />} />
            <Route path="behavior-history" element={<BehaviorHistoryPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/:gameId" element={<GamePlayPage />} />
            <Route path="ai-lesson" element={<AILessonGeneratorPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="students/:studentId/grades" element={<StudentGradeViewPage />} />
            <Route path="students" element={<StudentManagementPage />} />
            <Route path="evaluations" element={<EvaluationPage />} />
            <Route path="behaviors" element={<BehaviorHistoryPage />} />
            <Route path="*" element={<RedirectHome />} />
          </Route>
        </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
