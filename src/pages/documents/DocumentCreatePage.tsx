import { FileCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { DocumentForm } from './DocumentForm'

export function DocumentCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FileCheck}
        title={t('documents.create')}
      />
      <DocumentForm
        onSubmit={async (payload) => {
          await api.post('/documents', payload)
          toast.success(t('documents.created'))
          navigate('/base-info/documents')
        }}
      />
    </div>
  )
}
