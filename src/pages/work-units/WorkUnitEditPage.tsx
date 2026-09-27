import { Network } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { WorkUnit } from '../../types/app'
import { WorkUnitForm } from './WorkUnitForm'

export function WorkUnitEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['work-unit', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<WorkUnit>(`/work-units/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Network}
        title={t('workUnits.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Network} />}
      />
      <WorkUnitForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/work-units/${id}`, payload)
          toast.success(t('workUnits.updated'))
          navigate('/base-info/work-units')
        }}
      />
    </div>
  )
}
