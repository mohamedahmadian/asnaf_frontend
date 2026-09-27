import { FileText, Mail, Phone, ScanSearch, ScrollText, Type, UserRound } from 'lucide-react'
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
import type { InquiryCenter } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function InquiryCenterDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['inquiry-center', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InquiryCenter>(`/inquiry-centers/${id}`)
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
        icon={ScanSearch}
        title={t('inquiryCenters.details')}
        subtitle={<EntityNameSubtitle name={item.name} icon={ScanSearch} />}
      />
      <FormCard icon={ScanSearch} title={item.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ScanSearch}>{t('inquiryCenters.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('inquiryCenters.name')} value={item.name} tone="teal" />
            <FormFactTile
              icon={Phone}
              label={t('inquiryCenters.phone')}
              copyValue={item.phone}
              tone="mint"
            />
            <FormFactTile
              icon={UserRound}
              label={t('inquiryCenters.officer')}
              value={item.officer?.fullName || '—'}
              empty={!item.officer}
            />
            <FormFactTile
              icon={ScanSearch}
              label={t('inquiryCenters.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('inquiryCenters.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={ScrollText}>{t('inquiryCenters.letterSection')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={Mail}
              label={t('inquiryCenters.letterTitle')}
              value={item.letterTitle || '—'}
              empty={!item.letterTitle}
              className="sm:col-span-2"
            />
            <FormFactTile
              icon={ScrollText}
              label={t('inquiryCenters.letterBody')}
              value={
                item.letterBody ? (
                  <span className="whitespace-pre-wrap">{item.letterBody}</span>
                ) : (
                  '—'
                )
              }
              empty={!item.letterBody}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={`/base-info/inquiry-centers/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('inquiryCenters.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('inquiryCenters.confirmDelete'),
                successMessage: t('inquiryCenters.deleted'),
                path: `/inquiry-centers/${item.id}`,
                queryKey: ['inquiry-centers'],
                onDeleted: () => navigate('/base-info/inquiry-centers'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
