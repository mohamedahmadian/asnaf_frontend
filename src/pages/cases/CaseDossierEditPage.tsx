import { Briefcase, Files, MapPin, UserRound, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, FormActions, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { normalizeNationalId } from '../../lib/national-id'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex, Country, Job, JobGroup, RegistrationPlace } from '../../types/app'
import { CaseActivityStep } from './CaseActivityStep'
import { CaseDocumentList } from './CaseDocumentList'
import { caseDossierPath, type CaseDossier } from './CaseDossierPage'
import { CaseIdentityFields } from './CaseIdentityFields'
import { CaseLocationStep } from './CaseLocationStep'
import {
  fillPerson,
  locationFormFrom,
  matchesDocumentGender,
  type CaseActivity,
  type CaseLocation,
  type DocumentTypeRow,
  type IdentityPerson,
  type LocationForm,
  type StoredVersion,
} from './formation-types'

const TABS = ['identity', 'activity', 'location'] as const
type EditTab = (typeof TABS)[number]

const TAB_ICONS: Record<EditTab, LucideIcon> = {
  identity: UserRound,
  activity: Briefcase,
  location: MapPin,
}

export function CaseDossierEditPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['cases', 'dossier', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<CaseDossier>(`/cases/${id}/dossier`)).data,
  })

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={Files}
        title={t('cases.dossierEdit')}
        subtitle={
          query.data ? (
            <EntityNameSubtitle icon={UserRound} name={query.data.person.fullName || t('cases.dossierEdit')} />
          ) : undefined
        }
        backTo={caseDossierPath(id)}
      />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <FormEmptyHint>{t('cases.dossierLoadFailed')}</FormEmptyHint> : null}
      {query.data ? <DossierEditor item={query.data} /> : null}
    </div>
  )
}

function DossierEditor({ item }: { item: CaseDossier }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const [tab, setTab] = useState<EditTab>(requested === 'activity' || requested === 'location' ? requested : 'identity')
  const [identityPane, setIdentityPane] = useState<'fields' | 'documents'>(
    searchParams.get('section') === 'documents' ? 'documents' : 'fields',
  )
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [person, setPerson] = useState<IdentityPerson>(() =>
    fillPerson({
      ...item.person,
      caseId: item.id,
      formationStep: item.formationStep,
      caseTrackingCode: item.trackingCode,
    }),
  )
  const [unitTitle, setUnitTitle] = useState(item.activity.businessUnitTitle ?? '')
  const [groupId, setGroupId] = useState(item.activity.jobGroupId ?? '')
  const [jobId, setJobId] = useState(item.activity.jobId ?? '')
  const [previousOccupation, setPreviousOccupation] = useState(item.activity.previousOccupation ?? '')
  const [posCount, setPosCount] = useState(item.activity.posDeviceCount == null ? '' : String(item.activity.posDeviceCount))
  const [location, setLocation] = useState<LocationForm>(() => locationFormFrom(item.location))
  const locale = i18n.language.split('-')[0] ?? 'fa'

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => (await api.get<Country[]>('/countries', { params: { activeOnly: true } })).data,
  })
  const jobs = useQuery({
    queryKey: ['jobs', 'lookup'],
    queryFn: async () => (await api.get<Job[]>('/jobs')).data,
  })
  const groups = useQuery({
    queryKey: ['job-groups', 'lookup'],
    queryFn: async () => (await api.get<JobGroup[]>('/job-groups')).data,
  })
  const cities = useQuery({
    queryKey: ['cities', 'lookup'],
    queryFn: async () => (await api.get<City[]>('/cities', { params: { activeOnly: true } })).data,
  })
  const complexes = useQuery({
    queryKey: ['commercial-complexes', 'lookup'],
    queryFn: async () => (await api.get<CommercialComplex[]>('/commercial-complexes')).data,
  })
  const places = useQuery({
    queryKey: ['registration-places', 'lookup'],
    queryFn: async () => (await api.get<RegistrationPlace[]>('/registration-places')).data,
  })
  const documentTypes = useQuery({
    queryKey: ['cases', 'document-types'],
    enabled: tab === 'identity',
    queryFn: async () => (await api.get<DocumentTypeRow[]>('/cases/formation/document-types')).data,
  })
  const storedDocuments = useQuery({
    queryKey: ['cases', 'documents', item.person.id],
    enabled: tab === 'identity',
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>('/cases/formation/documents', {
          params: { userId: item.person.id },
        })
      ).data,
  })
  const activityRequirements = useQuery({
    queryKey: ['cases', 'activity-requirements', item.id, jobId],
    enabled: tab === 'activity' && Boolean(jobId),
    queryFn: async () =>
      (
        await api.get<DocumentTypeRow[]>('/cases/formation/activity-requirements', {
          params: { caseId: item.id, jobId: jobId || undefined },
        })
      ).data,
  })
  const storedActivityDocuments = useQuery({
    queryKey: ['cases', 'activity-documents', item.id],
    enabled: tab === 'activity' && Boolean(jobId),
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>(
          '/cases/formation/activity-documents',
          { params: { caseId: item.id } },
        )
      ).data,
  })
  const visibleDocuments = useMemo(
    () => (documentTypes.data ?? []).filter((row) => matchesDocumentGender(row.gender, person.gender)),
    [documentTypes.data, person.gender],
  )
  const activityDocuments = activityRequirements.data ?? []
  const requiredActivityCount = activityDocuments.filter((row) => row.isRequired).length
  const optionalActivityCount = activityDocuments.length - requiredActivityCount
  const activityDocumentsCountLabel =
    requiredActivityCount > 0 && optionalActivityCount > 0
      ? t('cases.activityDocumentsCount', {
          required: formatNumber(requiredActivityCount, locale),
          optional: formatNumber(optionalActivityCount, locale),
        })
      : requiredActivityCount > 0
        ? t('cases.activityDocumentsRequiredOnly', { required: formatNumber(requiredActivityCount, locale) })
        : optionalActivityCount > 0
          ? t('cases.activityDocumentsOptionalOnly', { optional: formatNumber(optionalActivityCount, locale) })
          : null

  function leave() {
    navigate(caseDossierPath(item.id))
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'dossier', item.id] })
    await queryClient.invalidateQueries({ queryKey: ['cases', 'home', item.id] })
  }

  async function saveIdentity() {
    if (!person.firstName.trim()) {
      toast.error(t('cases.firstNameRequired'))
      return
    }
    if (!person.lastName.trim()) {
      toast.error(t('cases.lastNameRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<IdentityPerson>('/cases/formation/identity', {
        nationalId: normalizeNationalId(person.nationalId ?? ''),
        firstName: person.firstName,
        lastName: person.lastName,
        fatherName: person.fatherName || null,
        lastNameEn: person.lastNameEn || null,
        gender: person.gender || null,
        religion: person.religion || null,
        religionOther: person.religionOther || null,
        birthDate: person.birthDate || null,
        residencyStatus: person.residencyStatus || null,
        passportNumber: person.passportNumber || null,
        nationalCardExpiresAt: person.nationalCardExpiresAt || null,
        passportExpiresAt: person.passportExpiresAt || null,
        identityCertificateNo: person.identityCertificateNo || null,
        birthPlace: person.birthPlace || null,
        identityIssuedIn: person.identityIssuedIn || null,
        countryId: person.countryId || null,
        phone: person.phone || null,
        homePhone: person.homePhone || null,
        postalCode: person.postalCode || null,
        address: person.address || null,
        email: person.email || null,
        educationLevel: person.educationLevel || null,
        citizenGroup: person.citizenGroup || null,
        jobId: person.jobId || null,
        caseId: item.id,
        startNew: false,
      })
      setPerson(fillPerson(data))
      toast.success(t('cases.saved'))
      await refresh()
      leave()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function saveActivity() {
    if (!unitTitle.trim()) {
      toast.error(t('cases.unitTitleRequired'))
      return
    }
    if (!jobId) {
      toast.error(t('cases.activityJobRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<{ activity: CaseActivity }>('/cases/formation/activity', {
        caseId: item.id,
        businessUnitTitle: unitTitle.trim(),
        jobGroupId: groupId || null,
        jobId,
        previousOccupation: previousOccupation || null,
        posDeviceCount: posCount === '' ? null : Number(posCount),
      })
      setUnitTitle(data.activity.businessUnitTitle ?? '')
      setGroupId(data.activity.jobGroupId ?? '')
      setJobId(data.activity.jobId ?? '')
      setPreviousOccupation(data.activity.previousOccupation ?? '')
      setPosCount(data.activity.posDeviceCount == null ? '' : String(data.activity.posDeviceCount))
      toast.success(t('cases.activitySaved'))
      await refresh()
      leave()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function saveLocation() {
    if (!location.cityId) {
      toast.error(t('cases.locationCityRequired'))
      return
    }
    if (!location.establishment) {
      toast.error(t('cases.locationEstablishmentRequired'))
      return
    }
    const commercialComplex = location.establishment === 'COMMERCIAL_COMPLEX'
    if (commercialComplex && !location.complexId) {
      toast.error(t('cases.locationComplexRequired'))
      return
    }
    if (!location.address.trim()) {
      toast.error(t('cases.locationAddressRequired'))
      return
    }
    if (location.area.trim() === '' || Number.isNaN(Number(location.area))) {
      toast.error(t('cases.locationAreaRequired'))
      return
    }
    if (!location.ownership) {
      toast.error(t('cases.locationOwnershipRequired'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<{ location: CaseLocation }>('/cases/formation/location', {
        caseId: item.id,
        cityId: location.cityId,
        establishment: location.establishment,
        complexId: commercialComplex ? location.complexId : null,
        address: location.address || null,
        addressEn: location.addressEn || null,
        plaque: location.plaque || null,
        plaqueSeries: location.plaqueSeries || null,
        floor: location.floor || null,
        unitNo: location.unitNo || null,
        postalCode: location.postalCode || null,
        phone: location.phone || null,
        fax: location.fax || null,
        geoPosition: location.geoPosition || null,
        publicAccess: location.publicAccess || null,
        registrationPlaceId: location.registrationPlaceId || null,
        ownership: location.ownership,
        deedNo: location.deedNo || null,
        area: Number(location.area),
        leaseIssuedAt: location.ownership === 'RENTED' ? location.leaseIssuedAt || null : null,
        leaseExpiresAt: location.ownership === 'RENTED' ? location.leaseExpiresAt || null : null,
        leaseAgency: location.ownership === 'RENTED' ? location.leaseAgency || null : null,
        ownerName: location.ownership === 'RENTED' ? location.ownerName || null : null,
      })
      setLocation(locationFormFrom(data.location))
      toast.success(t('cases.locationSaved'))
      await refresh()
      leave()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  function openIdentityPane(next: 'fields' | 'documents') {
    setIdentityPane(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', 'identity')
    if (next === 'documents') params.set('section', 'documents')
    else params.delete('section')
    setSearchParams(params, { replace: true })
  }

  async function uploadDocument(documentId: string, file: File, activity?: { jobId: string }) {
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('userId', item.person.id)
      body.append('documentId', documentId)
      if (activity) {
        body.append('caseId', item.id)
        body.append('jobId', activity.jobId)
      }
      body.append('file', prepared)
      await api.post('/cases/formation/documents', body)
      toast.success(t('cases.documentUploaded'))
      await queryClient.invalidateQueries({
        queryKey: activity ? ['cases', 'activity-documents', item.id] : ['cases', 'documents', item.person.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'dossier', item.id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  async function removeDocument(documentId: string, activity?: boolean) {
    setRemovingId(documentId)
    try {
      await api.delete(`/cases/formation/documents/${documentId}`, {
        params: activity ? { userId: item.person.id, caseId: item.id } : { userId: item.person.id },
      })
      toast.success(t('cases.documentRemoved'))
      await queryClient.invalidateQueries({
        queryKey: activity ? ['cases', 'activity-documents', item.id] : ['cases', 'documents', item.person.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'dossier', item.id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setRemovingId(null)
    }
  }

  const actions = (label: string) => (
    <FormActions submitLabel={label} cancelLabel={t('common.cancel')} submitting={saving} onCancel={leave} />
  )
  const locked = !item.canEditCase && tab !== 'identity'

  return (
    <FormCard icon={Files} title={item.businessUnitTitle || item.person.fullName}>
      <FormTabs
        tabs={TABS.map((key) => ({
          id: key,
          label: t(`cases.dossierTabs.${key}`),
          icon: TAB_ICONS[key],
        }))}
        value={tab}
        onChange={(next) => setTab(next as EditTab)}
      />
      <div className="p-5 sm:p-6" role="tabpanel">
        {locked ? <FormEmptyHint>{t('cases.dossierEditLocked')}</FormEmptyHint> : null}
        {!locked && tab === 'identity' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['fields', 'documents'] as const).map((pane) => (
                <button
                  key={pane}
                  type="button"
                  className={`cursor-pointer rounded-2xl px-4 py-2 text-sm ${
                    identityPane === pane ? 'bg-teal-500 text-white' : 'border border-teal-400 bg-white text-ink-700'
                  }`}
                  onClick={() => openIdentityPane(pane)}
                >
                  {t(pane === 'fields' ? 'cases.identityTab' : 'cases.documentsTab')}
                </button>
              ))}
            </div>
            {identityPane === 'fields' ? (
              <CaseIdentityFields
                person={person}
                countries={countries.data ?? []}
                jobs={jobs.data ?? []}
                locale={locale}
                onChange={(key, value) => setPerson((current) => ({ ...current, [key]: value }))}
                onSubmit={() => void saveIdentity()}
                actions={actions(t('cases.saveIdentity'))}
              />
            ) : documentTypes.isLoading || storedDocuments.isLoading ? (
              <LoadingState />
            ) : visibleDocuments.length === 0 ? (
              <FormEmptyHint>{t('cases.identityDocumentsEmpty')}</FormEmptyHint>
            ) : (
              <CaseDocumentList
                items={visibleDocuments}
                stored={storedDocuments.data ?? []}
                uploadingId={uploadingId}
                removingId={removingId}
                disabled={false}
                layout="tabs"
                onFile={(documentId, file) => void uploadDocument(documentId, file)}
                onDelete={(documentId) => void removeDocument(documentId)}
              />
            )}
          </div>
        ) : null}
        {!locked && tab === 'activity' ? (
          <div className="space-y-4">
            <CaseActivityStep
              unitTitle={unitTitle}
              groupId={groupId}
              jobId={jobId}
              previousOccupation={previousOccupation}
              posCount={posCount}
              groups={groups.data ?? []}
              jobs={jobs.data ?? []}
              onUnitTitleChange={setUnitTitle}
              onGroupChange={setGroupId}
              onJobChange={setJobId}
              onPreviousOccupationChange={setPreviousOccupation}
              onPosCountChange={setPosCount}
              onSubmit={() => void saveActivity()}
              actions={actions(t('cases.saveActivity'))}
            />
            {jobId ? (
              <section className="space-y-3 border-t border-teal-100 pt-4">
                <FormSectionTitle icon={Files} className="mb-2.5">
                  <span>{t('cases.activityDocumentsTitle')}</span>
                  {activityDocumentsCountLabel ? (
                    <span className="font-medium text-ink-500">{activityDocumentsCountLabel}</span>
                  ) : null}
                </FormSectionTitle>
                {activityRequirements.isLoading || storedActivityDocuments.isLoading ? (
                  <LoadingState />
                ) : activityDocuments.length === 0 ? (
                  <FormEmptyHint>{t('cases.activityDocumentsEmpty')}</FormEmptyHint>
                ) : (
                  <CaseDocumentList
                    items={activityDocuments}
                    stored={storedActivityDocuments.data ?? []}
                    uploadingId={uploadingId}
                    removingId={removingId}
                    disabled={false}
                    layout="tabs"
                    emphasizeRequired
                    onFile={(documentId, file) => void uploadDocument(documentId, file, { jobId })}
                    onDelete={(documentId) => void removeDocument(documentId, true)}
                  />
                )}
              </section>
            ) : null}
          </div>
        ) : null}
        {!locked && tab === 'location' ? (
          <CaseLocationStep
            value={location}
            cities={cities.data ?? []}
            complexes={complexes.data ?? []}
            places={places.data ?? []}
            locale={locale}
            onChange={(patch) => setLocation((current) => ({ ...current, ...patch }))}
            onSubmit={() => void saveLocation()}
            actions={actions(t('cases.saveLocation'))}
          />
        ) : null}
      </div>
    </FormCard>
  )
}
