import { CalendarDays, FileText, Percent, Type } from 'lucide-react'
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
import { formatNumber } from '../../lib/datetime'
import type { Discount } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function DiscountDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['discount', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Discount>(`/discounts/${id}`)
      return data
    },
  })

  const discount = query.data
  if (!discount) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Percent}
        title={t('discounts.details')}
        subtitle={<EntityNameSubtitle name={discount.title} icon={Percent} />}
      />
      <FormCard icon={Percent} title={discount.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Percent}>{t('discounts.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Type}
              label={t('discounts.title')}
              value={discount.title}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('discounts.year')}
              value={formatNumber(discount.year, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={Percent}
              label={t('discounts.percent')}
              value={t('discounts.percentValue', { value: formatNumber(discount.percent, locale) })}
            />
            <FormFactTile
              icon={Percent}
              label={t('discounts.isActive')}
              value={<GeoStatus active={discount.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('discounts.description')}
              value={discount.description || '—'}
              empty={!discount.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/discounts/${discount.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('discounts.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('discounts.confirmDelete'),
                successMessage: t('discounts.deleted'),
                path: `/discounts/${discount.id}`,
                queryKey: ['discounts'],
                onDeleted: () => navigate('/base-info/discounts'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
