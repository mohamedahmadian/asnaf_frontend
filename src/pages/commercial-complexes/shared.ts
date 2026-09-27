import { useTranslation } from 'react-i18next'

export function complexDisplayName(
  item: { name: string; nameEn: string },
  locale: string,
) {
  const useEn = locale === 'en' || locale === 'hi'
  return useEn ? item.nameEn || item.name : item.name || item.nameEn
}

export function useComplexName() {
  const { i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  return (item?: { name: string; nameEn: string } | null) =>
    item ? complexDisplayName(item, locale) : '—'
}

export function emptyText(value?: string | null) {
  return value?.trim() ? value : '—'
}
