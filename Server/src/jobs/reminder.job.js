import { schedule } from 'node-cron'
import { Homework } from '../models/Homework.js'
import { ReminderLog } from '../models/ReminderLog.js'
import { Student } from '../models/Student.js'
import { ParentStudent } from '../models/ParentStudent.js'
import { User } from '../models/User.js'
import { sendHomeworkReminderEmail } from '../utils/mailer.js'

const MS_DAY = 24 * 60 * 60 * 1000
const MS_2H = 2 * 60 * 60 * 1000

/**
 * One email per (homework, parent email, reminder type). Parents with multiple children get one email listing names.
 */
async function runReminderPass() {
  const now = new Date()

  const homeworks = await Homework.find({ dueDate: { $gt: now } }).lean()
  if (!homeworks.length) return

  for (const hw of homeworks) {
    const due = new Date(hw.dueDate).getTime()
    const remaining = due - now.getTime()
    if (remaining <= 0) continue

    const need1Day = remaining <= MS_DAY
    const need2H = remaining <= MS_2H

    if (!need1Day && !need2H) continue

    /** parentEmail -> Set(studentName) */
    const parentToStudents = new Map()

    for (const sid of hw.studentIds || []) {
      const student = await Student.findById(sid).lean()
      if (!student) continue

      const links = await ParentStudent.find({ studentId: sid }).lean()
      for (const link of links) {
        const user = await User.findById(link.parentUserId).select('email name').lean()
        const email = user?.email?.trim()?.toLowerCase()
        if (!email) continue

        if (!parentToStudents.has(email)) {
          parentToStudents.set(email, new Set())
        }
        parentToStudents.get(email).add(student.name || 'Student')
      }
    }

    const dueStr = new Date(hw.dueDate).toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    })

    for (const [email, namesSet] of parentToStudents) {
      const names = [...namesSet].join(', ')

      if (need1Day) {
        const exists = await ReminderLog.findOne({
          homeworkId: hw._id,
          sentTo: email,
          type: 'BEFORE_1_DAY',
        }).lean()
        if (!exists) {
          const subject = `Homework reminder: "${hw.title}" due in less than 24 hours`
          const text = `Hello,\n\nThis is a reminder that homework "${hw.title}" for ${names} is due on ${dueStr}.\n\n${hw.description ? `${hw.description}\n\n` : ''}— ClassRoom`
          const html = `<p>Hello,</p><p>This is a reminder that homework <strong>${escapeHtml(hw.title)}</strong> for <strong>${escapeHtml(names)}</strong> is due on <strong>${escapeHtml(dueStr)}</strong>.</p>${hw.description ? `<p>${escapeHtml(hw.description).replace(/\n/g, '<br/>')}</p>` : ''}<p>— ClassRoom</p>`

          try {
            const sent = await sendHomeworkReminderEmail({ to: email, subject, text, html })
            if (sent) {
              await ReminderLog.create({
                homeworkId: hw._id,
                sentTo: email,
                type: 'BEFORE_1_DAY',
              })
            }
          } catch (e) {
            console.error('[homework-reminder] BEFORE_1_DAY send failed', e?.message || e)
          }
        }
      }

      if (need2H) {
        const exists2 = await ReminderLog.findOne({
          homeworkId: hw._id,
          sentTo: email,
          type: 'BEFORE_2_HOURS',
        }).lean()
        if (!exists2) {
          const subject = `Homework reminder: "${hw.title}" due in less than 2 hours`
          const text = `Hello,\n\nUrgent: homework "${hw.title}" for ${names} is due soon (${dueStr}).\n\n${hw.description ? `${hw.description}\n\n` : ''}— ClassRoom`
          const html = `<p>Hello,</p><p><strong>Urgent:</strong> homework <strong>${escapeHtml(hw.title)}</strong> for <strong>${escapeHtml(names)}</strong> is due soon (<strong>${escapeHtml(dueStr)}</strong>).</p>${hw.description ? `<p>${escapeHtml(hw.description).replace(/\n/g, '<br/>')}</p>` : ''}<p>— ClassRoom</p>`

          try {
            const sent = await sendHomeworkReminderEmail({ to: email, subject, text, html })
            if (sent) {
              await ReminderLog.create({
                homeworkId: hw._id,
                sentTo: email,
                type: 'BEFORE_2_HOURS',
              })
            }
          } catch (e) {
            console.error('[homework-reminder] BEFORE_2_HOURS send failed', e?.message || e)
          }
        }
      }
    }
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function startHomeworkReminderJob() {
  schedule('*/10 * * * *', async () => {
    try {
      await runReminderPass()
    } catch (e) {
      console.error('[homework-reminder] job failed', e)
    }
  })
  console.log('[homework-reminder] cron scheduled every 10 minutes')
}
