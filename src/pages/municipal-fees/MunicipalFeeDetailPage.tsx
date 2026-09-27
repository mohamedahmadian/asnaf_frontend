import { Banknote, FileText, HandCoins, Landmark, ToggleRight, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import type { MunicipalFee } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { bankAccountOptionLabel, formatFeeAmount } from './MunicipalFeeForm'
import { accountFeesReturnTo } from './account-return'

export function MunicipalFeeDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = accountFeesReturnTo(searchParams.get('returnTo'))
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['municipal-fee', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<MunicipalFee>(`/municipal-fees/${id}`)
      return data
    },
  })

  const fee = query.data
  if (!fee) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={HandCoins}
        title={t('municipalFees.details')}
        subtitle={<EntityNameSubtitle name={fee.title} icon={HandCoins} />}
      />
      <FormCard icon={HandCoins} title={fee.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={HandCoins}>{t('municipalFees.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('municipalFees.title')} value={fee.title} tone="teal" />
            <FormFactTile
              icon={Landmark}
              label={t('municipalFees.bankAccount')}
              value={bankAccountOptionLabel(fee.bankAccount, locale, t('geo.inactive'))}
              tone="mint"
            />
            <FormFactTile
              icon={Banknote}
              label={t('municipalFees.amount')}
              value={formatFeeAmount(fee.amount, locale)}
              tone="teal"
            />
            <FormFactTile
              icon={ToggleRight}
              label={t('municipalFees.isActive')}
              value={<GeoStatus active={fee.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('municipalFees.description')}
              value={fee.description || '—'}
              empty={!fee.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/municipal-fees/${fee.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('municipalFees.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('municipalFees.confirmDelete'),
                successMessage: t('municipalFees.deleted'),
                path: `/municipal-fees/${fee.id}`,
                queryKey: ['municipal-fees'],
                onDeleted: () => navigate(returnTo ?? '/base-info/municipal-fees'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
