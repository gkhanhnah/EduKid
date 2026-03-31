import mongoose from 'mongoose'

const systemSettingSchema = new mongoose.Schema({
  schoolName: { type: String, default: 'EduKid School', index: true },
  logoUrl: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },

  academicYear: { type: String, default: '' },
  semester: { type: String, default: '' },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  principalName: { type: String, default: '' },
  principalEmail: { type: String, default: '' },

  // Optional: future-friendly grading rule configs (global weights, etc).
  gradingRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true })

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema)

