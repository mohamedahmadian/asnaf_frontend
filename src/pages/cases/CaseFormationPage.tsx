import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  CalendarDays,
  Check,
  FilePlus,
  Files,
  Fingerprint,
  IdCard,
  Info,
  Landmark,
  MapPin,
  ScanSearch,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { formatNumber } from '../../lib/datetime'
import { useDoubleSaveShortcut } from '../../hooks/useEscapeLeave'
import { api, getApiErrorMessage } from '../../lib/api'
import { CASE_DETAILS_VIEW } from '../../lib/nav-path'
import { hasPermission } from '../../lib/roles'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { City, CommercialComplex, Country, Job, JobGroup, RegistrationPlace } from '../../types/app'
import { ActivityLicensePanel } from './ActivityLicensePanel'
import { CaseActivityStep } from './CaseActivityStep'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import { CasePlacesStep } from './CasePlacesStep'
import type { CaseInquiryRow } from './inquiry-types'
import { CaseLocationStep } from './CaseLocationStep'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseIdentityFields } from './CaseIdentityFields'
import { useCaseCapabilities } from './case-capabilities'
import { DeleteCaseButton, useCaseDelete } from './useCaseDelete'
import {
  FORMATION_STEPS,
  ISSUANCE_FORMATION_STEP,
  MANAGEMENT_FORMATION_STEP,
  PLACES_FORMATION_STEP,
  emptyLocationForm,
  emptyPerson,
  fillPerson,
  locationFormFrom,
  matchesDocumentGender,
  type CaseActivity,
  type CaseLocation,
  type DocumentTypeRow,
  type LocationForm,
  type IdentityPerson,
  type StoredVersion,
} from './formation-types'

function focusRequiredField(id: string) {
  const el = document.getElementById(id)
  if (!(el instanceof HTMLElement)) return
  el.focus({ preventScroll: true, focusVisible: true })
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

type FormationCase = {
  id: string
  formationStep: number
  trackingCode: string | null
  licenseIssuedAt: string | null
  activity: CaseActivity | null
  location: CaseLocation | null
}

export function CaseFormationPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedNationalId = normalizeNationalId(searchParams.get('nationalId') ?? '')
  const requestedCaseId = searchParams.get('caseId') ?? ''
  const detailsView = searchParams.get('view') === CASE_DETAILS_VIEW
  const { user, admin, placesViewer, managementReviewer, issuerViewer, canIssue, formLocked, managementRoleIds } =
    useCaseCapabilities()
  const focusPlaces = placesViewer && searchParams.get('focus') === 'places'
  const focusManagement = managementReviewer && searchParams.get('focus') === 'management'
  const focusIssuance = issuerViewer && searchParams.get('focus') === 'issuance'

  useEffect(() => {
    if (detailsView && requestedCaseId) {
      navigate(`/cases/${requestedCaseId}`, { replace: true })
    }
  }, [detailsView, navigate, requestedCaseId])
  const [nationalId, setNationalId] = useState(() =>
    isValidIranianNationalId(requestedNationalId) ? requestedNationalId : '2280283972',
  )
  const [lookup, setLookup] = useState<'idle' | 'found' | 'missing'>('idle')
  const [person, setPerson] = useState<IdentityPerson | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [startNew, setStartNew] = useState(false)
  const [openCasePrompt, setOpenCasePrompt] = useState<{
    person: IdentityPerson
    file: FormationCase
  } | null>(null)
  const [tab, setTab] = useState<'identity' | 'documents'>('identity')
  const pendingFocusId = useRef<string | null>(null)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [unitTitle, setUnitTitle] = useState('')
  const [activityGroupId, setActivityGroupId] = useState('')
  const [activityJobId, setActivityJobId] = useState('')
  const [licenseIssuedAt, setLicenseIssuedAt] = useState<string | null>(null)
  const canManageCases =
    hasPermission(user, 'cases.management') && !placesViewer && !managementReviewer && !issuerViewer
  const { askDelete, dialog: deleteDialog } = useCaseDelete(caseId)
  const showHeaderDelete = canManageCases && Boolean(caseId) && !licenseIssuedAt
  const [previousOccupation, setPreviousOccupation] = useState('')
  const [posCount, setPosCount] = useState('')
  const [location, setLocation] = useState<LocationForm>(emptyLocationForm)
  const [locationEpoch, setLocationEpoch] = useState(0)
  const registrationPlaceTouched = useRef(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
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
  const storedActivityDocuments = useQuery({
    queryKey: ['cases', 'activity-documents', caseId],
    enabled: Boolean(caseId),
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>(
          '/cases/formation/activity-documents',
          { params: { caseId } },
        )
      ).data,
  })
  const caseInquiries = useQuery({
    queryKey: ['cases', 'formation-inquiries', caseId],
    enabled: Boolean(caseId) && (step >= FORMATION_STEPS.indexOf('inquiries') || reached >= FORMATION_STEPS.indexOf('inquiries')),
    queryFn: async () =>
      (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { caseId } })).data,
  })
  const casePlaces = useQuery({
    queryKey: ['cases', 'formation-places', caseId],
    enabled: Boolean(caseId) && (step >= PLACES_FORMATION_STEP || reached >= PLACES_FORMATION_STEP),
    queryFn: async () =>
      (await api.get<CaseInquiryRow | null>('/cases/formation/places', { params: { caseId } })).data,
  })
  const managementApprovers = useQuery({
    queryKey: ['cases', 'formation-management-approvers', caseId],
    enabled: Boolean(caseId) && (step >= MANAGEMENT_FORMATION_STEP || reached >= MANAGEMENT_FORMATION_STEP),
    queryFn: async () =>
      (
        await api.get<CaseManagementApproverRow[]>('/cases/formation/management-approvers', {
          params: { caseId },
        })
      ).data,
  })

  useEffect(() => {
    const qeshm = (cities.data ?? []).find(
      (city) => city.nameFa.trim() === 'قشم' || city.nameEn.trim().toLowerCase() === 'qeshm',
    )
    if (!qeshm) return
    setLocation((current) => (current.cityId ? current : { ...current, cityId: qeshm.id }))
  }, [cities.data, location.cityId])

  function assignLocation(next: LocationForm) {
    registrationPlaceTouched.current = false
    setLocation(next)
    setLocationEpoch((value) => value + 1)
  }

  useEffect(() => {
    if (registrationPlaceTouched.current) return
    const place = (registrationPlaces.data ?? []).find((item) => item.isDefault && item.isActive)
    if (!place) return
    setLocation((current) =>
      current.registrationPlaceId ? current : { ...current, registrationPlaceId: place.id },
    )
  }, [registrationPlaces.data, locationEpoch])

  function applyActivity(activity: CaseActivity | null) {
    setUnitTitle(activity?.businessUnitTitle ?? '')
    setActivityGroupId(activity?.jobGroupId ?? '')
    setActivityJobId(activity?.jobId ?? '')
    setPreviousOccupation(activity?.previousOccupation ?? '')
    setPosCount(activity?.posDeviceCount == null ? '' : String(activity.posDeviceCount))
  }

  const visibleDocuments = useMemo(() => {
    return (documentTypes.data ?? []).filter((item) => matchesDocumentGender(item.gender, person?.gender))
  }, [documentTypes.data, person?.gender])

  const activityRequirements = useQuery({
    queryKey: ['cases', 'activity-requirements', caseId, activityJobId],
    enabled: Boolean(caseId),
    queryFn: async () =>
      (
        await api.get<DocumentTypeRow[]>('/cases/formation/activity-requirements', {
          params: { caseId, jobId: activityJobId || undefined },
        })
      ).data,
  })
  const activityDocuments = activityRequirements.data ?? []
  const requiredActivityCount = activityDocuments.filter((item) => item.isRequired).length
  const optionalActivityCount = activityDocuments.length - requiredActivityCount
  const activityDocumentsCountLabel =
    requiredActivityCount > 0 && optionalActivityCount > 0
      ? t('cases.activityDocumentsCount', {
          required: formatNumber(requiredActivityCount, locale),
          optional: formatNumber(optionalActivityCount, locale),
        })
      : requiredActivityCount > 0
        ? t('cases.activityDocumentsRequiredOnly', {
            required: formatNumber(requiredActivityCount, locale),
          })
        : optionalActivityCount > 0
          ? t('cases.activityDocumentsOptionalOnly', {
              optional: formatNumber(optionalActivityCount, locale),
            })
          : null

  const inquiriesReady = useMemo(() => {
    if (reached < PLACES_FORMATION_STEP && step < PLACES_FORMATION_STEP) return true
    if (caseInquiries.isLoading) return null
    if (!caseInquiries.data) return null
    return caseInquiries.data.every((item) => item.status !== 'PENDING')
  }, [caseInquiries.data, caseInquiries.isLoading, reached, step])

  const identityDocumentsReady = useMemo(() => {
    if (documentTypes.isLoading) return null
    if (person?.id && storedDocuments.isLoading) return null
    const uploaded = new Set(
      (storedDocuments.data ?? []).filter((row) => row.current).map((row) => row.documentId),
    )
    return visibleDocuments.every((item) => !item.isRequired || uploaded.has(item.id))
  }, [documentTypes.isLoading, person?.id, storedDocuments.data, storedDocuments.isLoading, visibleDocuments])

  const activityDocsMissing = useMemo(() => {
    if (!activityJobId || !caseId || activityRequirements.isLoading || storedActivityDocuments.isLoading) return false
    const uploaded = new Set(
      (storedActivityDocuments.data ?? []).filter((row) => row.current).map((row) => row.documentId),
    )
    return activityDocuments.some((item) => item.isRequired && !uploaded.has(item.id))
  }, [
    activityDocuments,
    activityJobId,
    caseId,
    activityRequirements.isLoading,
    storedActivityDocuments.data,
    storedActivityDocuments.isLoading,
  ])

  const activityDocumentsReady = useMemo(() => {
    if (!activityJobId || !caseId) return false
    if (activityRequirements.isLoading || storedActivityDocuments.isLoading) return null
    const uploaded = new Set(
      (storedActivityDocuments.data ?? []).filter((row) => row.current).map((row) => row.documentId),
    )
    return activityDocuments.every((item) => !item.isRequired || uploaded.has(item.id))
  }, [
    activityDocuments,
    activityJobId,
    caseId,
    activityRequirements.isLoading,
    storedActivityDocuments.data,
    storedActivityDocuments.isLoading,
  ])

  function applyCase(nextPerson: IdentityPerson, file: FormationCase, notify: boolean) {
    const filled = fillPerson({
      ...nextPerson,
      formationStep: file.formationStep,
      caseTrackingCode: file.trackingCode,
      caseId: file.id,
    })
    const resume = Math.min(Math.max(filled.formationStep, 0), FORMATION_STEPS.length - 1)
    setPerson(filled)
    setCaseId(file.id)
    setLicenseIssuedAt(file.licenseIssuedAt)
    setStartNew(false)
    applyActivity(file.activity)
    assignLocation(locationFormFrom(file.location))
    setLookup('found')
    setReached(resume)
    setStep(
      focusPlaces
        ? PLACES_FORMATION_STEP
        : focusManagement
          ? MANAGEMENT_FORMATION_STEP
          : focusIssuance
            ? ISSUANCE_FORMATION_STEP
            : resume,
    )
    setOpenCasePrompt(null)
    if (notify) toast.success(t('cases.found'))
  }

  function applyFresh(nextPerson: IdentityPerson, notify: boolean) {
    const filled = fillPerson({
      ...nextPerson,
      formationStep: 0,
      caseTrackingCode: null,
      caseId: null,
    })
    setPerson(filled)
    setCaseId(null)
    setLicenseIssuedAt(null)
    setStartNew(true)
    applyActivity(null)
    assignLocation(emptyLocationForm())
    setLookup('found')
    setReached(0)
    setStep(0)
    setOpenCasePrompt(null)
    if (notify) toast.success(t('cases.found'))
  }

  async function lookupPerson(raw = nationalId, notify = true, openCaseId?: string) {
    const normalized = normalizeNationalId(raw)
    if (!isValidIranianNationalId(normalized)) {
      if (notify) toast.error(t('users.nationalIdInvalid'))
      return
    }
    try {
      const { data } = await api.get<{
        found: boolean
        person: IdentityPerson | null
        openCase: FormationCase | null
        requestedCase: FormationCase | null
        hasIssuedCase: boolean
      }>('/cases/formation/identity', {
        params: { nationalId: normalized, caseId: openCaseId || undefined },
      })
      if (data.found && data.person) {
        if (data.requestedCase) applyCase(data.person, data.requestedCase, notify)
        else if (data.openCase) {
          setOpenCasePrompt({ person: fillPerson(data.person), file: data.openCase })
          setPerson(null)
          setCaseId(null)
          setStartNew(false)
          setLookup('idle')
          setReached(0)
          setStep(0)
        } else applyFresh(data.person, notify)
      } else {
        setOpenCasePrompt(null)
        setPerson(emptyPerson(normalized))
        setCaseId(null)
        setStartNew(true)
        applyActivity(null)
        assignLocation(emptyLocationForm())
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
    void lookupRef.current(requestedNationalId, false, requestedCaseId || undefined)
  }, [requestedCaseId, requestedNationalId])

  useEffect(() => {
    const id = pendingFocusId.current
    if (!id) return
    pendingFocusId.current = null
    const frame = requestAnimationFrame(() => focusRequiredField(id))
    return () => cancelAnimationFrame(frame)
  }, [tab])

  function rejectRequired(id: string, message: string) {
    toast.error(message)
    const onHiddenIdentity = tab !== 'identity' && (id === 'case-first-name' || id === 'case-last-name')
    if (onHiddenIdentity) {
      pendingFocusId.current = id
      setTab('identity')
      return
    }
    focusRequiredField(id)
  }

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
        caseId: startNew ? null : caseId,
        startNew,
      })
      return data
    },
    onSuccess: (data) => {
      setPerson(fillPerson(data))
      setCaseId(data.caseId)
      setStartNew(false)
      setLookup('found')
      toast.success(t('cases.saved'))
      setReached((current) => Math.max(current, data.formationStep ?? 1, 1))
      setStep(1)
      void queryClient.invalidateQueries({ queryKey: ['cases', 'documents', data.id] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('cases.saveFailed'))),
  })

  function rewindTo(index: number) {
    setPerson((current) => (current ? { ...current, formationStep: index } : current))
    setReached(index)
    setStep(index)
    void queryClient.invalidateQueries({ queryKey: ['cases', 'list'] })
  }

  function goToStep(index: number) {
    if (formLocked) {
      if (index > reached) return
      setStep(index)
      return
    }
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
    if (formLocked) return
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
  }, [activityDocumentsReady, inquiriesReady, formLocked, step, t])

  function submitIdentity() {
    if (!person) return
    if (!person.firstName.trim()) {
      rejectRequired('case-first-name', t('cases.firstNameRequired'))
      return
    }
    if (!person.lastName.trim()) {
      rejectRequired('case-last-name', t('cases.lastNameRequired'))
      return
    }
    save.mutate()
  }

  async function completeActivity() {
    if (!unitTitle.trim()) {
      rejectRequired('case-unit-title', t('cases.unitTitleRequired'))
      return
    }
    if (!activityJobId) {
      rejectRequired('case-activity-job', t('cases.activityJobRequired'))
      return
    }
    if (!caseId) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    try {
      const { data } = await api.post<{ formationStep: number; activity: CaseActivity }>('/cases/formation/activity', {
        caseId,
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
      rejectRequired('case-premise-city', t('cases.locationCityRequired'))
      return
    }
    if (!location.establishment) {
      rejectRequired('case-establishment', t('cases.locationEstablishmentRequired'))
      return
    }
    const commercialComplex = location.establishment === 'COMMERCIAL_COMPLEX'
    if (commercialComplex && !location.complexId) {
      rejectRequired('case-complex', t('cases.locationComplexRequired'))
      return
    }
    if (!location.address.trim()) {
      rejectRequired('case-premise-address', t('cases.locationAddressRequired'))
      return
    }
    if (location.area.trim() === '' || Number.isNaN(Number(location.area))) {
      rejectRequired('case-area', t('cases.locationAreaRequired'))
      return
    }
    if (!location.ownership) {
      rejectRequired('case-ownership', t('cases.locationOwnershipRequired'))
      return
    }
    if (!caseId) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    try {
      const { data } = await api.post<{ formationStep: number; location: CaseLocation }>(
        '/cases/formation/location',
        {
          caseId,
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
      if (step === 0) submitIdentity()
      else if (step === 1) void completeActivity()
      else void completeLocation()
    },
  )

  async function upload(
    documentId: string,
    file: File,
    activity?: { caseId: string; jobId: string; other?: boolean } | { other: true },
  ) {
    const activityFile = activity && 'caseId' in activity ? activity : null
    if (!person?.id || (activityFile && !activityFile.caseId)) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('userId', person.id)
      body.append('documentId', documentId)
      if (activityFile) {
        body.append('caseId', activityFile.caseId)
        body.append('jobId', activityFile.jobId)
        if (activityFile.other) body.append('scope', 'other')
      } else if (activity && 'other' in activity) {
        body.append('scope', 'other')
      }
      body.append('file', prepared)
      await api.post('/cases/formation/documents', body)
      toast.success(t('cases.documentUploaded'))
      await queryClient.invalidateQueries({
        queryKey: activityFile
          ? ['cases', 'activity-documents', activityFile.caseId]
          : ['cases', 'documents', person.id],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  async function removeDocument(documentId: string, activityCaseId?: string) {
    if (!person?.id) return
    setRemovingId(documentId)
    try {
      await api.delete(`/cases/formation/documents/${documentId}`, {
        params: activityCaseId ? { userId: person.id, caseId: activityCaseId } : { userId: person.id },
      })
      toast.success(t('cases.documentRemoved'))
      await queryClient.invalidateQueries({
        queryKey: activityCaseId
          ? ['cases', 'activity-documents', activityCaseId]
          : ['cases', 'documents', person.id],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setRemovingId(null)
    }
  }

  const pastIdentity = reached >= 1 && person != null
  const fullName = person ? `${person.firstName} ${person.lastName}`.replace(/\s+/g, ' ').trim() : ''
  const activityJobTitle = (jobs.data ?? []).find((item) => item.id === activityJobId)?.title ?? ''
  const stepTotal = FORMATION_STEPS.length
  const stepCurrent = Math.min(reached + 1, stepTotal)

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={detailsView ? Files : FilePlus}
        title={detailsView ? t('cases.details') : t('menus.caseFormation')}
        backTo={requestedCaseId ? `/cases/${requestedCaseId}?stay=1` : undefined}
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
              {fullName ? (
                <HeaderBadge icon={UserRound}>
                  <span>{fullName}</span>
                </HeaderBadge>
              ) : null}
              {person.nationalId ? (
                <HeaderBadge icon={Fingerprint}>
                  <span className="text-teal-700">{t('users.nationalId')}</span>
                  <CopyableDigits value={person.nationalId} />
                </HeaderBadge>
              ) : null}
              {activityJobTitle ? (
                <HeaderBadge icon={Briefcase}>
                  <span className="text-teal-700">{t('cases.activityJob')}</span>
                  <span>{activityJobTitle}</span>
                </HeaderBadge>
              ) : null}
              {licenseIssuedAt ? (
                <HeaderBadge icon={CalendarDays}>
                  <span className="text-teal-700">{t('cases.listIssued')}</span>
                  <DateText value={licenseIssuedAt} />
                </HeaderBadge>
              ) : null}
            </span>
          ) : (
            t('cases.formationSubtitle')
          )
        }
        action={
          <>
            {showHeaderDelete ? <DeleteCaseButton onClick={() => void askDelete()} /> : null}
            <Button type="button" variant="ghost" onClick={() => toast.message(t('cases.feesHint'))}>
              <Landmark className="size-4" aria-hidden />
              {t('cases.fees')}
            </Button>
          </>
        }
      />

      <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {FORMATION_STEPS.map((item, index) => {
          const done = index < reached
          const current = index === reached
          const identityDocsMissing = Boolean(person?.id) && identityDocumentsReady === false
          const docsMissing =
            (done || current) &&
            ((index === 0 && identityDocsMissing) || (index === 1 && activityDocsMissing))
          const tone = docsMissing
            ? 'cursor-pointer border-orange-400 bg-white text-ink-800'
            : done
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
                    docsMissing
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : current
                        ? 'case-step-num-pulse border-emerald-500 bg-emerald-500 text-white'
                        : done
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-transparent bg-cream-100 text-ink-700'
                  }`}
                >
                  {formatNumber(index + 1, locale)}
                </span>
                <span className="text-center leading-5">{t(`cases.steps.${item}`)}</span>
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

      {step === 0 ? (
      <FormCard
        icon={UserRound}
        title={t('cases.steps.identity')}
        action={
          person && !formLocked ? (
            <Button type="button" disabled={save.isPending} onClick={submitIdentity}>
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
                  if (!formLocked) void lookupPerson()
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
                      readOnly={formLocked}
                      onChange={(event) => {
                        if (!formLocked) setNationalId(event.target.value)
                      }}
                    />
                  </FormField>
                </div>
                {formLocked ? null : (
                <Button type="submit" className="w-fit">
                  <ScanSearch className="size-4" aria-hidden />
                  {t('cases.lookup')}
                </Button>
                )}
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
                    locked={formLocked}
                    onChange={(key, value) =>
                      setPerson((current) => (current ? { ...current, [key]: value } : current))
                    }
                    onSubmit={submitIdentity}
                  />
                ) : documentTypes.isLoading ? null : (
                  <CaseDocumentList
                    items={visibleDocuments}
                    stored={storedDocuments.data ?? []}
                    uploadingId={uploadingId}
                    removingId={removingId}
                    disabled={!person.id}
                    readOnly={formLocked}
                    layout="tabs"
                    showOtherDocuments
                    otherReservedIds={(documentTypes.data ?? []).map((item) => item.id)}
                    onFile={(documentId, file) => void upload(documentId, file)}
                    onOtherFile={(documentId, file) => void upload(documentId, file, { other: true })}
                    onDelete={(documentId) => void removeDocument(documentId)}
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
            formLocked ? undefined : (
            <Button type="button" onClick={completeActivity}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveActivity')}
            </Button>
            )
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
              locked={formLocked}
            />
            {activityJobId ? (
              <section className="space-y-3 border-t border-teal-100 pt-4">
                <FormSectionTitle icon={Files} className="mb-2.5 flex-wrap">
                  <span>{t('cases.activityDocumentsTitle')}</span>
                  {activityDocumentsCountLabel ? (
                    <span className="font-medium text-ink-500">{activityDocumentsCountLabel}</span>
                  ) : null}
                </FormSectionTitle>
                {activityDocuments.some((item) => item.isRequired) ? (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-7 text-ink-700"
                  >
                    <Info className="case-doc-hint-blink mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden />
                    <p>{t('cases.activityDocumentsHint')}</p>
                  </div>
                ) : null}
                {activityRequirements.isLoading || jobs.isLoading ? null : (
                  <CaseDocumentList
                    items={activityDocuments}
                    stored={storedActivityDocuments.data ?? []}
                    uploadingId={uploadingId}
                    removingId={removingId}
                    disabled={!caseId}
                    readOnly={formLocked}
                    layout="tabs"
                    emphasizeRequired
                    showOtherDocuments
                    otherReservedIds={activityDocuments.map((item) => item.id)}
                    onFile={(documentId, file) => {
                      if (!caseId) return
                      void upload(documentId, file, { caseId, jobId: activityJobId })
                    }}
                    onOtherFile={(documentId, file) => {
                      if (!caseId) return
                      void upload(documentId, file, { caseId, jobId: activityJobId, other: true })
                    }}
                    onDelete={(documentId) => {
                      if (!caseId) return
                      void removeDocument(documentId, caseId)
                    }}
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
          subtitle={t('cases.locationCardSubtitle')}
          action={
            formLocked ? undefined : (
            <Button type="button" onClick={() => void completeLocation()}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveLocation')}
            </Button>
            )
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
              onChange={(patch) => {
                if (formLocked) return
                if ('registrationPlaceId' in patch) registrationPlaceTouched.current = true
                setLocation((current) => ({ ...current, ...patch }))
              }}
              onSubmit={() => {
                if (!formLocked) void completeLocation()
              }}
              locked={formLocked}
            />
          </div>
        </FormCard>
      ) : null}

      {step === FORMATION_STEPS.indexOf('inquiries') && caseId ? (
        <CaseInquiriesStep
          caseId={caseId}
          items={caseInquiries.data ?? []}
          loading={caseInquiries.isLoading}
          autoAdvance={
            admin &&
            reached < PLACES_FORMATION_STEP &&
            identityDocumentsReady === true &&
            (!activityJobId || activityDocumentsReady === true)
          }
          showAdvance={admin}
          actorId={user?.id}
          adminDecide={admin}
          documentsPending={identityDocumentsReady === false || activityDocsMissing}
          onRewound={() => rewindTo(FORMATION_STEPS.indexOf('inquiries'))}
          onAdvanced={(formationStep) => {
            setPerson((current) => (current ? { ...current, formationStep } : current))
            setReached((current) => Math.max(current, formationStep))
            setStep(formationStep)
          }}
        />
      ) : null}

      {step === PLACES_FORMATION_STEP && caseId ? (
        <CasePlacesStep
          caseId={caseId}
          item={casePlaces.data ?? null}
          loading={casePlaces.isLoading}
          autoAdvance={admin && reached < MANAGEMENT_FORMATION_STEP}
          locked={!admin && !placesViewer}
          answerOnly={placesViewer && !admin}
          showAdvance={admin}
          onRewound={() => rewindTo(PLACES_FORMATION_STEP)}
          onAdvanced={(formationStep) => {
            setPerson((current) => (current ? { ...current, formationStep } : current))
            setReached((current) => Math.max(current, formationStep))
            setStep(formationStep)
          }}
        />
      ) : null}

      {step === MANAGEMENT_FORMATION_STEP && caseId ? (
        <CaseManagementReviewStep
          caseId={caseId}
          items={managementApprovers.data ?? []}
          loading={managementApprovers.isLoading}
          autoAdvance={admin && reached < ISSUANCE_FORMATION_STEP}
          locked={false}
          ownRoleIds={managementRoleIds}
          showAdvance={admin}
          onRewound={() => rewindTo(MANAGEMENT_FORMATION_STEP)}
          onAdvanced={(formationStep) => {
            setPerson((current) => (current ? { ...current, formationStep } : current))
            setReached((current) => Math.max(current, formationStep))
            setStep(formationStep)
          }}
        />
      ) : null}

      {step === ISSUANCE_FORMATION_STEP && caseId ? (
        <ActivityLicensePanel caseId={caseId} readOnly={!canIssue} onIssued={setLicenseIssuedAt} />
      ) : null}

      {openCasePrompt ? (
        <OpenCaseModal
          jobGroupTitle={openCasePrompt.file.activity?.jobGroupTitle ?? null}
          jobTitle={openCasePrompt.file.activity?.jobTitle ?? null}
          unitTitle={openCasePrompt.file.activity?.businessUnitTitle ?? null}
          locale={locale}
          onResume={() => applyCase(openCasePrompt.person, openCasePrompt.file, true)}
          onNew={() => applyFresh(openCasePrompt.person, false)}
          onClose={() => setOpenCasePrompt(null)}
        />
      ) : null}
      {deleteDialog}
    </div>
  )
}

function OpenCaseFact({ label, value }: { label: string; value: string | null }) {
  return (
    <p className="min-w-0 text-sm leading-6 text-ink-800">
      <span className="text-ink-500">{label} : </span>
      <span>{value?.trim() || '—'}</span>
    </p>
  )
}

function OpenCaseModal({
  jobGroupTitle,
  jobTitle,
  unitTitle,
  locale,
  onResume,
  onNew,
  onClose,
}: {
  jobGroupTitle: string | null
  jobTitle: string | null
  unitTitle: string | null
  locale: string
  onResume: () => void
  onNew: () => void
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

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/30 p-4" role="dialog" aria-modal="true" aria-labelledby="open-case-title">
      <div className="max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_16px_40px_rgba(20,40,40,0.16)]">
        <h2 id="open-case-title" className="text-lg font-semibold text-ink-900">
          {t('cases.openCaseTitle')}
        </h2>
        <p className="mt-2 text-sm leading-7 text-ink-600">{t('cases.openCaseHint')}</p>
        <p className="mt-4 text-sm font-medium text-ink-800">{t('cases.openCaseChoose')}</p>
        <div className="mt-3 space-y-3">
          <section className="rounded-2xl border border-teal-200 bg-cream-50 p-4">
            <h3 className="text-sm font-semibold text-ink-900">
              <span className="text-teal-700">{formatNumber(1, locale)}. </span>
              {t('cases.resumePreviousTitle')}
            </h3>
            <div className="mt-3 grid gap-1 sm:grid-cols-2">
              <OpenCaseFact label={t('cases.activityGroup')} value={jobGroupTitle} />
              <OpenCaseFact label={t('cases.activityJob')} value={jobTitle} />
              <div className="sm:col-span-2">
                <OpenCaseFact label={t('cases.openCaseUnitLabel')} value={unitTitle} />
              </div>
            </div>
            <Button type="button" className="mt-4 w-full" onClick={onResume}>
              <Check className="size-4" aria-hidden />
              {t('cases.resumePreviousAction')}
            </Button>
          </section>
          <Button type="button" variant="soft" className="h-auto w-full whitespace-normal py-3" onClick={onNew}>
            <span className="flex w-full flex-col items-start gap-1 text-start">
              <span className="inline-flex items-center gap-2 font-semibold">
                <FilePlus className="size-4 shrink-0" aria-hidden />
                {formatNumber(2, locale)}. {t('cases.startNewCase')}
              </span>
              <span className="text-xs font-normal leading-6 text-white/90">{t('cases.startNewCaseHint')}</span>
            </span>
          </Button>
          <Button type="button" variant="ghost" className="h-auto w-full whitespace-normal py-3" onClick={onClose}>
            <span className="flex w-full flex-col items-start gap-1 text-start">
              <span className="font-semibold">
                {formatNumber(3, locale)}. {t('common.cancel')}
              </span>
              <span className="text-xs font-normal leading-6 text-ink-600">{t('cases.openCaseCancelHint')}</span>
            </span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function HeaderBadge({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
      <Icon className="size-4 shrink-0" aria-hidden />
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
