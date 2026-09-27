import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  clearImpersonateToken,
  clearSessionToken,
  getAuthToken,
  isImpersonatingSession,
  setSessionToken,
} from '../lib/auth-token'
import {
  applyUiLanguage,
  getStoredPreferredLocale,
  persistPreferredLocale,
  PREFERRED_LOCALE_EVENT,
  resolveUiLanguage,
  selectableLocale,
  uiLanguageFor,
} from '../i18n'
import type { AuthUser } from '../types/app'

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function endImpersonationWindow() {
  clearImpersonateToken()
  try {
    window.close()
  } catch {
    // ignore
  }
  window.location.assign('/impersonate-ended')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const applyUser = useCallback((next: AuthUser) => {
    setUser(next)
    if (next.impersonating || isImpersonatingSession()) {
      applyUiLanguage(selectableLocale(next.locale))
      return
    }
    const lang = resolveUiLanguage(next.locale)
    persistPreferredLocale(lang)
    applyUiLanguage(lang)
    window.dispatchEvent(new Event(PREFERRED_LOCALE_EVENT))
  }, [])

  const refresh = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    const { data } = await api.get<AuthUser>('/auth/me')
    applyUser(data)
    setLoading(false)
  }, [applyUser])

  useEffect(() => {
    void refresh().catch(() => {
      if (isImpersonatingSession()) {
        endImpersonationWindow()
        return
      }
      clearSessionToken()
      setUser(null)
      setLoading(false)
    })
  }, [refresh])

  const login = useCallback(
    async (username: string, password: string) => {
      const locale = uiLanguageFor(getStoredPreferredLocale())
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        '/auth/login',
        { username, password, locale },
      )
      setSessionToken(data.token)
      queryClient.clear()
      applyUser(data.user)
    },
    [applyUser, queryClient],
  )

  const logout = useCallback(() => {
    if (isImpersonatingSession() || user?.impersonating) {
      endImpersonationWindow()
      return
    }
    clearSessionToken()
    queryClient.clear()
    setUser(null)
    applyUiLanguage(getStoredPreferredLocale())
  }, [queryClient, user?.impersonating])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
