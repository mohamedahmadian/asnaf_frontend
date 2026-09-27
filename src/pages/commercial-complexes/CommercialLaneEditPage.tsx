import { Rows3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialLaneApi, commercialLanesPath } from '../../lib/paths/commercial-complexes'
import type { CommercialLane } from '../../types/app'
import { CommercialLaneForm } from './CommercialLaneForm'

export function CommercialLaneEditPage() {
  const { t } = useTranslation()
  const { complexId = '', floorId = '', laneId = '' } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['commercial-lane', complexId, floorId, laneId],
    enabled: Boolean(complexId && floorId && laneId),
    queryFn: async () => {
      const { data } = await api.get<CommercialLane>(commercialLaneApi(complexId, floorId, laneId))
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Rows3}
        title={t('commercialLanes.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Rows3} />}
      />
      <CommercialLaneForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          code: query.data.code,
        }}
        onSubmit={async (payload) => {
          await api.patch(commercialLaneApi(complexId, floorId, laneId), payload)
          toast.success(t('commercialLanes.updated'))
          navigate(commercialLanesPath(complexId, floorId))
        }}
      />
    </div>
  )
}
