import { Gavel } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { violationsPath } from '../../lib/paths/violations'
import type { Violation } from '../../types/app'
import { appendFiles } from './files'
import { ViolationForm } from './ViolationForm'

export function ViolationEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['violation', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Violation>(`/violations/${id}`)).data,
  })

  if (!query.data) return <LoadingState />
  const item = query.data
  const name = item.person?.fullName || item.nationalId

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t('violations.edit')}
        subtitle={<EntityNameSubtitle name={name} icon={Gavel} />}
      />
      <ViolationForm
        initial={{
          nationalId: item.nationalId,
          violationTypeId: item.violationTypeId,
          occurredAt: item.occurredAt,
          description: item.description ?? '',
          status: item.status,
          attachments: item.attachments,
          personName: item.person?.fullName,
          caseUserId: item.caseFile?.id,
        }}
        onSubmit={async (payload) => {
          const body = new FormData()
          body.append('nationalId', payload.nationalId)
          body.append('violationTypeId', payload.violationTypeId)
          body.append('occurredAt', payload.occurredAt)
          body.append('description', payload.description ?? '')
          body.append('status', payload.status)
          body.append('caseUserId', payload.caseUserId ?? '')
          for (const attachmentId of payload.removeAttachmentIds) {
            body.append('removeAttachmentIds', attachmentId)
          }
          appendFiles(body, payload.files)
          await api.patch(`/violations/${id}`, body)
          toast.success(t('violations.updated'))
          navigate(violationsPath())
        }}
      />
    </div>
  )
}
