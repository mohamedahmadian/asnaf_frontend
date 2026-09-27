import { FileCheck, Lock, ToggleRight, Type, Users } from 'lucide-react'
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
import type { DocumentItem } from '../../types/app'
import { DocumentFlag } from './DocumentFlag'

export function DocumentDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['document', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<DocumentItem>(`/documents/${id}`)
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
        icon={FileCheck}
        title={t('documents.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={FileCheck} />}
      />
      <FormCard icon={FileCheck} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={FileCheck}>{t('documents.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Type} label={t('documents.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={ToggleRight}
              label={t('documents.isRequired')}
              value={
                <DocumentFlag
                  on={item.isRequired}
                  onLabel={t('documents.required')}
                  offLabel={t('documents.optional')}
                />
              }
              tone="mint"
            />
            <FormFactTile
              icon={Users}
              label={t('documents.gender')}
              value={t(`documents.genders.${item.gender}`)}
            />
            <FormFactTile
              icon={Lock}
              label={t('documents.isFixed')}
              value={
                <DocumentFlag
                  on={item.isFixed}
                  onLabel={t('documents.fixed')}
                  offLabel={t('documents.notFixed')}
                />
              }
            />
          </div>
          <DetailActions
            editTo={`/base-info/documents/${item.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={t('documents.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('documents.confirmDelete'),
                successMessage: t('documents.deleted'),
                path: `/documents/${item.id}`,
                queryKey: ['documents'],
                onDeleted: () => navigate('/base-info/documents'),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
