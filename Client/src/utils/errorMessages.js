import i18n from '../i18n/index.js'

const ERROR_KEY_MAP = {
  Unauthorized: 'errors.unauthorized',
  Forbidden: 'errors.forbidden',
  'Invalid id': 'errors.invalidId',
  'Email already registered': 'errors.emailAlreadyRegistered',
  'Name is required': 'errors.nameRequired',
  'Email is required': 'errors.emailRequired',
  'Password is required': 'errors.passwordRequired',
  'Password must be at least 6 characters': 'errors.passwordMin',
  'Missing file': 'errors.missingFile',
}

const ERROR_CODE_KEY_MAP = {
  AUTH_INVALID_CREDENTIALS: 'auth.errors.invalidCredentials',
  AUTH_EMAIL_EXISTS: 'auth.errors.emailExists',
  AUTH_EMAIL_REQUIRED: 'auth.errors.emailRequired',
  AUTH_PASSWORD_REQUIRED: 'auth.errors.passwordRequired',
  AUTH_NAME_REQUIRED: 'auth.errors.nameRequired',
  AUTH_PASSWORD_MIN: 'auth.errors.passwordMin',
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  INVALID_ID: 'errors.invalidId',
  EMAIL_EXISTS: 'errors.emailAlreadyRegistered',
  NAME_REQUIRED: 'errors.nameRequired',
  EMAIL_REQUIRED: 'errors.emailRequired',
  PASSWORD_REQUIRED: 'errors.passwordRequired',
  PASSWORD_MIN: 'errors.passwordMin',
  MISSING_FILE: 'errors.missingFile'
}

export function translateErrorMessage(errorMessage, fallbackKey = 'errors.somethingWentWrong') {
  const trimmed = String(errorMessage ?? '').trim()
  if (!trimmed) return i18n.t(fallbackKey)
  const mapped = ERROR_KEY_MAP[trimmed]
  return mapped ? i18n.t(mapped) : trimmed
}

export function getUiErrorMessage(error, fallbackKey = 'errors.somethingWentWrong') {
  const backendCode = error?.response?.data?.code
  if (typeof backendCode === 'string' && ERROR_CODE_KEY_MAP[backendCode]) {
    return i18n.t(ERROR_CODE_KEY_MAP[backendCode])
  }
  const backendMessage = error?.response?.data?.error
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return translateErrorMessage(backendMessage, fallbackKey)
  }
  if (error?.message === 'Network Error') {
    return i18n.t('errors.network')
  }
  return i18n.t(fallbackKey)
}
