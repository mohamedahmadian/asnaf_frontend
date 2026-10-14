import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  Files,
  FolderKanban,
  GraduationCap,
  Hash,
  History,
  IdCard,
  Landmark,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Ruler,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import { Button, DetailActions, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { formatDate, formatNumber, localizeDigits } from '../../lib/datetime'
import { useGeoName } from '../../lib/geo'
import type { Religion, UserGender } from '../../types/app'
import type { CaseActivity, CaseLocation, EducationLevel, PreviousOccupation } from './formation-types'
import { CaseStewardsSection, type StewardRow } from './CaseStewardsSection'
import { useCaseCapabilities } from './case-capabilities'

export function caseDossierPath(id: string) {
  return `/cases/${id}/dossier`
}

type StoredFile = {
  id: string
  originalName: string | null
  mimeType: string
  byteSize: number
  createdAt: string
}

type DossierDocument = {
  documentId: string
  title: string
  isRequired: boolean
  file: StoredFile
}

export type CaseDossier = {
  id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  formationStep: number
  trackingCode: string | null
  canEditCase: boolean
  licenseNumber: string | null
  licenseIssuedAt: string | null
  licenseExpiresAt: string | null
  businessUnitTitle: string | null
  person: {
    id: string
    fullName: string
    firstName: string
    lastName: string
    fatherName: string | null
    lastNameEn: string | null
    gender: UserGender | null
    religion: Religion | null
    religionOther: string | null
    nationalId: string | null
    birthDate: string | null
    residencyStatus: 'RESIDENT' | 'NON_RESIDENT' | null
    passportNumber: string | null
    nationalCardExpiresAt: string | null
    passportExpiresAt: string | null
    identityCertificateNo: string | null
    birthPlace: string | null
    identityIssuedIn: string | null
    countryId: string | null
    phone: string | null
    homePhone: string | null
    postalCode: string | null
    address: string | null
    email: string | null
    educationLevel: EducationLevel | null
    citizenGroup: string | null
    jobId: string | null
    country: { nameFa: string; nameEn: string } | null
    economicJob: { id: string; title: string } | null
  }
  activity: CaseActivity & { jobTypeTitle: string | null }
  location: CaseLocation & {
    city: { nameFa: string; nameEn: string } | null
    complex: { name: string; nameEn: string } | null
    registrationPlaceTitle: string | null
  }
  locationHistory: (CaseLocation & {
    id: string
    startedAt: string | null
    endedAt: string | null
    city: { nameFa: string; nameEn: string } | null
    complex: { name: string; nameEn: string } | null
    registrationPlaceTitle: string | null
  })[]
  identityDocuments: DossierDocument[]
  kind?: 'LICENSE' | 'STEWARDSHIP'
  cardIssuedAt?: string | null
  cardExpiresAt?: string | null
  stewards?: StewardRow[]
  host?: { id: string; licenseNumber: string | null; firstName: string; lastName: string; fullName: string } | null
  requestDocuments: {
    id: string
    type: 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'STEWARDSHIP' | 'AUCTION'
    number: string
    status: string
    createdAt: string
    documents: DossierDocument[]
  }[]
}

const TABS = ['identity', 'activity', 'location', 'documents'] as const
type DossierTab = (typeof TABS)[number]

const TAB_ICONS: Record<DossierTab, LucideIcon> = {
  identity: UserRound,
  activity: Briefcase,
  location: MapPin,
  documents: Paperclip,
}

export function CaseDossierPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const { placesViewer, managementReviewer, issuerViewer } = useCaseCapabilities()
  const visitor = placesViewer || managementReviewer || issuerViewer
  const [tab, setTab] = useState<DossierTab>('identity')
  const query = useQuery({
    queryKey: ['cases', 'dossier', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseDossier>(`/cases/${id}/dossier`)).data,
  })
  const item = query.data
  const steward = item?.kind === 'STEWARDSHIP'
  const editQuery = tab === 'documents' ? 'tab=identity&section=documents' : `tab=${tab}`

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Files}
        title={t('cases.dossierTitle')}
        titleExtra={steward ? <StewardKindBadge /> : undefined}
        subtitle={
          item ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <EntityNameSubtitle icon={UserRound} name={item.person.fullName || t('cases.dossierTitle')} />
              {item.person.nationalId ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <IdCard className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only">{t('users.nationalId')}</span>
                  <CopyableDigits value={item.person.nationalId} />
                </span>
              ) : null}
              {item.person.phone ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                  <Phone className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only">{t('users.phone')}</span>
                  <CopyableDigits value={item.person.phone} />
                </span>
              ) : null}
            </span>
          ) : undefined
        }
        backTo={
          placesViewer
            ? '/cases/places'
            : managementReviewer
              ? '/cases/management-reviews'
              : issuerViewer
                ? '/cases/issuance'
                : `/cases/${id}`
        }
      />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <FormEmptyHint>{t('cases.dossierLoadFailed')}</FormEmptyHint> : null}
      {item ? (
        <FormCard
          icon={Briefcase}
          title={item.businessUnitTitle || item.person.fullName}
          titleExtra={
            !steward && item.licenseNumber ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
                <BadgeCheck className="size-4 shrink-0" aria-hidden />
                <span className="sr-only">{t('cases.licenseNumber')}</span>
                <CopyableDigits value={item.licenseNumber} />
              </span>
            ) : undefined
          }
        >
          <DossierSummary item={item} />
          <FormTabs
            tabs={TABS.map((key) => ({
              id: key,
              label: t(`cases.dossierTabs.${key}`),
              icon: TAB_ICONS[key],
            }))}
            value={tab}
            onChange={(next) => setTab(next as DossierTab)}
          />
          <div className="space-y-6 p-5 sm:p-6" role="tabpanel">
            {tab === 'identity' ? <IdentityPanel item={item} /> : null}
            {tab === 'activity' ? <ActivityPanel item={item} /> : null}
            {tab === 'location' ? <LocationPanel item={item} /> : null}
            {tab === 'documents' ? <DocumentsPanel item={item} /> : null}
            {item.canEditCase && !visitor ? (
              <DetailActions
                editTo={`${caseDossierPath(item.id)}/edit?${editQuery}`}
                editLabel={t('cases.dossierEdit')}
                className="mt-2"
              />
            ) : (
              <FormEmptyHint>{t('cases.dossierEditLocked')}</FormEmptyHint>
            )}
          </div>
        </FormCard>
      ) : null}
      {item && item.kind !== 'STEWARDSHIP' ? (
        <div className="mt-4">
          <CaseStewardsSection caseId={item.id} items={item.stewards ?? []} readOnly={visitor} />
        </div>
      ) : null}
    </div>
  )
}

function StewardKindBadge() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-500 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_4px_10px_rgba(63,214,190,0.28)]">
      <IdCard className="size-3.5 shrink-0" aria-hidden />
      {t('cases.stewardship.kind')}
    </span>
  )
}

function DossierSummary({ item }: { item: CaseDossier }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const steward = item.kind === 'STEWARDSHIP'
  return (
    <div className="grid gap-2 p-5 pb-0 sm:grid-cols-2 sm:gap-3 sm:p-6 sm:pb-0 lg:grid-cols-3">
      <FormFactTile icon={Files} label={t('cases.filterCaseStatus')} value={t(`cases.caseStatuses.${item.status}`)} tone="ink" />
      <FormFactTile
        icon={Hash}
        label={t('cases.trackingCode')}
        value={item.trackingCode || '—'}
        empty={!item.trackingCode}
        tone="teal"
      />
      {steward ? (
        <>
          <div className="flex items-center justify-center rounded-2xl border border-mint-100 bg-gradient-to-b from-mint-50 to-white px-3 py-3">
            <RemainingDaysRing issuedAt={item.cardIssuedAt ?? null} expiresAt={item.cardExpiresAt ?? null} locale={locale} />
          </div>
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.stewardship.cardIssued')}
            value={item.cardIssuedAt ? <DateText value={item.cardIssuedAt} /> : '—'}
            empty={!item.cardIssuedAt}
          />
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.stewardship.cardExpires')}
            value={item.cardExpiresAt ? <DateText value={item.cardExpiresAt} /> : '—'}
            empty={!item.cardExpiresAt}
            tone="mint"
          />
        </>
      ) : (
        <>
          <FormFactTile icon={BadgeCheck} label={t('cases.licenseNumber')} copyValue={item.licenseNumber} tone="mint" />
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.licenseIssued')}
            value={item.licenseIssuedAt ? <DateText value={item.licenseIssuedAt} /> : '—'}
            empty={!item.licenseIssuedAt}
          />
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.licenseExpires')}
            value={item.licenseExpiresAt ? <DateText value={item.licenseExpiresAt} /> : '—'}
            empty={!item.licenseExpiresAt}
            tone="mint"
          />
        </>
      )}
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

function cardSpan(issuedAt: string | null, expiresAt: string | null) {
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
}: {
  issuedAt: string | null
  expiresAt: string | null
  locale: string
}) {
  const { t } = useTranslation()
  const span = cardSpan(issuedAt, expiresAt)
  const size = 52
  const stroke = 5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const ratio = span?.ratio ?? 0
  const dash = circ * ratio
  const daysLabel = span ? formatNumber(span.remaining, locale) : '—'
  const caption = t('cases.daysRemaining')
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
      <span className="max-w-24 text-center text-[11px] font-medium leading-4 text-ink-500">{caption}</span>
    </div>
  )
}

function Section({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <FormSectionTitle icon={icon}>{title}</FormSectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">{children}</div>
    </section>
  )
}

function IdentityPanel({ item }: { item: CaseDossier }) {
  const { t, i18n } = useTranslation()
  const geoName = useGeoName()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const person = item.person
  const religion = person.religion
    ? person.religion === 'OTHER' && person.religionOther
      ? `${t(`religions.${person.religion}`)} (${person.religionOther})`
      : t(`religions.${person.religion}`)
    : '—'
  return (
    <div className="space-y-6">
      <Section icon={UserRound} title={t('cases.identitySections.personal')}>
        <FormFactTile icon={UserRound} label={t('users.firstName')} value={person.firstName} tone="teal" />
        <FormFactTile icon={UserRound} label={t('users.lastName')} value={person.lastName} tone="mint" />
        <FormFactTile icon={UserRound} label={t('cases.fatherName')} value={person.fatherName || '—'} empty={!person.fatherName} />
        <FormFactTile icon={UserRound} label={t('cases.lastNameEn')} value={person.lastNameEn || '—'} empty={!person.lastNameEn} tone="mint" />
        <FormFactTile
          icon={UserRound}
          label={t('users.gender')}
          value={person.gender ? t(`userGenders.${person.gender}`) : '—'}
          empty={!person.gender}
        />
        <FormFactTile icon={Landmark} label={t('users.religion')} value={religion} empty={!person.religion} tone="mint" />
        <FormFactTile icon={IdCard} label={t('users.nationalId')} copyValue={person.nationalId} />
      </Section>
      <Section icon={IdCard} title={t('cases.identitySections.birth')}>
        <FormFactTile
          icon={CalendarDays}
          label={t('cases.birthDate')}
          value={person.birthDate ? <DateText value={person.birthDate} /> : '—'}
          empty={!person.birthDate}
        />
        <FormFactTile icon={MapPin} label={t('cases.birthPlace')} value={person.birthPlace || '—'} empty={!person.birthPlace} tone="mint" />
        <FormFactTile
          icon={IdCard}
          label={t('cases.identityCertificateNo')}
          value={person.identityCertificateNo ? localizeDigits(person.identityCertificateNo, locale) : '—'}
          empty={!person.identityCertificateNo}
        />
        <FormFactTile
          icon={MapPin}
          label={t('cases.identityIssuedIn')}
          value={person.identityIssuedIn || '—'}
          empty={!person.identityIssuedIn}
          tone="mint"
        />
        <FormFactTile
          icon={Building2}
          label={t('cases.nationality')}
          value={person.country ? geoName(person.country) : '—'}
          empty={!person.country}
        />
      </Section>
      <Section icon={IdCard} title={t('cases.identitySections.travel')}>
        <FormFactTile
          icon={IdCard}
          label={t('cases.residency')}
          value={
            person.residencyStatus === 'RESIDENT'
              ? t('cases.resident')
              : person.residencyStatus === 'NON_RESIDENT'
                ? t('cases.nonResident')
                : '—'
          }
          empty={!person.residencyStatus}
        />
        <FormFactTile
          icon={IdCard}
          label={t('cases.passportNumber')}
          value={person.passportNumber ? localizeDigits(person.passportNumber, locale) : '—'}
          empty={!person.passportNumber}
          tone="mint"
        />
        <FormFactTile
          icon={CalendarDays}
          label={t('cases.nationalCardExpiresAt')}
          value={person.nationalCardExpiresAt ? <DateText value={person.nationalCardExpiresAt} /> : '—'}
          empty={!person.nationalCardExpiresAt}
        />
        <FormFactTile
          icon={CalendarDays}
          label={t('cases.passportExpiresAt')}
          value={person.passportExpiresAt ? <DateText value={person.passportExpiresAt} /> : '—'}
          empty={!person.passportExpiresAt}
          tone="mint"
        />
      </Section>
      <Section icon={Phone} title={t('cases.identitySections.contact')}>
        <FormFactTile icon={Phone} label={t('users.phone')} copyValue={person.phone} />
        <FormFactTile
          icon={Phone}
          label={t('cases.homePhone')}
          value={person.homePhone ? localizeDigits(person.homePhone, locale) : '—'}
          empty={!person.homePhone}
          tone="mint"
        />
        <FormFactTile
          icon={MapPin}
          label={t('cases.postalCode')}
          value={person.postalCode ? localizeDigits(person.postalCode, locale) : '—'}
          empty={!person.postalCode}
        />
        <FormFactTile icon={Mail} label={t('users.email')} value={person.email || '—'} empty={!person.email} tone="mint" />
        <FormFactTile
          className="sm:col-span-2"
          icon={MapPin}
          label={t('users.address')}
          value={person.address || '—'}
          empty={!person.address}
        />
      </Section>
      <Section icon={GraduationCap} title={t('cases.identitySections.work')}>
        <FormFactTile
          icon={GraduationCap}
          label={t('cases.education')}
          value={person.educationLevel ? t(`cases.educationLevels.${person.educationLevel}`) : '—'}
          empty={!person.educationLevel}
        />
        <FormFactTile
          icon={FolderKanban}
          label={t('cases.jobGroup')}
          value={person.citizenGroup || '—'}
          empty={!person.citizenGroup}
          tone="mint"
        />
        <FormFactTile
          icon={Briefcase}
          label={t('cases.job')}
          value={person.economicJob?.title || '—'}
          empty={!person.economicJob}
        />
      </Section>
    </div>
  )
}

function ActivityPanel({ item }: { item: CaseDossier }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const activity = item.activity
  const occupation = activity.previousOccupation
    ? t(`cases.previousOccupations.${activity.previousOccupation as PreviousOccupation}`)
    : '—'
  return (
    <Section icon={Briefcase} title={t('cases.dossierTabs.activity')}>
      <FormFactTile icon={Building2} label={t('cases.unitTitle')} value={activity.businessUnitTitle || '—'} empty={!activity.businessUnitTitle} />
      <FormFactTile icon={FolderKanban} label={t('cases.activityGroup')} value={activity.jobGroupTitle || '—'} empty={!activity.jobGroupTitle} tone="mint" />
      <FormFactTile icon={Briefcase} label={t('cases.activityJob')} value={activity.jobTitle || '—'} empty={!activity.jobTitle} />
      <FormFactTile icon={Briefcase} label={t('cases.activityType')} value={activity.jobTypeTitle || '—'} empty={!activity.jobTypeTitle} tone="mint" />
      <FormFactTile icon={Briefcase} label={t('cases.previousJob')} value={occupation} empty={!activity.previousOccupation} />
      <FormFactTile
        icon={CreditCard}
        label={t('cases.posCount')}
        value={activity.posDeviceCount == null ? '—' : formatNumber(activity.posDeviceCount, locale)}
        empty={activity.posDeviceCount == null}
        tone="mint"
      />
    </Section>
  )
}

function LocationPanel({ item }: { item: CaseDossier }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={() => setHistoryOpen(true)}>
          <History className="size-4" aria-hidden />
          {t('cases.viewLocationHistory')}
        </Button>
      </div>
      <PlaceFacts place={item.location} locale={locale} />
      {historyOpen ? (
        <LocationHistoryDialog items={item.locationHistory ?? []} locale={locale} onClose={() => setHistoryOpen(false)} />
      ) : null}
    </div>
  )
}

function PlaceFacts({ place, locale }: { place: CaseDossier['location']; locale: string }) {
  const { t } = useTranslation()
  const geoName = useGeoName()
  const complex =
    place.complex == null
      ? null
      : locale === 'en' || locale === 'hi'
        ? place.complex.nameEn || place.complex.name
        : place.complex.name || place.complex.nameEn
  const rented = place.ownership === 'RENTED'
  return (
    <div className="space-y-6">
      <Section icon={MapPin} title={t('cases.locationSections.place')}>
        <FormFactTile icon={MapPin} label={t('cases.premiseCity')} value={place.city ? geoName(place.city) : '—'} empty={!place.city} />
        <FormFactTile
          icon={Building2}
          label={t('cases.establishment')}
          value={place.establishment ? t(`cases.establishments.${place.establishment}`) : '—'}
          empty={!place.establishment}
          tone="mint"
        />
        {place.establishment === 'COMMERCIAL_COMPLEX' ? (
          <FormFactTile icon={Building2} label={t('cases.complex')} value={complex || '—'} empty={!complex} />
        ) : null}
        <FormFactTile className="sm:col-span-2" icon={MapPin} label={t('cases.premiseAddress')} value={place.address || '—'} empty={!place.address} />
        <FormFactTile className="sm:col-span-2" icon={MapPin} label={t('cases.premiseAddressEn')} value={place.addressEn || '—'} empty={!place.addressEn} tone="mint" />
        <FormFactTile icon={Hash} label={t('cases.plaque')} value={place.plaque ? localizeDigits(place.plaque, locale) : '—'} empty={!place.plaque} />
        <FormFactTile icon={Hash} label={t('cases.plaqueSeries')} value={place.plaqueSeries ? localizeDigits(place.plaqueSeries, locale) : '—'} empty={!place.plaqueSeries} tone="mint" />
        <FormFactTile icon={Hash} label={t('cases.floor')} value={place.floor ? localizeDigits(place.floor, locale) : '—'} empty={!place.floor} />
        <FormFactTile icon={Hash} label={t('cases.unitNo')} value={place.unitNo ? localizeDigits(place.unitNo, locale) : '—'} empty={!place.unitNo} tone="mint" />
      </Section>
      <Section icon={Phone} title={t('cases.locationSections.contact')}>
        <FormFactTile
          icon={MapPin}
          label={t('cases.premisePostalCode')}
          value={place.postalCode ? localizeDigits(place.postalCode, locale) : '—'}
          empty={!place.postalCode}
        />
        <FormFactTile
          icon={Phone}
          label={t('cases.premisePhone')}
          value={place.phone ? localizeDigits(place.phone, locale) : '—'}
          empty={!place.phone}
          tone="mint"
        />
        <FormFactTile
          icon={Phone}
          label={t('cases.premiseFax')}
          value={place.fax ? localizeDigits(place.fax, locale) : '—'}
          empty={!place.fax}
        />
      </Section>
      <Section icon={MapPin} title={t('cases.locationSections.position')}>
        <FormFactTile
          icon={MapPin}
          label={t('cases.geoPosition')}
          value={place.geoPosition ? t(`cases.geoPositions.${place.geoPosition}`) : '—'}
          empty={!place.geoPosition}
        />
        <FormFactTile
          icon={UserRound}
          label={t('cases.publicAccess')}
          value={place.publicAccess ? t(`cases.publicAccesses.${place.publicAccess}`) : '—'}
          empty={!place.publicAccess}
          tone="mint"
        />
        <FormFactTile
          icon={Landmark}
          label={t('cases.registrationPlace')}
          value={place.registrationPlaceTitle || '—'}
          empty={!place.registrationPlaceTitle}
        />
      </Section>
      <Section icon={Ruler} title={t('cases.locationSections.ownership')}>
        <FormFactTile
          icon={Landmark}
          label={t('cases.ownership')}
          value={place.ownership ? t(`cases.ownerships.${place.ownership}`) : '—'}
          empty={!place.ownership}
        />
        <FormFactTile icon={Hash} label={t('cases.deedNo')} value={place.deedNo ? localizeDigits(place.deedNo, locale) : '—'} empty={!place.deedNo} tone="mint" />
        <FormFactTile
          icon={Ruler}
          label={t('cases.buildingArea')}
          value={place.area ? formatNumber(Number(place.area), locale) : '—'}
          empty={!place.area}
          tone="mint"
        />
      </Section>
      {rented ? (
        <Section icon={CalendarDays} title={t('cases.locationSections.lease')}>
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.leaseIssuedAt')}
            value={place.leaseIssuedAt ? <DateText value={place.leaseIssuedAt} /> : '—'}
            empty={!place.leaseIssuedAt}
          />
          <FormFactTile
            icon={CalendarDays}
            label={t('cases.leaseExpiresAt')}
            value={place.leaseExpiresAt ? <DateText value={place.leaseExpiresAt} /> : '—'}
            empty={!place.leaseExpiresAt}
            tone="mint"
          />
          <FormFactTile icon={Building2} label={t('cases.leaseAgency')} value={place.leaseAgency || '—'} empty={!place.leaseAgency} />
          <FormFactTile icon={UserRound} label={t('cases.ownerName')} value={place.ownerName || '—'} empty={!place.ownerName} tone="mint" />
        </Section>
      ) : null}
    </div>
  )
}

function LocationHistoryDialog({
  items,
  locale,
  onClose,
}: {
  items: CaseDossier['locationHistory']
  locale: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  useEffect(() => {
    if (items.some((row) => row.id === activeId)) return
    setActiveId(items[0]?.id ?? '')
  }, [activeId, items])
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat) return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const active = items.find((row) => row.id === activeId) ?? items[0]

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 pt-[8vh]"
      data-nested-dialog
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-history-title"
      onClick={onClose}
    >
      <div className="mb-8 w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <FormCard
          icon={History}
          title={<span id="location-history-title">{t('cases.locationHistoryTitle')}</span>}
          action={
            <Button type="button" variant="ghost" icon className="size-9" onClick={onClose} aria-label={t('common.close')}>
              <X className="size-4" aria-hidden />
            </Button>
          }
        >
          {items.length === 0 ? (
            <div className="p-5 sm:p-6">
              <FormEmptyHint>{t('cases.locationHistoryEmpty')}</FormEmptyHint>
            </div>
          ) : (
            <>
              <FormTabs
                tabs={items.map((row) => ({
                  id: row.id,
                  label: locationHistoryRange(row, locale, t),
                  icon: MapPin,
                }))}
                value={active?.id ?? ''}
                onChange={setActiveId}
              />
              {active ? (
                <div id={`form-panel-${active.id}`} role="tabpanel" aria-labelledby={`form-tab-${active.id}`} className="space-y-4 p-5 sm:p-6">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink-800">
                    <CalendarDays className="size-4 text-teal-600" aria-hidden />
                    <span>{t('cases.locationHistoryFrom')}</span>
                    {active.startedAt ? <DateText value={active.startedAt} /> : '—'}
                    <span>{t('cases.locationHistoryUntil')}</span>
                    {active.endedAt ? <DateText value={active.endedAt} /> : '—'}
                  </p>
                  <PlaceFacts place={active} locale={locale} />
                </div>
              ) : null}
            </>
          )}
        </FormCard>
      </div>
    </div>,
    document.body,
  )
}

function locationHistoryRange(
  row: CaseDossier['locationHistory'][number],
  locale: string,
  t: (key: string) => string,
) {
  const from = row.startedAt ? formatDate(row.startedAt, locale) : '—'
  const until = row.endedAt ? formatDate(row.endedAt, locale) : '—'
  return `${t('cases.locationHistoryFrom')} ${from} ${t('cases.locationHistoryUntil')} ${until}`
}

function DocumentsPanel({ item }: { item: CaseDossier }) {
  const { t } = useTranslation()
  const requests = item.requestDocuments
  const [active, setActive] = useState(() => requests.at(-1)?.id ?? 'identity')
  useEffect(() => {
    if (active === 'identity' || requests.some((request) => request.id === active)) return
    setActive(requests.at(-1)?.id ?? 'identity')
  }, [active, requests])
  const typeCounts = new Map<string, number>()
  for (const request of requests) typeCounts.set(request.type, (typeCounts.get(request.type) ?? 0) + 1)
  const selectedRequest = requests.find((request) => request.id === active)
  const documents = active === 'identity' ? item.identityDocuments : selectedRequest?.documents ?? []

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'identity'}
          className={docTabClass(active === 'identity')}
          onClick={() => setActive('identity')}
        >
          {t('cases.dossierIdentityDocuments')}
        </button>
        {requests.map((request) => {
          const repeated = (typeCounts.get(request.type) ?? 0) > 1
          const label = repeated
            ? `${t(`cases.requestTypes.${request.type}`)} ${request.number}`
            : t(`cases.requestTypes.${request.type}`)
          return (
            <button
              key={request.id}
              type="button"
              role="tab"
              aria-selected={active === request.id}
              className={docTabClass(active === request.id)}
              onClick={() => setActive(request.id)}
            >
              {label}
            </button>
          )
        })}
      </div>
      {selectedRequest ? (
        <p className="text-sm text-ink-500">
          {t('cases.requestNumber')}: {selectedRequest.number}
          {' · '}
          <DateText value={selectedRequest.createdAt} />
        </p>
      ) : null}
      {documents.length === 0 ? (
        <FormEmptyHint>{t('cases.dossierDocumentsEmpty')}</FormEmptyHint>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <DossierDocumentCard key={document.documentId} item={document} />
          ))}
        </div>
      )}
    </div>
  )
}

function docTabClass(selected: boolean) {
  return `inline-flex cursor-pointer items-center rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
    selected
      ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white'
      : 'border border-teal-400 bg-white text-ink-700 hover:bg-teal-50'
  }`
}

function DossierDocumentCard({ item }: { item: DossierDocument }) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [enlarged, setEnlarged] = useState(false)
  const isImage = item.file.mimeType.startsWith('image/')

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(undefined)
      return
    }
    let cancelled = false
    let url = ''
    void api
      .get<Blob>(`/cases/formation/documents/${item.file.id}/file`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        url = URL.createObjectURL(data)
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(undefined)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [isImage, item.file.id])

  async function openFile() {
    if (isImage && previewUrl) {
      setEnlarged(true)
      return
    }
    const { data } = await api.get<Blob>(`/cases/formation/documents/${item.file.id}/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <article className="flex flex-col items-center rounded-2xl border border-teal-100 bg-cream-50/60 p-3">
      {previewUrl ? (
        <button
          type="button"
          className="flex h-44 w-full cursor-pointer items-center justify-center"
          aria-label={t('cases.inquiryDocEnlarge')}
          onClick={() => void openFile()}
        >
          <img src={previewUrl} alt="" className="max-h-44 max-w-full object-contain" />
        </button>
      ) : (
        <button type="button" className="cursor-pointer text-xs text-teal-700" onClick={() => void openFile()}>
          <Paperclip className="mx-auto mb-1 size-4" aria-hidden />
          {t('cases.inquiryViewFile')}
        </button>
      )}
      <p className="mt-2 text-center text-sm font-semibold text-ink-900">{item.title}</p>
      {enlarged && previewUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={t('cases.inquiryDocEnlarge')}
              onClick={() => setEnlarged(false)}
            >
              <img
                src={previewUrl}
                alt={item.title}
                className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </article>
  )
}
