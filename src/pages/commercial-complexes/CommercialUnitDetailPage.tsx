import { FileText, Hash, Store } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import {
  commercialUnitApi,
  commercialUnitEditPath,
  commercialUnitsPath,
} from '../../lib/paths/commercial-complexes'
import type { CommercialUnit } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { emptyText } from './shared'

export function CommercialUnitDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '', laneId = '', unitId = '' } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
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

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  const plaque = localizeDigits(item.plaque, locale)

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Store}
        title={t('commercialUnits.details')}
        subtitle={<EntityNameSubtitle name={plaque} icon={Store} />}
      />
      <FormCard icon={Store} title={plaque}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Store}>{t('commercialUnits.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Hash} label={t('commercialUnits.plaque')} value={plaque} tone="teal" />
            <FormFactTile
              icon={Hash}
              label={t('commercialUnits.code')}
              value={localizeDigits(item.code, locale)}
              tone="mint"
            />
            <FormFactTile icon={FileText} label={t('commercialUnits.description')} value={emptyText(item.description)} />
            <FormFactTile
              icon={Store}
              label={t('commercialUnits.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
          </div>
          <DetailActions
            editTo={commercialUnitEditPath(complexId, floorId, laneId, item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('commercialUnits.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('commercialUnits.confirmDelete'),
                successMessage: t('commercialUnits.deleted'),
                path: commercialUnitApi(complexId, floorId, laneId, item.id),
                queryKey: ['commercial-units', complexId, floorId, laneId],
                onDeleted: () => navigate(commercialUnitsPath(complexId, floorId, laneId)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
