import i18n from '../i18n/index.js'

export function currentLocale() {
  return i18n.resolvedLanguage || i18n.language || 'en'
}

export function formatDateTime(value, options = {}) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(currentLocale(), options).format(new Date(value))
  } catch {
    return ''
  }
}

export function formatRelativeTimeFromNow(value) {
  if (!value) return ''
  try {
    const target = new Date(value)
    const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000)
    const abs = Math.abs(diffSeconds)
    const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' })

    if (abs < 60) return rtf.format(diffSeconds, 'second')
    if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour')
    return rtf.format(Math.round(diffSeconds / 86400), 'day')
  } catch {
    return ''
  }
}
