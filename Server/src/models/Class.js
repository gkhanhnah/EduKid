import mongoose from 'mongoose'

const subjectTeacherInviteSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false },
)

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  grade: { type: mongoose.Schema.Types.Mixed },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  /** Invited co-teachers (main teacher remains teacherId) */
  subjectTeachers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  /** Pending subject-teacher invitations (only becomes subjectTeacher after ACCEPT). */
  subjectTeacherInvites: {
    type: [subjectTeacherInviteSchema],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
})

export const ClassRoom = mongoose.model('Class', classSchema)
