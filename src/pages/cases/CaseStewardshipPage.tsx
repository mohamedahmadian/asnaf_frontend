import { BadgeCheck, Building2, CalendarDays, Check, Eye, FileBadge2, IdCard, UserRound, type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, FormField, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { api, getApiErrorMessage } from '../../lib/api'
import { addYearsIso, formatNumber, todayIsoDate } from '../../lib/datetime'
import { optimizeImageFile } from '../../lib/optimize-image'
import type { Country, Job } from '../../types/app'
import { CaseDocumentList } from './CaseDocumentList'
import { CaseIdentityFields } from './CaseIdentityFields'
import { CaseInquiriesStep } from './CaseInquiriesStep'
import { CaseManagementReviewStep, type CaseManagementApproverRow } from './CaseManagementReviewStep'
import { CasePlacesStep } from './CasePlacesStep'
import { CaseStewardCard } from './CaseStewardCard'
import { useCaseCapabilities } from './case-capabilities'
import {
  STEWARDSHIP_ISSUANCE_STEP,
  STEWARDSHIP_STEPS,
  fillPerson,
  matchesDocumentGender,
  type DocumentTypeRow,
  type IdentityPerson,
  type StoredVersion,
} from './formation-types'
import type { CaseInquiryRow } from './inquiry-types'

function focusIdentityField(id: string) {
  const el = document.getElementById(id)
  if (!(el instanceof HTMLElement)) return
  el.focus({ preventScroll: true })
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

type StewardState = {
  id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'
  formationStep: number
  cardNumber: string | null
  cardIssuedAt: string | null
  cardExpiresAt: string | null
  revokeReason: string | null
  revokeSource: 'HOST' | 'STEWARD' | 'LICENSE' | null
  request: { id: string; number: string; status: string; formationStep: number } | null
  person: IdentityPerson
  host: {
    id: string
    licenseNumber: string | null
    businessUnitTitle: string | null
    licenseIssuedAt: string | null
    licenseExpiresAt: string | null
    firstName: string
    lastName: string
    fullName: string
  } | null
}

export function CaseStewardshipPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user, admin, placesViewer, managementReviewer, issuerViewer, canForm, canIssue, managementRoleIds } =
    useCaseCapabilities()
  const focusPlaces = placesViewer && searchParams.get('focus') === 'places'
  const focusManagement = managementReviewer && searchParams.get('focus') === 'management'
  const focusIssuance = issuerViewer && searchParams.get('focus') === 'issuance'
  const placesFocused = useRef(false)
  const managementFocused = useRef(false)
  const issuanceFocused = useRef(false)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [viewStep, setViewStep] = useState<number | null>(null)
  const [tab, setTab] = useState<'identity' | 'documents'>('identity')
  const pendingFocusId = useRef<string | null>(null)
  const [person, setPerson] = useState<IdentityPerson | null>(null)
  const [saving, setSaving] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [issuedAt, setIssuedAt] = useState(todayIsoDate())
  const contract = useQuery({
    queryKey: ['cases', 'general-settings'],
    queryFn: async () =>
      (await api.get<{ stewardContractYears: number }>('/cases/settings/general')).data,
  })
  const cardYears = contractYears(contract.data?.stewardContractYears)
  const cardExpiresAt = cardYears == null ? '' : addYearsIso(issuedAt, cardYears)

  const state = useQuery({
    queryKey: ['cases', 'stewardship', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<StewardState>(`/cases/${id}/stewardship`)).data,
  })
  const item = state.data
  const reached = item?.formationStep ?? 0
  const requestId = item?.request?.id
  const open = item?.request?.status === 'OPEN' && item.status !== 'REVOKED'
  const review = Boolean(item) && !open
  const step = viewStep != null && viewStep <= reached ? viewStep : review ? 0 : reached
  useEffect(() => {
    if (!placesViewer || !focusPlaces || placesFocused.current || !item) return
    placesFocused.current = true
    setViewStep(STEWARDSHIP_STEPS.indexOf('places'))
  }, [focusPlaces, item, placesViewer])
  useEffect(() => {
    if (!managementReviewer || !focusManagement || managementFocused.current || !item) return
    managementFocused.current = true
    setViewStep(STEWARDSHIP_STEPS.indexOf('managementReview'))
  }, [focusManagement, item, managementReviewer])
  useEffect(() => {
    if (!issuerViewer || !focusIssuance || issuanceFocused.current || !item) return
    issuanceFocused.current = true
    setViewStep(STEWARDSHIP_STEPS.indexOf('cardIssuance'))
  }, [focusIssuance, issuerViewer, item])

  const countries = useQuery({
    queryKey: ['countries', 'lookup'],
    queryFn: async () => (await api.get<Country[]>('/countries', { params: { activeOnly: true } })).data,
  })
  const jobs = useQuery({
    queryKey: ['jobs', 'lookup'],
    queryFn: async () => (await api.get<Job[]>('/jobs')).data,
  })
  const documentTypes = useQuery({
    queryKey: ['cases', 'document-types'],
    queryFn: async () => (await api.get<DocumentTypeRow[]>('/cases/formation/document-types')).data,
  })
  const identity = person ?? (item ? fillPerson(item.person) : null)
  const storedDocuments = useQuery({
    queryKey: ['cases', 'documents', identity?.id],
    enabled: Boolean(identity?.id),
    queryFn: async () =>
      (
        await api.get<{ documentId: string; current: StoredVersion | null }[]>('/cases/formation/documents', {
          params: { userId: identity?.id },
        })
      ).data,
  })
  const inquiries = useQuery({
    queryKey: ['cases', 'formation-inquiries', id, requestId],
    enabled: Boolean(id && requestId) && step >= 1,
    queryFn: async () =>
      (await api.get<CaseInquiryRow[]>('/cases/formation/inquiries', { params: { caseId: id, requestId } })).data,
  })
  const placesReview = useQuery({
    queryKey: ['cases', 'formation-places', id, requestId],
    enabled: Boolean(id && requestId) && step >= 2,
    queryFn: async () =>
      (await api.get<CaseInquiryRow | null>('/cases/formation/places', { params: { caseId: id, requestId } })).data,
  })
  const reviews = useQuery({
    queryKey: ['cases', 'formation-management-approvers', id, requestId],
    enabled: Boolean(id && requestId) && step >= 3,
    queryFn: async () =>
      (
        await api.get<CaseManagementApproverRow[]>('/cases/formation/management-approvers', {
          params: { caseId: id, requestId },
        })
      ).data,
  })

  const visibleDocuments = useMemo(
    () => (documentTypes.data ?? []).filter((row) => matchesDocumentGender(row.gender, identity?.gender)),
    [documentTypes.data, identity?.gender],
  )

  useEffect(() => {
    const fieldId = pendingFocusId.current
    if (!fieldId) return
    pendingFocusId.current = null
    const frame = requestAnimationFrame(() => focusIdentityField(fieldId))
    return () => cancelAnimationFrame(frame)
  }, [tab])

  function rejectIdentityField(fieldId: string, message: string) {
    toast.error(message)
    if (tab !== 'identity') {
      pendingFocusId.current = fieldId
      setTab('identity')
      return
    }
    focusIdentityField(fieldId)
  }

  async function saveIdentity() {
    if (!identity) return false
    const missing: { id: string; message: string }[] = []
    if (!identity.firstName.trim()) missing.push({ id: 'case-first-name', message: t('cases.firstNameRequired') })
    if (!identity.lastName.trim()) missing.push({ id: 'case-last-name', message: t('cases.lastNameRequired') })
    if (missing.length > 0) {
      rejectIdentityField(missing[0].id, missing.map((item) => item.message).join('، '))
      return false
    }
    setSaving(true)
    try {
      await api.post('/cases/formation/identity', {
        nationalId: identity.nationalId,
        firstName: identity.firstName,
        lastName: identity.lastName,
        fatherName: identity.fatherName || null,
        lastNameEn: identity.lastNameEn || null,
        gender: identity.gender || null,
        religion: identity.religion || null,
        religionOther: identity.religionOther || null,
        birthDate: identity.birthDate || null,
        residencyStatus: identity.residencyStatus || null,
        passportNumber: identity.passportNumber || null,
        nationalCardExpiresAt: identity.nationalCardExpiresAt || null,
        passportExpiresAt: identity.passportExpiresAt || null,
        identityCertificateNo: identity.identityCertificateNo || null,
        birthPlace: identity.birthPlace || null,
        identityIssuedIn: identity.identityIssuedIn || null,
        countryId: identity.countryId || null,
        phone: identity.phone || null,
        homePhone: identity.homePhone || null,
        postalCode: identity.postalCode || null,
        address: identity.address || null,
        email: identity.email || null,
        educationLevel: identity.educationLevel || null,
        citizenGroup: identity.citizenGroup || null,
        jobId: identity.jobId || null,
        caseId: id,
        startNew: false,
      })
      setPerson(null)
      await queryClient.invalidateQueries({ queryKey: ['cases', 'stewardship', id] })
      return true
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function upload(documentId: string, file: File) {
    if (!identity?.id) {
      toast.message(t('cases.saveBeforeDocuments'))
      return
    }
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('userId', identity.id)
      body.append('documentId', documentId)
      body.append('file', prepared)
      await api.post('/cases/formation/documents', body)
      toast.success(t('cases.documentUploaded'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'documents', identity.id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  async function removeDocument(documentId: string) {
    if (!identity?.id) return
    setRemovingId(documentId)
    try {
      await api.delete(`/cases/formation/documents/${documentId}`, { params: { userId: identity.id } })
      toast.success(t('cases.documentRemoved'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'documents', identity.id] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setRemovingId(null)
    }
  }

  async function continueStep() {
    setAdvancing(true)
    try {
      if (step === 0) {
        const saved = await saveIdentity()
        if (!saved) return null
      }
      const { data } = await api.post<{ formationStep: number }>(`/cases/${id}/stewardship/step`, { step: step + 1 })
      setViewStep(null)
      await queryClient.invalidateQueries({ queryKey: ['cases', 'stewardship', id] })
      toast.success(t('cases.saved'))
      return data.formationStep
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
      return null
    } finally {
      setAdvancing(false)
    }
  }

  async function saveIdentityAndOpenInquiries() {
    if (step === 0 && reached === 0) {
      await continueStep()
      return
    }
    const saved = await saveIdentity()
    if (!saved) return
    toast.success(t('cases.saved'))
    if (open) setViewStep(1)
  }

  async function issueCard() {
    if (!issuedAt) {
      toast.error(t('cases.issueLicenseDatesRequired'))
      return
    }
    setAdvancing(true)
    try {
      await api.post(`/cases/${id}/stewardship/issue`, { issuedAt })
      toast.success(t('cases.stewardship.issued'))
      await queryClient.invalidateQueries({ queryKey: ['cases', 'stewardship', id] })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'home', id] })
      navigate(`/cases/${id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setAdvancing(false)
    }
  }

  const nextStepKey = STEWARDSHIP_STEPS[step + 1]
  const continueButton =
    !review && open && nextStepKey && step < STEWARDSHIP_ISSUANCE_STEP && (admin || (canForm && step < 1)) ? (
      <Button type="button" disabled={advancing} onClick={() => void continueStep()}>
        <Check className="size-4" aria-hidden />
        {t('cases.stewardship.continueToStep', { step: t(`cases.steps.${nextStepKey}`) })}
      </Button>
    ) : null

  if (state.isLoading) {
    return (
      <div className={caseShellClassName}>
        <LoadingState />
      </div>
    )
  }
  if (!item || state.isError) {
    return (
      <div className={caseShellClassName}>
        <FormEmptyHint>{t('cases.dossierLoadFailed')}</FormEmptyHint>
      </div>
    )
  }
  const holderName = identity ? `${identity.firstName} ${identity.lastName}`.replace(/\s+/g, ' ').trim() : ''
  const hostPersonName = item.host
    ? [item.host.firstName, item.host.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || item.host.fullName.trim()
    : ''

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={IdCard}
        title={t('cases.stewardship.requestTitle')}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            {holderName ? <EntityNameSubtitle icon={UserRound} name={holderName} /> : null}
            {identity?.nationalId ? (
              <HeaderBadge icon={IdCard}>
                <span className="text-teal-700">{t('users.nationalId')}</span>
                <CopyableDigits value={identity.nationalId} />
              </HeaderBadge>
            ) : null}
            {item.host?.licenseNumber ? (
              <HeaderBadge icon={BadgeCheck}>
                <span className="text-teal-700">{t('cases.stewardship.hostLicense')}</span>
                <CopyableDigits value={item.host.licenseNumber} />
              </HeaderBadge>
            ) : null}
          </span>
        }
        backTo={
          placesViewer
            ? '/cases/places'
            : managementReviewer
              ? '/cases/management-reviews'
              : issuerViewer
                ? '/cases/issuance'
                : review
                  ? `/cases/${id}?stay=1`
                  : item.host
                    ? `/cases/${item.host.id}/dossier`
                    : `/cases/${id}`
        }
      />
      {item.host ? <HostBar host={item.host} /> : null}
      <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {STEWARDSHIP_STEPS.map((key, index) => {
          const done = review ? index <= reached : index < reached
          const current = !review && index === reached
          const tone = done
            ? 'cursor-pointer border-emerald-400 bg-white text-ink-800'
            : current
              ? 'case-step-done-pulse cursor-pointer border-emerald-500 bg-white text-ink-800'
              : 'cursor-default border-line bg-white text-ink-400'
          return (
            <li key={key}>
              <button
                type="button"
                disabled={!done && !current}
                onClick={() => setViewStep(index)}
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
                    current
                      ? 'case-step-num-pulse border-emerald-500 bg-emerald-500 text-white'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-transparent bg-cream-100 text-ink-700'
                  }`}
                >
                  {formatNumber(index + 1, locale)}
                </span>
                <span className="text-center leading-5">{t(`cases.steps.${key}`)}</span>
              </button>
            </li>
          )
        })}
      </ol>

      {step === 0 && identity ? (
        <FormCard
          icon={UserRound}
          title={t('cases.steps.identity')}
          action={
            review || !canForm ? undefined : (
            <Button type="button" disabled={saving || advancing} onClick={() => void saveIdentityAndOpenInquiries()}>
              <Check className="size-4" aria-hidden />
              {t('cases.saveIdentity')}
            </Button>
            )
          }
        >
          <div className={formCardBodyClassName}>
            <div className="flex flex-wrap gap-2">
              {(['identity', 'documents'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`cursor-pointer rounded-2xl px-4 py-2 text-sm ${
                    tab === key ? 'bg-teal-500 text-white' : 'border border-teal-400 bg-white text-ink-700'
                  }`}
                  onClick={() => setTab(key)}
                >
                  {t(key === 'identity' ? 'cases.identityTab' : 'cases.documentsTab')}
                </button>
              ))}
            </div>
            {tab === 'identity' ? (
              <CaseIdentityFields
                person={identity}
                countries={countries.data ?? []}
                jobs={(jobs.data ?? []).filter((row) => row.isActive)}
                locale={locale}
                locked={review || !canForm}
                onChange={(key, value) =>
                  setPerson((current) => ({ ...(current ?? identity), [key]: value }))
                }
                onSubmit={() => {
                  if (!review && canForm) void saveIdentityAndOpenInquiries()
                }}
              />
            ) : (
              <CaseDocumentList
                items={visibleDocuments}
                stored={storedDocuments.data ?? []}
                uploadingId={uploadingId}
                removingId={removingId}
                disabled={!identity.id}
                readOnly={review || !canForm}
                layout="tabs"
                onFile={(documentId, file) => void upload(documentId, file)}
                onDelete={review || !canForm ? undefined : (documentId) => void removeDocument(documentId)}
              />
            )}
            <div className="flex justify-end">{continueButton}</div>
          </div>
        </FormCard>
      ) : null}

      {step === 1 ? (
        <CaseInquiriesStep
          caseId={id}
          items={inquiries.data ?? []}
          loading={inquiries.isLoading}
          autoAdvance={admin && open && reached === 1 && step === 1}
          showAdvance={false}
          actorId={user?.id}
          adminDecide={admin}
          closed={review}
          headerAction={continueButton}
          onAdvanced={() => undefined}
          onAutoAdvance={() => void continueStep()}
          onRewound={() => {
            setViewStep(null)
            void state.refetch()
          }}
        />
      ) : null}
      {step === 2 ? (
        <CasePlacesStep
          caseId={id}
          item={placesReview.data ?? null}
          loading={placesReview.isLoading}
          autoAdvance={admin && open && reached === 2 && step === 2}
          showAdvance={false}
          locked={review || (!admin && !placesViewer)}
          answerOnly={placesViewer && !admin}
          headerAction={continueButton}
          onAdvanced={() => undefined}
          onAutoAdvance={() => void continueStep()}
          onRewound={() => {
            setViewStep(null)
            void state.refetch()
          }}
        />
      ) : null}
      {step === 3 ? (
        <CaseManagementReviewStep
          caseId={id}
          items={reviews.data ?? []}
          loading={reviews.isLoading}
          autoAdvance={false}
          showAdvance={false}
          locked={review}
          ownRoleIds={managementRoleIds}
          headerAction={continueButton}
          onAdvanced={() => undefined}
          onRewound={() => {
            setViewStep(null)
            void state.refetch()
          }}
        />
      ) : null}
      {step === 4 ? (
        <FormCard icon={BadgeCheck} title={t('cases.stewardship.issueTitle')}>
          <div className={formCardBodyClassName}>
            <FormSectionTitle icon={FileBadge2} className="">
              {t('cases.stewardship.relatedLicense')}
            </FormSectionTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.licenseIssued')}
                  value={item.host?.licenseIssuedAt ? <DateText value={item.host.licenseIssuedAt} /> : '—'}
                  empty={!item.host?.licenseIssuedAt}
                  tone="teal"
                />
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.licenseExpires')}
                  value={item.host?.licenseExpiresAt ? <DateText value={item.host.licenseExpiresAt} /> : '—'}
                  empty={!item.host?.licenseExpiresAt}
                  tone="mint"
                />
              </div>
              <LicenseRemainingChart
                issuedAt={item.host?.licenseIssuedAt ?? null}
                expiresAt={item.host?.licenseExpiresAt ?? null}
                locale={locale}
                label={t('cases.daysRemaining')}
              />
            </div>
            {!review && canIssue && cardYears != null ? (
              <p className="text-sm text-ink-600">
                {t('cases.stewardship.issueDurationHint', { count: formatNumber(cardYears, locale) })}
              </p>
            ) : null}
            {review || !canIssue ? (
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={IdCard}
                  label={t('cases.stewardship.cardNumber')}
                  copyValue={item.cardNumber}
                  tone="teal"
                />
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.stewardship.cardIssued')}
                  value={item.cardIssuedAt ? <DateText value={item.cardIssuedAt} /> : '—'}
                  empty={!item.cardIssuedAt}
                  tone="mint"
                />
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.stewardship.cardExpires')}
                  value={item.cardExpiresAt ? <DateText value={item.cardExpiresAt} /> : '—'}
                  empty={!item.cardExpiresAt}
                />
              </div>
            ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField icon={CalendarDays} label={t('cases.stewardship.cardIssued')} htmlFor="steward-issued-at">
                <PersianDateField id="steward-issued-at" value={issuedAt || undefined} onChange={(next) => setIssuedAt(next ?? '')} />
              </FormField>
              <FormField icon={CalendarDays} label={t('cases.stewardship.cardExpires')}>
                <p className="rounded-2xl border border-line bg-cream-50 px-3 py-2 text-sm">
                  <DateText value={cardExpiresAt || null} />
                </p>
              </FormField>
            </div>
            )}
            {!review && canIssue ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  disabled={advancing}
                  className="h-auto max-w-full whitespace-normal text-center"
                  onClick={() => void issueCard()}
                >
                  <Check className="size-4 shrink-0" aria-hidden />
                  {t('cases.stewardship.issueFor', {
                    steward: holderName || '—',
                    host: hostPersonName || '—',
                  })}
                </Button>
              </div>
            ) : null}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}

function contractYears(value: unknown) {
  const years = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(years) || years < 1 || years > 5) return null
  return years
}

function LicenseRemainingChart({
  issuedAt,
  expiresAt,
  locale,
  label,
}: {
  issuedAt: string | null
  expiresAt: string | null
  locale: string
  label: string
}) {
  const span = licenseSpan(issuedAt, expiresAt)
  const size = 72
  const stroke = 7
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const dash = circ * (span?.ratio ?? 0)
  const daysLabel = span ? formatNumber(span.remaining, locale) : '—'
  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-mint-100"
      role="img"
      aria-label={span ? `${label}: ${daysLabel}` : label}
    >
      <div className="relative size-[4.5rem]">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-[4.5rem] -rotate-90" aria-hidden>
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
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold leading-none text-ink-900" aria-hidden>
          {daysLabel}
        </span>
      </div>
      <p className="max-w-20 text-xs font-medium leading-5 text-ink-500">{label}</p>
    </div>
  )
}

function licenseSpan(issuedAt: string | null, expiresAt: string | null) {
  if (!expiresAt) return null
  const end = isoUtcDay(expiresAt)
  const today = isoUtcDay(todayIsoDate())
  if (end == null || today == null) return null
  const remaining = Math.max(0, Math.round((end - today) / 86_400_000))
  const start = issuedAt ? isoUtcDay(issuedAt) : null
  const total = start == null ? null : Math.round((end - start) / 86_400_000)
  const ratio = total == null || total <= 0 ? (remaining > 0 ? 1 : 0) : Math.min(1, remaining / total)
  return { remaining, ratio }
}

function isoUtcDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function HeaderBadge({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800">
      <Icon className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  )
}

function HostBar({ host }: { host: NonNullable<StewardState['host']> }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const lastName = host.lastName.trim()
  const unitTitle = host.businessUnitTitle?.trim() ?? ''
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
        <FormFactTile icon={UserRound} label={t('users.lastName')} value={lastName || '—'} empty={!lastName} tone="teal" />
        <FormFactTile
          icon={Building2}
          label={t('cases.unitTitle')}
          value={unitTitle || '—'}
          empty={!unitTitle}
          tone="mint"
        />
        <FormFactTile icon={BadgeCheck} label={t('cases.stewardship.hostLicense')} copyValue={host.licenseNumber} />
      </div>
      <Button
        type="button"
        variant="ghost"
        className="ms-auto shrink-0 !px-3 !py-1.5 !text-xs"
        onClick={() => navigate(`/cases/${host.id}`)}
      >
        <Eye className="size-3.5" aria-hidden />
        {t('cases.stewardship.viewHostLicense')}
      </Button>
    </div>
  )
}

export function CaseStewardCardPage() {
  const { id = '' } = useParams()
  return <CaseStewardCard caseId={id} />
}
