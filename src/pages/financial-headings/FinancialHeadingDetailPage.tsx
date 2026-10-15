import { FileText, Hash, Landmark, ScrollText, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import type { FinancialHeading } from '../../types/app'
import { bankAccountOptionLabel } from '../municipal-fees/MunicipalFeeForm'
import { accountHeadingsReturnTo } from './account-return'

export function FinancialHeadingDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = accountHeadingsReturnTo(searchParams.get('returnTo'))
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['financial-heading', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<FinancialHeading>(`/financial-headings/${id}`)
      return data
    },
  })

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('financialHeadings.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ScrollText} />}
      />
      <FormCard icon={ScrollText} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ScrollText}>
            {t('financialHeadings.details')}
          </FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Type}
              label={t('financialHeadings.title')}
              value={item.title}
              tone="teal"
            />
            <FormFactTile
              icon={Landmark}
              label={t('financialHeadings.bankAccount')}
              value={bankAccountOptionLabel(item.bankAccount, locale, t('geo.inactive'))}
              tone="mint"
            />
            <FormFactTile
              icon={Hash}
              label={t('financialHeadings.paymentId')}
              value={item.paymentId ? localizeDigits(item.paymentId, locale) : '—'}
              empty={!item.paymentId}
              tone="teal"
            />
            <FormFactTile
              icon={FileText}
              label={t('financialHeadings.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/financial-headings/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('financialHeadings.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('financialHeadings.confirmDelete'),
                successMessage: t('financialHeadings.deleted'),
                path: `/financial-headings/${item.id}`,
                queryKey: ['financial-headings'],
                onDeleted: () => navigate(returnTo ?? '/base-info/financial-headings'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
