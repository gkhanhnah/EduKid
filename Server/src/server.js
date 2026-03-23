import 'dotenv/config'
import app from './app.js'
import { connectDb } from './config/db.js'

const port = Number(process.env.PORT) || 3000

try {
  await connectDb()
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
  })
} catch (err) {
  console.error('Failed to start server', err)
  process.exit(1)
}
