import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Briefcase,
  Check,
  FilePlus,
  Files,
  Fingerprint,
  FolderKanban,
  Hash,
  IdCard,
  Landmark,
  MapPin,
  ScanSearch,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AppForm,
  Button,
  FormField,
  PageHeader,
  caseShellClassName,
  inputClassName,
} from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormEmptyHint, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import { useDoubleSaveShortcut } from '../../hooks/useEscapeLeave'
import { api, getApiErrorMessage } from '../../lib/api'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex, Country, DocumentItem, Job, JobGroup, Paginated, RegistrationPlace } from '../../types/app'
import { CaseActivityStep } from './CaseActivityStep'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CasePlacesStep } from './CasePlacesStep'
import type { CaseInquiryRow } from './inquiry-types'
import { CaseLocationStep } from './CaseLocationStep'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseIdentityFields } from './CaseIdentityFields'
import {
  FORMATION_STEPS,
  MANAGEMENT_FORMATION_STEP,
  PLACES_FORMATION_STEP,
  activityDocumentRows,
  emptyLocationForm,
  emptyPerson,
  fillPerson,
  locationFormFrom,
  type CaseActivity,
  type CaseLocation,
  type DocumentTypeRow,
  type LocationForm,
  type IdentityPerson,
  type StoredVersion,
} from './formation-types'

export function CaseFormationPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedNationalId = normalizeNationalId(searchParams.get('nationalId') ?? '')
  const [nationalId, setNationalId] = useState(() =>
    isValidIranianNationalId(requestedNationalId) ? requestedNationalId : '2280283972',
  )
  const [lookup, setLookup] = useState<'idle' | 'found' | 'missing'>('idle')
  const [person, setPerson] = useState<IdentityPerson | null>(null)
  const [tab, setTab] = useState<'identity' | 'documents'>('identity')
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [unitTitle, setUnitTitle] = useState('')
  const [activityGroupId, setActivityGroupId] = useState('')
  const [activityJobId, setActivityJobId] = useState('')
  const [previousOccupation, setPreviousOccupation] = useState('')
  const [posCount, setPosCount] = useState('')
  const [location, setLocation] = useState<LocationForm>(emptyLocationForm)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const formOpen = lookup !== 'idle'

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    enabled: formOpen,
    queryFn: async () => (await api.get<Country[]>('/countries', { params: { activeOnly: true } })).data,
  })
  const jobs = useQuery({
    queryKey: ['jobs', 'lookup'],
    enabled: formOpen || step === 1,
    queryFn: async () => (await api.get<Job[]>('/jobs')).data,
  })
  const cities = useQuery({
    queryKey: ['cities', 'lookup'],
    enabled: step === 2,
    queryFn: async () => (await api.get<City[]>('/cities', { params: { activeOnly: true } })).data,
  })
  const complexes = useQuery({
    queryKey: ['commercial-complexes', 'lookup'],
    enabled: step === 2,
    queryFn: async () => (await api.get<CommercialComplex[]>('/commercial-complexes')).data,
  })
  const registrationPlaces = useQuery({
    queryKey: ['registration-places', 'lookup'],
    enabled: step === 2,
    queryFn: async () => (await api.get<RegistrationPlace[]>('/registration-places')).data,
  })
  const jobGroups = useQuery({
    queryKey: ['job-groups', 'lookup'],
    enabled: formOpen && (step === 1 || Boolean(activityGroupId)),
    queryFn: async () => (await api.get<JobGroup[]>('/job-groups')).data,
  })
  const documentTypes = useQuery({
    queryKey: ['cases', 'document-types'],
    queryFn: async () => (await api.get<DocumentTypeRow[]>('/cases/formation/document-types')).data,
  })
  const documentCatalog = useQuery({
    queryKey: ['documents', 'lookup'],
    enabled: Boolean(activityJobId),
    queryFn: async () => {
      const { data } = await api.get<DocumentItem[] | Paginated<DocumentItem>>('/documents')
      return Array.isArray(data) ? data : data.items
    },
  })
  const storedDocuments = useQuery({
    queryKey: ['cases', 'documents', person?.id],
    enabled: Boolean(person?.id),
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>('/cases/formation/documents', {
          params: { userId: person?.id },
        })
      ).data,
  })
  const caseInquiries = useQuery({
    queryKey: ['cases', 'formation-inquiries', person?.id],
    enabled: Boolean(person?.id) && (step >= FORMATION_STEPS.indexOf('inquiries') || reached >= FORMATION_STEPS.indexOf('inquiries')),
    queryFn: async () =>
      (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { userId: person?.id } })).data,
  })
  const casePlaces = useQuery({
    queryKey: ['cases', 'formation-places', person?.id],
    enabled:
      Boolean(person?.id) &&
      (step >= PLACES_FORMATION_STEP || reached >= PLACES_FORMATION_STEP),
    queryFn: async () =>
      (await api.get<CaseInquiryRow | null>('/cases/formation/places', { params: { userId: person?.id } })).data,
  })

  useEffect(() => {
    const qeshm = (cities.data ?? []).find(
      (city) => city.nameFa.trim() === 'قشم' || city.nameEn.trim().toLowerCase() === 'qeshm',
    )
    if (!qeshm) return
    setLocation((current) => (current.cityId ? current : { ...current, cityId: qeshm.id }))
  }, [cities.data, location.cityId])

  function applyActivity(activity: CaseActivity | null) {
    setUnitTitle(activity?.businessUnitTitle ?? '')
    setActivityGroupId(activity?.jobGroupId ?? '')
    setActivityJobId(activity?.jobId ?? '')
    setPreviousOccupation(activity?.previousOccupation ?? '')
    setPosCount(activity?.posDeviceCount == null ? '' : String(activity.posDeviceCount))
  }

  const visibleDocuments = useMemo(() => {
    return (documentTypes.data ?? []).filter((item) => item.gender !== 'MALE' || person?.gender !== 'FEMALE')
  }, [documentTypes.data, person?.gender])

  const activityDocuments = useMemo(() => {
    const job = (jobs.data ?? []).find((item) => item.id === activityJobId)
    return activityDocumentRows(job?.documents ?? [], documentCatalog.data ?? [], person?.gender)
  }, [activityJobId, documentCatalog.data, jobs.data, person?.gender])

  const inquiriesReady = useMemo(() => {
    if (reached < PLACES_FORMATION_STEP && step < PLACES_FORMATION_STEP) return true
    if (caseInquiries.isLoading) return null
    if (!caseInquiries.data) return null
    return caseInquiries.data.every((item) => item.status !== 'PENDING')
  }, [caseInquiries.data, caseInquiries.isLoading, reached, step])

  const activityDocumentsReady = useMemo(() => {
    if (!activityJobId) return false
    if (documentCatalog.isLoading || storedDocuments.isLoading) return null
    const uploaded = new Set(
      (storedDocuments.data ?? []).filter((row) => row.current).map((row) => row.documentId),
    )
    return activityDocuments.every((item) => !item.isRequired || uploaded.has(item.id))
  }, [activityDocuments, activityJobId, documentCatalog.isLoading, storedDocuments.data, storedDocuments.isLoading])

  async function lookupPerson(raw = nationalId, notify = true) {
    const normalized = normalizeNationalId(raw)
    if (!isValidIranianNationalId(normalized)) {
      if (notify) toast.error(t('users.nationalIdInvalid'))
      return
    }
    try {
      const { data } = await api.get<{
        found: boolean
        person: IdentityPerson | null
        activity: CaseActivity | null
        location: CaseLocation | null
      }>('/cases/formation/identity', { params: { nationalId: normalized } })
      if (data.found && data.person) {
        const filled = fillPerson(data.person)
        const resume = Math.min(
          Math.max(filled.formationStep, 0),
          FORMATION_STEPS.length - 1,
        )
        setPerson(filled)
        applyActivity(data.activity)
        setLocation(locationFormFrom(data.location))
        setLookup('found')
        setReached(resume)
        setStep(resume)
        if (notify) toast.success(t('cases.found'))
      } else {
        setPerson(emptyPerson(normalized))
        applyActivity(null)
        setLocation(emptyLocationForm())
        setLookup('missing')
        setReached(0)
        setStep(0)
        if (notify) toast.message(t('cases.notFound'))
      }
      setNationalId(normalized)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    }
  }

  const lookupRef = useRef(lookupPerson)
  lookupRef.current = lookupPerson

  useEffect(() => {
    if (!isValidIranianNationalId(requestedNationalId)) return
    void lookupRef.current(requestedNationalId, false)
  }, [requestedNationalId])

  const save = useMutation({
    mutationFn: async () => {
      if (!person) throw new Error('missing')
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
      })
      return data
    },
    onSuccess: (data) => {
      setPerson(fillPerson(data))
      setLookup('found')
      toast.success(t('cases.saved'))
      setReached((current) => Math.max(current, data.formationStep ?? 1, 1))
      setStep(1)
      void queryClient.invalidateQueries({ queryKey: ['cases', 'documents', data.id] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('cases.saveFailed'))),
  })

  function goToStep(index: number) {
    if (index > reached) return
    if (index >= PLACES_FORMATION_STEP && activityDocumentsReady !== true) {
      toast.error(t('cases.activityDocumentsBeforePlaces'))
      setStep(FORMATION_STEPS.indexOf('activity'))
      return
    }
    if (index >= PLACES_FORMATION_STEP && inquiriesReady !== true) {
      toast.error(t('cases.inquiriesBeforePlaces'))
      setStep(FORMATION_STEPS.indexOf('inquiries'))
      return
    }
    setStep(index)
  }

  useEffect(() => {
    if (step < PLACES_FORMATION_STEP) return
    if (activityDocumentsReady === false) {
      toast.error(t('cases.activityDocumentsBeforePlaces'))
      setStep(FORMATION_STEPS.indexOf('activity'))
      return
    }
    if (inquiriesReady === false) {
      toast.error(t('cases.inquiriesBeforePlaces'))
      setStep(FORMATION_STEPS.indexOf('inquiries'))
    }
  }, [activityDocumentsReady, inquiriesReady, step, t])

  async function completeActivity() {
    if (!unitTitle.trim()) {
      toast.error(t('cases.unitTitleRequired'))
      return
    }
    if (!activityJobId) {
      toast.error(t('cases.activityJobRequired'))
      return
    }
    if (!person?.id) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    try {
      const { data } = await api.post<{ formationStep: number; activity: CaseActivity }>('/cases/formation/activity', {
        userId: person.id,
        businessUnitTitle: unitTitle.trim(),
        jobGroupId: activityGroupId || null,
        jobId: activityJobId,
        previousOccupation: previousOccupation || null,
        posDeviceCount: posCount === '' ? null : Number(posCount),
      })
      applyActivity(data.activity)
      toast.success(t('cases.activitySaved'))
      const next = data.formationStep ?? 2
      setPerson((current) => (current ? { ...current, formationStep: next } : current))
      setReached((current) => Math.max(current, next))
      setStep(2)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    }
  }

  async function completeLocation() {
    if (!location.cityId) {
      toast.error(t('cases.locationCityRequired'))
      return
    }
    if (!location.establishment) {
      toast.error(t('cases.locationEstablishmentRequired'))
      return
    }
    const residentialComplex = location.establishment === 'RESIDENTIAL_COMPLEX'
    if (residentialComplex && !location.complexId) {
      toast.error(t('cases.locationComplexRequired'))
      return
    }
    if (!location.ownership) {
      toast.error(t('cases.locationOwnershipRequired'))
      return
    }
    if (!person?.id) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    try {
      const { data } = await api.post<{ formationStep: number; location: CaseLocation }>(
        '/cases/formation/location',
        {
          userId: person.id,
          cityId: location.cityId,
          establishment: location.establishment,
          complexId: residentialComplex ? location.complexId : null,
          address: location.address || null,
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
          area: location.area === '' ? null : Number(location.area),
          leaseIssuedAt: location.ownership === 'RENTED' ? location.leaseIssuedAt || null : null,
          leaseExpiresAt: location.ownership === 'RENTED' ? location.leaseExpiresAt || null : null,
          leaseAgency: location.ownership === 'RENTED' ? location.leaseAgency || null : null,
          ownerName: location.ownership === 'RENTED' ? location.ownerName || null : null,
        },
      )
      setLocation(locationFormFrom(data.location))
      toast.success(t('cases.locationSaved'))
      const next = data.formationStep ?? 3
      setPerson((current) => (current ? { ...current, formationStep: next } : current))
      setReached((current) => Math.max(current, next))
      setStep(3)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    }
  }

  useDoubleSaveShortcut(
    (step === 0 && Boolean(person) && !save.isPending) || step === 1 || step === 2,
    () => {
      if (step === 0) save.mutate()
      else if (step === 1) void completeActivity()
      else void completeLocation()
    },
  )

  async function upload(documentId: string, file: File, jobId?: string) {
    if (!person?.id) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('userId', person.id)
      body.append('documentId', documentId)
      if (jobId) body.append('jobId', jobId)
      body.append('file', prepared)
      await api.post('/cases/formation/documents', body)
      toast.success(t('cases.documentUploaded'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'documents', person.id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  const pastIdentity = reached >= 1 && person != null
  const fullName = person ? `${person.firstName} ${person.lastName}`.replace(/\s+/g, ' ').trim() : ''
  const activityJobTitle = (jobs.data ?? []).find((item) => item.id === activityJobId)?.title ?? ''
  const activityGroupTitle =
    (jobGroups.data ?? []).find((item) => item.id === activityGroupId)?.title ?? ''
  const stepTotal = FORMATION_STEPS.length
  const stepCurrent = Math.min(reached + 1, stepTotal)

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={FilePlus}
        title={t('menus.caseFormation')}
        titleExtra={
          <FormationStepRing
            currentLabel={formatNumber(stepCurrent, locale)}
            totalLabel={formatNumber(stepTotal, locale)}
            ratio={stepCurrent / stepTotal}
            label={t('cases.stepOf', {
              current: formatNumber(stepCurrent, locale),
              total: formatNumber(stepTotal, locale),
            })}
          />
        }
        subtitle={
          pastIdentity && person ? (
            <span className="flex flex-wrap gap-1.5">
              {person.caseTrackingCode ? (
                <HeaderBadge icon={Hash}>
                  <span className="text-ink-500">{t('cases.trackingCode')}</span>
                  <CopyableDigits value={person.caseTrackingCode} />
                </HeaderBadge>
              ) : null}
              {fullName ? (
                <HeaderBadge icon={UserRound}>
                  <span>{fullName}</span>
                </HeaderBadge>
              ) : null}
              {person.nationalId ? (
                <HeaderBadge icon={Fingerprint}>
                  <span className="text-ink-500">{t('users.nationalId')}</span>
                  <CopyableDigits value={person.nationalId} />
                </HeaderBadge>
              ) : null}
              {activityGroupTitle ? (
                <HeaderBadge icon={FolderKanban}>
                  <span className="text-ink-500">{t('cases.activityGroup')}</span>
                  <span>{activityGroupTitle}</span>
                </HeaderBadge>
              ) : null}
              {activityJobTitle ? (
                <HeaderBadge icon={Briefcase}>
                  <span className="text-ink-500">{t('cases.activityJob')}</span>
                  <span>{activityJobTitle}</span>
                </HeaderBadge>
              ) : null}
            </span>
          ) : (
            t('cases.formationSubtitle')
          )
        }
        action={
          <Button type="button" variant="ghost" onClick={() => toast.message(t('cases.feesHint'))}>
            <Landmark className="size-4" aria-hidden />
            {t('cases.fees')}
          </Button>
        }
      />

      <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {FORMATION_STEPS.map((item, index) => {
          const done = index < reached
          const current = index === reached
          const tone = done
            ? 'cursor-pointer border-emerald-400 bg-white text-ink-800'
            : current
              ? 'case-step-done-pulse cursor-pointer border-emerald-500 bg-white text-ink-800'
              : 'cursor-default border-line bg-white text-ink-400'
          return (
            <li key={item}>
              <button
                type="button"
                disabled={!done && !current}
                onClick={() => goToStep(index)}
                className={`relative flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-center text-sm ${tone}`}
              >
                {done ? (
                  <span className="case-step-check absolute top-1.5 end-1.5 inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                <span
                  className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    current
                      ? 'case-step-num-pulse border-emerald-500 bg-emerald-500 text-white'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-transparent bg-cream-100 text-ink-700'
                  }`}
                >
                  {formatNumber(index + 1, locale)}
                </span>
                <span className="text-center leading-5">{t(`cases.steps.${item}`)}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {step === 0 ? (
      <FormCard
        icon={UserRound}
        title={t('cases.steps.identity')}
        action={
          person ? (
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveIdentity')}
            </Button>
          ) : null
        }
      >
          <div className={formCardBodyClassName}>
            <div className="flex w-full flex-wrap items-end gap-3">
              <AppForm
                onSubmit={(event) => {
                  event.preventDefault()
                  void lookupPerson()
                }}
                className="flex flex-wrap items-end gap-3"
              >
                <div className="w-full min-w-0 sm:w-80">
                  <FormField icon={Fingerprint} label={t('users.nationalId')} htmlFor="case-national-id">
                    <input
                      id="case-national-id"
                      className={`${inputClassName()} digit-field`}
                      inputMode="numeric"
                      value={nationalId}
                      onChange={(event) => setNationalId(event.target.value)}
                    />
                  </FormField>
                </div>
                <Button type="submit" className="w-fit">
                  <ScanSearch className="size-4" aria-hidden />
                  {t('cases.lookup')}
                </Button>
              </AppForm>
              {lookup === 'missing' ? (
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  <Button type="button" variant="soft" onClick={() => toast.message(t('cases.externalLater'))}>
                    <Landmark className="size-4" aria-hidden />
                    {t('cases.citizenSystem')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => toast.message(t('cases.externalLater'))}>
                    <IdCard className="size-4" aria-hidden />
                    {t('cases.civilRegistry')}
                  </Button>
                </div>
              ) : null}
            </div>

            {person ? (
              <div key={tab} className="case-step-in space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(['identity', 'documents'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`cursor-pointer rounded-2xl px-4 py-2 text-sm ${
                        tab === item ? 'bg-teal-500 text-white' : 'border border-teal-400 bg-white text-ink-700'
                      }`}
                      onClick={() => setTab(item)}
                    >
                      {t(item === 'identity' ? 'cases.identityTab' : 'cases.documentsTab')}
                    </button>
                  ))}
                </div>
                {tab === 'identity' ? (
                  <CaseIdentityFields
                    person={person}
                    countries={countries.data ?? []}
                    jobs={(jobs.data ?? []).filter((item) => item.isActive)}
                    locale={locale}
                    onChange={(key, value) =>
                      setPerson((current) => (current ? { ...current, [key]: value } : current))
                    }
                    onSubmit={() => save.mutate()}
                  />
                ) : (
                  <CaseDocumentList
                    items={visibleDocuments}
                    stored={storedDocuments.data ?? []}
                    uploadingId={uploadingId}
                    disabled={!person.id}
                    onFile={(documentId, file) => void upload(documentId, file)}
                  />
                )}
              </div>
            ) : null}
          </div>
      </FormCard>
      ) : null}

      {step === 1 ? (
        <FormCard
          icon={Briefcase}
          title={t('cases.steps.activity')}
          action={
            <Button type="button" onClick={completeActivity}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveActivity')}
            </Button>
          }
        >
          <div className={formCardBodyClassName}>
            <CaseActivityStep
              unitTitle={unitTitle}
              groupId={activityGroupId}
              jobId={activityJobId}
              previousOccupation={previousOccupation}
              posCount={posCount}
              groups={(jobGroups.data ?? []).filter((item) => item.isActive || item.id === activityGroupId)}
              jobs={(jobs.data ?? []).filter((item) => item.isActive || item.id === activityJobId)}
              onUnitTitleChange={setUnitTitle}
              onGroupChange={setActivityGroupId}
              onJobChange={setActivityJobId}
              onPreviousOccupationChange={setPreviousOccupation}
              onPosCountChange={setPosCount}
              onSubmit={completeActivity}
            />
            {activityJobId ? (
              <section className="space-y-3 border-t border-teal-100 pt-4">
                <FormSectionTitle icon={Files}>{t('cases.activityDocumentsTitle')}</FormSectionTitle>
                <p className="text-sm text-ink-500">{t('cases.activityDocumentsHint')}</p>
                {activityDocuments.length === 0 ? (
                  documentCatalog.isLoading || jobs.isLoading ? null : (
                    <FormEmptyHint>{t('cases.activityDocumentsEmpty')}</FormEmptyHint>
                  )
                ) : (
                  <CaseDocumentList
                    items={activityDocuments}
                    stored={storedDocuments.data ?? []}
                    uploadingId={uploadingId}
                    disabled={!person?.id}
                    framed
                    onFile={(documentId, file) => void upload(documentId, file, activityJobId)}
                  />
                )}
              </section>
            ) : null}
          </div>
        </FormCard>
      ) : null}

      {step === 2 ? (
        <FormCard
          icon={MapPin}
          title={t('cases.steps.location')}
          action={
            <Button type="button" onClick={() => void completeLocation()}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveLocation')}
            </Button>
          }
        >
          <div className={formCardBodyClassName}>
            <CaseLocationStep
              value={location}
              cities={(cities.data ?? []).filter((item) => item.isActive || item.id === location.cityId)}
              complexes={(complexes.data ?? []).filter((item) => item.isActive || item.id === location.complexId)}
              places={(registrationPlaces.data ?? []).filter(
                (item) => item.isActive || item.id === location.registrationPlaceId,
              )}
              locale={locale}
              onChange={(patch) => setLocation((current) => ({ ...current, ...patch }))}
              onSubmit={() => void completeLocation()}
            />
          </div>
        </FormCard>
      ) : null}

      {step === FORMATION_STEPS.indexOf('inquiries') && person?.id ? (
        <CaseInquiriesStep
          userId={person.id}
          items={caseInquiries.data ?? []}
          loading={caseInquiries.isLoading}
          autoAdvance={reached < PLACES_FORMATION_STEP}
          onAdvanced={(formationStep) => {
            setPerson((current) => (current ? { ...current, formationStep } : current))
            setReached((current) => Math.max(current, formationStep))
            setStep(formationStep)
          }}
        />
      ) : null}

      {step === PLACES_FORMATION_STEP && person?.id ? (
        <CasePlacesStep
          userId={person.id}
          item={casePlaces.data ?? null}
          loading={casePlaces.isLoading}
          autoAdvance={reached < MANAGEMENT_FORMATION_STEP}
          onAdvanced={(formationStep) => {
            setPerson((current) => (current ? { ...current, formationStep } : current))
            setReached((current) => Math.max(current, formationStep))
            setStep(formationStep)
          }}
        />
      ) : null}

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

function FormationStepRing({
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-teal-100"
          strokeWidth={stroke}
        />
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
