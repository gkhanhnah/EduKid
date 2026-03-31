import mongoose from 'mongoose'
import { reconcileGradeIndexes } from '../models/Grade.js'

export async function connectDb() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not set')
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15_000,
  })
  // Keep grade indexes compatible with component-based grading.
  await reconcileGradeIndexes()
}
