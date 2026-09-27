import { Building2, Languages, Layers, Mailbox, MapPin } from 'lucide-react'
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
  commercialComplexApi,
  commercialComplexEditPath,
  commercialComplexesPath,
  commercialFloorsPath,
} from '../../lib/paths/commercial-complexes'
import type { CommercialComplex } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { emptyText, useComplexName } from './shared'

export function CommercialComplexDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const name = useComplexName()
  const { complexId } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['commercial-complex', complexId],
    enabled: Boolean(complexId),
    queryFn: async () => {
      const { data } = await api.get<CommercialComplex>(commercialComplexApi(complexId!))
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
        icon={Building2}
        title={t('commercialComplexes.details')}
        subtitle={<EntityNameSubtitle name={name(item)} icon={Building2} />}
      />
      <FormCard icon={Building2} title={name(item)}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Building2}>{t('commercialComplexes.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Building2} label={t('commercialComplexes.name')} value={item.name} tone="teal" />
            <FormFactTile icon={Languages} label={t('commercialComplexes.nameEn')} value={item.nameEn} tone="mint" />
            <FormFactTile icon={MapPin} label={t('commercialComplexes.address')} value={emptyText(item.address)} />
            <FormFactTile
              icon={Mailbox}
              label={t('commercialComplexes.postalCode')}
              value={item.postalCode ? localizeDigits(item.postalCode, locale) : '—'}
            />
            <FormFactTile
              icon={Layers}
              label={t('commercialComplexes.floorCount')}
              value={formatNumber(item._count?.floors ?? 0, locale)}
            />
            <FormFactTile
              icon={Building2}
              label={t('commercialComplexes.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
          </div>
          <DetailActions
            editTo={commercialComplexEditPath(item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('commercialComplexes.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('commercialComplexes.confirmDelete'),
                successMessage: t('commercialComplexes.deleted'),
                path: commercialComplexApi(item.id),
                queryKey: ['commercial-complexes'],
                onDeleted: () => navigate(commercialComplexesPath()),
              })
            }
            extraItems={[
              {
                to: commercialFloorsPath(item.id),
                icon: Layers,
                label: t('commercialFloors.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
