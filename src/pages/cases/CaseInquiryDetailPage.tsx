import { useState } from 'react'
import { Check, FileText, Hash, Phone, Printer, ScanSearch, Briefcase, Building2, UserRound, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, FormField, PageHeader, caseShellClassName, fieldClassName } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormCard, FormFactTile, FormSectionTitle, formCardBodyClassName } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { openInquiryFile, submitInquiryDecision } from './inquiry-api'
import type { CaseInquiryRow } from './inquiry-types'

type InquiryDetail = CaseInquiryRow & {
  applicant: {
    fullName: string
    nationalId: string | null
    trackingCode: string | null
    phone: string | null
    unitTitle: string | null
    jobTitle: string | null
  } | null
}

export function CaseInquiryDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['cases', 'inquiry', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<InquiryDetail>(`/cases/inquiries/${id}`)).data,
  })
  const item = query.data

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

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={ScanSearch}
        title={t('cases.inquiryDetails')}
        subtitle={item?.applicant?.fullName}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard icon={ScanSearch} title={item.center.name} subtitle={t(`cases.inquiryStatuses.${item.status}`)}>
          <div className={`${formCardBodyClassName} space-y-6`}>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <FormFactTile icon={UserRound} label={t('users.fullName')} value={item.applicant?.fullName} />
              <FormFactTile icon={FileText} label={t('users.nationalId')} copyValue={item.applicant?.nationalId} />
              <FormFactTile icon={Hash} label={t('cases.trackingCode')} copyValue={item.applicant?.trackingCode} />
              <FormFactTile icon={Phone} label={t('users.phone')} copyValue={item.applicant?.phone} />
              <FormFactTile icon={Briefcase} label={t('cases.activityJob')} value={item.applicant?.jobTitle} />
              <FormFactTile icon={Building2} label={t('cases.unitTitle')} value={item.applicant?.unitTitle} />
            </div>
            <Link
              to={`/cases/inquiries/${item.id}/letter`}
              target="_blank"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-teal-700"
            >
              <Printer className="size-4" aria-hidden />
              {t('cases.inquiryLetter')}
            </Link>
            {item.status === 'PENDING' ? (
              <div className="space-y-3">
                <FormSectionTitle icon={FileText}>{t('cases.inquiryDecision')}</FormSectionTitle>
                <FormField icon={FileText} label={t('cases.inquiryNote')} htmlFor="inquiry-decision-note">
                  <textarea
                    id="inquiry-decision-note"
                    className={fieldClassName}
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </FormField>
                <FormField icon={FileText} label={t('cases.inquiryAttachment')} htmlFor="inquiry-decision-file">
                  <FileDropField
                    id="inquiry-decision-file"
                    accept="image/*,application/pdf"
                    allowCamera
                    onFile={setFile}
                    onClear={() => setFile(null)}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={saving} onClick={() => void decide('APPROVED')}>
                    <Check className="size-4" aria-hidden />
                    {t('cases.inquiryApprove')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={saving}
                    onClick={() =>
                      confirmToast({
                        title: t('cases.inquiryRejectConfirm'),
                        confirmLabel: t('cases.inquiryReject'),
                        cancelLabel: t('common.cancel'),
                        confirmVariant: 'danger',
                        onConfirm: () => void decide('REJECTED'),
                      })
                    }
                  >
                    <X className="size-4" aria-hidden />
                    {t('cases.inquiryReject')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FormSectionTitle icon={FileText}>{t('cases.inquiryResult')}</FormSectionTitle>
                <p className="text-sm text-ink-700">
                  {t(`cases.inquiryStatuses.${item.status}`)}
                  {item.channel ? ` · ${t(`cases.inquiryChannels.${item.channel}`)}` : ''}
                </p>
                {item.note ? <p className="text-sm whitespace-pre-wrap text-ink-800">{item.note}</p> : null}
                {item.decidedBy ? <p className="text-xs text-ink-500">{item.decidedBy.fullName}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {item.files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className="cursor-pointer text-sm text-teal-700"
                      onClick={() => void openInquiryFile(file.id)}
                    >
                      {file.originalName || file.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormCard>
      ) : null}
    </div>
  )
}
