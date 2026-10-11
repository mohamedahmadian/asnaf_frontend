import { BadgeCheck, CalendarDays, Check, Download, Printer, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField } from '../../components/ui/Form'
import { formCardBodyClassName, FormCard } from '../../components/ui/FormLayout'
import { PersianDateField } from '../../components/ui/PersianDateField'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { addYearsIso, todayIsoDate } from '../../lib/datetime'
import {
  activityLicenseHtml,
  buildLicenseView,
  downloadActivityLicense,
  licensePhotoDataUrl,
  printActivityLicense,
  type ActivityLicense,
  type LicenseView,
} from './activity-license'

function licenseCopy(t: (key: string) => string) {
  return {
    org: t('cases.licenseDoc.org'),
    orgEn: t('cases.licenseDoc.orgEn'),
    title: t('cases.licenseDoc.title'),
    titleEn: t('cases.licenseDoc.titleEn'),
    site: t('cases.licenseDoc.site'),
    number: t('cases.licenseDoc.number'),
    numberEn: t('cases.licenseDoc.numberEn'),
    issued: t('cases.licenseDoc.issued'),
    issuedEn: t('cases.licenseDoc.issuedEn'),
    expires: t('cases.licenseDoc.expires'),
    expiresEn: t('cases.licenseDoc.expiresEn'),
    name: t('cases.licenseDoc.name'),
    nameEn: t('cases.licenseDoc.nameEn'),
    father: t('cases.licenseDoc.father'),
    fatherEn: t('cases.licenseDoc.fatherEn'),
    birth: t('cases.licenseDoc.birth'),
    birthEn: t('cases.licenseDoc.birthEn'),
    nationality: t('cases.licenseDoc.nationality'),
    nationalityEn: t('cases.licenseDoc.nationalityEn'),
    passport: t('cases.licenseDoc.passport'),
    passportEn: t('cases.licenseDoc.passportEn'),
    address: t('cases.licenseDoc.address'),
    addressEn: t('cases.licenseDoc.addressEn'),
    phone: t('cases.licenseDoc.phone'),
    phoneEn: t('cases.licenseDoc.phoneEn'),
    activity: t('cases.licenseDoc.activity'),
    activityEn: t('cases.licenseDoc.activityEn'),
    trade: t('cases.licenseDoc.trade'),
    tradeEn: t('cases.licenseDoc.tradeEn'),
    plaque: t('cases.licenseDoc.plaque'),
    floor: t('cases.licenseDoc.floor'),
    unit: t('cases.licenseDoc.unit'),
    postal: t('cases.licenseDoc.postal'),
  }
}

export function ActivityLicenseSheet({ view }: { view: LicenseView }) {
  return (
    <article className="license-sheet mx-auto flex min-h-[640px] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#d5deea] bg-white shadow-[0_12px_32px_rgba(20,40,70,0.08)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <aside className="flex w-40 shrink-0 flex-col items-center justify-center gap-3 bg-[#14356e] px-4 py-8 text-center text-white">
        <svg viewBox="0 0 72 72" className="size-16" aria-hidden>
          <circle cx="36" cy="28" r="10" fill="#f0c14d" />
          <path d="M8 46c8-8 14-8 22 0s14 8 22 0 14-8 12 0" fill="none" stroke="#7ec8e3" strokeWidth="3" />
          <path d="M8 54c8-8 14-8 22 0s14 8 22 0 14-8 12 0" fill="none" stroke="#fff" strokeWidth="3" />
        </svg>
        <div className="text-sm font-bold leading-7">{view.org}</div>
        <div className="text-[11px] leading-5 text-white/80" dir="ltr">
          {view.orgEn}
        </div>
        <div className="mt-2 text-base font-extrabold leading-7">{view.title}</div>
        <div className="text-xs text-white/90" dir="ltr">
          {view.titleEn}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col px-6 py-5">
        {view.rows.map((row) => (
          <div key={row.en} className="grid grid-cols-2 gap-4 border-b border-[#e6edf4] py-2">
            <div>
              <div className="text-[11px] text-[#5d7284]">{row.fa}</div>
              <div className="text-sm font-bold leading-7 text-ink-900">{row.faValue}</div>
            </div>
            <div dir="ltr" className="text-left">
              <div className="text-[11px] text-[#5d7284]">{row.en}</div>
              <div className="text-sm font-bold leading-7 text-ink-900">{row.enValue}</div>
            </div>
          </div>
        ))}
        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          {view.photoUrl ? (
            <img src={view.photoUrl} alt="" className="h-28 w-[5.75rem] rounded-lg border border-[#d5deea] object-cover" />
          ) : (
            <div className="h-28 w-[5.75rem] rounded-lg border border-[#d5deea] bg-[#eef3f8]" />
          )}
          <div dir="ltr" className="text-sm font-bold text-[#14356e]">
            {view.site}
          </div>
        </div>
      </div>
    </article>
  )
}

export function ActivityLicensePanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'print' | 'download' | 'issue' | null>(null)
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
    queryFn: async () => {
      const { data } = await api.get<ActivityLicense & { licenseNumber: string | null }>(`/cases/${caseId}/license`)
      return data.licenseNumber ? data : null
    },
  })

  async function output(action: 'print' | 'download') {
    if (!query.data) return
    setBusy(action)
    try {
      const photoUrl = await licensePhotoDataUrl(query.data.photoId)
      const view = buildLicenseView(query.data, licenseCopy(t), photoUrl)
      const html = activityLicenseHtml(view)
      if (action === 'print') printActivityLicense(html)
      else downloadActivityLicense(`${query.data.licenseNumber}.html`, html)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.licenseFailed')))
    } finally {
      setBusy(null)
    }
  }

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
      await api.post('/cases/formation/complete', {
        caseId,
        step: 6,
        licenseIssuedAt: issuedAt,
        licenseExpiresAt: expiresAt,
      })
      toast.success(t('cases.issueLicenseDone'))
      setConfirming(false)
      await query.refetch()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setBusy(null)
    }
  }

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data) {
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
          <div className="flex justify-center">
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
              {t('cases.issueLicense')}
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

  const view = buildLicenseView(
    query.data,
    licenseCopy(t),
    query.data.photoId ? getImageUrl(query.data.photoId) : null,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" disabled={busy != null} onClick={() => void output('print')}>
          <Printer className="size-4" aria-hidden />
          {t('cases.licensePrint')}
        </Button>
        <Button type="button" variant="ghost" disabled={busy != null} onClick={() => void output('download')}>
          <Download className="size-4" aria-hidden />
          {t('cases.licenseDownload')}
        </Button>
      </div>
      <ActivityLicenseSheet view={view} />
    </div>
  )
}
