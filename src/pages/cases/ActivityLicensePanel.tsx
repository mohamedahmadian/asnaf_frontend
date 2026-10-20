import { BadgeCheck, CalendarDays, Check, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { addYearsIso, todayIsoDate } from '../../lib/datetime'
import { IssuedActivityLicense } from './IssuedActivityLicense'
import type { ActivityLicense } from './activity-license'

async function licensePhotoDataUrl(photoId: string | null) {
  if (!photoId) return null
  const { data } = await api.get<Blob>(`/images/${photoId}`, { responseType: 'blob' })
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(data)
  })
}

export function ActivityLicensePanel({
  caseId,
  onIssued,
  readOnly = false,
}: {
  caseId: string
  onIssued?: (issuedAt: string) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'issue' | null>(null)
  const [issuedAt, setIssuedAt] = useState(() => todayIsoDate())
  const [expiresAt, setExpiresAt] = useState(() => addYearsIso(todayIsoDate(), 1))
  const [confirming, setConfirming] = useState(false)
  const expiresTouched = useRef(false)
  const settings = useQuery({
    queryKey: ['cases', 'general-settings'],
    queryFn: async () => (await api.get<{ contractYears: number }>('/cases/settings/general')).data,
  })
  const contractYears = settings.data?.contractYears || 1
  useEffect(() => {
    if (expiresTouched.current || !settings.data) return
    setExpiresAt(addYearsIso(issuedAt, contractYears))
  }, [settings.data, contractYears, issuedAt])
  const query = useQuery({
    queryKey: ['cases', 'license', caseId],
    queryFn: async () =>
      (
        await api.get<
          | ActivityLicense
          | { licenseNumber: null; firstName: string; lastName: string; gender: 'MALE' | 'FEMALE' | null }
        >(`/cases/${caseId}/license`)
      ).data,
  })

  function datesReady() {
    if (!issuedAt || !expiresAt) {
      toast.error(t('cases.issueLicenseDatesRequired'))
      return false
    }
    if (expiresAt <= issuedAt) {
      toast.error(t('cases.issueLicenseDateOrder'))
      return false
    }
    return true
  }

  async function issue() {
    if (!datesReady()) return
    setBusy('issue')
    try {
      await api.post('/cases/issuance/complete', {
        caseId,
        step: 6,
        licenseIssuedAt: issuedAt,
        licenseExpiresAt: expiresAt,
      })
      toast.success(t('cases.issueLicenseDone'))
      setConfirming(false)
      onIssued?.(issuedAt)
      await query.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setBusy(null)
    }
  }

  if (query.isLoading) return <LoadingState />
  const issued = query.data?.licenseNumber ? query.data : null
  const applicant = query.data && !query.data.licenseNumber ? query.data : null
  const applicantName = applicant ? `${applicant.firstName} ${applicant.lastName}`.replace(/\s+/g, ' ').trim() : ''
  const honorific =
    applicant?.gender === 'FEMALE'
      ? t('cases.inquiryHonorificFemale')
      : applicant?.gender === 'MALE'
        ? t('cases.inquiryHonorificMale')
        : ''
  const issueLabel = applicantName
    ? t('cases.issueLicenseFor', { person: honorific ? `${honorific} ${applicantName}` : applicantName })
    : t('cases.issueLicense')
  if (readOnly && !issued) {
    return (
      <FormCard icon={BadgeCheck} title={t('cases.steps.issuance')}>
        <div className={formCardBodyClassName}>
          <FormEmptyHint>{t('cases.licenseNotIssued')}</FormEmptyHint>
        </div>
      </FormCard>
    )
  }
  if (query.isError || !issued) {
    return (
      <FormCard icon={BadgeCheck} title={t('cases.steps.issuance')}>
        <div className={formCardBodyClassName}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField icon={CalendarDays} label={t('cases.licenseIssued')} htmlFor="license-issued-at">
              <PersianDateField
                id="license-issued-at"
                value={issuedAt || undefined}
                onChange={(next) => {
                  const value = next ?? ''
                  setIssuedAt(value)
                  if (!expiresTouched.current && value) setExpiresAt(addYearsIso(value, contractYears))
                }}
              />
            </FormField>
            <FormField icon={CalendarDays} label={t('cases.licenseExpires')} htmlFor="license-expires-at">
              <PersianDateField
                id="license-expires-at"
                value={expiresAt || undefined}
                onChange={(next) => {
                  expiresTouched.current = true
                  setExpiresAt(next ?? '')
                }}
              />
            </FormField>
          </div>
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              aria-pressed
              className="ring-2 ring-teal-300 ring-offset-2"
              disabled={busy != null}
              onClick={() => {
                if (datesReady()) setConfirming(true)
              }}
            >
              <BadgeCheck className="size-4" aria-hidden />
              {issueLabel}
            </Button>
          </div>
          {confirming ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3">
              <p className="text-sm leading-7 text-ink-700">{t('cases.issueLicenseConfirmText')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={busy != null} onClick={() => void issue()}>
                  <Check className="size-4" aria-hidden />
                  {t('cases.issueLicenseConfirmYes')}
                </Button>
                <Button type="button" variant="ghost" disabled={busy != null} onClick={() => setConfirming(false)}>
                  <X className="size-4" aria-hidden />
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </FormCard>
    )
  }

  return (
    <IssuedActivityLicense
      license={issued}
      photoUrl={issued.photoId ? getImageUrl(issued.photoId) : null}
      signatureUrl={issued.signatureId ? getImageUrl(issued.signatureId) : null}
      loadPrintPhoto={() => licensePhotoDataUrl(issued.photoId)}
      loadPrintSignature={() => licensePhotoDataUrl(issued.signatureId)}
      onError={(error) => toast.error(getApiErrorMessage(error, t('cases.licenseFailed')))}
    />
  )
}
