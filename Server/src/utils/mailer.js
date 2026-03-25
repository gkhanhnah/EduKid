import nodemailer from 'nodemailer'

export function createMailTransport() {
  const host = process.env.SMTP_HOST
  if (!host) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  })
}

/**
 * @returns {Promise<boolean>} true if sent (or skipped because SMTP disabled — returns false)
 */
export async function sendHomeworkReminderEmail({ to, subject, text, html }) {
  const transport = createMailTransport()
  if (!transport) {
    console.warn('[homework-reminder] SMTP_HOST not set; skipping email to', to)
    return false
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@classroom.local'

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
  return true
}
