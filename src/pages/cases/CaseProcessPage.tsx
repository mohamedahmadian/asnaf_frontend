import { BadgeCheck, Briefcase, Building2, CalendarClock, CalendarDays, Check, Eye, FileText, Fingerprint, Hash, KeyRound, MapPin, MapPinned, Phone, RefreshCw, Ruler, Signpost, Store, UserRound, Users, X, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { DateText } from '../../components/ui/DateText'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { addYearsIso, formatNumber, localizeDigits } from '../../lib/datetime'
import { geoName } from '../../lib/geo'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex } from '../../types/app'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CaseLocationStep, type LocationSectionKey } from './CaseLocationStep'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import { CasePlacesStep } from './CasePlacesStep'
import type { CaseInquiryRow } from './inquiry-types'
import { emptyLocationForm, type DocumentTypeRow, type LocationForm, type StoredVersion } from './formation-types'
import { AuctionCaseSubtitle, AuctionStepRing } from './AuctionWizard'

const RENEWAL_STEPS = ['terms', 'documents', 'inquiries', 'places', 'management', 'issue'] as const
const LOCATION_STEPS = ['location', 'documents', 'inquiries', 'places', 'management'] as const
type LocationStepName = (typeof LOCATION_STEPS)[number]
const LOCATION_STEP_INDEX: Record<LocationStepName, number> = {
  location: 0,
  documents: 1,
  inquiries: 2,
  places: 3,
  management: 4,
}

const LOCATION_SECTION_FIELDS: Record<LocationSectionKey, (keyof LocationForm)[]> = {
  place: ['cityId', 'establishment', 'complexId', 'address', 'addressEn', 'floor', 'plaqueSeries', 'plaque', 'unitNo'],
  ownership: ['ownership', 'area', 'deedNo'],
  lease: ['leaseIssuedAt', 'leaseExpiresAt', 'leaseAgency', 'ownerName'],
  contact: ['phone', 'fax', 'postalCode'],
  position: ['geoPosition', 'publicAccess'],
}

type CurrentLocation = {
  cityId: string | null
  establishment: string | null
  complexId: string | null
  address: string | null
  addressEn: string | null
  plaque: string | null
  plaqueSeries: string | null
  floor: string | null
  unitNo: string | null
  postalCode: string | null
  phone: string | null
  fax: string | null
  geoPosition: string | null
  publicAccess: string | null
  ownership: string | null
  deedNo: string | null
  area: string | number | null
  leaseIssuedAt: string | null
  leaseExpiresAt: string | null
  leaseAgency: string | null
  ownerName: string | null
  city: { nameFa: string; nameEn: string } | null
  complex: { name: string; nameEn: string } | null
}

type ProcessState = {
  id: string
  caseId: string
  userId: string | null
  number: string
  type: 'RENEWAL' | 'LOCATION_CHANGE'
  formationStep: number
  licenseNumber: string | null
  licenseIssuedAt: string | null
  trackingCode: string | null
  nationalId: string | null
  businessUnitTitle: string | null
  person: { firstName: string; lastName: string; fullName: string } | null
  jobGroupTitle: string | null
  jobTitle: string | null
  contractYears: number
  renewal: {
    currentIssuedAt: string
    currentExpiresAt: string
    nextIssuedAt: string
    nextExpiresAt: string
    delayDays: number
  } | null
  location: LocationForm | null
  currentLocation: CurrentLocation | null
}

function locationFrom(value: CurrentLocation | ProcessState['location']): LocationForm {
  const empty = emptyLocationForm()
  if (!value) return empty
  return {
    ...empty,
    area: value.area == null || value.area === '' ? '' : String(value.area),
    cityId: value.cityId ?? '',
    establishment: value.establishment ?? 'INDEPENDENT',
    complexId: value.complexId ?? '',
    address: value.address ?? '',
    addressEn: value.addressEn ?? '',
    plaque: value.plaque ?? '',
    plaqueSeries: value.plaqueSeries ?? '',
    floor: value.floor ?? '',
    unitNo: value.unitNo ?? '',
    postalCode: value.postalCode ?? '',
    phone: value.phone ?? '',
    fax: value.fax ?? '',
    geoPosition: value.geoPosition ?? '',
    publicAccess: value.publicAccess ?? '',
    registrationPlaceId: 'registrationPlaceId' in value ? (value.registrationPlaceId ?? '') : '',
    ownership: value.ownership ?? 'OWNED',
    deedNo: value.deedNo ?? '',
    leaseIssuedAt: value.leaseIssuedAt ?? '',
    leaseExpiresAt: value.leaseExpiresAt ?? '',
    leaseAgency: value.leaseAgency ?? '',
    ownerName: value.ownerName ?? '',
  }
}

export function CaseProcessPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [location, setLocation] = useState<LocationForm | null>(null)
  const [currentLocationOpen, setCurrentLocationOpen] = useState(false)
  const [viewStep, setViewStep] = useState<number | null>(null)
  const [renewalIssued, setRenewalIssued] = useState('')
  const [renewalExpires, setRenewalExpires] = useState('')
  const renewalDates = useRef({ issued: '', expires: '' })
  const renewalSaved = useRef({ issued: '', expires: '' })
  const renewalTouched = useRef(false)
  const renewalExpiresTouched = useRef(false)
  const renewalSaveTail = useRef(Promise.resolve())
  const process = useQuery({
    queryKey: ['cases', 'process', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<ProcessState>(`/cases/${id}/process`)).data,
  })
  const requirements = useQuery({
    queryKey: ['cases', 'activity-requirements', id, process.data?.type],
    enabled: Boolean(id) && Boolean(process.data?.type),
    queryFn: async () =>
      (
        await api.get<DocumentTypeRow[]>('/cases/formation/activity-requirements', {
          params: { caseId: id, requestType: process.data?.type },
        })
      ).data,
  })
  const stored = useQuery({
    queryKey: ['cases', 'activity-documents', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>('/cases/formation/activity-documents', {
          params: { caseId: id },
        })
      ).data,
  })
  const requestId = process.data?.id
  const inquiries = useQuery({
    queryKey: ['cases', 'formation-inquiries', id, requestId],
    enabled:
      Boolean(id && requestId) &&
      ((process.data?.formationStep ?? 0) >= 2 ||
        (process.data?.type === 'RENEWAL' &&
          requirements.isSuccess &&
          !(requirements.data ?? []).some((row) => row.isRequired) &&
          (process.data?.formationStep ?? 0) >= 1)),
    queryFn: async () =>
      (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { caseId: id, requestId } })).data,
  })
  const placesReview = useQuery({
    queryKey: ['cases', 'formation-places', id, requestId],
    enabled:
      Boolean(id && requestId) &&
      (process.data?.type === 'RENEWAL' || process.data?.type === 'LOCATION_CHANGE') &&
      (process.data?.formationStep ?? 0) >= 3,
    queryFn: async () =>
      (await api.get<CaseInquiryRow | null>('/cases/formation/places', { params: { caseId: id, requestId } })).data,
  })
  const reviews = useQuery({
    queryKey: ['cases', 'formation-management-approvers', id, requestId],
    enabled:
      Boolean(id && requestId) &&
      (process.data?.formationStep ?? 0) >= 4,
    queryFn: async () =>
      (
        await api.get<CaseManagementApproverRow[]>('/cases/formation/management-approvers', {
          params: { caseId: id, requestId },
        })
      ).data,
  })
  const cities = useQuery({
    queryKey: ['cities', 'lookup'],
    enabled: process.data?.type === 'LOCATION_CHANGE',
    queryFn: async () => (await api.get<City[]>('/cities', { params: { activeOnly: true } })).data,
  })
  const complexes = useQuery({
    queryKey: ['commercial-complexes', 'lookup'],
    enabled: process.data?.type === 'LOCATION_CHANGE',
    queryFn: async () => (await api.get<CommercialComplex[]>('/commercial-complexes')).data,
  })

  const item = process.data
  const form = location ?? (item ? locationFrom(item.location) : emptyLocationForm())
  const needsDocuments = requirements.isSuccess && (requirements.data ?? []).some((row) => row.isRequired)
  const wizard = item?.type === 'RENEWAL' || item?.type === 'LOCATION_CHANGE'
  const showDocumentsStep = wizard ? needsDocuments : (requirements.data?.length ?? 0) > 0
  const hideDocuments = wizard && requirements.isSuccess && !needsDocuments
  const wizardSteps =
    item?.type === 'LOCATION_CHANGE'
      ? hideDocuments
        ? LOCATION_STEPS.filter((name) => name !== 'documents')
        : [...LOCATION_STEPS]
      : hideDocuments
        ? RENEWAL_STEPS.filter((name) => name !== 'documents')
        : [...RENEWAL_STEPS]
  function wizardIndex(name: string) {
    if (item?.type === 'LOCATION_CHANGE') return LOCATION_STEP_INDEX[name as LocationStepName]
    return RENEWAL_STEPS.indexOf(name as (typeof RENEWAL_STEPS)[number])
  }
  const reached = item?.formationStep ?? 0
  const progress = hideDocuments && reached === 1 ? 2 : reached
  const serverStep = Math.min(viewStep ?? reached, reached)
  const step = hideDocuments && serverStep === 1 ? 2 : serverStep
  const documentsMissing = useMemo(() => {
    if (requirements.isLoading || stored.isLoading) return false
    const uploaded = new Set((stored.data ?? []).filter((row) => row.current).map((row) => row.documentId))
    return (requirements.data ?? []).some((row) => row.isRequired && !uploaded.has(row.id))
  }, [requirements.data, requirements.isLoading, stored.data, stored.isLoading])

  async function upload(documentId: string, file: File) {
    if (!item?.userId) return
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('userId', item.userId)
      body.append('documentId', documentId)
      body.append('caseId', id)
      body.append('file', prepared)
      await api.post('/cases/formation/documents', body)
      toast.success(t('cases.documentUploaded'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'activity-documents', id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  async function saveDraft() {
    if (!item) return false
    if (
      !form.cityId ||
      !form.address.trim() ||
      form.area === '' ||
      Number.isNaN(Number(form.area)) ||
      (form.establishment === 'COMMERCIAL_COMPLEX' && !form.complexId)
    ) {
      toast.error(t('cases.locationDraftIncomplete'))
      return false
    }
    setBusy(true)
    try {
      const commercialComplex = form.establishment === 'COMMERCIAL_COMPLEX'
      await api.post('/cases/formation/location-draft', {
        caseId: id,
        cityId: form.cityId,
        establishment: form.establishment,
        complexId: commercialComplex ? form.complexId : null,
        address: form.address || null,
        addressEn: form.addressEn || null,
        plaque: form.plaque || null,
        plaqueSeries: form.plaqueSeries || null,
        floor: form.floor || null,
        unitNo: form.unitNo || null,
        postalCode: form.postalCode || null,
        phone: form.phone || null,
        fax: form.fax || null,
        geoPosition: form.geoPosition || null,
        publicAccess: form.publicAccess || null,
        ownership: form.ownership,
        deedNo: form.deedNo || null,
        area: form.area === '' ? null : Number(form.area),
        leaseIssuedAt: form.ownership === 'RENTED' ? form.leaseIssuedAt || null : null,
        leaseExpiresAt: form.ownership === 'RENTED' ? form.leaseExpiresAt || null : null,
        leaseAgency: form.ownership === 'RENTED' ? form.leaseAgency || null : null,
        ownerName: form.ownership === 'RENTED' ? form.ownerName || null : null,
      })
      await process.refetch()
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
      return false
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (renewalTouched.current) return
    const issued = item?.renewal?.nextIssuedAt ?? ''
    const expires = item?.renewal?.nextExpiresAt ?? ''
    if (!issued && !expires) return
    renewalDates.current = { issued, expires }
    renewalSaved.current = { issued, expires }
    setRenewalIssued(issued)
    setRenewalExpires(expires)
  }, [item?.renewal?.nextExpiresAt, item?.renewal?.nextIssuedAt])

  function rememberRenewalDates(issued: string, expires: string) {
    renewalTouched.current = true
    renewalDates.current = { issued, expires }
    setRenewalIssued(issued)
    setRenewalExpires(expires)
  }

  function scheduleRenewalSave(notify: boolean) {
    const task = renewalSaveTail.current.then(async () => {
      const { issued, expires } = renewalDates.current
      if (!issued || !expires) {
        if (notify) toast.error(t('cases.issueLicenseDatesRequired'))
        return false
      }
      if (expires <= issued) {
        if (notify) toast.error(t('cases.issueLicenseDateOrder'))
        return false
      }
      if (issued === renewalSaved.current.issued && expires === renewalSaved.current.expires) return true
      try {
        await api.post('/cases/formation/renewal-dates', {
          caseId: id,
          nextIssuedAt: issued,
          nextExpiresAt: expires,
        })
        renewalSaved.current = { issued, expires }
        if (renewalDates.current.issued === issued && renewalDates.current.expires === expires) {
          await queryClient.invalidateQueries({ queryKey: ['cases', 'process', id] })
        }
        return true
      } catch (error) {
        toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
        return false
      }
    })
    renewalSaveTail.current = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }

  function nextProcessStep(from: number) {
    let next = from + 1
    if ((item?.type === 'RENEWAL' || item?.type === 'LOCATION_CHANGE') && !showDocumentsStep && next === 1) next = 2
    return next
  }

  async function goToStep(index: number) {
    if (index > reached || (hideDocuments && index === 1)) return
    if (item?.type === 'RENEWAL' && (step === 0 || step === 5) && index !== step) {
      const saved = await scheduleRenewalSave(true)
      if (!saved) return
    }
    if (item?.type === 'LOCATION_CHANGE' && step === 0 && index !== step) {
      const saved = await saveDraft()
      if (!saved) return
    }
    setViewStep(index)
  }

  useEffect(() => {
    if ((item?.type !== 'RENEWAL' && item?.type !== 'LOCATION_CHANGE') || !hideDocuments || item.formationStep !== 1) return
    let cancelled = false
    setBusy(true)
    void (async () => {
      try {
        await api.post('/cases/formation/process-step', { caseId: id, step: 2 })
        if (cancelled) return
        setViewStep(null)
        await queryClient.invalidateQueries({ queryKey: ['cases', 'process', id] })
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hideDocuments, id, item?.formationStep, item?.type, queryClient, t])

  async function continueProcess() {
    if (!item) return
    if (item.type === 'RENEWAL' && (serverStep === 0 || serverStep === 5)) {
      const saved = await scheduleRenewalSave(true)
      if (!saved) return
    }
    if (item.type === 'LOCATION_CHANGE' && serverStep === 0) {
      const saved = await saveDraft()
      if (!saved) return
    }
    if (serverStep < reached) {
      setViewStep(Math.min(nextProcessStep(serverStep), reached))
      return
    }
    setBusy(true)
    try {
      const finalStep = item.type === 'RENEWAL' ? 5 : 4
      if (serverStep >= finalStep) {
        await api.post('/cases/formation/complete', { caseId: id, step: finalStep })
        toast.success(item.type === 'RENEWAL' ? t('cases.renewLicenseDone') : t('cases.processCompleted'))
        navigate(`/cases/${id}?stay=1`)
        return
      }
      await api.post('/cases/formation/process-step', { caseId: id, step: nextProcessStep(serverStep) })
      setViewStep(null)
      await process.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const icon = item?.type === 'LOCATION_CHANGE' ? MapPinned : RefreshCw
  const renewal = item?.type === 'RENEWAL'
  const inquiriesPending = (inquiries.data ?? []).some((row) => row.status === 'PENDING')
  const reviewsPending = (reviews.data ?? []).some((row) => row.status === 'PENDING')
  const stepTotal = wizardSteps.length
  const stepCurrent = Math.min(
    wizardSteps.filter((name) => wizardIndex(name) <= progress).length,
    stepTotal,
  )
  const renewalActionLabel =
    step >= 5 ? t('cases.renewActivityLicense') : step === 4 ? t('cases.renewEconomicLicense') : t('cases.processContinue')
  const locationActionLabel = step >= 4 ? t('cases.processComplete') : t('cases.processContinue')
  const wizardContinue = wizard ? (
    <Button
      type="button"
      disabled={
        busy ||
        (step === 1 && (requirements.isLoading || stored.isLoading || documentsMissing)) ||
        (step === 2 && (inquiries.isLoading || inquiriesPending)) ||
        (step === 3 && (placesReview.isLoading || !placesReview.data || placesReview.data.status === 'PENDING')) ||
        (step === 4 && (reviews.isLoading || reviewsPending))
      }
      onClick={() => void continueProcess()}
    >
      <BadgeCheck className="size-4" aria-hidden />
      {renewal ? renewalActionLabel : locationActionLabel}
    </Button>
  ) : null

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={icon}
        title={renewal ? t('cases.renewCurrentLicense') : item ? t(`cases.requestTypes.${item.type}`) : t('cases.newRequest')}
        titleExtra={
          wizard ? (
            <AuctionStepRing
              currentLabel={formatNumber(stepCurrent, locale)}
              totalLabel={formatNumber(stepTotal, locale)}
              ratio={stepTotal ? stepCurrent / stepTotal : 0}
              label={t('cases.stepOf', {
                current: formatNumber(stepCurrent, locale),
                total: formatNumber(stepTotal, locale),
              })}
            />
          ) : undefined
        }
        subtitle={
          renewal && item ? (
            <AuctionCaseSubtitle
              firstName={item.person?.firstName}
              lastName={item.person?.lastName}
              fullName={item.person?.fullName}
              jobTitle={item.jobTitle}
              businessUnitTitle={item.businessUnitTitle}
              licenseNumber={item.licenseNumber}
            />
          ) : item?.type === 'LOCATION_CHANGE' ? (
            <LocationCaseSubtitle item={item} locale={locale} />
          ) : (
            item?.number
          )
        }
        backTo={`/cases/${id}?stay=1`}
      />
      {wizard ? (
        <ol
          className={`mb-5 grid grid-cols-2 gap-2 ${
            wizardSteps.length > 5
              ? 'sm:grid-cols-3 lg:grid-cols-6'
              : wizardSteps.length > 4
                ? 'sm:grid-cols-3 lg:grid-cols-5'
                : wizardSteps.length > 3
                  ? 'sm:grid-cols-4'
                  : 'sm:grid-cols-3'
          }`}
        >
          {wizardSteps.map((name, position) => {
            const index = wizardIndex(name)
            const done = index < progress
            const current = index === progress
            const docsMissing = index === 1 && (done || current) && documentsMissing
            const tone = docsMissing
              ? 'cursor-pointer border-orange-400 bg-white text-ink-800'
              : done
                ? 'cursor-pointer border-emerald-400 bg-white text-ink-800'
                : current
                  ? 'case-step-done-pulse cursor-pointer border-emerald-500 bg-white text-ink-800'
                  : 'cursor-default border-line bg-white text-ink-400'
            return (
              <li key={name}>
                <button
                  type="button"
                  disabled={!done && !current}
                  onClick={() => goToStep(index)}
                  className={`relative flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-center text-sm ${tone} ${
                    index === step && !current ? 'ring-2 ring-teal-300' : ''
                  }`}
                >
                  {done ? (
                    <span className="case-step-check absolute top-1.5 end-1.5 inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                      docsMissing
                        ? 'border-orange-300 bg-orange-50 text-orange-700'
                        : current
                          ? 'case-step-num-pulse border-emerald-500 bg-emerald-500 text-white'
                          : done
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-transparent bg-cream-100 text-ink-700'
                    }`}
                  >
                    {formatNumber(position + 1, locale)}
                  </span>
                  <span className="text-center leading-5">
                    {t(item?.type === 'LOCATION_CHANGE' ? `cases.locationSteps.${name}` : `cases.renewalSteps.${name}`)}
                  </span>
                  {docsMissing ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium leading-4 text-orange-700 ring-1 ring-orange-200">
                      {t('cases.requiredDocumentsPending')}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}
      {process.isLoading ? <LoadingState /> : null}
      {item?.type === 'RENEWAL' && item.renewal && step === 0 ? (
        <FormCard
          icon={CalendarClock}
          title={
            item.businessUnitTitle
              ? `${t('cases.renewalDatesTitle')} (${item.businessUnitTitle})`
              : t('cases.renewalDatesTitle')
          }
          chips={
            item.licenseNumber ? (
              <ProcessBadge
                icon={BadgeCheck}
                label={t('cases.licenseNumber')}
                value={<CopyableDigits value={item.licenseNumber} />}
              />
            ) : undefined
          }
          action={wizardContinue}
        >
          <div className={formCardBodyClassName}>
            <section>
              <FormSectionTitle icon={CalendarClock}>{t('cases.renewalCurrentLicense')}</FormSectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormFactTile icon={CalendarClock} label={t('cases.renewalCurrentIssued')} value={<DateText value={item.renewal.currentIssuedAt} />} />
                <FormFactTile icon={CalendarClock} label={t('cases.renewalCurrentExpires')} value={<DateText value={item.renewal.currentExpiresAt} />} />
                {item.renewal.delayDays > 0 ? (
                  <FormFactTile
                    icon={CalendarClock}
                    label={t('cases.renewalDelay')}
                    value={t('cases.renewalDelayDays', { count: formatNumber(item.renewal.delayDays, locale) })}
                  />
                ) : null}
              </div>
            </section>
            <section>
              <FormSectionTitle icon={RefreshCw}>{t('cases.renewalNextLicense')}</FormSectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField icon={CalendarDays} label={t('cases.renewalNextIssued')} htmlFor="renewal-next-issued">
                  <PersianDateField
                    id="renewal-next-issued"
                    value={renewalIssued || undefined}
                    maxDate={renewalExpires || undefined}
                    onChange={(value) => {
                      const issued = value ?? ''
                      const expires = renewalExpiresTouched.current
                        ? renewalExpires
                        : addYearsIso(issued, item.contractYears || 1)
                      rememberRenewalDates(issued, expires)
                      void scheduleRenewalSave(false)
                    }}
                  />
                </FormField>
                <FormField icon={CalendarDays} label={t('cases.renewalNextExpires')} htmlFor="renewal-next-expires">
                  <PersianDateField
                    id="renewal-next-expires"
                    value={renewalExpires || undefined}
                    minDate={renewalIssued || undefined}
                    onChange={(value) => {
                      renewalExpiresTouched.current = true
                      rememberRenewalDates(renewalIssued, value ?? '')
                      void scheduleRenewalSave(false)
                    }}
                  />
                </FormField>
              </div>
            </section>
          </div>
        </FormCard>
      ) : null}
      {item?.type === 'LOCATION_CHANGE' && step === 0 ? (
        <FormCard
          icon={MapPinned}
          title={t('cases.requestTypes.LOCATION_CHANGE')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setCurrentLocationOpen(true)}>
                <Eye className="size-4" aria-hidden />
                {t('cases.viewCurrentLocation')}
              </Button>
              {wizardContinue}
            </div>
          }
        >
          <div className={formCardBodyClassName}>
            <CaseLocationStep
              value={form}
              cities={cities.data ?? []}
              complexes={complexes.data ?? []}
              places={[]}
              locale={locale}
              hideRegistrationPlace
              onUseCurrentSection={(section) => {
                if (!item.currentLocation) return
                const current = locationFrom(item.currentLocation)
                const patch = Object.fromEntries(
                  LOCATION_SECTION_FIELDS[section].map((key) => [key, current[key]]),
                ) as Partial<LocationForm>
                setLocation({ ...form, ...patch })
                toast.success(t('cases.currentSectionFilled'))
              }}
              onChange={(patch) => setLocation({ ...form, ...patch })}
              onSubmit={() => void continueProcess()}
            />
          </div>
        </FormCard>
      ) : null}
      {item && step === 1 && showDocumentsStep ? (
        <FormCard icon={icon} title={t('cases.activityDocumentsTitle')} action={wizard ? wizardContinue : undefined}>
          <div className={formCardBodyClassName}>
            <CaseDocumentList
              items={requirements.data ?? []}
              stored={stored.data ?? []}
              uploadingId={uploadingId}
              disabled={false}
              layout={wizard ? 'tabs' : 'grid'}
              emphasizeRequired={wizard}
              onFile={(documentId, file) => void upload(documentId, file)}
            />
          </div>
        </FormCard>
      ) : null}
      {item && step === 2 ? (
        <CaseInquiriesStep
          caseId={id}
          items={inquiries.data ?? []}
          loading={inquiries.isLoading}
          autoAdvance={false}
          showAdvance={false}
          headerAction={wizard ? wizardContinue : undefined}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void inquiries.refetch()
          }}
        />
      ) : null}
      {(item?.type === 'RENEWAL' || item?.type === 'LOCATION_CHANGE') && step === 3 ? (
        <CasePlacesStep
          caseId={id}
          item={placesReview.data ?? null}
          loading={placesReview.isLoading}
          autoAdvance={false}
          showAdvance={false}
          headerAction={wizardContinue}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void placesReview.refetch()
          }}
        />
      ) : null}
      {item && step === 4 ? (
        <CaseManagementReviewStep
          caseId={id}
          items={reviews.data ?? []}
          loading={reviews.isLoading}
          autoAdvance={false}
          showAdvance={false}
          headerAction={wizard ? wizardContinue : undefined}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void reviews.refetch()
          }}
        />
      ) : null}
      {item?.type === 'RENEWAL' && item.renewal && step === 5 ? (
        <FormCard icon={BadgeCheck} title={t('cases.renewalSteps.issue')} action={wizardContinue}>
          <div className={formCardBodyClassName}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFactTile
                icon={Store}
                label={t('cases.unitTitle')}
                value={item.businessUnitTitle?.trim() || '—'}
                tone="teal"
              />
              <FormFactTile
                icon={BadgeCheck}
                label={t('cases.licenseNumber')}
                copyValue={item.licenseNumber}
                tone="mint"
              />
            </div>
            <section>
              <FormSectionTitle icon={RefreshCw}>{t('cases.renewalNextLicense')}</FormSectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField icon={CalendarDays} label={t('cases.renewalNextIssued')} htmlFor="renewal-issue-issued">
                  <PersianDateField
                    id="renewal-issue-issued"
                    value={renewalIssued || undefined}
                    maxDate={renewalExpires || undefined}
                    onChange={(value) => {
                      const issued = value ?? ''
                      const expires = renewalExpiresTouched.current
                        ? renewalExpires
                        : addYearsIso(issued, item.contractYears || 1)
                      rememberRenewalDates(issued, expires)
                      void scheduleRenewalSave(false)
                    }}
                  />
                </FormField>
                <FormField icon={CalendarDays} label={t('cases.renewalNextExpires')} htmlFor="renewal-issue-expires">
                  <PersianDateField
                    id="renewal-issue-expires"
                    value={renewalExpires || undefined}
                    minDate={renewalIssued || undefined}
                    onChange={(value) => {
                      renewalExpiresTouched.current = true
                      rememberRenewalDates(renewalIssued, value ?? '')
                      void scheduleRenewalSave(false)
                    }}
                  />
                </FormField>
              </div>
            </section>
          </div>
        </FormCard>
      ) : null}
      {item && !wizard ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={
              busy ||
              (step === 2 && inquiriesPending) ||
              (step === 3 &&
                (placesReview.isLoading || !placesReview.data || placesReview.data.status === 'PENDING')) ||
              (step >= 4 && reviewsPending)
            }
            onClick={() => void continueProcess()}
          >
            <BadgeCheck className="size-4" aria-hidden />
            {step >= 4 ? t('cases.processComplete') : t('cases.processContinue')}
          </Button>
        </div>
      ) : null}
      {currentLocationOpen && item?.currentLocation ? (
        <CurrentLocationDialog
          place={item.currentLocation}
          locale={locale}
          onClose={() => setCurrentLocationOpen(false)}
        />
      ) : null}
    </div>
  )
}

function ProcessBadge({ icon: Icon, label, value }: { icon: LucideIcon; label?: string; value: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      {label ? <span className="text-ink-500">{label}</span> : null}
      <span>{value}</span>
    </span>
  )
}

function LocationCaseSubtitle({ item, locale }: { item: ProcessState; locale: string }) {
  const { t } = useTranslation()
  const personName =
    [item.person?.firstName, item.person?.lastName].filter(Boolean).join(' ') || item.person?.fullName?.trim() || ''
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <EntityNameSubtitle icon={MapPinned} label={t('cases.requestNumber')} name={localizeDigits(item.number, locale)} />
      {personName ? <ProcessBadge icon={UserRound} value={personName} /> : null}
      {item.nationalId ? (
        <ProcessBadge icon={Fingerprint} label={t('users.nationalId')} value={<CopyableDigits value={item.nationalId} />} />
      ) : null}
      {item.jobTitle ? <ProcessBadge icon={Briefcase} label={t('cases.activityJob')} value={item.jobTitle} /> : null}
      {item.licenseIssuedAt ? (
        <ProcessBadge icon={CalendarDays} label={t('cases.listIssued')} value={<DateText value={item.licenseIssuedAt} />} />
      ) : null}
    </span>
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

function CurrentLocationDialog({
  place,
  locale,
  onClose,
}: {
  place: CurrentLocation
  locale: string
  onClose: () => void
}) {
  const { t } = useTranslation()
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

  const rented = place.ownership === 'RENTED'
  const complexName = place.complex
    ? locale === 'en' || locale === 'hi'
      ? place.complex.nameEn || place.complex.name
      : place.complex.name || place.complex.nameEn
    : null
  const area = place.area == null || place.area === '' || Number.isNaN(Number(place.area)) ? null : formatNumber(Number(place.area), locale)

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink-900/30 p-4 pt-[8vh]"
      data-nested-dialog
      role="dialog"
      aria-modal="true"
      aria-labelledby="current-location-title"
      onClick={onClose}
    >
      <div className="mb-8 w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <FormCard
          icon={MapPinned}
          title={<span id="current-location-title">{t('cases.currentLocationTitle')}</span>}
          action={
            <Button type="button" variant="ghost" icon className="size-9" onClick={onClose} aria-label={t('common.close')}>
              <X className="size-4" aria-hidden />
            </Button>
          }
        >
          <div className="space-y-6 p-5 sm:p-6">
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
        </FormCard>
      </div>
    </div>,
    document.body,
  )
}
