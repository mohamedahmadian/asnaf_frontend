import { Store } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { commercialUnitApi, commercialUnitsPath } from '../../lib/paths/commercial-complexes'
import type { CommercialUnit } from '../../types/app'
import { CommercialUnitForm } from './CommercialUnitForm'

export function CommercialUnitEditPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '', laneId = '', unitId = '' } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['commercial-unit', complexId, floorId, laneId, unitId],
    enabled: Boolean(complexId && floorId && laneId && unitId),
    queryFn: async () => {
      const { data } = await api.get<CommercialUnit>(
        commercialUnitApi(complexId, floorId, laneId, unitId),
      )
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Store}
        title={t('commercialUnits.edit')}
        subtitle={
          <EntityNameSubtitle name={localizeDigits(query.data.plaque, locale)} icon={Store} />
        }
      />
      <CommercialUnitForm
        initial={{
          plaque: query.data.plaque,
          description: query.data.description ?? '',
          code: query.data.code,
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(commercialUnitApi(complexId, floorId, laneId, unitId), payload)
          toast.success(t('commercialUnits.updated'))
          navigate(commercialUnitsPath(complexId, floorId, laneId))
        }}
      />
    </div>
  )
}
