import { useTranslation } from 'react-i18next'

export function useHeadquartersSummary() {
  return { data: undefined, isLoading: false }
}

export function useBrandDisplay() {
  const { t } = useTranslation()
  return {
    title: t('nav.panel'),
    name: t('app.name'),
    logoSrc: undefined as string | undefined,
    branding: undefined,
  }
}
