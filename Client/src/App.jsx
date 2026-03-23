import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import ClassroomPage from './pages/ClassroomPage.jsx'
import { StudentManagement as StudentManagementPage } from './pages/StudentManagement.jsx'
import { BehaviorHistory as BehaviorHistoryPage } from './pages/BehaviorHistory.jsx'
import { TeacherDashboard } from './pages/TeacherDashboard.jsx'
import { ParentDashboard } from './pages/ParentDashboard.jsx'
import { BehaviorTracking as BehaviorTrackingPage } from './pages/BehaviorTracking.jsx'
import { Games as GamesPage } from './pages/Games.jsx'
import { GamePlay as GamePlayPage } from './pages/GamePlay.jsx'
import { AILessonGenerator as AILessonGeneratorPage } from './pages/AILessonGenerator.jsx'
import { Messages as MessagesPage } from './pages/Messages.jsx'
import { Login as LoginPage } from './pages/Login.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ClassroomPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="parent" element={<ParentDashboard />} />
          <Route path="behavior" element={<BehaviorTrackingPage />} />
          <Route path="behavior-history" element={<BehaviorHistoryPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:gameId" element={<GamePlayPage />} />
          <Route path="ai-lesson" element={<AILessonGeneratorPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="behaviors" element={<BehaviorHistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
