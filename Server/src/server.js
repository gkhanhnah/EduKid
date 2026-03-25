import './loadEnv.js'
import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import { connectDb } from './config/db.js'
import { createSocketAuthMiddleware } from './socket/socketAuth.js'
import { registerChatHandlers } from './socket/chat.handlers.js'
import { registerGroupChatHandlers } from './socket/groupChat.handlers.js'
import { startHomeworkReminderJob } from './jobs/reminder.job.js'

const port = Number(process.env.PORT) || 3000

function parseOrigins() {
  const raw = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

try {
  await connectDb()

  startHomeworkReminderJob()

  const httpServer = createServer(app)
  const io = new Server(httpServer, {
    cors: {
      origin: parseOrigins(),
      methods: ['GET', 'POST'],
    },
  })

  io.use(createSocketAuthMiddleware())
  registerChatHandlers(io)
  registerGroupChatHandlers(io)

  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })
} catch (err) {
  console.error('Failed to start server', err)
  process.exit(1)
}
