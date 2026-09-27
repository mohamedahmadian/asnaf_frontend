import { FileCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { DocumentItem } from '../../types/app'
import { DocumentForm } from './DocumentForm'

export function DocumentEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['document', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<DocumentItem>(`/documents/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FileCheck}
        title={t('documents.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={FileCheck} />}
      />
      <DocumentForm
        initial={{
          title: query.data.title,
          isRequired: query.data.isRequired,
          gender: query.data.gender,
          isFixed: query.data.isFixed,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/documents/${id}`, payload)
          toast.success(t('documents.updated'))
          navigate('/base-info/documents')
        }}
      />
    </div>
  )
}
