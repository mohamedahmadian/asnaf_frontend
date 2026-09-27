import axios from 'axios'
import { getStoredPreferredLocale, uiLanguageFor } from '../i18n'
import {
  clearImpersonateToken,
  clearSessionToken,
  getAuthToken,
  isImpersonatingSession,
} from './auth-token'
import { isPublicSessionPath } from './public-paths'

const envApiUrl = import.meta.env.VITE_API_URL?.trim()

export const apiBaseUrl = envApiUrl ? envApiUrl.replace(/\/+$/, '') : '/api'

export const api = axios.create({
  baseURL: apiBaseUrl,
})

export function getImageUrl(id: string): string {
  return `${apiBaseUrl}/images/${id}`
}

export function getFileUrl(id: string): string {
  return `${apiBaseUrl}/files/${id}`
}

export function getProjectDocumentUrl(projectId: string, documentId: string): string {
  return `${apiBaseUrl}/public/projects/${projectId}/documents/${documentId}/file`
}

export function isApiServerError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false
  }
  const status = error.response?.status
  return status == null || status >= 500
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }
  const message = error.response?.data?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }
  if (Array.isArray(message)) {
    const text = message.filter((item) => typeof item === 'string').join('، ')
    if (text) {
      return text
    }
  }
  return fallback
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`
  if (
    token &&
    !url.includes('/public/vouchers/') &&
    !url.includes('/public/profiles/') &&
    !url.includes('/public/projects/') &&
    !url.includes('/public/accommodations/') &&
    !url.includes('/public/walking-stations/')
  ) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['Accept-Language'] = uiLanguageFor(getStoredPreferredLocale())
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (isImpersonatingSession()) {
        clearImpersonateToken()
        window.location.assign('/impersonate-ended')
        return Promise.reject(error)
      }
      clearSessionToken()
      const path = window.location.pathname
      if (!isPublicSessionPath(path)) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)
