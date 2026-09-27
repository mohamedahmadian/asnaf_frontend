import { FileText, Hash, Layers, Rows3 } from 'lucide-react'
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
  commercialFloorApi,
  commercialFloorEditPath,
  commercialFloorsPath,
  commercialLanesPath,
} from '../../lib/paths/commercial-complexes'
import type { CommercialFloor } from '../../types/app'
import { emptyText } from './shared'

export function CommercialFloorDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { complexId = '', floorId = '' } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['commercial-floor', complexId, floorId],
    enabled: Boolean(complexId && floorId),
    queryFn: async () => {
      const { data } = await api.get<CommercialFloor>(commercialFloorApi(complexId, floorId))
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
        icon={Layers}
        title={t('commercialFloors.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={Layers} />}
      />
      <FormCard icon={Layers} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Layers}>{t('commercialFloors.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Layers} label={t('commercialFloors.titleLabel')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Hash}
              label={t('commercialFloors.code')}
              value={localizeDigits(item.code, locale)}
              tone="mint"
            />
            <FormFactTile icon={FileText} label={t('commercialFloors.description')} value={emptyText(item.description)} />
            <FormFactTile
              icon={Rows3}
              label={t('commercialFloors.laneCount')}
              value={formatNumber(item._count?.lanes ?? 0, locale)}
            />
          </div>
          <DetailActions
            editTo={commercialFloorEditPath(complexId, item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('commercialFloors.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('commercialFloors.confirmDelete'),
                successMessage: t('commercialFloors.deleted'),
                path: commercialFloorApi(complexId, item.id),
                queryKey: ['commercial-floors', complexId],
                onDeleted: () => navigate(commercialFloorsPath(complexId)),
              })
            }
            extraItems={[
              {
                to: commercialLanesPath(complexId, item.id),
                icon: Rows3,
                label: t('commercialLanes.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
