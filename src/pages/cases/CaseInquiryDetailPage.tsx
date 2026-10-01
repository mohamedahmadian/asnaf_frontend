import { useState } from 'react'
import {
  CalendarCheck,
  Check,
  CircleCheck,
  CircleX,
  Download,
  FileText,
  Files,
  MapPin,
  MessageSquareText,
  Paperclip,
  Printer,
  Radio,
  ScanSearch,
  ClipboardCheck,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, FormField, PageHeader, caseShellClassName, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FileDropField } from '../../components/ui/FileDropField'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { CaseInquiryDossier } from './CaseInquiryDossier'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import {
  downloadInquiryLetter,
  inquiryLetterFilename,
  openInquiryFile,
  presentInquiryLetter,
  printInquiryLetter,
  submitInquiryDecision,
} from './inquiry-api'
import type { CaseInquiryLetter, CaseInquiryRow } from './inquiry-types'

const statusBadgeClass: Record<CaseInquiryRow['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-teal-50 text-teal-800 ring-teal-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
}

type InquiryDetail = CaseInquiryRow & {
  applicant: {
    fullName: string
    gender: 'MALE' | 'FEMALE' | null
    nationalId: string | null
    trackingCode: string | null
    phone: string | null
    unitTitle: string | null
    jobTitle: string | null
  } | null
}

function applicantConfirmName(
  fullName: string,
  gender: 'MALE' | 'FEMALE' | null | undefined,
  honorific: (key: 'cases.inquiryHonorificMale' | 'cases.inquiryHonorificFemale') => string,
) {
  const name = fullName.trim()
  if (!name) return ''
  if (gender === 'MALE') return `${honorific('cases.inquiryHonorificMale')} ${name}`
  if (gender === 'FEMALE') return `${honorific('cases.inquiryHonorificFemale')} ${name}`
  return name
}

export function CaseInquiryDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [letterBusy, setLetterBusy] = useState<'print' | 'download' | null>(null)
  const [dossierTab, setDossierTab] = useState('identity')
  const query = useQuery({
    queryKey: ['cases', 'inquiry', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<InquiryDetail>(`/cases/inquiries/${id}`)).data,
  })
  const item = query.data

  const applicantName = applicantConfirmName(item?.applicant?.fullName ?? '', item?.applicant?.gender, t)

  function askApprove() {
    confirmToast({
      title: t('cases.inquiryApproveConfirm', { name: applicantName }).trim(),
      confirmLabel: t('cases.inquiryApprove'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void decide('APPROVED'),
    })
  }

  function askReject() {
    confirmToast({
      title: t('cases.inquiryRejectConfirm'),
      confirmLabel: t('cases.inquiryReject'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: () => void decide('REJECTED'),
    })
  }

  async function decide(status: 'APPROVED' | 'REJECTED') {
    if (!item) return
    if (status === 'REJECTED' && !note.trim()) {
      toast.error(t('cases.inquiryRejectNote'))
      return
    }
    setSaving(true)
    try {
      await submitInquiryDecision(`/cases/inquiries/${item.id}/decision`, status, note, file)
      toast.success(t('cases.inquiryDecided'))
      setFile(null)
      setNote('')
      await queryClient.invalidateQueries({ queryKey: ['cases', 'inquiry', id] })
      await queryClient.invalidateQueries({ queryKey: ['cases', 'inquiries'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function runLetter(action: 'print' | 'download') {
    if (!item) return
    setLetterBusy(action)
    try {
      const { data } = await api.get<CaseInquiryLetter>(`/cases/inquiries/${item.id}/letter`)
      const filled = presentInquiryLetter(data, locale)
      if (action === 'print') printInquiryLetter(filled.title, filled.body)
      else downloadInquiryLetter(inquiryLetterFilename(data.centerName), filled.title, filled.body)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setLetterBusy(null)
    }
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={ScanSearch}
        title={t('cases.inquiryDetails')}
        subtitle={item?.applicant?.fullName}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard
          icon={ScanSearch}
          title={item.center.name}
          subtitle={t(`cases.inquiryStatuses.${item.status}`)}
          action={
            item.status === 'PENDING' ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="primary" disabled={saving} onClick={askApprove}>
                  <Check className="size-4" aria-hidden />
                  {t('cases.inquiryApproveConfirm', { name: applicantName }).trim()}
                </Button>
                <Button type="button" variant="ghost" disabled={saving} onClick={askReject}>
                  <X className="size-4" aria-hidden />
                  {t('cases.inquiryReject')}
                </Button>
              </div>
            ) : null
          }
        >
          <FormTabs
            value={dossierTab}
            onChange={setDossierTab}
            tabs={[
              { id: 'identity', label: t('cases.identityTab'), icon: UserRound },
              { id: 'documents', label: t('cases.documentsTab'), icon: Files },
              { id: 'location', label: t('cases.steps.location'), icon: MapPin },
            ]}
          />
          <div className={`${formCardBodyClassName} space-y-6`}>
            <div role="tabpanel" id={`form-panel-${dossierTab}`} aria-labelledby={`form-tab-${dossierTab}`}>
              <CaseInquiryDossier
                inquiryId={item.id}
                tab={dossierTab}
                createdAt={item.createdAt}
                applicant={item.applicant}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                className="min-w-40"
                disabled={letterBusy !== null}
                onClick={() => void runLetter('print')}
              >
                <Printer className="size-4" aria-hidden />
                {t('cases.inquiryPrintLetter')}
              </Button>
              <Button
                type="button"
                className="min-w-40"
                disabled={letterBusy !== null}
                onClick={() => void runLetter('download')}
              >
                <Download className="size-4" aria-hidden />
                {t('cases.inquiryDownloadLetter')}
              </Button>
            </div>
            {item.status === 'PENDING' ? (
              <section className="space-y-4 rounded-[22px] border border-teal-200 bg-gradient-to-b from-teal-50/70 to-white p-4 shadow-[0_10px_28px_rgba(46,189,182,0.08)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-ink-900">{t('cases.inquiryDecision')}</h3>
                  <Button type="button" variant="ghost" onClick={() => setAttachmentOpen((open) => !open)}>
                    <Paperclip className="size-4" aria-hidden />
                    {t('cases.inquiryAddAttachment')}
                  </Button>
                </div>
                <FormField icon={FileText} label={t('cases.inquiryNote')} htmlFor="inquiry-decision-note">
                  <textarea
                    id="inquiry-decision-note"
                    className={fieldClassName}
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </FormField>
                {attachmentOpen ? (
                  <FormField icon={Paperclip} label={t('cases.inquiryAttachment')} htmlFor="inquiry-decision-file">
                    <FileDropField
                      id="inquiry-decision-file"
                      accept="image/*,application/pdf"
                      allowCamera
                      onFile={setFile}
                      onClear={() => setFile(null)}
                    />
                  </FormField>
                ) : null}
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-40"
                    disabled={saving}
                    onClick={askApprove}
                  >
                    <Check className="size-4" aria-hidden />
                    {t('cases.inquiryApproveConfirm', { name: applicantName }).trim()}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-w-40"
                    disabled={saving}
                    onClick={askReject}
                  >
                    <X className="size-4" aria-hidden />
                    {t('cases.inquiryReject')}
                  </Button>
                </div>
              </section>
            ) : (
              <div className="space-y-3">
                <FormSectionTitle icon={ClipboardCheck}>{t('cases.inquiryResult')}</FormSectionTitle>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <FormFactTile
                    icon={item.status === 'REJECTED' ? CircleX : CircleCheck}
                    label={t('cases.inquiryStatus')}
                    tone={item.status === 'APPROVED' ? 'teal' : 'ink'}
                    value={
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass[item.status]}`}
                      >
                        {t(`cases.inquiryStatuses.${item.status}`)}
                      </span>
                    }
                  />
                  {item.channel ? (
                    <FormFactTile
                      icon={Radio}
                      label={t('cases.inquiryChannel')}
                      value={t(`cases.inquiryChannels.${item.channel}`)}
                      tone="mint"
                    />
                  ) : null}
                  <FormFactTile
                    icon={CalendarCheck}
                    label={t('cases.inquiryDecidedAt')}
                    value={<DateText value={item.decidedAt} withTime />}
                  />
                  {item.decidedBy ? (
                    <FormFactTile icon={UserCheck} label={t('cases.inquiryDecidedBy')} value={item.decidedBy.fullName} />
                  ) : null}
                  {item.note ? (
                    <FormFactTile
                      icon={MessageSquareText}
                      label={t('cases.inquiryNote')}
                      className="sm:col-span-2"
                      value={<span className="whitespace-pre-wrap font-normal">{item.note}</span>}
                    />
                  ) : null}
                </div>
                {item.files.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.files.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
                        onClick={() => void openInquiryFile(attachment.id)}
                      >
                        <Paperclip className="size-3.5" aria-hidden />
                        {attachment.originalName || attachment.id}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}
