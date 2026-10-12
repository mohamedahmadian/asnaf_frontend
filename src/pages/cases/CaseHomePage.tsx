import {
  BadgeCheck,
  Ban,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CirclePause,
  CirclePlay,
  ClipboardList,
  Eye,
  Files,
  FolderKanban,
  Gavel,
  HandHeart,
  IdCard,
  Info,
  MapPin,
  MapPinned,
  MapPinPlus,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { confirmToast } from '../../components/ui/confirmToast'
import { Button, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { isAdmin } from '../../lib/roles'
import { useAuth } from '../../auth/AuthProvider'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormEmptyHint, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
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
import { violationCreatePath, violationsPath } from '../../lib/paths/violations'
import type { Violation, ViolationAttachment } from '../../types/app'
import { isAudioAttachment, openViolationFile } from '../violations/files'
import { FORMATION_STEPS } from './formation-types'
import {
  CaseLiftSuspensionDialog,
  CaseRevokeDialog,
  CaseSuspendDialog,
  CaseSuspensionsDialog,
  SuspensionCountBadge,
  SuspensionFiles,
} from './CaseSuspensions'
import { CaseStewardsSection, type StewardRow } from './CaseStewardsSection'

type CaseRequestRow = {
  id: string
  number: string
  type: 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  formationStep: number
  completedAt: string | null
  createdAt: string
  issuedAt: string | null
  expiresAt: string | null
  auctionStartsAt: string | null
  auctionEndsAt: string | null
}

function requestDone(status: CaseRequestRow['status']) {
  return status === 'ISSUED' || status === 'COMPLETED'
}

type CaseHome = {
  id: string
  kind?: 'LICENSE' | 'STEWARDSHIP'
  cardNumber?: string | null
  hasOwnLicense?: boolean
  host?: {
    id: string
    licenseNumber: string | null
    businessUnitTitle: string | null
    gender: 'MALE' | 'FEMALE' | null
    firstName: string
    lastName: string
    fullName: string
  } | null
  formationStep: number
  trackingCode: string | null
  businessUnitTitle: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  violationCount: number
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  revokeReason: string | null
  revokedAt: string | null
  reactivatedAt: string | null
  suspensionCount: number
  suspensions: {
    id: string
    reason: string
    startsAt: string
    endsAt: string | null
    liftNote: string | null
    files: { id: string; kind: 'SUSPEND' | 'LIFT'; originalName: string | null; mimeType?: string | null }[]
    active: boolean
  }[]
  city: { nameFa: string; nameEn: string } | null
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

const REQUEST_TYPE_STYLES = {
  ISSUANCE: {
    badge: 'bg-teal-50 text-teal-800 ring-teal-200',
    edge: 'border-s-teal-500',
  },
  RENEWAL: {
    badge: 'bg-sky-50 text-sky-800 ring-sky-200',
    edge: 'border-s-sky-500',
  },
  LOCATION_CHANGE: {
    badge: 'bg-amber-50 text-amber-900 ring-amber-200',
    edge: 'border-s-amber-500',
  },
  STEWARDSHIP: {
    badge: 'bg-violet-50 text-violet-800 ring-violet-200',
    edge: 'border-s-violet-500',
  },
  AUCTION: {
    badge: 'bg-rose-50 text-rose-800 ring-rose-200',
    edge: 'border-s-rose-400',
  },
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

function suspensionDayCount(startsAt: string, endsAt: string) {
  const start = isoUtcDay(startsAt)
  const end = isoUtcDay(endsAt)
  const today = isoUtcDay(todayIso())
  if (start == null || end == null || today == null) return null
  const total = Math.max(1, Math.round((end - start) / 86_400_000) + 1)
  const elapsed = Math.min(total, Math.max(0, Math.round((today - start) / 86_400_000) + 1))
  return { total, ratio: elapsed / total }
}

function ActiveSuspensionNotice({
  suspension,
}: {
  suspension: CaseHome['suspensions'][number] | null
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  if (!suspension) return null
  const attachments = (suspension.files ?? []).filter((file) => file.kind === 'SUSPEND')
  const span = suspension.endsAt ? suspensionDayCount(suspension.startsAt, suspension.endsAt) : null
  return (
    <div className="space-y-2 rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-amber-800/80">{t('cases.suspendStartsAt')}</span>
          <DateText value={suspension.startsAt} />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-amber-800/80">{t('cases.suspendEndsAt')}</span>
          {suspension.endsAt ? <DateText value={suspension.endsAt} /> : '—'}
        </span>
        {span ? (
          <SuspensionDaysChart total={span.total} ratio={span.ratio} locale={locale} label={t('cases.suspensionDays')} />
        ) : null}
      </div>
      <p className="whitespace-pre-wrap leading-6">{suspension.reason}</p>
      <SuspensionFiles files={attachments} />
    </div>
  )
}

function SuspensionDaysChart({
  total,
  ratio,
  locale,
  label,
}: {
  total: number
  ratio: number
  locale: string
  label: string
}) {
  const size = 52
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const dash = circ * Math.min(1, Math.max(0, ratio))
  const daysLabel = formatNumber(total, locale)
  return (
    <div
      className="ms-auto flex items-center gap-2 rounded-2xl bg-white/80 px-2.5 py-1.5 ring-1 ring-amber-200"
      role="img"
      aria-label={`${daysLabel} ${label}`}
    >
      <div className="relative size-[3.25rem] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-[3.25rem] -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-amber-100" strokeWidth={stroke} />
          {dash > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-amber-500"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold leading-none text-amber-950" aria-hidden>
          {daysLabel}
        </span>
      </div>
      <p className="max-w-16 text-[11px] font-medium leading-4 text-amber-800">{label}</p>
    </div>
  )
}

function caseRequestPath(caseId: string, nationalId: string | null) {
  return `/cases/formation?nationalId=${encodeURIComponent(nationalId ?? '')}&caseId=${encodeURIComponent(caseId)}`
}

export function CaseHomePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const admin = isAdmin(user)
  const geoName = useGeoName()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [picking, setPicking] = useState(false)
  const [violationsOpen, setViolationsOpen] = useState(false)
  const [suspensionsOpen, setSuspensionsOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [liftOpen, setLiftOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const showHome = searchParams.get('stay') === '1'
  const query = useQuery({
    queryKey: ['cases', 'home', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseHome>(`/cases/${id}`)).data,
  })
  const item = query.data
  const stewardWithoutLicense = Boolean(
    item &&
      item.kind === 'STEWARDSHIP' &&
      !item.hasOwnLicense &&
      item.requests.every((request) => request.type === 'STEWARDSHIP'),
  )
  const stewardsQuery = useQuery({
    queryKey: ['cases', 'stewards', id],
    enabled: Boolean(id) && item != null && item.kind !== 'STEWARDSHIP',
    queryFn: async () => (await api.get<StewardRow[]>(`/cases/${id}/stewards`)).data,
  })
  const activityDayCount = item?.licenseNumber ? activityDays(item) : null
  const openRequest = item?.requests.find((request) => request.status === 'OPEN') ?? null
  const revoked = item?.status === 'REVOKED'
  const canStart = Boolean(item?.licenseNumber) && !openRequest && !revoked
  const redirecting = Boolean(item && !showHome && openRequest?.type === 'ISSUANCE')

  function canDeleteRequest(status: CaseRequestRow['status']) {
    return admin || !requestDone(status)
  }

  function askDeleteRequest(requestId: string, number: string) {
    confirmToast({
      title: t('cases.deleteRequestConfirm', { number }),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/cases/${id}/requests/${requestId}`)
          toast.success(t('cases.requestDeleted'))
          await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
        } catch (error) {
          toast.error(getApiErrorMessage(error, t('common.error')))
        }
      },
    })
  }

  async function startRequest(type: 'RENEWAL' | 'LOCATION_CHANGE') {
    if (item?.status === 'REVOKED') {
      toast.error(t('cases.revokedNoRequest'))
      return
    }
    try {
      await api.post(`/cases/${id}/requests`, { type })
      navigate(`/cases/${id}/process`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    }
  }

  function openAuction() {
    if (item?.status === 'REVOKED') {
      toast.error(t('cases.revokedNoRequest'))
      return
    }
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
    if (!item || showHome || openRequest?.type !== 'ISSUANCE') return
    navigate(caseRequestPath(item.id, item.person.nationalId), { replace: true })
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
              {item.person.phone ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <Phone className="size-4 shrink-0" aria-hidden />
                  <CopyableDigits value={item.person.phone} />
                </span>
              ) : null}
              {item.person.nationalId ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <IdCard className="size-4 shrink-0" aria-hidden />
                  <CopyableDigits value={item.person.nationalId} />
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
            className={
              item.status === 'SUSPENDED' ? '!border-2 !border-amber-400' : undefined
            }
            onClick={() => navigate(`/cases/${item.id}/dossier`)}
            icon={Briefcase}
            title={
              item.kind === 'STEWARDSHIP'
                ? item.person.fullName || t('cases.stewardship.kind')
                : item.businessUnitTitle || t('cases.details')
            }
            titleExtra={
              item.licenseNumber || (activityDayCount != null && activityDayCount > 0) ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {item.licenseNumber ? (
                    <span
                      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800"
                      aria-label={t('cases.licenseNumber')}
                    >
                      <BadgeCheck className="size-4 shrink-0" aria-hidden />
                      <CopyableDigits value={item.licenseNumber} />
                    </span>
                  ) : null}
                  {activityDayCount != null && activityDayCount > 0 ? (
                    <span
                      className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-mint-50 px-3 py-1.5 text-sm font-medium text-teal-900"
                      aria-label={`${t('cases.activityDays')}: ${formatNumber(activityDayCount, locale)}`}
                    >
                      <CalendarDays className="size-4 shrink-0" aria-hidden />
                      <span className="font-semibold">{formatNumber(activityDayCount, locale)}</span>
                      <span>{t('cases.activityDays')}</span>
                    </span>
                  ) : null}
                </span>
              ) : undefined
            }
            chips={
              item.job?.group || item.job || item.status === 'SUSPENDED' || item.status === 'REVOKED' ? (
                <>
                  {item.status === 'REVOKED' ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 shadow-[0_4px_10px_rgba(220,38,38,0.08)] ring-1 ring-red-200">
                      <Ban className="size-3.5 shrink-0" aria-hidden />
                      {t('cases.revoked')}
                    </span>
                  ) : null}
                  {item.status === 'SUSPENDED' ? (
                    <span className="case-suspension-blink inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-[0_4px_10px_rgba(217,119,6,0.08)] ring-1 ring-amber-200">
                      <CirclePause className="size-3.5 shrink-0" aria-hidden />
                      {t('cases.suspensionActive')}
                    </span>
                  ) : null}
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
              (item.violationCount > 0 && item.person.nationalId) ||
              (item.suspensionCount ?? 0) > 0 ||
              !stewardWithoutLicense ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {item.violationCount > 0 && item.person.nationalId ? (
                  <ViolationCountBadge
                    count={item.violationCount}
                    label={t('cases.violationCount')}
                    locale={locale}
                    onClick={() => setViolationsOpen(true)}
                  />
                ) : null}
                {(item.suspensionCount ?? 0) > 0 ? (
                  <SuspensionCountBadge
                    count={item.suspensionCount}
                    label={t('cases.suspensionCount')}
                    locale={locale}
                    onClick={() => setSuspensionsOpen(true)}
                  />
                ) : null}
                {stewardWithoutLicense ? null : (
                  <RemainingDaysBadge
                    issuedAt={item.licenseIssuedAt}
                    expiresAt={item.licenseExpiresAt}
                    label={t('cases.daysRemaining')}
                    locale={locale}
                  />
                )}
              </div>
              ) : undefined
            }
          >
            <div className={formCardBodyClassName}>
              {item.status === 'SUSPENDED' ? (
                <ActiveSuspensionNotice
                  suspension={item.suspensions.find((row) => row.active) ?? null}
                />
              ) : null}
              {item.status === 'REVOKED' && item.revokeReason ? (
                <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-900 ring-1 ring-red-100">
                  {item.revokeReason}
                </p>
              ) : null}
              {stewardWithoutLicense ? (
                <p
                  role="status"
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-start gap-2.5 rounded-2xl bg-amber-50 px-3 py-3 text-sm leading-7 text-amber-950 ring-1 ring-amber-200"
                >
                  <Info className="mt-1 size-4 shrink-0 text-amber-700" aria-hidden />
                  <span>
                    {t('cases.stewardship.noOwnLicense', {
                      honorific:
                        item.host?.gender === 'FEMALE'
                          ? t('cases.inquiryHonorificFemale')
                          : t('cases.inquiryHonorificMale'),
                      name: item.host?.fullName || '—',
                      unit: item.host?.businessUnitTitle || '—',
                    })}
                  </span>
                </p>
              ) : (
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.licenseIssued')}
                  value={item.licenseIssuedAt ? <DateText value={item.licenseIssuedAt} /> : '—'}
                  empty={!item.licenseIssuedAt}
                />
                <div className="relative min-w-0">
                  <FormFactTile
                    icon={CalendarClock}
                    label={t('cases.licenseExpires')}
                    value={item.licenseExpiresAt ? <DateText value={item.licenseExpiresAt} /> : '—'}
                    empty={!item.licenseExpiresAt}
                    className={item.licenseNumber && item.status !== 'REVOKED' ? 'pe-24' : ''}
                  />
                  {item.licenseNumber && item.status !== 'REVOKED' ? (
                    <button
                      type="button"
                      onClick={() => void startRequest('RENEWAL')}
                      className="absolute end-2 top-1/2 z-20 inline-flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded-xl bg-mint-500 px-2 py-1 text-[11px] font-medium text-white shadow-[0_3px_8px_rgba(63,214,190,0.35)] transition hover:bg-mint-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    >
                      <RefreshCw className="size-3" aria-hidden />
                      {t('cases.requestTypes.RENEWAL')}
                    </button>
                  ) : null}
                </div>
                <div className="relative min-w-0">
                  <FormFactTile
                    icon={MapPin}
                    label={t('geo.city')}
                    value={item.city ? geoName(item.city) : '—'}
                    empty={!item.city}
                    className="pb-10"
                  />
                  <button
                    type="button"
                    onClick={() => navigate(`/cases/${item.id}/dossier`)}
                    className="absolute end-2 bottom-2 z-20 inline-flex cursor-pointer items-center gap-1 rounded-xl bg-teal-500 px-2 py-1 text-[11px] font-medium text-white shadow-[0_3px_8px_rgba(46,189,182,0.35)] transition hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    <Eye className="size-3" aria-hidden />
                    {t('cases.viewDossier')}
                  </button>
                </div>
              </div>
              )}
              {item.reactivatedAt && item.status !== 'REVOKED' ? (
                <p className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-sm text-teal-950 ring-1 ring-teal-100">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <RotateCcw className="size-4 shrink-0 text-teal-600" aria-hidden />
                    {t('cases.reactivatedAt')}
                  </span>
                  <DateText value={item.reactivatedAt} withTime />
                </p>
              ) : null}
              {violationsOpen && item.person.nationalId ? (
                <PersonViolationsModal
                  nationalId={item.person.nationalId}
                  name={item.person.fullName}
                  onClose={() => setViolationsOpen(false)}
                />
              ) : null}
              {suspensionsOpen ? (
                <CaseSuspensionsDialog
                  name={item.person.fullName}
                  items={item.suspensions}
                  onClose={() => setSuspensionsOpen(false)}
                />
              ) : null}
              {suspendOpen ? <CaseSuspendDialog caseId={item.id} onClose={() => setSuspendOpen(false)} /> : null}
              {liftOpen ? (
                <CaseLiftSuspensionDialog
                  caseId={item.id}
                  startsAt={item.suspensions.find((row) => row.active)?.startsAt ?? ''}
                  onClose={() => setLiftOpen(false)}
                />
              ) : null}
              {revokeOpen ? <CaseRevokeDialog caseId={item.id} onClose={() => setRevokeOpen(false)} /> : null}
            </div>
          </FormCard>

          {item.kind !== 'STEWARDSHIP' ? (
            <CaseStewardsSection caseId={item.id} items={stewardsQuery.data ?? []} />
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
                      onClick={() => navigate(`/cases/${item.id}/stewards/new`)}
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
                        <th className="px-4 py-3 text-start font-medium">{t('cases.issuedOn')}</th>
                        <th className="px-4 py-3 text-center! font-medium">{t('cases.endsOn')}</th>
                        <th className="px-4 py-3 text-start font-medium">{t('cases.listStep')}</th>
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
                          request.type === 'STEWARDSHIP'
                            ? request.status === 'OPEN'
                              ? `/cases/${item.id}/stewardship`
                              : `/cases/${item.id}/stewardship/card`
                            : request.type === 'ISSUANCE'
                            ? caseRequestPath(item.id, item.person.nationalId)
                            : request.type === 'RENEWAL' && request.status !== 'OPEN'
                              ? `/cases/${item.id}/renewal/${request.id}`
                              : request.type === 'LOCATION_CHANGE' && request.status !== 'OPEN'
                                ? `/cases/${item.id}/place-change/${request.id}`
                                : request.status === 'OPEN'
                                  ? `/cases/${item.id}/process`
                                  : `/cases/${item.id}?stay=1`
                        const TypeIcon = REQUEST_TYPE_ICONS[request.type]
                        const typeStyle = REQUEST_TYPE_STYLES[request.type]
                        return (
                          <tr key={request.id} className="border-t border-line">
                            <td className={`border-s-4 px-4 py-3 ${typeStyle.edge}`}>
                              <DateText value={request.createdAt} />
                            </td>
                            <td className="px-4 py-3">
                              <RequestBadge className={typeStyle.badge} large>
                                <TypeIcon className="size-4" aria-hidden />
                                {t(`cases.requestTypes.${request.type}`)}
                              </RequestBadge>
                            </td>
                            <td className="px-4 py-3">
                              <RequestDateCell request={request} part="start" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <RequestDateCell request={request} part="end" />
                            </td>
                            <td className="px-4 py-3">
                              <RequestBadge tone={issued ? 'mint' : 'teal'}>{status}</RequestBadge>
                            </td>
                            <td className={actionsColClassName}>
                              {request.type === 'AUCTION' ? (
                                <EntityRowActions
                                  viewTo={`/cases/${item.id}/auction/${request.id}`}
                                  viewLabel={request.status === 'OPEN' ? t('cases.continueRequest') : t('cases.viewRequest')}
                                  viewClassName={requestActionClassName}
                                  viewIcon={Eye}
                                  editTo={request.status === 'OPEN' ? `/cases/${item.id}/auction/${request.id}/edit` : undefined}
                                  rowOpensView={request.status !== 'OPEN'}
                                  onDelete={
                                    canDeleteRequest(request.status)
                                      ? () => askDeleteRequest(request.id, request.number)
                                      : undefined
                                  }
                                />
                              ) : request.type === 'ISSUANCE' || request.type === 'RENEWAL' || request.type === 'LOCATION_CHANGE' || request.type === 'STEWARDSHIP' ? (
                                <EntityRowActions
                                  viewTo={requestTo}
                                  viewLabel={
                                    issued ||
                                    ((request.type === 'RENEWAL' || request.type === 'LOCATION_CHANGE') &&
                                      request.status !== 'OPEN')
                                      ? t('cases.viewRequest')
                                      : t('cases.continueRequest')
                                  }
                                  viewClassName={requestActionClassName}
                                  viewIcon={Eye}
                                  rowOpensView
                                  extra={
                                    request.type === 'STEWARDSHIP' && item.host ? (
                                      <Link to={`/cases/${item.host.id}`}>
                                        <Button type="button" variant="soft" className={requestActionClassName}>
                                          <BadgeCheck className="size-3.5" aria-hidden />
                                          {t('cases.stewardship.relatedLicense')}
                                        </Button>
                                      </Link>
                                    ) : null
                                  }
                                  onDelete={
                                    request.type !== 'ISSUANCE' && canDeleteRequest(request.status)
                                      ? () => askDeleteRequest(request.id, request.number)
                                      : undefined
                                  }
                                />
                              ) : canDeleteRequest(request.status) ? (
                                <EntityRowActions
                                  viewTo={`/cases/${item.id}?stay=1`}
                                  showView={false}
                                  onDelete={() => askDeleteRequest(request.id, request.number)}
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

          <FormCard icon={ClipboardList} title={t('cases.operationsTitle')}>
            <div className={formCardBodyClassName}>
              {item.kind === 'STEWARDSHIP' ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {item.cardNumber ? (
                    <Button type="button" onClick={() => navigate(`/cases/${item.id}/stewardship/card`)}>
                      <IdCard className="size-4" aria-hidden />
                      {t('cases.stewardship.cardTitle')}
                    </Button>
                  ) : item.status !== 'REVOKED' ? (
                    <Button type="button" onClick={() => navigate(`/cases/${item.id}/stewardship`)}>
                      <IdCard className="size-4" aria-hidden />
                      {t('cases.stewardship.continue')}
                    </Button>
                  ) : null}
                  {item.host ? (
                    <Button type="button" variant="ghost" onClick={() => navigate(`/cases/${item.host?.id}/dossier`)}>
                      <BadgeCheck className="size-4" aria-hidden />
                      {t('cases.viewLicense')}
                    </Button>
                  ) : null}
                </div>
              ) : (
              <CaseOperations
                suspended={item.status === 'SUSPENDED'}
                revoked={item.status === 'REVOKED'}
                stewardTo={`/cases/${item.id}/stewards/new`}
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
                  const startsRequest =
                    key === 'renewLicense' ||
                    key === 'changeLocation' ||
                    key === 'issueAuction' ||
                    key === 'issueStewardship' ||
                    key === 'renewWithLocation' ||
                    key === 'issueServiceCard'
                  if (item.status === 'REVOKED' && startsRequest) {
                    toast.error(t('cases.revokedNoRequest'))
                    return
                  }
                  if (key === 'suspend') {
                    if (item.status === 'REVOKED') {
                      toast.error(t('cases.revokeAlready'))
                      return
                    }
                    if (item.status === 'SUSPENDED') setLiftOpen(true)
                    else setSuspendOpen(true)
                  } else if (key === 'reactivate') {
                    confirmToast({
                      title: t('cases.reactivateConfirm'),
                      confirmLabel: t('common.yes'),
                      cancelLabel: t('common.cancel'),
                      onConfirm: async () => {
                        try {
                          await api.post(`/cases/${id}/reactivation`)
                          toast.success(t('cases.reactivated'))
                          await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
                          await queryClient.invalidateQueries({ queryKey: ['cases', 'list'] })
                        } catch (error) {
                          toast.error(getApiErrorMessage(error, t('common.error')))
                        }
                      },
                    })
                  } else if (key === 'revoke') {
                    if (item.status === 'REVOKED') {
                      toast.error(t('cases.revokeAlready'))
                      return
                    }
                    setRevokeOpen(true)
                  } else if (key === 'renewLicense') void startRequest('RENEWAL')
                  else if (key === 'changeLocation') void startRequest('LOCATION_CHANGE')
                  else if (key === 'issueAuction') openAuction()
                  else toast.message(t('cases.requestTypeLater'))
                }}
              />
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
  stewardTo,
  violationTo,
  suspended,
  revoked,
}: {
  onPick: (key: string) => void
  licenseTo: string | null
  stewardTo: string
  violationTo: string | null
  suspended: boolean
  revoked: boolean
}) {
  const { t } = useTranslation()
  if (revoked) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        <CaseOperationButton
          icon={RotateCcw}
          tone="teal"
          label={t('cases.operations.reactivate')}
          onClick={() => onPick('reactivate')}
        />
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {suspended ? null : (
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
              to={operation.key === 'issueStewardship' ? stewardTo : undefined}
              onClick={() => onPick(operation.key)}
            />
          ))}
        </div>
      )}
      <div
        className={`flex flex-wrap justify-center gap-2 ${suspended ? '' : 'border-t border-dashed border-red-100 pt-3'}`}
      >
        {CASE_SENSITIVE_OPERATIONS.map((operation) => {
          const unsuspend = operation.key === 'suspend' && suspended
          return (
            <CaseOperationButton
              key={operation.key}
              icon={unsuspend ? CirclePlay : operation.icon}
              tone={unsuspend ? 'teal' : operation.tone}
              label={unsuspend ? t('cases.operations.unsuspend') : t(`cases.operations.${operation.key}`)}
              to={operation.key === 'registerViolation' ? violationTo ?? undefined : undefined}
              onClick={() => onPick(operation.key)}
            />
          )
        })}
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
  large = false,
  className,
}: {
  children: ReactNode
  tone?: 'teal' | 'mint'
  large?: boolean
  className?: string
}) {
  const toneClass =
    className ??
    (tone === 'mint'
      ? 'bg-mint-50 text-teal-900 ring-mint-200'
      : 'bg-teal-50 text-teal-900 ring-teal-200')
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ${
        large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
      } ${toneClass}`}
    >
      {children}
    </span>
  )
}

function DateBadge({
  children,
  tone,
  label,
}: {
  children: ReactNode
  tone: 'mint' | 'red' | 'teal'
  label: string
}) {
  const toneClass =
    tone === 'mint'
      ? 'bg-mint-50 text-teal-900 ring-mint-200'
      : tone === 'red'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : 'bg-teal-50 text-teal-900 ring-teal-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${toneClass}`}>
      <span className="sr-only">{label}</span>
      {children}
    </span>
  )
}

function RequestDateCell({ request, part }: { request: CaseRequestRow; part: 'start' | 'end' }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const dated =
    request.type === 'ISSUANCE' || request.type === 'RENEWAL' || request.type === 'STEWARDSHIP'
  const stewardship = request.type === 'STEWARDSHIP'
  const value =
    part === 'start'
      ? request.type === 'AUCTION'
        ? request.auctionStartsAt
        : dated
          ? request.issuedAt
          : null
      : request.type === 'AUCTION'
        ? request.auctionEndsAt
        : dated
          ? request.expiresAt
          : null
  if (!value) return '—'
  const remaining = part === 'end' ? licenseSpan(null, value)?.remaining : null
  const remainingText = remaining == null ? null : formatNumber(remaining, locale)
  const stacked = part === 'end' && remainingText != null
  const endUrgent = remaining != null && remaining < END_DATE_URGENT_DAYS
  const label = stewardship
    ? part === 'start'
      ? t('cases.stewardship.cardIssued')
      : t('cases.stewardship.cardExpires')
    : part === 'start'
      ? t('cases.issuedOn')
      : t('cases.endsOn')
  return (
    <span className={stacked ? 'inline-flex flex-col items-center gap-1' : 'inline-flex flex-wrap items-center gap-1.5'}>
      <DateBadge
        tone={part === 'start' ? 'mint' : endUrgent ? 'red' : 'teal'}
        label={label}
      >
        <DateText value={value} />
      </DateBadge>
      {remainingText != null ? (
        <span
          className="inline-flex min-w-6 items-center justify-center rounded-full bg-mint-50 px-2 py-0.5 text-xs font-semibold text-teal-900 ring-1 ring-mint-200"
          aria-label={`${t('cases.daysRemaining')}: ${remainingText}`}
        >
          {remainingText}
        </span>
      ) : null}
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

const END_DATE_URGENT_DAYS = 30

const requestActionClassName = '!h-8 !gap-1 !rounded-xl !px-2.5 !py-1 !text-xs [&_svg]:size-3.5'

function activityDays(item: CaseHome) {
  const issued = item.requests
    .filter((request) => request.type === 'ISSUANCE' && request.issuedAt)
    .map((request) => request.issuedAt as string)
    .sort()
  const first = issued[0] ?? item.licenseIssuedAt
  if (!first) return null
  const start = isoUtcDay(first)
  const today = isoUtcDay(todayIso())
  if (start == null || today == null) return null
  return Math.max(0, Math.round((today - start) / 86_400_000))
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['violations', 'person', nationalId],
    queryFn: async () =>
      (
        await api.get<Violation[]>('/violations', {
          params: { nationalId, sortBy: 'occurredAt', sortDir: 'desc' },
        })
      ).data,
  })
  const detail = useQuery({
    queryKey: ['violation', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await api.get<Violation>(`/violations/${selectedId}`)).data,
  })
  const items = query.data ?? []

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      event.stopPropagation()
      if (selectedId) setSelectedId(null)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, selectedId])

  const selected = detail.data

  return createPortal(
    <>
      <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink-900/30 p-4 pt-[10vh]" data-nested-dialog>
        <button type="button" className="absolute inset-0 cursor-default" aria-label={t('common.close')} onClick={onClose} />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-person-violations-title"
          className="relative z-10 flex max-h-[min(44rem,88dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
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
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border border-orange-100 bg-white px-3 py-3 text-start transition hover:border-orange-300 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
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
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <footer className="shrink-0 border-t border-orange-100 p-3">
            <Link to={`${violationsPath()}?q=${encodeURIComponent(nationalId)}`} onClick={onClose} className="block">
              <Button type="button" className="w-full">
                <Eye className="size-4" aria-hidden />
                {t('cases.viewAllViolations')}
              </Button>
            </Link>
          </footer>
        </section>
      </div>
      {selectedId ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink-900/40 p-4 pt-[8vh]" data-nested-dialog>
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t('common.close')}
            onClick={() => setSelectedId(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-violation-detail-title"
            className="relative z-10 flex max-h-[min(52rem,92dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-xl"
          >
            <header className="relative shrink-0 overflow-hidden bg-gradient-to-e from-orange-50 via-white to-amber-50 px-5 py-4">
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_8px_16px_rgba(234,88,12,0.28)]">
                    <ShieldAlert className="size-5" aria-hidden />
                  </span>
                  <h2 id="case-violation-detail-title" className="truncate text-sm font-semibold text-ink-900">
                    {t('violations.details')}
                  </h2>
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-xl p-2 text-ink-500 hover:bg-white"
                  onClick={() => setSelectedId(null)}
                  aria-label={t('common.close')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {detail.isLoading || !selected ? <LoadingState /> : null}
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{selected.violationType.title}</p>
                    <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800 ring-1 ring-orange-200">
                      {t(`violationStatuses.${selected.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    <DateText value={selected.occurredAt} />
                  </p>
                  {selected.description ? <p className="text-sm leading-6 text-ink-800">{selected.description}</p> : null}
                  <ViolationAttachmentMedia violationId={selected.id} items={selected.attachments} />
                </>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>,
    document.body,
  )
}

const IMAGE_NAME = /\.(jpe?g|png|gif|webp|bmp)$/i

function isImageAttachment(item: ViolationAttachment) {
  if (item.kind === 'IMAGE') return true
  if (item.mimeType?.toLowerCase().startsWith('image/')) return true
  return IMAGE_NAME.test(item.originalName ?? '')
}

function useApiObjectUrl(href: string | null) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    if (!href) {
      setSrc(undefined)
      return
    }
    let objectUrl: string | undefined
    let cancelled = false
    void api
      .get<Blob>(href, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return
        const header = String(response.headers['content-type'] ?? '')
        const mime = header.split(';')[0].trim() || response.data.type || 'application/octet-stream'
        const blob =
          response.data.type && response.data.type.split(';')[0] === mime
            ? response.data
            : new Blob([response.data], { type: mime })
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc(undefined)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [href])

  return src
}

function ViolationAttachmentMedia({
  violationId,
  items,
}: {
  violationId: string
  items: ViolationAttachment[]
}) {
  const { t } = useTranslation()
  const images = items.filter(isImageAttachment)
  const audios = items.filter((item) => !isImageAttachment(item) && isAudioAttachment(item))
  const others = items.filter((item) => !isImageAttachment(item) && !isAudioAttachment(item))
  if (!items.length) return null
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-ink-500">{t('violations.attachments')}</p>
      {images.length ? (
        <div className="space-y-2">
          {images.map((item) => (
            <ViolationImage
              key={item.id}
              href={`/violations/${violationId}/attachments/${item.id}`}
              name={item.originalName || t('violations.attachments')}
            />
          ))}
        </div>
      ) : null}
      {audios.map((item) => (
        <ViolationAudio
          key={item.id}
          href={`/violations/${violationId}/attachments/${item.id}`}
          label={item.originalName || t('violations.attachmentVoice')}
        />
      ))}
      {others.map((item) => (
        <button
          key={item.id}
          type="button"
          className="flex w-full cursor-pointer items-center gap-2 rounded-2xl bg-orange-50/70 px-3 py-2 text-start text-sm text-orange-900"
          onClick={() => {
            openViolationFile(`/violations/${violationId}/attachments/${item.id}`).catch((error) => {
              toast.error(getApiErrorMessage(error, t('common.error')))
            })
          }}
        >
          <span className="min-w-0 truncate">{item.originalName || t('violations.openAttachment')}</span>
        </button>
      ))}
    </div>
  )
}

function ViolationImage({ href, name }: { href: string; name: string }) {
  const src = useApiObjectUrl(href)
  if (!src) {
    return <div className="h-36 animate-pulse rounded-2xl bg-orange-50" aria-hidden />
  }
  return <img src={src} alt={name} className="max-h-[28rem] w-full rounded-2xl bg-orange-50 object-contain" />
}

function ViolationAudio({ href, label }: { href: string; label: string }) {
  const src = useApiObjectUrl(href)
  return (
    <div className="space-y-1 rounded-2xl bg-orange-50/70 px-3 py-2">
      <p className="truncate text-xs text-ink-600">{label}</p>
      {src ? (
        <audio src={src} controls preload="metadata" className="h-10 w-full" dir="ltr" />
      ) : (
        <div className="h-10 animate-pulse rounded-xl bg-white" aria-hidden />
      )}
    </div>
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
