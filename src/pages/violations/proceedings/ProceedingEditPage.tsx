import { ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { violationProceedingsPath } from '../../../lib/paths/violations'
import type { ViolationProceeding } from '../../../types/app'
import { appendFiles } from '../files'
import { ProceedingForm } from './ProceedingForm'

export function ProceedingEditPage() {
  const { t } = useTranslation()
  const { id: violationId = '', proceedingId = '' } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['violation-proceeding', violationId, proceedingId],
    enabled: Boolean(violationId && proceedingId),
    queryFn: async () =>
      (await api.get<ViolationProceeding>(`/violations/${violationId}/proceedings/${proceedingId}`)).data,
  })

  if (!query.data) return <LoadingState />
  const item = query.data

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('violationProceedings.edit')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ClipboardList} />}
      />
      <ProceedingForm
        initial={{
          occurredAt: item.occurredAt,
          title: item.title,
          description: item.description ?? '',
          attachments: item.attachments,
        }}
        onSubmit={async (payload) => {
          const body = new FormData()
          body.append('occurredAt', payload.occurredAt)
          body.append('title', payload.title)
          body.append('description', payload.description ?? '')
          for (const attachmentId of payload.removeAttachmentIds) {
            body.append('removeAttachmentIds', attachmentId)
          }
          appendFiles(body, payload.files)
          await api.patch(`/violations/${violationId}/proceedings/${proceedingId}`, body)
          toast.success(t('violationProceedings.updated'))
          navigate(violationProceedingsPath(violationId))
        }}
      />
    </div>
  )
}
