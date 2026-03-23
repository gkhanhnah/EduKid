import { ParentStudent } from '../models/ParentStudent.js'

function handleError(res, err) {
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid id' })
  }
  return res.status(500).json({ error: 'Server error' })
}

/**
 * GET /api/parents/me/children — linked students for the authenticated parent.
 */
export async function getMyChildren(req, res) {
  try {
    const links = await ParentStudent.find({ parentUserId: req.user.id })
      .populate({
        path: 'studentId',
        populate: { path: 'classId', select: 'name grade' },
      })
      .sort({ createdAt: -1 })
      .lean()

    const children = links
      .filter((l) => l.studentId)
      .map((l) => ({
        linkId: l._id,
        relationship: l.relationship ?? null,
        student: l.studentId,
      }))

    res.json(children)
  } catch (err) {
    handleError(res, err)
  }
}
