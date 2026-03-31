import mongoose from 'mongoose'
import { SystemSetting } from '../models/SystemSetting.js'

function badRequest(res, error) {
  return res.status(400).json({ error })
}

function normalizeOptionalString(value) {
  if (value === undefined) return undefined
  return String(value).trim()
}

function normalizeOptionalDate(value, fieldName) {
  if (value === undefined) return { ok: true, value: undefined }
  if (value === null || value === '') return { ok: true, value: null }
  const date = new Date(String(value))
  if (!Number.isFinite(date.getTime())) {
    return { ok: false, error: `${fieldName} must be a valid date` }
  }
  return { ok: true, value: date }
}

export async function getSystemSettings(req, res) {
  try {
    const setting = await SystemSetting.findOne({}).lean()
    if (!setting) return res.json({ setting: null })
    return res.json({
      setting: {
        _id: setting._id,
        gradingRules: setting.gradingRules ?? {},
        updatedAt: setting.updatedAt ?? null,
      },
    })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function upsertSystemSettings(req, res) {
  try {
    const { gradingRules } = req.body || {}

    const updates = {}
    if (gradingRules !== undefined) updates.gradingRules = gradingRules

    const setting = await SystemSetting.findOneAndUpdate(
      {},
      { $set: updates },
      { upsert: true, new: true, runValidators: true },
    ).lean()

    res.json({ setting })
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) return badRequest(res, 'Invalid input')
    res.status(500).json({ error: 'Server error' })
  }
}

export async function getSchoolInfo(req, res) {
  try {
    const setting = await SystemSetting.findOne({}).lean()
    if (!setting) return res.json({ school: null })
    return res.json({
      school: {
        _id: setting._id,
        schoolName: setting.schoolName ?? '',
        logoUrl: setting.logoUrl ?? '',
        address: setting.address ?? '',
        phone: setting.phone ?? '',
        email: setting.email ?? '',
        website: setting.website ?? '',
        academicYear: setting.academicYear ?? '',
        semester: setting.semester ?? '',
        startDate: setting.startDate ?? null,
        endDate: setting.endDate ?? null,
        principalName: setting.principalName ?? '',
        principalEmail: setting.principalEmail ?? '',
        updatedAt: setting.updatedAt ?? null,
      },
    })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
}

export async function upsertSchoolInfo(req, res) {
  try {
    const {
      schoolName,
      logoUrl,
      address,
      phone,
      email,
      website,
      academicYear,
      semester,
      startDate,
      endDate,
      principalName,
      principalEmail,
    } = req.body || {}

    const updates = {}

    if (schoolName !== undefined) {
      const next = normalizeOptionalString(schoolName)
      if (!next) return badRequest(res, 'schoolName must be a non-empty string')
      updates.schoolName = next
    }

    for (const [key, value] of Object.entries({
      logoUrl,
      address,
      phone,
      email,
      website,
      academicYear,
      semester,
      principalName,
      principalEmail,
    })) {
      const next = normalizeOptionalString(value)
      if (next !== undefined) updates[key] = next
    }

    const normalizedStartDate = normalizeOptionalDate(startDate, 'startDate')
    if (!normalizedStartDate.ok) return badRequest(res, normalizedStartDate.error)
    if (normalizedStartDate.value !== undefined) updates.startDate = normalizedStartDate.value

    const normalizedEndDate = normalizeOptionalDate(endDate, 'endDate')
    if (!normalizedEndDate.ok) return badRequest(res, normalizedEndDate.error)
    if (normalizedEndDate.value !== undefined) updates.endDate = normalizedEndDate.value

    if (
      normalizedStartDate.value instanceof Date &&
      normalizedEndDate.value instanceof Date &&
      normalizedStartDate.value.getTime() > normalizedEndDate.value.getTime()
    ) {
      return badRequest(res, 'startDate must be before or equal to endDate')
    }

    const school = await SystemSetting.findOneAndUpdate(
      {},
      { $set: updates },
      { upsert: true, new: true, runValidators: true },
    ).lean()

    return res.json({ school })
  } catch (err) {
    if (err instanceof mongoose.Error.CastError) return badRequest(res, 'Invalid input')
    return res.status(500).json({ error: 'Server error' })
  }
}

