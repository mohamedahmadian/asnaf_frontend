import { Layers } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialFloorApi, commercialFloorsPath } from '../../lib/paths/commercial-complexes'
import type { CommercialFloor } from '../../types/app'
import { CommercialFloorForm } from './CommercialFloorForm'

export function CommercialFloorEditPage() {
  const { t } = useTranslation()
  const { complexId = '', floorId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['commercial-floor', complexId, floorId],
    enabled: Boolean(complexId && floorId),
    queryFn: async () => {
      const { data } = await api.get<CommercialFloor>(commercialFloorApi(complexId, floorId))
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Layers}
        title={t('commercialFloors.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Layers} />}
      />
      <CommercialFloorForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          code: query.data.code,
        }}
        onSubmit={async (payload) => {
          await api.patch(commercialFloorApi(complexId, floorId), payload)
          await queryClient.invalidateQueries({ queryKey: ['commercial-floor', complexId, floorId] })
          await queryClient.invalidateQueries({ queryKey: ['commercial-floors', complexId] })
          toast.success(t('commercialFloors.updated'))
          navigate(commercialFloorsPath(complexId))
        }}
      />
    </div>
  )
}
