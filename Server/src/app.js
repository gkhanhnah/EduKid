import './loadEnv.js'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import studentRoutes from './routes/student.routes.js'
import behaviorRoutes from './routes/behavior.routes.js'
import classRoutes from './routes/class.routes.js'
import parentStudentRoutes from './routes/parentStudent.routes.js'
import parentRoutes from './routes/parent.routes.js'
import evaluationRoutes from './routes/evaluation.routes.js'
import messageRoutes from './routes/message.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import gameRoutes from './routes/game.routes.js'
import aiRoutes from './routes/ai.routes.js'
import timetableRoutes from './routes/timetable.routes.js'
import chatRoutes from './routes/chat.routes.js'
import gradeRoutes from './routes/grade.routes.js'
import documentRoutes from './routes/document.routes.js'
import homeworkRoutes from './routes/homework.routes.js'
import attendanceRoutes from './routes/attendance.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cors())
app.use(express.json())
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads')),
)

app.use('/api/auth', authRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/behaviors', behaviorRoutes)
app.use('/api/parent-students', parentStudentRoutes)
app.use('/api/parents', parentRoutes)
app.use('/api/evaluations', evaluationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/games', gameRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/timetable', timetableRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/homeworks', homeworkRoutes)
app.use('/api/attendance', attendanceRoutes)

export default app
