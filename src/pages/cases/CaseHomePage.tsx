import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Eye,
  Files,
  FolderKanban,
  Gavel,
  Plus,
  RefreshCw,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormEmptyHint, FormFactTile, formCardBodyClassName, formToneClass } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { DateText } from '../../components/ui/DateText'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { FORMATION_STEPS } from './formation-types'

type CaseRequestRow = {
  id: string
  number: string
  type: 'ISSUANCE' | 'RENEWAL' | 'STEWARDSHIP' | 'AUCTION'
  status: 'OPEN' | 'ISSUED'
  formationStep: number
  completedAt: string | null
  createdAt: string
}

type CaseHome = {
  id: string
  formationStep: number
  trackingCode: string | null
  businessUnitTitle: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  job: { id: string; title: string; group: { id: string; title: string } | null } | null
  person: {
    id: string
    fullName: string
    firstName: string
    lastName: string
    nationalId: string | null
    phone: string | null
  }
  requests: CaseRequestRow[]
}

const REQUEST_TYPE_ICONS = {
  ISSUANCE: BadgeCheck,
  RENEWAL: RefreshCw,
  STEWARDSHIP: UserRound,
  AUCTION: Gavel,
} as const

const LATER_REQUESTS = [
  { type: 'RENEWAL', icon: RefreshCw },
  { type: 'STEWARDSHIP', icon: UserRound },
  { type: 'AUCTION', icon: Gavel },
] as const

export function CaseHomePage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [picking, setPicking] = useState(false)
  const query = useQuery({
    queryKey: ['cases', 'home', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseHome>(`/cases/${id}`)).data,
  })
  const item = query.data
  const openRequest = item?.requests.some((request) => request.status === 'OPEN') ?? false
  const canStart = Boolean(item?.licenseNumber) && !openRequest

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Files}
        title={t('cases.details')}
        subtitle={
          item ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <EntityNameSubtitle icon={UserRound} name={item.person.fullName || t('cases.details')} />
              {item.licenseNumber ? (
                <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <BadgeCheck className="size-4 shrink-0" aria-hidden />
                  <span>{t('cases.licenseNumber')}</span>
                  <CopyableDigits value={item.licenseNumber} />
                </span>
              ) : null}
            </span>
          ) : undefined
        }
        backTo="/cases"
        action={
          canStart ? (
            <Button type="button" variant="soft" onClick={() => setPicking((current) => !current)}>
              <Plus className="size-4" aria-hidden />
              {t('cases.newRequest')}
            </Button>
          ) : null
        }
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <div className="space-y-4">
          <FormCard
            icon={Briefcase}
            title={item.businessUnitTitle || t('cases.details')}
            chips={
              item.job?.group || item.job ? (
                <>
                  {item.job?.group ? (
                    <CaseMetaBadge icon={FolderKanban} label={t('cases.activityGroup')} value={item.job.group.title} />
                  ) : null}
                  {item.job ? (
                    <CaseMetaBadge icon={Briefcase} label={t('cases.activityJob')} value={item.job.title} />
                  ) : null}
                </>
              ) : undefined
            }
          >
            <div className={formCardBodyClassName}>
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.licenseIssued')}
                  value={item.licenseIssuedAt ? <DateText value={item.licenseIssuedAt} /> : '—'}
                  empty={!item.licenseIssuedAt}
                />
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.licenseExpires')}
                  value={item.licenseExpiresAt ? <DateText value={item.licenseExpiresAt} /> : '—'}
                  empty={!item.licenseExpiresAt}
                />
                <RemainingDaysTile
                  issuedAt={item.licenseIssuedAt}
                  expiresAt={item.licenseExpiresAt}
                  label={t('cases.daysRemaining')}
                  locale={locale}
                />
              </div>
            </div>
          </FormCard>

          <FormCard icon={Files} title={t('cases.requestsTitle')}>
            <div className={formCardBodyClassName}>
              {picking ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {LATER_REQUESTS.map(({ type, icon: Icon }) => (
                    <Button
                      key={type}
                      type="button"
                      variant="ghost"
                      onClick={() => toast.message(t('cases.requestTypeLater'))}
                    >
                      <Icon className="size-4" aria-hidden />
                      {t(`cases.requestTypes.${type}`)}
                    </Button>
                  ))}
                </div>
              ) : null}
              {item.requests.length === 0 ? (
                <FormEmptyHint>{t('cases.requestsEmpty')}</FormEmptyHint>
              ) : (
                <TableCard hasRows empty={t('cases.requestsEmpty')}>
                  <table className="w-full text-sm">
                    <thead className="bg-cream-50 text-ink-700">
                      <tr>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.requestNumber')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.requestType')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.listStep')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.requestDate')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.licenseIssued')}</th>
                        <ActionsTh />
                      </tr>
                    </thead>
                    <tbody>
                      {item.requests.map((request) => {
                        const issued = request.status === 'ISSUED'
                        const stepKey = FORMATION_STEPS[request.formationStep] ?? FORMATION_STEPS[0]
                        const status = issued
                          ? t('cases.issuedStatus')
                          : request.type === 'ISSUANCE'
                            ? t(`cases.steps.${stepKey}`)
                            : t('cases.requestStatus.OPEN')
                        const requestTo = `/cases/formation?nationalId=${encodeURIComponent(item.person.nationalId ?? '')}&caseId=${encodeURIComponent(item.id)}`
                        const licenseTo = `/cases/${item.id}/license`
                        const TypeIcon = REQUEST_TYPE_ICONS[request.type]
                        const issuedOn =
                          issued && request.type === 'ISSUANCE'
                            ? item.licenseIssuedAt ?? request.completedAt
                            : request.completedAt
                        return (
                          <tr key={request.id} className="border-t border-line">
                            <td className="px-4 py-3" dir="ltr">
                              {localizeDigits(request.number, locale)}
                            </td>
                            <td className="px-4 py-3">
                              <RequestBadge>
                                <TypeIcon className="size-3.5" aria-hidden />
                                {t(`cases.requestTypes.${request.type}`)}
                              </RequestBadge>
                            </td>
                            <td className="px-4 py-3">
                              <RequestBadge tone={issued ? 'mint' : 'teal'}>{status}</RequestBadge>
                            </td>
                            <td className="px-4 py-3">
                              <DateText value={request.createdAt} />
                            </td>
                            <td className="px-4 py-3">
                              {issuedOn ? <DateText value={issuedOn} /> : '—'}
                            </td>
                            <td className={actionsColClassName}>
                              {request.type === 'ISSUANCE' ? (
                                <EntityRowActions
                                  viewTo={issued ? licenseTo : requestTo}
                                  viewLabel={issued ? t('cases.viewLicense') : t('cases.continueRequest')}
                                  viewIcon={issued ? BadgeCheck : Eye}
                                  rowOpensView
                                  extra={
                                    issued ? (
                                      <Link to={requestTo}>
                                        <Button type="button" variant="ghost">
                                          <Eye className="size-4" aria-hidden />
                                          {t('cases.viewRequest')}
                                        </Button>
                                      </Link>
                                    ) : null
                                  }
                                />
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </TableCard>
              )}
            </div>
          </FormCard>
        </div>
      ) : null}
    </div>
  )
}

function RequestBadge({
  children,
  tone = 'teal',
}: {
  children: ReactNode
  tone?: 'teal' | 'mint'
}) {
  const toneClass =
    tone === 'mint'
      ? 'bg-mint-50 text-teal-900 ring-mint-200'
      : 'bg-teal-50 text-teal-900 ring-teal-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${toneClass}`}>
      {children}
    </span>
  )
}

function CaseMetaBadge({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="text-ink-500">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function isoUtcDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function todayIso() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function licenseSpan(issuedAt: string | null, expiresAt: string | null) {
  if (!expiresAt) return null
  const end = isoUtcDay(expiresAt)
  const today = isoUtcDay(todayIso())
  if (end == null || today == null) return null
  const remaining = Math.max(0, Math.round((end - today) / 86_400_000))
  const start = issuedAt ? isoUtcDay(issuedAt) : null
  const total = start == null ? null : Math.round((end - start) / 86_400_000)
  const ratio = total == null || total <= 0 ? (remaining > 0 ? 1 : 0) : Math.min(1, remaining / total)
  return { remaining, ratio }
}

function RemainingDaysTile({
  issuedAt,
  expiresAt,
  label,
  locale,
}: {
  issuedAt: string | null
  expiresAt: string | null
  label: string
  locale: string
}) {
  const span = licenseSpan(issuedAt, expiresAt)
  const size = 72
  const stroke = 7
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const ratio = span?.ratio ?? 0
  const dash = circ * ratio
  const daysLabel = span ? formatNumber(span.remaining, locale) : '—'
  return (
    <article
      className={`relative z-10 flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border px-3 py-3 ${formToneClass.mint.wrap}`}
    >
      <div
        className="relative size-[4.5rem] shrink-0"
        role="img"
        aria-label={span ? `${label}: ${daysLabel}` : label}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="size-[4.5rem] -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-mint-100" strokeWidth={stroke} />
          {dash > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-mint-500"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold leading-none text-ink-900" aria-hidden>
          {daysLabel}
        </span>
      </div>
      <p className="min-w-0 text-[11px] font-medium leading-5 text-ink-500">{label}</p>
    </article>
  )
}
