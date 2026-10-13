import {
  BadgeCheck,
  Ban,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CirclePause,
  Files,
  FolderKanban,
  Hourglass,
  IdCard,
  Info,
  KeyRound,
  MessageSquareText,
  MapPin,
  Phone,
  Send,
  UserRound,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { OpenUserPanelButton } from '../../components/auth/OpenUserPanelButton'
import { SendUserSmsModal } from '../../components/sms/SendUserSmsModal'
import { ChangeUserPasswordModal } from '../../components/users/ChangeUserPasswordModal'
import { DateText } from '../../components/ui/DateText'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  userFormShellClassName,
} from '../../components/ui/Form'
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from '../../components/ui/FormLayout'
import { RoleBadges } from '../../components/ui/RoleBadges'
import { api, getImageUrl } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { ManagedUser } from '../../types/app'
import { FORMATION_STEPS, STEWARDSHIP_STEPS } from '../cases/formation-types'

type GeoCity = { nameFa: string; nameEn: string }

type CaseFileStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED'

type HostLicense = {
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  city: GeoCity | null
  nationalId: string | null
  fullName: string | null
  status?: CaseFileStatus
  revokeReason?: string | null
  revokedAt?: string | null
  revokedBy?: { fullName: string } | null
}

type PersonCase = {
  id: string
  kind?: 'LICENSE' | 'STEWARDSHIP'
  status?: CaseFileStatus
  revokeReason?: string | null
  revokedAt?: string | null
  revokedBy?: { fullName: string } | null
  formationStep: number
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  cardNumber?: string | null
  cardIssuedAt?: string | null
  cardExpiresAt?: string | null
  host?: HostLicense | null
  premiseOwnership: 'OWNED' | 'RENTED' | null
  leaseIssuedAt: string | null
  leaseExpiresAt: string | null
  job: { id: string; title: string; group: { id: string; title: string } | null } | null
  jobTitle: string | null
  city: GeoCity | null
}

export function UserDossierPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const geoName = useGeoName()
  const [smsOpen, setSmsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const userQuery = useQuery({
    queryKey: ['user', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<ManagedUser>(`/users/${id}`)).data,
  })
  const casesQuery = useQuery({
    queryKey: ['cases', 'by-user', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<PersonCase[]>('/cases', { params: { userId: id } })).data,
  })

  const user = userQuery.data
  if (!user) return <LoadingState />

  const cases = Array.isArray(casesQuery.data) ? casesQuery.data : []

  return (
    <div className={userFormShellClassName}>
      <PageHeader
        icon={Files}
        title={t('users.dossier')}
        subtitle={<EntityNameSubtitle name={user.fullName} icon={UserRound} />}
        backTo="/users"
      />
      <div className="space-y-4">
        <FormCard
          icon={UserRound}
          title={user.fullName}
          subtitle={t('users.dossierAccountHint')}
          chips={user.roles?.length ? <RoleBadges roles={user.roles} /> : undefined}
          onClick={() => navigate(`/users/${user.id}`)}
          action={
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <Button type="button" variant="soft" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="size-4" aria-hidden />
                {t('auth.changePassword')}
              </Button>
              <Button type="button" variant="soft" onClick={() => setSmsOpen(true)}>
                <Send className="size-4" aria-hidden />
                {t('sms.send')}
              </Button>
              <OpenUserPanelButton userId={user.id} status={user.status} />
            </div>
          }
        >
          <div className={formCardBodyClassName}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {user.photoId ? (
                <img
                  src={getImageUrl(user.photoId)}
                  alt=""
                  className="size-28 shrink-0 rounded-2xl object-cover ring-1 ring-teal-100"
                />
              ) : null}
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                <FormFactTile icon={IdCard} label={t('users.nationalId')} copyValue={user.nationalId} tone="teal" />
                <FormFactTile icon={Phone} label={t('users.phone')} copyValue={user.phone} tone="mint" />
                <FormFactTile
                  icon={UserRound}
                  label={t('users.gender')}
                  value={user.gender ? t(`userGenders.${user.gender}`) : '—'}
                  empty={!user.gender}
                  tone="ink"
                />
                {user.city ? (
                  <FormFactTile icon={MapPin} label={t('geo.city')} value={geoName(user.city)} tone="teal" />
                ) : null}
              </div>
            </div>
          </div>
        </FormCard>

        <section className="space-y-3">
          <FormSectionTitle icon={Files} className="mb-0">
            {t('users.dossierCases')}
            {!casesQuery.isLoading && !casesQuery.isError ? (
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-100">
                {formatNumber(cases.length, locale)}
              </span>
            ) : null}
          </FormSectionTitle>
          {casesQuery.isLoading ? <LoadingState variant="inline" /> : null}
          {casesQuery.isError ? <FormEmptyHint>{t('common.error')}</FormEmptyHint> : null}
          {!casesQuery.isLoading && !casesQuery.isError && cases.length === 0 ? (
            <FormEmptyHint>{t('users.dossierCasesEmpty')}</FormEmptyHint>
          ) : null}
          {!casesQuery.isLoading && !casesQuery.isError && cases.length > 0 ? (
            <div className={`grid grid-cols-1 gap-4 ${cases.length > 1 ? 'xl:grid-cols-2' : ''}`}>
              {cases.map((item) => (
                <CaseSummaryCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  onOpen={() => navigate(`/cases/${item.id}`)}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
      {smsOpen ? (
        <SendUserSmsModal phone={user.phone} recipientName={user.fullName} onClose={() => setSmsOpen(false)} />
      ) : null}
      {passwordOpen ? (
        <ChangeUserPasswordModal userId={user.id} phone={user.phone} onClose={() => setPasswordOpen(false)} />
      ) : null}
    </div>
  )
}

function CaseSummaryCard({
  item,
  locale,
  onOpen,
}: {
  item: PersonCase
  locale: string
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const steward = item.kind === 'STEWARDSHIP'
  const issued = steward ? Boolean(item.cardNumber) : Boolean(item.licenseNumber)
  const unit = item.jobTitle?.trim() ?? ''
  const job = item.job?.title?.trim() ?? ''
  const group = item.job?.group?.title?.trim() ?? ''
  const title = unit || t('users.dossierCaseFallback')
  const steps = steward ? STEWARDSHIP_STEPS : FORMATION_STEPS
  const headerStatus = steward ? item.host?.status ?? 'ACTIVE' : item.status ?? 'ACTIVE'
  const showHeaderStatus = steward
    ? Boolean(item.host) || headerStatus !== 'ACTIVE'
    : issued || headerStatus !== 'ACTIVE'
  const stewardRevoked = steward && item.status === 'REVOKED'

  return (
    <FormCard
      className={stewardRevoked ? 'h-full ring-2 ring-red-400 hover:!ring-red-400' : 'h-full'}
      headerClassName={stewardRevoked ? '!from-red-100 !via-red-50 !to-red-50' : undefined}
      icon={Briefcase}
      title={title}
      subtitle={
        job || group ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {group ? (
              <CaseHeaderMeta icon={FolderKanban} label={t('cases.activityGroup')} value={group} />
            ) : null}
            {job ? <CaseHeaderMeta icon={Briefcase} label={t('cases.activityJob')} value={job} /> : null}
          </span>
        ) : undefined
      }
      chips={showHeaderStatus ? <CaseStatusChip status={headerStatus} /> : undefined}
      action={
        issued ? (
          <RemainingDaysRing
            issuedAt={steward ? item.cardIssuedAt ?? null : item.licenseIssuedAt}
            expiresAt={steward ? item.cardExpiresAt ?? null : item.licenseExpiresAt}
            locale={locale}
          />
        ) : undefined
      }
      onClick={onOpen}
    >
      <div className={formCardBodyClassName}>
        {steward ? (
          <StewardCaseBody item={item} issued={issued} locale={locale} />
        ) : issued ? (
          <div className="space-y-3">
            {item.status === 'REVOKED' ? <RevokeDetails item={item} /> : null}
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile
                icon={BadgeCheck}
                label={t('cases.licenseNumber')}
                copyValue={item.licenseNumber}
                tone="teal"
              />
              <FormFactTile
                icon={MapPin}
                label={t('geo.city')}
                value={item.city ? geoName(item.city) : '—'}
                empty={!item.city}
                tone="mint"
              />
              <FormFactTile
                icon={CalendarDays}
                label={t('users.dossierLicenseIssued')}
                value={item.licenseIssuedAt ? <DateText value={item.licenseIssuedAt} /> : '—'}
                empty={!item.licenseIssuedAt}
                tone="ink"
              />
              <FormFactTile
                icon={CalendarClock}
                label={t('users.dossierLicenseExpires')}
                value={item.licenseExpiresAt ? <DateText value={item.licenseExpiresAt} /> : '—'}
                empty={!item.licenseExpiresAt}
                tone="teal"
              />
            </div>
            {item.premiseOwnership === 'RENTED' ? (
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={KeyRound}
                  label={t('users.dossierLeaseExpires')}
                  value={item.leaseExpiresAt ? <DateText value={item.leaseExpiresAt} /> : '—'}
                  empty={!item.leaseExpiresAt}
                  tone="mint"
                />
                <div className="flex items-center justify-center rounded-2xl border border-mint-100 bg-gradient-to-b from-mint-50 to-white px-3 py-3">
                  <RemainingDaysRing
                    issuedAt={item.leaseIssuedAt}
                    expiresAt={item.leaseExpiresAt}
                    locale={locale}
                    label={t('users.dossierLeaseDays')}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {item.status === 'REVOKED' ? <RevokeDetails item={item} /> : null}
            <IssuingHint stepLabel={t(`cases.steps.${steps[item.formationStep] ?? steps[0]}`)} />
          </div>
        )}
      </div>
    </FormCard>
  )
}

function StewardCaseBody({ item, issued, locale }: { item: PersonCase; issued: boolean; locale: string }) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const host = item.host
  const city = host?.city ?? null
  const step = STEWARDSHIP_STEPS[item.formationStep] ?? STEWARDSHIP_STEPS[0]

  return (
    <div className="space-y-3">
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-2xl bg-teal-50 px-3 py-3 text-sm font-semibold leading-7 text-teal-900 ring-1 ring-teal-200"
      >
        <Info className="mt-1 size-4 shrink-0 text-teal-600" aria-hidden />
        <span>{t('users.dossierStewardAlert')}</span>
      </div>
      {host?.status === 'REVOKED' ? <RevokeDetails item={host} /> : null}
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile
          icon={BadgeCheck}
          label={t('cases.licenseNumber')}
          copyValue={host?.licenseNumber ?? null}
          tone="teal"
        />
        <FormFactTile
          icon={MapPin}
          label={t('geo.city')}
          value={city ? geoName(city) : '—'}
          empty={!city}
          tone="mint"
        />
        <FormFactTile
          icon={CalendarDays}
          label={t('users.dossierLicenseIssued')}
          value={host?.licenseIssuedAt ? <DateText value={host.licenseIssuedAt} /> : '—'}
          empty={!host?.licenseIssuedAt}
          tone="ink"
        />
        <FormFactTile
          icon={CalendarClock}
          label={t('users.dossierLicenseExpires')}
          value={host?.licenseExpiresAt ? <DateText value={host.licenseExpiresAt} /> : '—'}
          empty={!host?.licenseExpiresAt}
          tone="teal"
        />
        <FormFactTile
          icon={IdCard}
          label={t('users.nationalId')}
          copyValue={host?.nationalId ?? null}
          tone="mint"
        />
        <FormFactTile
          icon={UserRound}
          label={t('cases.stewardship.hostFullName')}
          value={host?.fullName?.trim() || '—'}
          empty={!host?.fullName?.trim()}
          tone="ink"
        />
      </div>
      <FormSectionTitle icon={IdCard} className="mb-0">
        {t('cases.stewardship.cardTitle')}
        <CaseStatusChip status={item.status ?? 'ACTIVE'} />
      </FormSectionTitle>
      {item.status === 'REVOKED' ? <RevokeDetails item={item} /> : null}
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile
          icon={CalendarDays}
          label={t('users.dossierStewardCardIssued')}
          value={item.cardIssuedAt ? <DateText value={item.cardIssuedAt} /> : '—'}
          empty={!item.cardIssuedAt}
          tone="teal"
        />
        <FormFactTile
          icon={CalendarClock}
          label={t('users.dossierStewardCardExpires')}
          value={item.cardExpiresAt ? <DateText value={item.cardExpiresAt} /> : '—'}
          empty={!item.cardExpiresAt}
          tone="mint"
        />
      </div>
      {issued ? null : <IssuingHint stepLabel={t(`cases.steps.${step}`)} />}
      {item.premiseOwnership === 'RENTED' ? (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <FormFactTile
            icon={KeyRound}
            label={t('users.dossierLeaseExpires')}
            value={item.leaseExpiresAt ? <DateText value={item.leaseExpiresAt} /> : '—'}
            empty={!item.leaseExpiresAt}
            tone="mint"
          />
          <div className="flex items-center justify-center rounded-2xl border border-mint-100 bg-gradient-to-b from-mint-50 to-white px-3 py-3">
            <RemainingDaysRing
              issuedAt={item.leaseIssuedAt}
              expiresAt={item.leaseExpiresAt}
              locale={locale}
              label={t('users.dossierLeaseDays')}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function RevokeDetails({
  item,
}: {
  item: {
    revokedAt?: string | null
    revokedBy?: { fullName: string } | null
    revokeReason?: string | null
  }
}) {
  const { t } = useTranslation()
  const reason = item.revokeReason?.trim() ?? ''
  const revokedByName = item.revokedBy?.fullName?.trim() ?? ''
  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      <FormFactTile
        icon={CalendarClock}
        label={t('cases.revokedAt')}
        value={item.revokedAt ? <DateText value={item.revokedAt} withTime /> : '—'}
        empty={!item.revokedAt}
        tone="ink"
      />
      <FormFactTile
        icon={UserRound}
        label={t('cases.revokedBy')}
        value={revokedByName || '—'}
        empty={!revokedByName}
        tone="ink"
      />
      <FormFactTile
        icon={MessageSquareText}
        label={t('cases.revokeNote')}
        value={reason || '—'}
        empty={!reason}
        tone="ink"
        className="sm:col-span-2"
      />
    </div>
  )
}

function CaseHeaderMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase
  label: string
  value: string
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="text-ink-500">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function IssuingHint({ stepLabel }: { stepLabel: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50 to-white px-4 py-8 text-center">
      <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-teal-800">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-[0_8px_16px_rgba(46,189,182,0.28)]">
          <Hourglass className="size-4" aria-hidden />
        </span>
        {t('users.dossierIssuing')}
      </p>
      <p className="animate-issuing-blink text-sm font-semibold text-teal-700">{stepLabel}</p>
    </div>
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

function RemainingDaysRing({
  issuedAt,
  expiresAt,
  locale,
  label,
}: {
  issuedAt: string | null
  expiresAt: string | null
  locale: string
  label?: string
}) {
  const { t } = useTranslation()
  const span = licenseSpan(issuedAt, expiresAt)
  const size = 52
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const ratio = span?.ratio ?? 0
  const dash = circ * ratio
  const daysLabel = span ? formatNumber(span.remaining, locale) : '—'
  const caption = label ?? t('cases.daysRemaining')
  return (
    <div className="flex flex-col items-center gap-1" role="img" aria-label={span ? `${caption}: ${daysLabel}` : caption}>
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
      <span className="max-w-20 text-center text-[9px] font-medium leading-3 text-ink-400">{caption}</span>
    </div>
  )
}

const CASE_STATUS_CHIP: Record<CaseFileStatus, { className: string; icon: typeof BadgeCheck }> = {
  ACTIVE: {
    className: 'bg-teal-500 text-white ring-teal-500',
    icon: BadgeCheck,
  },
  SUSPENDED: {
    className: 'case-suspension-blink bg-amber-50 text-amber-900 ring-amber-200',
    icon: CirclePause,
  },
  REVOKED: {
    className: 'bg-red-50 text-red-800 ring-red-200',
    icon: Ban,
  },
}

function CaseStatusChip({ status }: { status: CaseFileStatus }) {
  const { t } = useTranslation()
  const tone = CASE_STATUS_CHIP[status]
  const Icon = tone.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-1 ps-1 pe-2.5 text-[11px] font-medium ring-1 ${tone.className}`}>
      <Icon className="ms-1 size-3.5" aria-hidden />
      {t(`cases.caseStatuses.${status}`)}
    </span>
  )
}
