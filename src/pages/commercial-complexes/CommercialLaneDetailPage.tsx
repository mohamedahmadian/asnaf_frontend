import { FileText, Hash, Rows3, Store } from 'lucide-react'
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
import { formatNumber, localizeDigits } from '../../lib/datetime'
import {
  commercialLaneApi,
  commercialLaneEditPath,
  commercialLanesPath,
  commercialUnitsPath,
} from '../../lib/paths/commercial-complexes'
import type { CommercialLane } from '../../types/app'
import { emptyText } from './shared'

export function CommercialLaneDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '', laneId = '' } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['commercial-lane', complexId, floorId, laneId],
    enabled: Boolean(complexId && floorId && laneId),
    queryFn: async () => {
      const { data } = await api.get<CommercialLane>(commercialLaneApi(complexId, floorId, laneId))
      return data
    },
  })

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Rows3}
        title={t('commercialLanes.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Rows3} />}
      />
      <FormCard icon={Rows3} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Rows3}>{t('commercialLanes.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Rows3} label={t('commercialLanes.titleLabel')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Hash}
              label={t('commercialLanes.code')}
              value={localizeDigits(item.code, locale)}
              tone="mint"
            />
            <FormFactTile icon={FileText} label={t('commercialLanes.description')} value={emptyText(item.description)} />
            <FormFactTile
              icon={Store}
              label={t('commercialLanes.unitCount')}
              value={formatNumber(item._count?.units ?? 0, locale)}
            />
          </div>
          <DetailActions
            editTo={commercialLaneEditPath(complexId, floorId, item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('commercialLanes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('commercialLanes.confirmDelete'),
                successMessage: t('commercialLanes.deleted'),
                path: commercialLaneApi(complexId, floorId, item.id),
                queryKey: ['commercial-lanes', complexId, floorId],
                onDeleted: () => navigate(commercialLanesPath(complexId, floorId)),
              })
            }
            extraItems={[
              {
                to: commercialUnitsPath(complexId, floorId, item.id),
                icon: Store,
                label: t('commercialUnits.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
