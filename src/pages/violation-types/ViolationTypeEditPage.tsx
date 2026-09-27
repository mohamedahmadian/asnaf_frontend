import { ShieldAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { ViolationType } from '../../types/app'
import { ViolationTypeForm } from './ViolationTypeForm'

export function ViolationTypeEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['violation-type', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ViolationType>(`/violation-types/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ShieldAlert}
        title={t('violationTypes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={ShieldAlert} />}
      />
      <ViolationTypeForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/violation-types/${id}`, payload)
          toast.success(t('violationTypes.updated'))
          navigate('/inspection/violation-types')
        }}
      />
    </div>
  )
}
