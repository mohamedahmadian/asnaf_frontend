import { BadgeCheck, Briefcase, CalendarClock, FileText, FolderKanban, Landmark, RefreshCw, ScanSearch, ShieldCheck, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormEmptyHint, FormFactTile, FormMetaChip, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber, localizeDigits } from '../../lib/datetime'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

type RenewalFile = {
  id: string
  originalName: string | null
  mimeType: string
  createdAt: string
}

type RenewalView = {
  id: string
  number: string
  status: 'OPEN' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  completedAt: string | null
  licenseNumber: string | null
  businessUnitTitle: string | null
  jobGroupTitle: string | null
  jobTitle: string | null
  renewal: {
    currentIssuedAt: string | null
    currentExpiresAt: string | null
    nextIssuedAt: string | null
    nextExpiresAt: string | null
    delayDays: number
  } | null
  documents: { id: string; title: string; isRequired: boolean; file: RenewalFile | null }[]
  inquiries: {
    id: string
    centerName: string
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  }[]
  places: {
    id: string
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  } | null
  management: {
    id: string
    workUnitTitle: string | null
    roleName: string
    displayTitle?: string | null
    status: ReviewStatus
    note: string | null
    decidedAt: string | null
    decidedByName: string | null
  }[]
}

const reviewTone: Record<ReviewStatus, string> = {
  PENDING: 'bg-teal-50 text-teal-900 ring-teal-200',
  APPROVED: 'bg-mint-50 text-teal-900 ring-mint-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
}

export function CaseRenewalDetailPage() {
  const { id = '', requestId = '' } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const redirected = useRef(false)
  const query = useQuery({
    queryKey: ['cases', 'renewal', id, requestId],
    enabled: Boolean(id && requestId),
    queryFn: async () => (await api.get<RenewalView>(`/cases/${id}/renewal/${requestId}`)).data,
  })

  useEffect(() => {
    if (!query.isError || redirected.current) return
    redirected.current = true
    toast.error(getApiErrorMessage(query.error, t('common.error')))
    navigate(`/cases/${id}?stay=1`, { replace: true })
  }, [id, navigate, query.error, query.isError, t])

  const item = query.data

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={RefreshCw}
        title={t('cases.renewalDetails')}
        subtitle={
          item ? (
            <EntityNameSubtitle icon={RefreshCw} label={t('cases.requestNumber')} name={localizeDigits(item.number, locale)} />
          ) : undefined
        }
        backTo={`/cases/${id}?stay=1`}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard
          icon={RefreshCw}
          title={localizeDigits(item.number, locale)}
          chips={
            <>
              <FormMetaChip icon={RefreshCw} label={t(`cases.requestStatus.${item.status}`)} />
              {item.licenseNumber ? <FormMetaChip icon={BadgeCheck} copyValue={item.licenseNumber} /> : null}
            </>
          }
        >
          <div className={formCardBodyClassName}>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={CalendarClock} label={t('cases.requestDate')} value={<DateText value={item.createdAt} withTime />} />
              {item.completedAt ? (
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalCompletedAt')}
                  value={<DateText value={item.completedAt} withTime />}
                  tone="mint"
                />
              ) : null}
              {item.businessUnitTitle ? (
                <FormFactTile icon={BadgeCheck} label={t('cases.unitTitle')} value={item.businessUnitTitle} />
              ) : null}
              {item.jobGroupTitle ? (
                <FormFactTile icon={FolderKanban} label={t('cases.activityGroup')} value={item.jobGroupTitle} />
              ) : null}
              {item.jobTitle ? (
                <FormFactTile icon={Briefcase} label={t('cases.activityJob')} value={item.jobTitle} tone="mint" />
              ) : null}
            </div>

            <section className="space-y-3">
              <FormSectionTitle icon={CalendarClock}>{t('cases.renewalCurrentLicense')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalCurrentIssued')}
                  value={<DateText value={item.renewal?.currentIssuedAt} />}
                />
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalCurrentExpires')}
                  value={<DateText value={item.renewal?.currentExpiresAt} />}
                  tone="mint"
                />
                {item.renewal && item.renewal.delayDays > 0 ? (
                  <FormFactTile
                    icon={CalendarClock}
                    label={t('cases.renewalDelay')}
                    value={t('cases.renewalDelayDays', { count: formatNumber(item.renewal.delayDays, locale) })}
                  />
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <FormSectionTitle icon={RefreshCw}>{t('cases.renewalNextLicense')}</FormSectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalNextIssued')}
                  value={<DateText value={item.renewal?.nextIssuedAt} />}
                />
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.renewalNextExpires')}
                  value={<DateText value={item.renewal?.nextExpiresAt} />}
                  tone="mint"
                />
              </div>
            </section>

            <section className="space-y-3">
              <FormSectionTitle icon={FileText}>{t('cases.renewalSteps.documents')}</FormSectionTitle>
              {item.documents.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {item.documents.map((document) => (
                    <article key={document.id} className="space-y-2 rounded-2xl border border-teal-100 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-ink-900">{document.title}</h3>
                        <span className="text-xs text-ink-500">
                          {document.isRequired ? t('cases.documentRequired') : t('cases.documentOptional')}
                        </span>
                      </div>
                      {document.file ? (
                        <RenewalDocumentFile file={document.file} />
                      ) : (
                        <p className="text-sm text-ink-500">{t('cases.inquiryDocumentMissing')}</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <FormEmptyHint>{t('cases.renewalViewNoDocuments')}</FormEmptyHint>
              )}
            </section>

            <section className="space-y-3">
              <FormSectionTitle icon={ScanSearch}>{t('cases.renewalSteps.inquiries')}</FormSectionTitle>
              {item.inquiries.length ? (
                <div className="space-y-3">
                  {item.inquiries.map((row) => (
                    <ReviewCard
                      key={row.id}
                      title={row.centerName}
                      status={row.status}
                      note={row.note}
                      decidedAt={row.decidedAt}
                      decidedByName={row.decidedByName}
                    />
                  ))}
                </div>
              ) : (
                <FormEmptyHint>{t('cases.renewalViewNoInquiries')}</FormEmptyHint>
              )}
            </section>

            <section className="space-y-3">
              <FormSectionTitle icon={Landmark}>{t('cases.renewalSteps.places')}</FormSectionTitle>
              {item.places ? (
                <ReviewCard
                  title={t('cases.renewalSteps.places')}
                  status={item.places.status}
                  note={item.places.note}
                  decidedAt={item.places.decidedAt}
                  decidedByName={item.places.decidedByName}
                />
              ) : (
                <FormEmptyHint>{t('cases.renewalViewNoPlaces')}</FormEmptyHint>
              )}
            </section>

            <section className="space-y-3">
              <FormSectionTitle icon={ShieldCheck}>{t('cases.renewalSteps.management')}</FormSectionTitle>
              {item.management.length ? (
                <div className="space-y-3">
                  {item.management.map((row) => (
                    <ReviewCard
                      key={row.id}
                      title={row.displayTitle || row.workUnitTitle}
                      subtitle={
                        row.displayTitle
                          ? [row.workUnitTitle, row.roleName].filter(Boolean).join(' · ')
                          : row.roleName
                      }
                      status={row.status}
                      note={row.note}
                      decidedAt={row.decidedAt}
                      decidedByName={row.decidedByName}
                    />
                  ))}
                </div>
              ) : (
                <FormEmptyHint>{t('cases.renewalViewNoManagement')}</FormEmptyHint>
              )}
            </section>
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}

function ReviewCard({
  title,
  subtitle,
  status,
  note,
  decidedAt,
  decidedByName,
}: {
  title: string
  subtitle?: string
  status: ReviewStatus
  note: string | null
  decidedAt: string | null
  decidedByName: string | null
}) {
  const { t } = useTranslation()
  return (
    <article className="space-y-2 rounded-2xl border border-teal-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle ? <p className="text-xs text-ink-500">{subtitle}</p> : null}
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${reviewTone[status]}`}>
          {t(`cases.inquiryStatuses.${status}`)}
        </span>
      </div>
      {decidedByName ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-600">
          <UserRound className="size-4 shrink-0 text-teal-600" aria-hidden />
          <span>{decidedByName}</span>
          {decidedAt ? <DateText value={decidedAt} withTime /> : null}
        </p>
      ) : null}
      {note ? <p className="text-sm leading-7 text-ink-700">{note}</p> : null}
    </article>
  )
}

function RenewalDocumentFile({ file }: { file: RenewalFile }) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  const image = file.mimeType.startsWith('image/')

  useEffect(() => {
    if (!image) return
    let cancelled = false
    let url = ''
    void api
      .get<Blob>(`/cases/formation/documents/${file.id}/file`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        url = URL.createObjectURL(data)
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file.id, image])

  async function openFile() {
    const { data } = await api.get<Blob>(`/cases/formation/documents/${file.id}/file`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="space-y-2">
      {file.originalName ? <p className="text-xs text-ink-500">{file.originalName}</p> : null}
      {previewUrl ? <img src={previewUrl} alt="" className="max-h-64 w-full rounded-2xl object-contain" /> : null}
      {!image || failed ? (
        <Button type="button" variant="ghost" onClick={() => void openFile()}>
          <FileText className="size-4" aria-hidden />
          {t('cases.inquiryViewFile')}
        </Button>
      ) : null}
    </div>
  )
}
