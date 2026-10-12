import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Files,
  Fingerprint,
  Hash,
  KeyRound,
  Landmark,
  MapPin,
  MapPinned,
  Phone,
  Ruler,
  ScanSearch,
  ShieldCheck,
  Signpost,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint, FormFactTile, FormMetaChip, FormSectionTitle } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { geoName } from '../../lib/geo'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

type LocationFile = {
  id: string
  originalName: string | null
  mimeType: string
  createdAt: string
}

type PlaceView = {
  city: { nameFa: string; nameEn: string } | null
  complex: { name: string; nameEn: string } | null
  establishment: string | null
  address: string | null
  addressEn: string | null
  floor: string | null
  plaqueSeries: string | null
  plaque: string | null
  unitNo: string | null
  ownership: string | null
  area: string | number | null
  deedNo: string | null
  leaseIssuedAt: string | null
  leaseExpiresAt: string | null
  leaseAgency: string | null
  ownerName: string | null
  phone: string | null
  fax: string | null
  postalCode: string | null
  geoPosition: string | null
  publicAccess: string | null
}

type LocationView = {
  id: string
  number: string
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  completedAt: string | null
  licenseNumber: string | null
  licenseIssuedAt: string | null
  applicantName: string | null
  nationalId: string | null
  jobTitle: string | null
  location: PlaceView | null
  previousLocation: PlaceView | null
  documents: { id: string; title: string; isRequired: boolean; file: LocationFile | null }[]
  inquiries: {
    id: string
    centerName: string
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  }[]
  places: {
    id: string
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  } | null
  management: {
    id: string
    workUnitTitle: string | null
    roleName: string
    displayTitle?: string | null
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  }[]
}

const reviewTone: Record<ReviewStatus, string> = {
  PENDING: 'bg-teal-50 text-teal-900 ring-teal-200',
  APPROVED: 'bg-mint-50 text-teal-900 ring-mint-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
}

const LOCATION_TABS = ['location', 'documents', 'inquiries', 'places', 'management'] as const
type LocationTab = (typeof LOCATION_TABS)[number]

const TAB_ICONS: Record<LocationTab, LucideIcon> = {
  location: MapPinned,
  documents: Files,
  inquiries: ScanSearch,
  places: Landmark,
  management: ShieldCheck,
}

function placeFilled(place: PlaceView | null) {
  if (!place) return false
  return Boolean(
    place.city ||
      place.address?.trim() ||
      place.establishment ||
      place.ownership ||
      place.phone?.trim() ||
      place.postalCode?.trim(),
  )
}

export function CaseLocationDetailPage() {
  const { id = '', requestId = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const [tab, setTab] = useState<LocationTab>('location')
  const query = useQuery({
    queryKey: ['cases', 'place-change', id, requestId],
    enabled: Boolean(id && requestId),
    queryFn: async () => (await api.get<LocationView>(`/cases/${id}/place-change/${requestId}`)).data,
  })

  useEffect(() => {
    if (!query.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(query.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [id, navigate, query.error, query.isError, t])

  const item = query.data

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={MapPinned}
        title={t('cases.locationDetails')}
        subtitle={
          item ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <EntityNameSubtitle icon={MapPinned} label={t('cases.requestNumber')} name={localizeDigits(item.number, locale)} />
              {item.applicantName ? (
                <HeaderBadge icon={UserRound}>
                  <span>{item.applicantName}</span>
                </HeaderBadge>
              ) : null}
              {item.nationalId ? (
                <HeaderBadge icon={Fingerprint}>
                  <span className="text-ink-500">{t('users.nationalId')}</span>
                  <CopyableDigits value={item.nationalId} />
                </HeaderBadge>
              ) : null}
              {item.jobTitle ? (
                <HeaderBadge icon={Briefcase}>
                  <span className="text-ink-500">{t('cases.activityJob')}</span>
                  <span>{item.jobTitle}</span>
                </HeaderBadge>
              ) : null}
              {item.licenseIssuedAt ? (
                <HeaderBadge icon={CalendarDays}>
                  <span className="text-ink-500">{t('cases.listIssued')}</span>
                  <DateText value={item.licenseIssuedAt} />
                </HeaderBadge>
              ) : null}
            </span>
          ) : undefined
        }
        backTo={`/cases/${id}?stay=1`}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard
          icon={MapPinned}
          title={localizeDigits(item.number, locale)}
          chips={
            <>
              <FormMetaChip icon={MapPinned} label={t(`cases.requestStatus.${item.status}`)} />
              {item.licenseNumber ? <FormMetaChip icon={BadgeCheck} copyValue={item.licenseNumber} /> : null}
            </>
          }
        >
          <FormTabs
            tabs={LOCATION_TABS.map((key) => ({
              id: key,
              label: t(`cases.locationSteps.${key}`),
              icon: TAB_ICONS[key],
            }))}
            value={tab}
            onChange={(next) => setTab(next as LocationTab)}
          />
          <div
            role="tabpanel"
            id={`form-panel-${tab}`}
            aria-labelledby={`form-tab-${tab}`}
            className="space-y-6 p-5 sm:p-6"
          >
            {tab === 'location' ? <LocationPanel item={item} locale={locale} /> : null}
            {tab === 'documents' ? <DocumentsPanel item={item} /> : null}
            {tab === 'inquiries' ? <InquiriesPanel item={item} /> : null}
            {tab === 'places' ? <PlacesPanel item={item} /> : null}
            {tab === 'management' ? <ManagementPanel item={item} /> : null}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}

function LocationPanel({ item, locale }: { item: LocationView; locale: string }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <FormFactTile icon={CalendarClock} label={t('cases.requestDate')} value={<DateText value={item.createdAt} withTime />} />
        {item.completedAt ? (
          <FormFactTile
            icon={CalendarClock}
            label={t('cases.renewalCompletedAt')}
            value={<DateText value={item.completedAt} withTime />}
            tone="mint"
          />
        ) : null}
      </div>
      <section className="space-y-3">
        <FormSectionTitle icon={MapPinned}>{t('cases.locationNewTitle')}</FormSectionTitle>
        {placeFilled(item.location) && item.location ? (
          <PlaceFacts place={item.location} locale={locale} />
        ) : (
          <FormEmptyHint>{t('cases.locationViewNoPlace')}</FormEmptyHint>
        )}
      </section>
      <section className="space-y-3">
        <FormSectionTitle icon={MapPin}>{t('cases.locationPreviousTitle')}</FormSectionTitle>
        {placeFilled(item.previousLocation) && item.previousLocation ? (
          <PlaceFacts place={item.previousLocation} locale={locale} />
        ) : (
          <FormEmptyHint>{t('cases.locationViewNoPrevious')}</FormEmptyHint>
        )}
      </section>
    </>
  )
}

function PlaceFacts({ place, locale }: { place: PlaceView; locale: string }) {
  const { t } = useTranslation()
  const rented = place.ownership === 'RENTED'
  const complexName = place.complex
    ? locale === 'en' || locale === 'hi'
      ? place.complex.nameEn || place.complex.name
      : place.complex.name || place.complex.nameEn
    : null
  const area =
    place.area == null || place.area === '' || Number.isNaN(Number(place.area)) ? null : formatNumber(Number(place.area), locale)

  return (
    <div className="space-y-6">
      <LocationFacts icon={MapPin} title={t('cases.locationSections.place')}>
        <FormFactTile icon={MapPin} label={t('cases.premiseCity')} value={place.city ? geoName(place.city, locale) : '—'} empty={!place.city} />
        <FormFactTile
          icon={Store}
          label={t('cases.establishment')}
          value={place.establishment ? t(`cases.establishments.${place.establishment}`) : '—'}
          empty={!place.establishment}
          tone="mint"
        />
        {place.establishment === 'COMMERCIAL_COMPLEX' ? (
          <FormFactTile icon={Building2} label={t('cases.complex')} value={complexName || '—'} empty={!complexName} />
        ) : null}
        <FormFactTile className="sm:col-span-2" icon={MapPin} label={t('cases.premiseAddress')} value={place.address?.trim() || '—'} empty={!place.address?.trim()} />
        <FormFactTile className="sm:col-span-2" icon={MapPin} label={t('cases.premiseAddressEn')} value={place.addressEn?.trim() || '—'} empty={!place.addressEn?.trim()} tone="mint" />
        <FormFactTile icon={Hash} label={t('cases.floor')} value={shownDigits(place.floor, locale) || '—'} empty={!place.floor?.trim()} />
        <FormFactTile icon={Hash} label={t('cases.plaqueSeries')} value={shownDigits(place.plaqueSeries, locale) || '—'} empty={!place.plaqueSeries?.trim()} tone="mint" />
        <FormFactTile icon={Hash} label={t('cases.plaque')} value={shownDigits(place.plaque, locale) || '—'} empty={!place.plaque?.trim()} />
        <FormFactTile icon={Hash} label={t('cases.unitNo')} value={shownDigits(place.unitNo, locale) || '—'} empty={!place.unitNo?.trim()} tone="mint" />
      </LocationFacts>
      <LocationFacts icon={KeyRound} title={t('cases.locationSections.ownership')}>
        <FormFactTile
          icon={KeyRound}
          label={t('cases.ownership')}
          value={place.ownership ? t(`cases.ownerships.${place.ownership}`) : '—'}
          empty={!place.ownership}
        />
        <FormFactTile icon={Ruler} label={t('cases.buildingArea')} value={area || '—'} empty={!area} tone="mint" />
        <FormFactTile icon={FileText} label={t('cases.deedNo')} value={shownDigits(place.deedNo, locale) || '—'} empty={!place.deedNo?.trim()} />
      </LocationFacts>
      {rented ? (
        <LocationFacts icon={FileText} title={t('cases.locationSections.lease')}>
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
          <FormFactTile icon={Store} label={t('cases.leaseAgency')} value={place.leaseAgency?.trim() || '—'} empty={!place.leaseAgency?.trim()} />
          <FormFactTile icon={Users} label={t('cases.ownerName')} value={place.ownerName?.trim() || '—'} empty={!place.ownerName?.trim()} tone="mint" />
        </LocationFacts>
      ) : null}
      <LocationFacts icon={Phone} title={t('cases.locationSections.contact')}>
        <FormFactTile icon={Phone} label={t('cases.premisePhone')} value={shownDigits(place.phone, locale) || '—'} empty={!place.phone?.trim()} />
        <FormFactTile icon={Phone} label={t('cases.premiseFax')} value={shownDigits(place.fax, locale) || '—'} empty={!place.fax?.trim()} tone="mint" />
        <FormFactTile icon={Hash} label={t('cases.premisePostalCode')} value={shownDigits(place.postalCode, locale) || '—'} empty={!place.postalCode?.trim()} />
      </LocationFacts>
      <LocationFacts icon={Signpost} title={t('cases.locationSections.position')}>
        <FormFactTile
          icon={Signpost}
          label={t('cases.geoPosition')}
          value={place.geoPosition ? t(`cases.geoPositions.${place.geoPosition}`) : '—'}
          empty={!place.geoPosition}
        />
        <FormFactTile
          icon={Users}
          label={t('cases.publicAccess')}
          value={place.publicAccess ? t(`cases.publicAccesses.${place.publicAccess}`) : '—'}
          empty={!place.publicAccess}
          tone="mint"
        />
      </LocationFacts>
    </div>
  )
}

function LocationFacts({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <FormSectionTitle icon={icon}>{title}</FormSectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">{children}</div>
    </section>
  )
}

function shownDigits(value: string | null | undefined, locale: string) {
  const text = value?.trim()
  return text ? localizeDigits(text, locale) : null
}

function DocumentsPanel({ item }: { item: LocationView }) {
  const { t } = useTranslation()
  if (!item.documents.length) return <FormEmptyHint>{t('cases.locationViewNoDocuments')}</FormEmptyHint>
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {item.documents.map((document) => (
        <article key={document.id} className="space-y-2 rounded-2xl border border-teal-100 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-900">{document.title}</h3>
            <span className="text-xs text-ink-500">
              {document.isRequired ? t('cases.documentRequired') : t('cases.documentOptional')}
            </span>
          </div>
          {document.file ? (
            <LocationDocumentFile file={document.file} />
          ) : (
            <p className="text-sm text-ink-500">{t('cases.inquiryDocumentMissing')}</p>
          )}
        </article>
      ))}
    </div>
  )
}

function InquiriesPanel({ item }: { item: LocationView }) {
  const { t } = useTranslation()
  if (!item.inquiries.length) return <FormEmptyHint>{t('cases.locationViewNoInquiries')}</FormEmptyHint>
  return (
    <div className="space-y-3">
      {item.inquiries.map((row) => (
        <ReviewCard
          key={row.id}
          title={row.centerName}
          status={row.status}
          note={row.note}
          decidedAt={row.decidedAt}
          decidedByName={row.decidedByName}
        />
      ))}
    </div>
  )
}

function PlacesPanel({ item }: { item: LocationView }) {
  const { t } = useTranslation()
  if (!item.places) return <FormEmptyHint>{t('cases.locationViewNoPlaces')}</FormEmptyHint>
  return (
    <ReviewCard
      title={t('cases.locationSteps.places')}
      status={item.places.status}
      note={item.places.note}
      decidedAt={item.places.decidedAt}
      decidedByName={item.places.decidedByName}
    />
  )
}

function ManagementPanel({ item }: { item: LocationView }) {
  const { t } = useTranslation()
  if (!item.management.length) return <FormEmptyHint>{t('cases.locationViewNoManagement')}</FormEmptyHint>
  return (
    <div className="space-y-3">
      {item.management.map((row) => (
        <ReviewCard
          key={row.id}
          title={row.displayTitle || row.workUnitTitle || row.roleName}
          subtitle={row.displayTitle ? [row.workUnitTitle, row.roleName].filter(Boolean).join(' · ') : row.roleName}
          status={row.status}
          note={row.note}
          decidedAt={row.decidedAt}
          decidedByName={row.decidedByName}
        />
      ))}
    </div>
  )
}

function HeaderBadge({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      {children}
    </span>
  )
}

function ReviewCard({
  title,
  subtitle,
  status,
  note,
  decidedAt,
  decidedByName,
}: {
  title: string
  subtitle?: string
  status: ReviewStatus
  note: string | null
  decidedAt: string | null
  decidedByName: string | null
}) {
  const { t } = useTranslation()
  return (
    <article className="space-y-2 rounded-2xl border border-teal-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle ? <p className="text-xs text-ink-500">{subtitle}</p> : null}
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${reviewTone[status]}`}>
          {t(`cases.inquiryStatuses.${status}`)}
        </span>
      </div>
      {decidedByName ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
          <UserRound className="size-4 shrink-0 text-teal-600" aria-hidden />
          <span>{decidedByName}</span>
          {decidedAt ? <DateText value={decidedAt} withTime /> : null}
        </p>
      ) : null}
      {note ? <p className="text-sm leading-7 text-ink-700">{note}</p> : null}
    </article>
  )
}

function LocationDocumentFile({ file }: { file: LocationFile }) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  const image = file.mimeType.startsWith('image/')

  useEffect(() => {
    if (!image) return
    let cancelled = false
    let url = ''
    void api
      .get<Blob>(`/cases/formation/documents/${file.id}/file`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        url = URL.createObjectURL(data)
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file.id, image])

  async function openFile() {
    const { data } = await api.get<Blob>(`/cases/formation/documents/${file.id}/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="space-y-2">
      {file.originalName ? <p className="text-xs text-ink-500">{file.originalName}</p> : null}
      {previewUrl ? <img src={previewUrl} alt="" className="max-h-64 w-full rounded-2xl object-contain" /> : null}
      {!image || failed ? (
        <Button type="button" variant="ghost" onClick={() => void openFile()}>
          <FileText className="size-4" aria-hidden />
          {t('cases.inquiryViewFile')}
        </Button>
      ) : null}
    </div>
  )
}
