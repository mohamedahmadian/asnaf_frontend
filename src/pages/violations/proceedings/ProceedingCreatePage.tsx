import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../../components/ui/Form'
import { api } from '../../../lib/api'
import { violationProceedingsPath } from '../../../lib/paths/violations'
import { appendFiles } from '../files'
import { ProceedingForm } from './ProceedingForm'

export function ProceedingCreatePage() {
  const { t } = useTranslation()
  const { id: violationId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader icon={ClipboardList} title={t('violationProceedings.create')} />
      <ProceedingForm
        onSubmit={async (payload) => {
          const body = new FormData()
          body.append('occurredAt', payload.occurredAt)
          body.append('title', payload.title)
          body.append('description', payload.description ?? '')
          appendFiles(body, payload.files)
          await api.post(`/violations/${violationId}/proceedings`, body)
          toast.success(t('violationProceedings.created'))
          navigate(violationProceedingsPath(violationId))
        }}
      />
    </div>
  )
}
