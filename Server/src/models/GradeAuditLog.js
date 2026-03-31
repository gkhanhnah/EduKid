import mongoose from 'mongoose'

const gradeAuditSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  scopeType: { type: String, enum: ['GRADE', 'SUBJECT'], default: 'GRADE', index: true },

  // Actor who performed the action.
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Subject scope (for submit/approve/reject).
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },

  // Grade scope (for score/showToParent changes).
  gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
  componentName: { type: String, default: null },

  from: { type: mongoose.Schema.Types.Mixed, default: null },
  to: { type: mongoose.Schema.Types.Mixed, default: null },

  createdAt: { type: Date, default: Date.now },
})

export const GradeAuditLog = mongoose.model('GradeAuditLog', gradeAuditSchema)

