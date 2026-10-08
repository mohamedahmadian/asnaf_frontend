import { Download, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
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
  const [busy, setBusy] = useState<'print' | 'download' | null>(null)
  const query = useQuery({
    queryKey: ['cases', 'license', caseId],
    queryFn: async () => (await api.get<ActivityLicense>(`/cases/${caseId}/license`)).data,
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

  if (query.isLoading) return <LoadingState />
  if (query.isError || !query.data) {
    return <FormEmptyHint>{getApiErrorMessage(query.error, t('cases.licenseNotIssued'))}</FormEmptyHint>
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
