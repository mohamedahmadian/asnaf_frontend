import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../lib/datetime'

export function GeoHas({ value }: { value: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        value ? 'bg-teal-50 text-teal-700' : 'bg-cream-100 text-ink-500'
      }`}
    >
      {value ? t('geo.has') : t('geo.hasNot')}
    </span>
  )
}

export function GeoYesNo({ value }: { value: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        value ? 'bg-teal-50 text-teal-700' : 'bg-cream-100 text-ink-500'
      }`}
    >
      {value ? t('common.yes') : t('common.no')}
    </span>
  )
}

export function GeoStatus({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-teal-50 text-teal-700' : 'bg-cream-100 text-ink-500'
      }`}
    >
      {active ? t('geo.active') : t('geo.inactive')}
    </span>
  )
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  )
}

export function GeoLocationRows({
  neshanAddress,
  latitude,
  longitude,
}: {
  neshanAddress: string | null
  latitude: number | null
  longitude: number | null
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const num = (value: number | null) => (value == null ? '—' : formatNumber(value, locale))

  return (
    <>
      <DetailRow label={t('geo.neshanAddress')} value={neshanLink(neshanAddress)} />
      <DetailRow label={t('geo.latitude')} value={num(latitude)} />
      <DetailRow label={t('geo.longitude')} value={num(longitude)} />
    </>
  )
}

function neshanLink(value: string | null) {
  if (!value) {
    return '—'
  }
  if (/^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="break-all text-teal-700 hover:underline">
        {value}
      </a>
    )
  }
  return value
}
