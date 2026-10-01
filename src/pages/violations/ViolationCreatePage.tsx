import { Gavel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { violationsPath } from '../../lib/paths/violations'
import { appendFiles } from './files'
import { ViolationForm } from './ViolationForm'

export function ViolationCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={formShellClassName}>
      <PageHeader icon={Gavel} title={t('violations.create')} />
      <ViolationForm
        onSubmit={async (payload) => {
          const body = new FormData()
          body.append('nationalId', payload.nationalId)
          body.append('violationTypeId', payload.violationTypeId)
          body.append('occurredAt', payload.occurredAt)
          body.append('description', payload.description ?? '')
          body.append('status', payload.status)
          body.append('caseUserId', payload.caseUserId ?? '')
          appendFiles(body, payload.files)
          await api.post('/violations', body)
          toast.success(t('violations.created'))
          navigate(violationsPath())
        }}
      />
    </div>
  )
}
