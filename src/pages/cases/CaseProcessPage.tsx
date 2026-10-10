import { BadgeCheck, Briefcase, Building2, CalendarClock, FolderKanban, MapPinned, RefreshCw, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex, RegistrationPlace } from '../../types/app'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CaseLocationStep } from './CaseLocationStep'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import type { CaseInquiryRow } from './inquiry-types'
import { emptyLocationForm, type DocumentTypeRow, type LocationForm, type StoredVersion } from './formation-types'

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
  const process = useQuery({
    queryKey: ['cases', 'process', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<ProcessState>(`/cases/${id}/process`)).data,
  })
  const requirements = useQuery({
    queryKey: ['cases', 'activity-requirements', id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<DocumentTypeRow[]>('/cases/formation/activity-requirements', { params: { caseId: id } })).data,
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
    enabled: Boolean(id) && (process.data?.formationStep ?? 0) >= 2,
    queryFn: async () => (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { caseId: id } })).data,
  })
  const reviews = useQuery({
    queryKey: ['cases', 'formation-management-approvers', id],
    enabled: Boolean(id) && (process.data?.formationStep ?? 0) >= 3,
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
  const step = item?.formationStep ?? 0

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

  async function continueProcess() {
    if (!item) return
    setBusy(true)
    try {
      if (step >= 3) {
        await api.post('/cases/formation/complete', { caseId: id, step: 3 })
        toast.success(t('cases.processCompleted'))
        navigate(`/cases/${id}?stay=1`)
        return
      }
      await api.post('/cases/formation/process-step', { caseId: id, step: step + 1 })
      await process.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setBusy(false)
    }
  }

  const icon = item?.type === 'LOCATION_CHANGE' ? MapPinned : RefreshCw
  const inquiriesPending = (inquiries.data ?? []).some((row) => row.status === 'PENDING')
  const reviewsPending = (reviews.data ?? []).some((row) => row.status === 'PENDING')

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={icon}
        title={item?.type === 'RENEWAL' ? t('cases.renewCurrentLicense') : item ? t(`cases.requestTypes.${item.type}`) : t('cases.newRequest')}
        subtitle={
          item?.type === 'RENEWAL' ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {item.jobGroupTitle ? (
                <ProcessBadge icon={FolderKanban} label={t('cases.activityGroup')} value={item.jobGroupTitle} />
              ) : null}
              {item.jobTitle ? <ProcessBadge icon={Briefcase} label={t('cases.activityJob')} value={item.jobTitle} /> : null}
            </span>
          ) : (
            item?.number
          )
        }
        backTo={`/cases/${id}?stay=1`}
      />
      {process.isLoading ? <LoadingState /> : null}
      {item?.type === 'RENEWAL' && item.renewal && step === 0 ? (
        <FormCard icon={CalendarClock} title={t('cases.renewalDatesTitle')}>
          <div className={formCardBodyClassName}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFactTile icon={Building2} label={t('cases.unitTitle')} value={item.businessUnitTitle || '—'} />
              <FormFactTile icon={BadgeCheck} label={t('cases.licenseNumber')} copyValue={item.licenseNumber} />
              <FormFactTile icon={CalendarClock} label={t('cases.renewalCurrentIssued')} value={<DateText value={item.renewal.currentIssuedAt} />} />
              <FormFactTile icon={CalendarClock} label={t('cases.renewalCurrentExpires')} value={<DateText value={item.renewal.currentExpiresAt} />} />
              <FormFactTile icon={BadgeCheck} label={t('cases.renewalNextIssued')} value={<DateText value={item.renewal.nextIssuedAt} />} tone="teal" />
              <FormFactTile icon={BadgeCheck} label={t('cases.renewalNextExpires')} value={<DateText value={item.renewal.nextExpiresAt} />} tone="mint" />
              {item.renewal.delayDays > 0 ? (
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalDelay')}
                  value={t('cases.renewalDelayDays', { count: formatNumber(item.renewal.delayDays, locale) })}
                />
              ) : null}
            </div>
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
      {item && step === 1 ? (
        <FormCard icon={icon} title={t('cases.activityDocumentsTitle')}>
          <div className={formCardBodyClassName}>
            <CaseDocumentList
              items={requirements.data ?? []}
              stored={stored.data ?? []}
              uploadingId={uploadingId}
              disabled={false}
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
          onAdvanced={() => undefined}
          onRewound={() => void inquiries.refetch()}
        />
      ) : null}
      {item && step >= 3 ? (
        <CaseManagementReviewStep
          caseId={id}
          items={reviews.data ?? []}
          loading={reviews.isLoading}
          autoAdvance={false}
          onAdvanced={() => undefined}
          onRewound={() => void reviews.refetch()}
        />
      ) : null}
      {item && !(item.type === 'LOCATION_CHANGE' && step === 0) ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={busy || (step === 2 && inquiriesPending) || (step >= 3 && reviewsPending)}
            onClick={() => void continueProcess()}
          >
            <BadgeCheck className="size-4" aria-hidden />
            {step >= 3 ? t('cases.processComplete') : t('cases.processContinue')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ProcessBadge({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="text-ink-500">{label}</span>
      <span>{value}</span>
    </span>
  )
}
