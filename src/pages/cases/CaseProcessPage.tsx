import { BadgeCheck, Briefcase, CalendarClock, CalendarDays, Check, FolderKanban, MapPinned, RefreshCw, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { DateText } from '../../components/ui/DateText'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { addYearsIso, formatNumber } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex, RegistrationPlace } from '../../types/app'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CaseLocationStep } from './CaseLocationStep'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import { CasePlacesStep } from './CasePlacesStep'
import type { CaseInquiryRow } from './inquiry-types'
import { emptyLocationForm, type DocumentTypeRow, type LocationForm, type StoredVersion } from './formation-types'

const RENEWAL_STEPS = ['terms', 'documents', 'inquiries', 'places', 'management'] as const

type ProcessState = {
  id: string
  caseId: string
  userId: string | null
  number: string
  type: 'RENEWAL' | 'LOCATION_CHANGE'
  formationStep: number
  licenseNumber: string | null
  businessUnitTitle: string | null
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
}

function locationFrom(value: ProcessState['location']): LocationForm {
  const empty = emptyLocationForm()
  if (!value) return empty
  return {
    ...empty,
    ...value,
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
    registrationPlaceId: value.registrationPlaceId ?? '',
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
  const inquiries = useQuery({
    queryKey: ['cases', 'formation-inquiries', id],
    enabled:
      Boolean(id) &&
      ((process.data?.formationStep ?? 0) >= 2 ||
        (process.data?.type === 'RENEWAL' &&
          requirements.isSuccess &&
          !(requirements.data ?? []).some((row) => row.isRequired) &&
          (process.data?.formationStep ?? 0) >= 1)),
    queryFn: async () => (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { caseId: id } })).data,
  })
  const placesReview = useQuery({
    queryKey: ['cases', 'formation-places', id],
    enabled: Boolean(id) && process.data?.type === 'RENEWAL' && (process.data?.formationStep ?? 0) >= 3,
    queryFn: async () =>
      (await api.get<CaseInquiryRow | null>('/cases/formation/places', { params: { caseId: id } })).data,
  })
  const reviews = useQuery({
    queryKey: ['cases', 'formation-management-approvers', id],
    enabled:
      Boolean(id) &&
      (process.data?.type === 'RENEWAL'
        ? (process.data?.formationStep ?? 0) >= 4
        : (process.data?.formationStep ?? 0) >= 3),
    queryFn: async () =>
      (
        await api.get<CaseManagementApproverRow[]>('/cases/formation/management-approvers', { params: { caseId: id } })
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
  const places = useQuery({
    queryKey: ['registration-places', 'lookup'],
    enabled: process.data?.type === 'LOCATION_CHANGE',
    queryFn: async () => (await api.get<RegistrationPlace[]>('/registration-places')).data,
  })

  const item = process.data
  const form = location ?? (item ? locationFrom(item.location) : emptyLocationForm())
  const needsDocuments = requirements.isSuccess && (requirements.data ?? []).some((row) => row.isRequired)
  const showDocumentsStep = item?.type === 'RENEWAL' ? needsDocuments : (requirements.data?.length ?? 0) > 0
  const hideDocuments = item?.type === 'RENEWAL' && requirements.isSuccess && !needsDocuments
  const renewalSteps =
    item?.type === 'RENEWAL' && !needsDocuments
      ? RENEWAL_STEPS.filter((name) => name !== 'documents')
      : RENEWAL_STEPS
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
    if (!item) return
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
        registrationPlaceId: form.registrationPlaceId || null,
        ownership: form.ownership,
        deedNo: form.deedNo || null,
        area: form.area === '' ? null : Number(form.area),
        leaseIssuedAt: form.ownership === 'RENTED' ? form.leaseIssuedAt || null : null,
        leaseExpiresAt: form.ownership === 'RENTED' ? form.leaseExpiresAt || null : null,
        leaseAgency: form.ownership === 'RENTED' ? form.leaseAgency || null : null,
        ownerName: form.ownership === 'RENTED' ? form.ownerName || null : null,
      })
      await process.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
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

  function nextRenewalStep(from: number) {
    let next = from + 1
    if (item?.type === 'RENEWAL' && !showDocumentsStep && next === 1) next = 2
    return next
  }

  async function goToStep(index: number) {
    if (index > reached || (hideDocuments && index === 1)) return
    if (item?.type === 'RENEWAL' && step === 0 && index !== 0) {
      const saved = await scheduleRenewalSave(true)
      if (!saved) return
    }
    setViewStep(index)
  }

  useEffect(() => {
    if (item?.type !== 'RENEWAL' || !hideDocuments || item.formationStep !== 1) return
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
    if (item.type === 'RENEWAL' && serverStep === 0) {
      const saved = await scheduleRenewalSave(true)
      if (!saved) return
    }
    if (serverStep < reached) {
      setViewStep(Math.min(nextRenewalStep(serverStep), reached))
      return
    }
    setBusy(true)
    try {
      const finalStep = item.type === 'RENEWAL' ? RENEWAL_STEPS.length - 1 : 3
      if (serverStep >= finalStep) {
        await api.post('/cases/formation/complete', { caseId: id, step: finalStep })
        toast.success(t('cases.processCompleted'))
        navigate(`/cases/${id}?stay=1`)
        return
      }
      await api.post('/cases/formation/process-step', { caseId: id, step: nextRenewalStep(serverStep) })
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
  const stepTotal = renewalSteps.length
  const stepCurrent = Math.min(
    renewalSteps.filter((name) => RENEWAL_STEPS.indexOf(name) <= progress).length,
    stepTotal,
  )
  const renewalOnLastStep = renewal && step >= RENEWAL_STEPS.length - 1
  const renewalContinue = renewal ? (
    <Button
      type="button"
      disabled={
        busy ||
        (step === 2 && inquiriesPending) ||
        (step === 3 && (placesReview.isLoading || !placesReview.data || placesReview.data.status === 'PENDING')) ||
        (renewalOnLastStep && reviewsPending)
      }
      onClick={() => void continueProcess()}
    >
      <BadgeCheck className="size-4" aria-hidden />
      {renewalOnLastStep ? t('cases.processComplete') : t('cases.processContinue')}
    </Button>
  ) : null

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={icon}
        title={renewal ? t('cases.renewCurrentLicense') : item ? t(`cases.requestTypes.${item.type}`) : t('cases.newRequest')}
        titleExtra={
          renewal ? (
            <ProcessStepRing
              currentLabel={formatNumber(stepCurrent, locale)}
              totalLabel={formatNumber(stepTotal, locale)}
              ratio={stepCurrent / stepTotal}
              label={t('cases.stepOf', {
                current: formatNumber(stepCurrent, locale),
                total: formatNumber(stepTotal, locale),
              })}
            />
          ) : undefined
        }
        subtitle={
          renewal && item ? (
            <span className="flex flex-col gap-1.5">
              {item.businessUnitTitle ? (
                <span className="text-sm font-medium text-ink-800">
                  {t('cases.unitTitle')}: {item.businessUnitTitle}
                </span>
              ) : null}
              <span className="flex flex-wrap items-center gap-1.5">
                {item.jobGroupTitle ? (
                  <ProcessBadge icon={FolderKanban} label={t('cases.activityGroup')} value={item.jobGroupTitle} />
                ) : null}
                {item.jobTitle ? <ProcessBadge icon={Briefcase} label={t('cases.activityJob')} value={item.jobTitle} /> : null}
              </span>
            </span>
          ) : (
            item?.number
          )
        }
        backTo={`/cases/${id}?stay=1`}
      />
      {renewal ? (
        <ol
          className={`mb-5 grid grid-cols-2 gap-2 ${
            renewalSteps.length > 4 ? 'sm:grid-cols-3 lg:grid-cols-5' : renewalSteps.length > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          }`}
        >
          {renewalSteps.map((name) => {
            const index = RENEWAL_STEPS.indexOf(name)
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
                    {formatNumber(renewalSteps.indexOf(name) + 1, locale)}
                  </span>
                  <span className="text-center leading-5">{t(`cases.renewalSteps.${name}`)}</span>
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
          action={renewalContinue}
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
        <FormCard icon={MapPinned} title={t('cases.requestTypes.LOCATION_CHANGE')}>
          <div className={formCardBodyClassName}>
            <CaseLocationStep
              value={form}
              cities={cities.data ?? []}
              complexes={complexes.data ?? []}
              places={places.data ?? []}
              locale={locale}
              onChange={(patch) => setLocation({ ...form, ...patch })}
              onSubmit={() => void saveDraft()}
            />
          </div>
        </FormCard>
      ) : null}
      {item && step === 1 && showDocumentsStep ? (
        <FormCard icon={icon} title={t('cases.activityDocumentsTitle')} action={item.type === 'RENEWAL' ? renewalContinue : undefined}>
          <div className={formCardBodyClassName}>
            <CaseDocumentList
              items={requirements.data ?? []}
              stored={stored.data ?? []}
              uploadingId={uploadingId}
              disabled={false}
              layout={item.type === 'RENEWAL' ? 'tabs' : 'grid'}
              emphasizeRequired={item.type === 'RENEWAL'}
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
          headerAction={item.type === 'RENEWAL' ? renewalContinue : undefined}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void inquiries.refetch()
          }}
        />
      ) : null}
      {item?.type === 'RENEWAL' && step === 3 ? (
        <CasePlacesStep
          caseId={id}
          item={placesReview.data ?? null}
          loading={placesReview.isLoading}
          autoAdvance={false}
          showAdvance={false}
          headerAction={renewalContinue}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void placesReview.refetch()
          }}
        />
      ) : null}
      {item && (item.type === 'RENEWAL' ? step >= 4 : step >= 3) ? (
        <CaseManagementReviewStep
          caseId={id}
          items={reviews.data ?? []}
          loading={reviews.isLoading}
          autoAdvance={false}
          showAdvance={false}
          headerAction={item.type === 'RENEWAL' ? renewalContinue : undefined}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void process.refetch()
            void reviews.refetch()
          }}
        />
      ) : null}
      {item && item.type !== 'RENEWAL' && !(item.type === 'LOCATION_CHANGE' && step === 0) ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={
              busy ||
              (step === 2 && inquiriesPending) ||
              (item.type === 'RENEWAL' &&
                step === 3 &&
                (placesReview.isLoading || !placesReview.data || placesReview.data.status === 'PENDING')) ||
              ((item.type === 'RENEWAL' ? step >= 4 : step >= 3) && reviewsPending)
            }
            onClick={() => void continueProcess()}
          >
            <BadgeCheck className="size-4" aria-hidden />
            {(item.type === 'RENEWAL' ? step >= 4 : step >= 3) ? t('cases.processComplete') : t('cases.processContinue')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ProcessStepRing({
  currentLabel,
  totalLabel,
  ratio,
  label,
}: {
  currentLabel: string
  totalLabel: string
  ratio: number
  label: string
}) {
  const size = 56
  const stroke = 5.5
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, ratio))
  const dash = circ * clamped
  return (
    <div className="relative size-14 shrink-0" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-14 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-teal-100" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-teal-500"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold leading-none text-teal-800" aria-hidden>
        {currentLabel}
        <span className="px-px text-ink-400">/</span>
        {totalLabel}
      </span>
    </div>
  )
}

function ProcessBadge({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="text-ink-500">{label}</span>
      <span>{value}</span>
    </span>
  )
}
