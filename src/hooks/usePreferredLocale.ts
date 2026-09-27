import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import i18n, {
  applyUiLanguage,
  getStoredPreferredLocale,
  languages,
  persistPreferredLocale,
  PREFERRED_LOCALE_EVENT,
  type AppLanguage,
} from '../i18n'
import { api } from '../lib/api'
import { getAuthToken } from '../lib/auth-token'

export function usePreferredLocale() {
  const [locale, setLocaleState] = useState<AppLanguage>(getStoredPreferredLocale)

  useEffect(() => {
    function sync() {
      setLocaleState(getStoredPreferredLocale())
    }
    window.addEventListener(PREFERRED_LOCALE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PREFERRED_LOCALE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setLocale = useCallback((next: AppLanguage) => {
    const previous = getStoredPreferredLocale()
    persistPreferredLocale(next)
    setLocaleState(next)
    applyUiLanguage(next)
    window.dispatchEvent(new Event(PREFERRED_LOCALE_EVENT))
    if (getAuthToken()) {
      void api.patch('/auth/settings', { locale: next }).catch(() => undefined)
    }
    if (next !== previous && !languages[next].enabled) {
      toast.info(i18n.t('settings.comingSoon'))
    }
  }, [])

  return { locale, setLocale }
}
