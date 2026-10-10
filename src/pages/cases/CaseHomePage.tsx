import {
  BadgeCheck,
  Ban,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CirclePause,
  Eye,
  Files,
  FolderKanban,
  Gavel,
  HandHeart,
  IdCard,
  MapPin,
  MapPinned,
  MapPinPlus,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import {
  ActionsTh,
  EntityRowActions,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { DateText } from '../../components/ui/DateText'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import { violationCreatePath, violationPath } from '../../lib/paths/violations'
import type { Violation } from '../../types/app'
import { FORMATION_STEPS } from './formation-types'

type CaseRequestRow = {
  id: string
  number: string
  type: 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  formationStep: number
  completedAt: string | null
  createdAt: string
}

function requestDone(status: CaseRequestRow['status']) {
  return status === 'ISSUED' || status === 'COMPLETED'
}

function PremiseHistoryBlock({
  title,
  place,
  endedAt,
}: {
  title: string
  place: PremisePlace
  endedAt?: string | null
}) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  return (
    <section className="space-y-3">
      <FormSectionTitle icon={MapPinned}>{title}</FormSectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile
          icon={MapPin}
          label={t('cases.premiseAddress')}
          value={place.address || '—'}
          empty={!place.address}
          className="sm:col-span-2"
          tone="teal"
        />
        <FormFactTile
          icon={MapPin}
          label={t('geo.city')}
          value={place.city ? geoName(place.city) : '—'}
          empty={!place.city}
        />
        <FormFactTile
          icon={MapPin}
          label={t('cases.plaque')}
          value={place.plaque || '—'}
          empty={!place.plaque}
        />
        <FormFactTile
          icon={MapPinned}
          label={t('cases.ownership')}
          value={place.ownership ? t(`cases.ownerships.${place.ownership}`) : '—'}
          empty={!place.ownership}
          tone="mint"
        />
        <FormFactTile
          icon={CalendarDays}
          label={t('cases.premiseHistoryFrom')}
          value={place.startedAt ? <DateText value={place.startedAt} /> : '—'}
          empty={!place.startedAt}
        />
        {endedAt !== undefined ? (
          <FormFactTile
            icon={CalendarClock}
            label={t('cases.premiseHistoryUntil')}
            value={endedAt ? <DateText value={endedAt} /> : '—'}
            empty={!endedAt}
          />
        ) : null}
      </div>
    </section>
  )
}

type PremisePlace = {
  address: string | null
  plaque: string | null
  ownership: 'OWNED' | 'RENTED' | null
  city: { nameFa: string; nameEn: string } | null
  startedAt: string | null
}

type CaseHome = {
  id: string
  formationStep: number
  trackingCode: string | null
  businessUnitTitle: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  violationCount: number
  city: { nameFa: string; nameEn: string } | null
  premise: PremisePlace | null
  premiseHistory: (PremisePlace & { id: string; endedAt: string | null })[]
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
  LOCATION_CHANGE: MapPinned,
  STEWARDSHIP: UserRound,
  AUCTION: Gavel,
} as const

const LATER_REQUESTS = [
  { type: 'STEWARDSHIP', icon: UserRound },
] as const

const PROCESS_REQUESTS = [
  { type: 'RENEWAL', icon: RefreshCw },
  { type: 'LOCATION_CHANGE', icon: MapPinned },
] as const

const CASE_OPERATIONS = [
  { key: 'renewLicense', icon: RefreshCw, tone: 'teal' },
  { key: 'issueAuction', icon: Gavel, tone: 'teal' },
  { key: 'issueStewardship', icon: IdCard, tone: 'teal' },
  { key: 'changeLocation', icon: MapPinned, tone: 'teal' },
  { key: 'renewWithLocation', icon: MapPinPlus, tone: 'teal' },
  { key: 'issueServiceCard', icon: HandHeart, tone: 'teal' },
] as const

const CASE_SENSITIVE_OPERATIONS = [
  { key: 'suspend', icon: CirclePause, tone: 'amber' },
  { key: 'registerViolation', icon: ShieldAlert, tone: 'orange' },
  { key: 'revoke', icon: Ban, tone: 'rose' },
] as const

const OPERATION_TONES = {
  teal: {
    button:
      'border-teal-200 bg-white text-ink-800 shadow-[0_3px_10px_rgba(46,189,182,0.12)] hover:border-teal-400 hover:bg-teal-50',
    icon: 'bg-teal-50 text-teal-600',
  },
  amber: {
    button:
      'border-amber-200 bg-amber-50/80 text-amber-900 shadow-[0_3px_10px_rgba(217,119,6,0.1)] hover:border-amber-300 hover:bg-amber-50',
    icon: 'bg-amber-100 text-amber-700',
  },
  orange: {
    button:
      'border-orange-200 bg-orange-50/80 text-orange-900 shadow-[0_3px_10px_rgba(234,88,12,0.1)] hover:border-orange-300 hover:bg-orange-50',
    icon: 'bg-orange-100 text-orange-700',
  },
  rose: {
    button:
      'border-red-200 bg-red-50/80 text-red-800 shadow-[0_3px_10px_rgba(220,38,38,0.1)] hover:border-red-300 hover:bg-red-50',
    icon: 'bg-red-100 text-red-700',
  },
} as const

function caseRequestPath(caseId: string, nationalId: string | null) {
  return `/cases/formation?nationalId=${encodeURIComponent(nationalId ?? '')}&caseId=${encodeURIComponent(caseId)}`
}

export function CaseHomePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const geoName = useGeoName()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [picking, setPicking] = useState(false)
  const [violationsOpen, setViolationsOpen] = useState(false)
  const showHome = searchParams.get('stay') === '1'
  const query = useQuery({
    queryKey: ['cases', 'home', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseHome>(`/cases/${id}`)).data,
  })
  const item = query.data
  const openRequest = item?.requests.find((request) => request.status === 'OPEN') ?? null
  const canStart = Boolean(item?.licenseNumber) && !openRequest
  const redirecting = Boolean(item && !showHome && openRequest)

  async function startRequest(type: 'RENEWAL' | 'LOCATION_CHANGE') {
    try {
      await api.post(`/cases/${id}/requests`, { type })
      navigate(`/cases/${id}/process`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    }
  }

  function openAuction() {
    if (!item?.licenseNumber) {
      toast.error(t('cases.auction.licenseRequired'))
      return
    }
    const open = item.requests.find((request) => request.status === 'OPEN')
    if (open?.type === 'AUCTION') {
      navigate(`/cases/${item.id}/auction/${open.id}`)
      return
    }
    if (open) {
      toast.error(t('cases.auction.openRequest'))
      return
    }
    navigate(`/cases/${item.id}/auction/new`)
  }

  useEffect(() => {
    if (!item || showHome || !openRequest) return
    if (openRequest.type === 'ISSUANCE') {
      navigate(caseRequestPath(item.id, item.person.nationalId), { replace: true })
      return
    }
    if (openRequest.type === 'RENEWAL' || openRequest.type === 'LOCATION_CHANGE') {
      navigate(`/cases/${item.id}/process`, { replace: true })
      return
    }
    if (openRequest.type === 'AUCTION') {
      navigate(`/cases/${item.id}/auction/${openRequest.id}`, { replace: true })
    }
  }, [item, showHome, openRequest, navigate])

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
      {query.isLoading || redirecting ? <LoadingState /> : null}
      {item && !redirecting ? (
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
            action={
              <div className="flex items-center gap-2">
                {item.violationCount > 0 && item.person.nationalId ? (
                  <ViolationCountBadge
                    count={item.violationCount}
                    label={t('cases.violationCount')}
                    locale={locale}
                    onClick={() => setViolationsOpen(true)}
                  />
                ) : null}
                <RemainingDaysBadge
                  issuedAt={item.licenseIssuedAt}
                  expiresAt={item.licenseExpiresAt}
                  label={t('cases.daysRemaining')}
                  locale={locale}
                />
              </div>
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
                <FormFactTile
                  icon={MapPin}
                  label={t('geo.city')}
                  value={item.city ? geoName(item.city) : '—'}
                  empty={!item.city}
                />
              </div>
              <CaseOperations
                licenseTo={item.licenseNumber ? `/cases/${item.id}/license` : null}
                violationTo={
                  item.person.nationalId
                    ? `${violationCreatePath()}?${new URLSearchParams({
                        nationalId: item.person.nationalId,
                        caseId: item.id,
                      }).toString()}`
                    : null
                }
                onPick={(key) => {
                  if (key === 'renewLicense') void startRequest('RENEWAL')
                  else if (key === 'changeLocation') void startRequest('LOCATION_CHANGE')
                  else if (key === 'issueAuction') openAuction()
                  else toast.message(t('cases.requestTypeLater'))
                }}
              />
              {violationsOpen && item.person.nationalId ? (
                <PersonViolationsModal
                  nationalId={item.person.nationalId}
                  name={item.person.fullName}
                  onClose={() => setViolationsOpen(false)}
                />
              ) : null}
            </div>
          </FormCard>

          {item.premise || item.premiseHistory.length > 0 ? (
            <FormCard icon={MapPinned} title={t('cases.premiseHistoryTitle')}>
              <div className={formCardBodyClassName}>
                {item.premiseHistory.map((place) => (
                  <PremiseHistoryBlock
                    key={place.id}
                    title={t('cases.premiseHistoryPrevious')}
                    place={place}
                    endedAt={place.endedAt}
                  />
                ))}
                {item.premise ? (
                  <PremiseHistoryBlock title={t('cases.premiseHistoryCurrent')} place={item.premise} />
                ) : null}
              </div>
            </FormCard>
          ) : null}

          <FormCard icon={Files} title={t('cases.requestsTitle')}>
            <div className={formCardBodyClassName}>
              {picking ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {PROCESS_REQUESTS.map(({ type, icon: Icon }) => (
                    <Button
                      key={type}
                      type="button"
                      variant="ghost"
                      onClick={() => void startRequest(type)}
                    >
                      <Icon className="size-4" aria-hidden />
                      {t(`cases.requestTypes.${type}`)}
                    </Button>
                  ))}
                  <Button type="button" variant="ghost" onClick={openAuction}>
                    <Gavel className="size-4" aria-hidden />
                    {t('cases.requestTypes.AUCTION')}
                  </Button>
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
                        <th className="px-4 py-3 text-start font-medium">{t('cases.requestDate')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.requestType')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.listStep')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.licenseIssued')}</th>
                        <ActionsTh />
                      </tr>
                    </thead>
                    <tbody>
                      {item.requests.map((request) => {
                        const issued = requestDone(request.status)
                        const stepKey = FORMATION_STEPS[request.formationStep] ?? FORMATION_STEPS[0]
                        const status =
                          request.status === 'OPEN' && request.type === 'ISSUANCE'
                            ? t(`cases.steps.${stepKey}`)
                            : t(`cases.requestStatus.${request.status}`)
                        const requestTo =
                          request.type === 'ISSUANCE'
                            ? caseRequestPath(item.id, item.person.nationalId)
                            : request.status === 'OPEN'
                              ? `/cases/${item.id}/process`
                              : `/cases/${item.id}?stay=1`
                        const licenseTo = `/cases/${item.id}/license`
                        const TypeIcon = REQUEST_TYPE_ICONS[request.type]
                        const issuedOn =
                          issued && request.type === 'ISSUANCE'
                            ? item.licenseIssuedAt ?? request.completedAt
                            : request.completedAt
                        return (
                          <tr key={request.id} className="border-t border-line">
                            <td className="px-4 py-3">
                              <DateText value={request.createdAt} />
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
                              {issuedOn ? <DateText value={issuedOn} /> : '—'}
                            </td>
                            <td className={actionsColClassName}>
                              {request.type === 'AUCTION' ? (
                                <EntityRowActions
                                  viewTo={`/cases/${item.id}/auction/${request.id}`}
                                  viewLabel={request.status === 'OPEN' ? t('cases.continueRequest') : t('cases.viewRequest')}
                                  viewIcon={Eye}
                                  editTo={request.status === 'OPEN' ? `/cases/${item.id}/auction/${request.id}/edit` : undefined}
                                  rowOpensView={request.status !== 'OPEN'}
                                />
                              ) : request.type === 'ISSUANCE' || request.type === 'RENEWAL' || request.type === 'LOCATION_CHANGE' ? (
                                <EntityRowActions
                                  viewTo={requestTo}
                                  viewLabel={issued ? t('cases.viewRequest') : t('cases.continueRequest')}
                                  viewIcon={Eye}
                                  rowOpensView
                                  extra={
                                    issued ? (
                                      <Link to={licenseTo}>
                                        <Button type="button" variant="ghost">
                                          <BadgeCheck className="size-4" aria-hidden />
                                          {t('cases.viewLicense')}
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

function CaseOperations({
  onPick,
  licenseTo,
  violationTo,
}: {
  onPick: (key: string) => void
  licenseTo: string | null
  violationTo: string | null
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 border-t border-teal-100 pt-4">
      <div className="flex flex-wrap justify-center gap-2">
        {licenseTo ? (
          <CaseOperationButton icon={BadgeCheck} tone="teal" label={t('cases.viewLicense')} to={licenseTo} />
        ) : null}
        {CASE_OPERATIONS.map((operation) => (
          <CaseOperationButton
            key={operation.key}
            icon={operation.icon}
            tone={operation.tone}
            label={t(`cases.operations.${operation.key}`)}
            onClick={() => onPick(operation.key)}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 border-t border-dashed border-red-100 pt-3">
        {CASE_SENSITIVE_OPERATIONS.map((operation) => (
          <CaseOperationButton
            key={operation.key}
            icon={operation.icon}
            tone={operation.tone}
            label={t(`cases.operations.${operation.key}`)}
            to={operation.key === 'registerViolation' ? violationTo ?? undefined : undefined}
            onClick={() => onPick(operation.key)}
          />
        ))}
      </div>
    </div>
  )
}

function CaseOperationButton({
  icon: Icon,
  label,
  tone,
  onClick,
  to,
}: {
  icon: LucideIcon
  label: string
  tone: keyof typeof OPERATION_TONES
  onClick?: () => void
  to?: string
}) {
  const styles = OPERATION_TONES[tone]
  const className = `inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${styles.button}`
  const content = (
    <>
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      {label}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
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

function ViolationCountBadge({
  count,
  label,
  locale,
  onClick,
}: {
  count: number
  label: string
  locale: string
  onClick: () => void
}) {
  const text = formatNumber(count, locale)
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white/80 px-2.5 py-1.5 ring-1 ring-orange-200 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      aria-label={`${label}: ${text}`}
    >
      <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full bg-orange-50 ring-[5px] ring-orange-200">
        <span className="text-sm font-semibold leading-none text-orange-800">{text}</span>
      </span>
      <span className="flex max-w-16 flex-col items-start gap-0.5">
        <ShieldAlert className="size-3.5 text-orange-600" aria-hidden />
        <span className="text-[11px] font-medium leading-4 text-ink-500">{label}</span>
      </span>
    </button>
  )
}

function PersonViolationsModal({
  nationalId,
  name,
  onClose,
}: {
  nationalId: string
  name: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['violations', 'person', nationalId],
    queryFn: async () =>
      (
        await api.get<Violation[]>('/violations', {
          params: { nationalId, sortBy: 'occurredAt', sortDir: 'desc' },
        })
      ).data,
  })
  const items = query.data ?? []

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]" data-nested-dialog>
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-person-violations-title"
        className="relative z-10 flex max-h-[min(36rem,80dvh)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-orange-50 via-white to-amber-50 px-5 py-4">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_8px_16px_rgba(234,88,12,0.28)]">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <h2 id="case-person-violations-title" className="truncate text-sm font-semibold text-ink-900">
                {t('cases.personViolations', { name: name || t('cases.details') })}
              </h2>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {query.isLoading ? <LoadingState /> : null}
          {!query.isLoading && items.length === 0 ? <FormEmptyHint>{t('violations.empty')}</FormEmptyHint> : null}
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={violationPath(item.id)}
                  onClick={onClose}
                  className="flex cursor-pointer flex-col gap-1.5 rounded-2xl border border-orange-100 bg-white px-3 py-3 transition hover:border-orange-300 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-ink-900">{item.violationType.title}</span>
                    <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-orange-200">
                      {t(`violationStatuses.${item.status}`)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <DateText value={item.occurredAt} />
                    {item.caseFile?.businessUnitTitle ? <span className="truncate">{item.caseFile.businessUnitTitle}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>,
    document.body,
  )
}

function RemainingDaysBadge({
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
  const size = 52
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const ratio = span?.ratio ?? 0
  const dash = circ * ratio
  const daysLabel = span ? formatNumber(span.remaining, locale) : '—'
  return (
    <div
      className="flex items-center gap-2 rounded-2xl bg-white/80 px-2.5 py-1.5 ring-1 ring-mint-100"
      role="img"
      aria-label={span ? `${label}: ${daysLabel}` : label}
    >
      <div className="relative size-[3.25rem] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-[3.25rem] -rotate-90" aria-hidden>
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
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold leading-none text-ink-900" aria-hidden>
          {daysLabel}
        </span>
      </div>
      <p className="max-w-20 text-[11px] font-medium leading-4 text-ink-500">{label}</p>
    </div>
  )
}
