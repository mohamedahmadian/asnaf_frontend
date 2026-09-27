export const AUTH_TOKEN_KEY = 'template_token'
export const IMPERSONATE_TOKEN_KEY = 'template_impersonate_token'

export function getAuthToken() {
  return sessionStorage.getItem(IMPERSONATE_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY)
}

export function isImpersonatingSession() {
  return Boolean(sessionStorage.getItem(IMPERSONATE_TOKEN_KEY))
}

export function setSessionToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function setImpersonateToken(token: string) {
  sessionStorage.setItem(IMPERSONATE_TOKEN_KEY, token)
}

export function clearImpersonateToken() {
  sessionStorage.removeItem(IMPERSONATE_TOKEN_KEY)
}

export function clearSessionToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}
