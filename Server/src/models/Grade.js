import mongoose from 'mongoose'

const gradeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    index: true,
  },
  /** Must match subject.components[].name */
  componentName: { type: String, required: true, trim: true },
  score: { type: Number, required: true },
  /**
   * Connected academic pipeline:
   * - HOMEWORK grades are auto-synced from a graded Homework (sourceId=homeworkId)
   * - MANUAL grades are entered directly in GradeManagement
   */
  source: { type: String, enum: ['HOMEWORK', 'MANUAL'], default: 'MANUAL', index: true },
  sourceId: { type: String, default: 'MANUAL', index: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  showToParent: { type: Boolean, default: false, index: true },
  // Admin workflow controls
  locked: { type: Boolean, default: false, index: true },
  lockedAt: { type: Date, default: null },
  approvalStatus: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
    default: 'DRAFT',
    index: true,
  },
  submittedAt: { type: Date, default: null },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedAt: { type: Date, default: null },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectionReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})

// Prevent duplicates coming from the same source record.
// (e.g. one homework => one grade row per student per subject component)
gradeSchema.index(
  { student: 1, class: 1, subject: 1, componentName: 1, source: 1, sourceId: 1 },
  { unique: true },
)

export const Grade = mongoose.model('Grade', gradeSchema)

/**
 * Drop obsolete unique indexes that can incorrectly block valid inserts.
 * Legacy deployments may still have unique indexes that do not include
 * `componentName`, causing Midterm/Final for the same student+subject to
 * conflict with "Duplicate grade for this component".
 */
export async function reconcileGradeIndexes() {
  const indexes = await Grade.collection.indexes()
  for (const idx of indexes) {
    if (!idx?.unique || !idx?.key) continue
    const key = idx.key
    const hasStudent = Object.prototype.hasOwnProperty.call(key, 'student')
    const hasClass = Object.prototype.hasOwnProperty.call(key, 'class')
    const hasSubject = Object.prototype.hasOwnProperty.call(key, 'subject')
    const hasComponent = Object.prototype.hasOwnProperty.call(key, 'componentName')
    if (!hasStudent || !hasClass || !hasSubject) continue
    if (hasComponent) continue
    // Keep _id and unrelated indexes untouched; only remove legacy unique
    // subject-level indexes that miss componentName.
    await Grade.collection.dropIndex(idx.name)
    console.warn('[grade-index] Dropped legacy unique index:', idx.name)
  }

  // Ensure declared indexes in this schema exist after cleanup.
  await Grade.syncIndexes()
}
