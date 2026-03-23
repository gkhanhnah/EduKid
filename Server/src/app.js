import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import studentRoutes from './routes/student.routes.js'
import behaviorRoutes from './routes/behavior.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/behaviors', behaviorRoutes)

export default app
