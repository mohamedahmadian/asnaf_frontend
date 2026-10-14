import { Children, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  Hash,
  IdCard,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Ruler,
  Signpost,
  Store,
  UserRound,
  Users,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DateText } from '../../components/ui/DateText'
import { FormEmptyHint, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { geoName } from '../../lib/geo'
import type { InquiryDossier, InquiryDossierDocument, InquiryDocumentStats } from './inquiry-types'

type Applicant = {
  fullName: string
  nationalId: string | null
  trackingCode: string | null
  phone: string | null
  unitTitle: string | null
  jobTitle: string | null
} | null

function present(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function digits(value: string | null | undefined, locale: string) {
  const text = present(value)
  return text ? localizeDigits(text, locale) : '—'
}

function text(value: string | null | undefined) {
  return present(value) ?? '—'
}

function IdentitySection({
  icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  const items = Children.toArray(children)
  if (!items.length) return null
  return (
    <section className="space-y-3">
      <FormSectionTitle icon={icon}>{title}</FormSectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">{items}</div>
    </section>
  )
}

function DocumentStatBadge({
  label,
  value,
  locale,
  tone = 'teal',
}: {
  label: string
  value: number
  locale: string
  tone?: 'teal' | 'amber'
}) {
  const pill = tone === 'amber' ? 'bg-amber-500' : 'bg-teal-500'
  const ring = tone === 'amber' ? 'ring-amber-200' : 'ring-teal-200'
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink-700 shadow-[0_6px_16px_rgba(46,189,182,0.12)] ring-1 ${ring}`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${pill}`}>
        {formatNumber(value, locale)}
      </span>
    </span>
  )
}

function DocumentStats({ stats, locale }: { stats: InquiryDocumentStats; locale: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <DocumentStatBadge label={t('cases.inquiryDocsFixed')} value={stats.fixedTotal} locale={locale} />
      <DocumentStatBadge label={t('cases.inquiryDocsJob')} value={stats.jobTotal} locale={locale} />
      <DocumentStatBadge label={t('cases.inquiryDocsUploaded')} value={stats.uploaded} locale={locale} />
      {stats.remaining > 0 ? (
        <DocumentStatBadge label={t('cases.inquiryDocsRemaining')} value={stats.remaining} locale={locale} tone="amber" />
      ) : null}
    </div>
  )
}

function DossierDocuments({
  inquiryId,
  apiBase,
  documents,
  stats,
  locale,
}: {
  inquiryId: string
  apiBase: string
  documents: InquiryDossierDocument[]
  stats: InquiryDocumentStats
  locale: string
}) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState(() => documents[0]?.id ?? '')

  useEffect(() => {
    if (documents.some((item) => item.id === activeId)) return
    setActiveId(documents[0]?.id ?? '')
  }, [activeId, documents])

  if (documents.length === 0) {
    return (
      <div className="space-y-5">
        <DocumentStats stats={stats} locale={locale} />
        <FormEmptyHint>{t('cases.inquiryDocumentsEmpty')}</FormEmptyHint>
      </div>
    )
  }

  const active = documents.find((item) => item.id === activeId) ?? documents[0]

  return (
    <div className="space-y-4">
      <DocumentStats stats={stats} locale={locale} />
      <div role="tablist" aria-label={t('cases.documentsTab')} className="flex flex-wrap gap-2">
        {documents.map((item) => {
          const selected = item.id === active?.id
          const uploaded = Boolean(item.file)
          const missingRequired = item.isRequired && !uploaded
          const tabTone = missingRequired
            ? selected
              ? 'border-2 border-red-300 bg-red-100 text-red-800'
              : 'border border-red-200 bg-red-50 text-red-700'
            : uploaded
              ? selected
                ? 'border-2 border-emerald-400 bg-emerald-100 text-emerald-800'
                : 'border border-emerald-300 bg-emerald-50 text-emerald-800'
              : selected
                ? 'bg-teal-500 bg-[linear-gradient(to_inline-end,var(--color-teal-500),var(--color-mint-500))] text-white'
                : 'border border-teal-400 bg-white text-ink-700'
          return (
            <button
              key={item.id}
              id={`inquiry-doc-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`inquiry-doc-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${tabTone}`}
              onClick={() => setActiveId(item.id)}
            >
              <span>{item.title}</span>
              {item.isRequired ? (
                <span className={uploaded ? 'text-emerald-600' : selected && !missingRequired ? 'text-white' : 'text-red-500'} aria-hidden>
                  *
                </span>
              ) : null}
              {item.isRequired ? <span className="sr-only">{t('cases.documentRequired')}</span> : null}
              {uploaded ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
            </button>
          )
        })}
      </div>
      {active ? (
        <div
          id={`inquiry-doc-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`inquiry-doc-tab-${active.id}`}
          className="rounded-2xl border border-teal-100 bg-cream-50/60 p-4"
        >
          <DossierDocumentCard inquiryId={inquiryId} apiBase={apiBase} item={active} featured />
        </div>
      ) : null}
    </div>
  )
}

function DossierDocumentCard({
  inquiryId,
  apiBase,
  item,
  featured = false,
}: {
  inquiryId: string
  apiBase: string
  item: InquiryDossierDocument
  featured?: boolean
}) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [enlarged, setEnlarged] = useState(false)
  const file = item.file
  const isImage = Boolean(file?.mimeType.startsWith('image/'))
  const missingRequired = item.isRequired && !file

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl(undefined)
      return
    }
    let cancelled = false
    let url = ''
    void api
      .get<Blob>(`${apiBase}/${inquiryId}/documents/${file.id}`, { responseType: 'blob' })
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
  }, [apiBase, file, inquiryId, isImage])

  useEffect(() => {
    if (!enlarged) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setEnlarged(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enlarged])

  async function openFile() {
    if (!file) return
    if (isImage && previewUrl) {
      setEnlarged(true)
      return
    }
    const { data } = await api.get<Blob>(`${apiBase}/${inquiryId}/documents/${file.id}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <article
      className={`flex flex-col items-center ${
        featured
          ? ''
          : `rounded-2xl border p-3 ${
              missingRequired ? 'inquiry-doc-missing border-red-200/70 bg-red-50/40' : 'border-teal-100 bg-cream-50/60'
            }`
      }`}
    >
      {previewUrl ? (
        <button
          type="button"
          className={`flex w-full cursor-pointer items-center justify-center ${featured ? 'min-h-64' : 'h-44'}`}
          aria-label={t('cases.inquiryDocEnlarge')}
          onClick={() => void openFile()}
        >
          <img
            src={previewUrl}
            alt=""
            className={`max-w-full object-contain ${featured ? 'mx-auto max-h-[28rem] w-full max-w-3xl rounded-2xl' : 'max-h-44'}`}
          />
        </button>
      ) : file ? (
        <button type="button" className="cursor-pointer text-xs text-teal-700" onClick={() => void openFile()}>
          <Paperclip className="mx-auto mb-1 size-4" aria-hidden />
          {t('cases.inquiryViewFile')}
        </button>
      ) : (
        <p className="text-xs text-ink-400">{t('cases.inquiryDocumentMissing')}</p>
      )}
      <p className={`${previewUrl || file ? 'mt-2' : 'mt-1'} text-center text-sm font-semibold text-ink-900`}>{item.title}</p>
      <span
        className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
          item.isRequired ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-cream-100 text-ink-600 ring-line'
        }`}
      >
        {item.isRequired ? t('cases.documentRequired') : t('cases.documentOptional')}
      </span>
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

export function CaseInquiryDossier({
  inquiryId,
  apiBase = '/cases/inquiries',
  tab,
  createdAt,
  createdAtLabel = 'cases.inquiryCreatedAt',
  applicant,
}: {
  inquiryId: string
  apiBase?: string
  tab: string
  createdAt: string
  createdAtLabel?: string
  applicant: Applicant
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const query = useQuery({
    queryKey: ['cases', 'inquiry-dossier', apiBase, inquiryId],
    enabled: Boolean(inquiryId),
    queryFn: async () => (await api.get<InquiryDossier>(`${apiBase}/${inquiryId}/dossier`)).data,
  })
  const dossier = query.data

  if (tab === 'documents') {
    if (query.isLoading) return <LoadingState />
    if (!dossier) return <p className="text-sm text-ink-500">{t('cases.inquiryDossierFailed')}</p>
    return (
      <DossierDocuments
        inquiryId={inquiryId}
        apiBase={apiBase}
        documents={dossier.documents}
        stats={dossier.documentStats}
        locale={locale}
      />
    )
  }

  if (tab === 'location') {
    if (query.isLoading) return <LoadingState />
    if (!dossier) return <p className="text-sm text-ink-500">{t('cases.inquiryDossierFailed')}</p>
    const place = dossier.location
    const cityLabel = place.city
      ? place.province
        ? `${geoName(place.city, locale)}، ${geoName(place.province, locale)}`
        : geoName(place.city, locale)
      : '—'
    const complexLabel = place.complex
      ? locale === 'en' || locale === 'hi'
        ? place.complex.nameEn || place.complex.name
        : place.complex.name || place.complex.nameEn
      : '—'
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <FormSectionTitle icon={MapPin}>{t('cases.locationSections.place')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={MapPin} label={t('cases.premiseCity')} value={cityLabel} />
            <FormFactTile
              icon={Store}
              label={t('cases.establishment')}
              value={place.establishment ? t(`cases.establishments.${place.establishment}`) : '—'}
            />
            {place.establishment === 'COMMERCIAL_COMPLEX' || place.complex ? (
              <FormFactTile icon={Building2} label={t('cases.complex')} value={complexLabel} />
            ) : null}
            <FormFactTile icon={MapPin} label={t('cases.premiseAddress')} value={text(place.address)} className="sm:col-span-2" />
            <FormFactTile
              icon={MapPin}
              label={t('cases.premiseAddressEn')}
              value={place.addressEn ? <span dir="ltr">{place.addressEn}</span> : '—'}
              empty={!place.addressEn}
              className="sm:col-span-2"
            />
            <FormFactTile icon={Building2} label={t('cases.floor')} value={text(place.floor)} />
            <FormFactTile icon={Hash} label={t('cases.plaqueSeries')} value={digits(place.plaqueSeries, locale)} />
            <FormFactTile icon={Hash} label={t('cases.plaque')} value={digits(place.plaque, locale)} />
            <FormFactTile icon={Hash} label={t('cases.unitNo')} value={digits(place.unitNo, locale)} />
          </div>
        </section>
        <section className="space-y-3">
          <FormSectionTitle icon={Phone}>{t('cases.locationSections.contact')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Phone} label={t('cases.premisePhone')} value={digits(place.phone, locale)} />
            <FormFactTile icon={Phone} label={t('cases.premiseFax')} value={digits(place.fax, locale)} />
            <FormFactTile icon={Hash} label={t('cases.premisePostalCode')} value={digits(place.postalCode, locale)} />
          </div>
        </section>
        <section className="space-y-3">
          <FormSectionTitle icon={Signpost}>{t('cases.locationSections.position')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Landmark} label={t('cases.registrationPlace')} value={text(place.registrationPlace)} />
            <FormFactTile
              icon={Signpost}
              label={t('cases.geoPosition')}
              value={place.geoPosition ? t(`cases.geoPositions.${place.geoPosition}`) : '—'}
            />
            <FormFactTile
              icon={Users}
              label={t('cases.publicAccess')}
              value={place.publicAccess ? t(`cases.publicAccesses.${place.publicAccess}`) : '—'}
            />
          </div>
        </section>
        <section className="space-y-3">
          <FormSectionTitle icon={KeyRound}>{t('cases.locationSections.ownership')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={KeyRound}
              label={t('cases.ownership')}
              value={place.ownership ? t(`cases.ownerships.${place.ownership}`) : '—'}
            />
            <FormFactTile icon={Ruler} label={t('cases.buildingArea')} value={digits(place.area, locale)} />
            <FormFactTile icon={FileText} label={t('cases.deedNo')} value={digits(place.deedNo, locale)} />
          </div>
        </section>
        {place.ownership === 'RENTED' ? (
          <section className="space-y-3">
            <FormSectionTitle icon={FileText}>{t('cases.locationSections.lease')}</FormSectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={CalendarDays} label={t('cases.leaseIssuedAt')} value={<DateText value={place.leaseIssuedAt} />} />
              <FormFactTile icon={CalendarDays} label={t('cases.leaseExpiresAt')} value={<DateText value={place.leaseExpiresAt} />} />
              <FormFactTile icon={Store} label={t('cases.leaseAgency')} value={text(place.leaseAgency)} />
              <FormFactTile icon={Users} label={t('cases.ownerName')} value={text(place.ownerName)} />
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  const person = dossier?.person
  const fullName = present(applicant?.fullName) ?? present(person ? `${person.firstName} ${person.lastName}` : null)
  const nationalId = present(applicant?.nationalId ?? person?.nationalId)
  const phone = present(applicant?.phone ?? person?.phone)
  const jobTitle = present(applicant?.jobTitle ?? person?.activityJobTitle)
  const unitTitle = present(applicant?.unitTitle ?? person?.unitTitle)
  const religion =
    person?.religion === 'OTHER'
      ? present(person.religionOther)
      : person?.religion
        ? t(`religions.${person.religion}`)
        : null
  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {fullName ? <FormFactTile icon={UserRound} label={t('users.fullName')} value={fullName} /> : null}
        {nationalId ? <FormFactTile icon={FileText} label={t('users.nationalId')} copyValue={nationalId} /> : null}
        {present(applicant?.trackingCode) ? (
          <FormFactTile icon={Hash} label={t('cases.trackingCode')} copyValue={applicant?.trackingCode} />
        ) : null}
        {phone ? <FormFactTile icon={Phone} label={t('users.phone')} copyValue={phone} /> : null}
        {jobTitle ? <FormFactTile icon={Briefcase} label={t('cases.activityJob')} value={jobTitle} /> : null}
        {unitTitle ? <FormFactTile icon={Building2} label={t('cases.unitTitle')} value={unitTitle} /> : null}
        {createdAt ? (
          <FormFactTile icon={Calendar} label={t(createdAtLabel)} value={<DateText value={createdAt} withTime />} />
        ) : null}
      </div>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <p className="text-sm text-ink-500">{t('cases.inquiryDossierFailed')}</p> : null}
      {person ? (
        <>
          <IdentitySection icon={UserRound} title={t('cases.identitySections.personal')}>
            {present(person.fatherName) ? (
              <FormFactTile icon={Users} label={t('cases.fatherName')} value={person.fatherName} />
            ) : null}
            {present(person.lastNameEn) ? (
              <FormFactTile icon={UserRound} label={t('cases.lastNameEn')} value={person.lastNameEn} />
            ) : null}
            {person.gender ? (
              <FormFactTile icon={UserRound} label={t('users.gender')} value={t(`userGenders.${person.gender}`)} />
            ) : null}
            {religion ? <FormFactTile icon={Landmark} label={t('users.religion')} value={religion} /> : null}
          </IdentitySection>
          <IdentitySection icon={BookOpen} title={t('cases.identitySections.birth')}>
            {present(person.birthDate) ? (
              <FormFactTile icon={CalendarDays} label={t('cases.birthDate')} value={<DateText value={person.birthDate} />} />
            ) : null}
            {present(person.birthPlace) ? (
              <FormFactTile icon={MapPin} label={t('cases.birthPlace')} value={person.birthPlace} />
            ) : null}
            {present(person.identityCertificateNo) ? (
              <FormFactTile
                icon={IdCard}
                label={t('cases.identityCertificateNo')}
                value={digits(person.identityCertificateNo, locale)}
              />
            ) : null}
            {present(person.identityIssuedIn) ? (
              <FormFactTile icon={MapPin} label={t('cases.identityIssuedIn')} value={person.identityIssuedIn} />
            ) : null}
            {person.country ? (
              <FormFactTile icon={Building2} label={t('cases.nationality')} value={geoName(person.country, locale)} />
            ) : null}
          </IdentitySection>
          <IdentitySection icon={IdCard} title={t('cases.identitySections.travel')}>
            {person.residencyStatus ? (
              <FormFactTile
                icon={IdCard}
                label={t('cases.residency')}
                value={person.residencyStatus === 'RESIDENT' ? t('cases.resident') : t('cases.nonResident')}
              />
            ) : null}
            {present(person.passportNumber) ? (
              <FormFactTile icon={IdCard} label={t('cases.passportNumber')} value={digits(person.passportNumber, locale)} />
            ) : null}
            {present(person.nationalCardExpiresAt) ? (
              <FormFactTile
                icon={CalendarDays}
                label={t('cases.nationalCardExpiresAt')}
                value={<DateText value={person.nationalCardExpiresAt} />}
              />
            ) : null}
            {present(person.passportExpiresAt) ? (
              <FormFactTile
                icon={CalendarDays}
                label={t('cases.passportExpiresAt')}
                value={<DateText value={person.passportExpiresAt} />}
              />
            ) : null}
          </IdentitySection>
          <IdentitySection icon={Phone} title={t('cases.identitySections.contact')}>
            {present(person.homePhone) ? (
              <FormFactTile icon={Phone} label={t('cases.homePhone')} value={digits(person.homePhone, locale)} />
            ) : null}
            {present(person.postalCode) ? (
              <FormFactTile icon={MapPin} label={t('cases.postalCode')} value={digits(person.postalCode, locale)} />
            ) : null}
            {present(person.email) ? <FormFactTile icon={Mail} label={t('users.email')} value={person.email} /> : null}
            {present(person.address) ? (
              <FormFactTile icon={MapPin} label={t('users.address')} value={person.address} className="sm:col-span-2" />
            ) : null}
          </IdentitySection>
          <IdentitySection icon={GraduationCap} title={t('cases.identitySections.work')}>
            {person.educationLevel ? (
              <FormFactTile
                icon={GraduationCap}
                label={t('cases.education')}
                value={t(`cases.educationLevels.${person.educationLevel}`)}
              />
            ) : null}
            {present(person.citizenGroup) ? (
              <FormFactTile icon={Landmark} label={t('cases.jobGroup')} value={person.citizenGroup} />
            ) : null}
            {present(person.jobTitle) ? (
              <FormFactTile icon={Briefcase} label={t('cases.job')} value={person.jobTitle} />
            ) : null}
          </IdentitySection>
        </>
      ) : null}
    </div>
  )
}
