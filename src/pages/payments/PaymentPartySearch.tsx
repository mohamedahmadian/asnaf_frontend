import {
  BadgeCheck,
  Briefcase,
  Building2,
  Hash,
  IdCard,
  Layers,
  LoaderCircle,
  Search,
  Store,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormEmptyHint } from '../../components/ui/FormLayout'
import { FormField, fieldClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { personTypes, type PaymentCaseFile, type PaymentParty } from '../../types/app'

export type PartySelection = {
  userId: string
  caseFileId: string | null
  party: PaymentParty
  caseFile: PaymentCaseFile | null
}

const selectedCardClassName =
  'border-teal-500 bg-teal-50 shadow-[0_8px_20px_rgba(46,189,182,0.16)] ring-2 ring-teal-200'
const idleCardClassName = 'border-teal-100 bg-white hover:border-teal-300 hover:shadow-[0_6px_16px_rgba(46,189,182,0.1)]'

function isNestedControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('button, input, label, a'))
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-teal-100 bg-white/90 px-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-ink-500">{label}</span>
        <span className="block truncate text-sm font-medium text-ink-900">{value}</span>
      </span>
    </div>
  )
}

/** گزینهٔ قابل انتخاب با چک‌باکس همیشه‌پیدا؛ کلیک روی بدنهٔ کارت هم انتخاب می‌کند */
function SelectableCard({
  selected,
  label,
  onToggle,
  large = false,
  children,
}: {
  selected: boolean
  label: string
  onToggle: (checked: boolean) => void
  large?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`flex cursor-pointer items-start gap-3 border transition ${
        large ? 'rounded-3xl p-4' : 'rounded-2xl p-3'
      } ${selected ? selectedCardClassName : idleCardClassName}`}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (isNestedControl(event.target) || selected) return
        onToggle(true)
      }}
    >
      <CheckboxField compact checked={selected} onChange={onToggle} label={label} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function LicenseFacts({ item }: { item: PaymentCaseFile }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const license = item.licenseNumber || item.cardNumber || item.trackingCode
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Fact icon={Layers} label={t('payments.jobGroup')} value={item.jobGroupTitle || '—'} />
      <Fact icon={Briefcase} label={t('payments.job')} value={item.activityJobTitle || '—'} />
      <Fact
        icon={BadgeCheck}
        label={t('payments.license')}
        value={license ? <span dir="ltr">{localizeDigits(license, locale)}</span> : '—'}
      />
      <Fact icon={Store} label={t('payments.businessUnit')} value={item.businessUnitTitle || '—'} />
    </div>
  )
}

function PartyHeader({
  icon: Icon,
  title,
  typeLabel,
  children,
}: {
  icon: LucideIcon
  title: string
  typeLabel: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink-900">{title}</p>
        {children}
      </div>
      <span className="rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-medium text-teal-800">{typeLabel}</span>
    </div>
  )
}

export function PaymentPartySearch({
  resetKey,
  value,
  onChange,
}: {
  resetKey: number
  value: PartySelection | null
  onChange: (next: PartySelection | null) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [term, setTerm] = useState('')
  const [queryText, setQueryText] = useState('')

  useEffect(() => {
    setTerm('')
    setQueryText('')
  }, [resetKey])

  useEffect(() => {
    const timer = window.setTimeout(() => setQueryText(term.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [term])

  const canSearch = queryText.length >= 2
  const query = useQuery({
    queryKey: ['payments', 'parties', queryText],
    enabled: canSearch,
    queryFn: async () => {
      const { data } = await api.get<PaymentParty[]>('/payments/parties', { params: { q: queryText } })
      return data
    },
  })
  const parties = canSearch ? (query.data ?? []) : []
  const searching = canSearch && query.isFetching

  function toggle(party: PaymentParty, caseFile: PaymentCaseFile | null, checked: boolean) {
    onChange(
      checked ? { userId: party.id, caseFileId: caseFile?.id ?? null, party, caseFile } : null,
    )
  }

  function clear() {
    setTerm('')
    setQueryText('')
    onChange(null)
  }

  return (
    <div className="space-y-3">
      <FormField icon={Search} label={t('payments.searchParty')} htmlFor="payment-party-search">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-teal-600"
            aria-hidden
          />
          <input
            id="payment-party-search"
            type="search"
            className={`${fieldClassName} !ps-10 !pe-20 [&::-webkit-search-cancel-button]:hidden`}
            placeholder={t('payments.searchPartyPlaceholder')}
            value={term}
            autoComplete="off"
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.stopPropagation()
              setQueryText(term.trim())
            }}
          />
          <span className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {searching ? <LoaderCircle className="size-4 animate-spin text-teal-600" aria-hidden /> : null}
            {term ? (
              <button
                type="button"
                className="flex size-7 cursor-pointer items-center justify-center rounded-xl text-ink-500 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                aria-label={t('payments.clearSearch')}
                title={t('payments.clearSearch')}
                onClick={clear}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </span>
        </div>
      </FormField>

      {term.trim().length > 0 && term.trim().length < 2 ? (
        <p className="text-xs text-ink-500">{t('payments.searchPartyHint')}</p>
      ) : null}
      {canSearch && query.isFetched && !searching && parties.length === 0 ? (
        <FormEmptyHint>{t('payments.noPartyResults')}</FormEmptyHint>
      ) : null}
      {parties.length > 0 ? (
        <p className="text-xs font-medium text-ink-600">
          {t('payments.resultCount', { value: formatNumber(parties.length, locale) })}
        </p>
      ) : null}

      <div className="space-y-3">
        {parties.map((party) => {
          const personSelected = value?.userId === party.id && !value.caseFileId

          if (party.personType === personTypes.LEGAL) {
            return (
              <SelectableCard
                key={party.id}
                selected={personSelected}
                label={t('payments.onCompanyName')}
                onToggle={(checked) => toggle(party, null, checked)}
                large
              >
                <PartyHeader
                  icon={Building2}
                  title={party.companyName || party.fullName}
                  typeLabel={t('personTypes.LEGAL')}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Fact icon={Building2} label={t('payments.companyName')} value={party.companyName || party.fullName} />
                  <Fact
                    icon={IdCard}
                    label={t('payments.companyNationalId')}
                    value={<CopyableDigits value={party.companyNationalId} />}
                  />
                  <Fact
                    icon={Hash}
                    label={t('payments.companyRegistrationNo')}
                    value={
                      party.companyRegistrationNo ? (
                        <span dir="ltr">{localizeDigits(party.companyRegistrationNo, locale)}</span>
                      ) : (
                        '—'
                      )
                    }
                  />
                </div>
              </SelectableCard>
            )
          }

          return (
            <article
              key={party.id}
              className="space-y-3 rounded-3xl border border-teal-100 bg-white p-4 shadow-[0_10px_30px_rgba(20,40,40,0.04)]"
            >
              <PartyHeader icon={UserRound} title={party.fullName} typeLabel={t('personTypes.NATURAL')}>
                <p className="flex items-center gap-1.5 text-sm text-ink-600">
                  <IdCard className="size-3.5 shrink-0 text-teal-600" aria-hidden />
                  <span className="text-[11px] text-ink-500">{t('payments.nationalId')}</span>
                  <CopyableDigits value={party.nationalId} />
                </p>
              </PartyHeader>

              <SelectableCard
                selected={personSelected}
                label={t('payments.payOnPerson')}
                onToggle={(checked) => toggle(party, null, checked)}
              >
                <p className="flex items-center gap-2 pt-1.5 text-sm font-medium text-ink-800">
                  <UserRound className="size-4 shrink-0 text-teal-600" aria-hidden />
                  {t('payments.payOnPerson')}
                </p>
              </SelectableCard>

              {party.cases.length === 0 ? (
                <p className="text-xs text-ink-500">{t('payments.noLicenseYet')}</p>
              ) : (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
                    <BadgeCheck className="size-3.5 text-teal-600" aria-hidden />
                    {t('payments.licenses')}
                  </p>
                  {party.cases.map((item) => (
                    <SelectableCard
                      key={item.id}
                      selected={value?.userId === party.id && value.caseFileId === item.id}
                      label={t('payments.selectLicense')}
                      onToggle={(checked) => toggle(party, item, checked)}
                    >
                      <LicenseFacts item={item} />
                    </SelectableCard>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
