import { CalendarDays, ClipboardList, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DateText } from '../../../components/ui/DateText'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../../components/ui/Form'
import { FormCard, FormFactTile, FormSectionTitle } from '../../../components/ui/FormLayout'
import { useConfirmDelete } from '../../../hooks/useConfirmDelete'
import { api } from '../../../lib/api'
import { violationProceedingEditPath, violationProceedingsPath } from '../../../lib/paths/violations'
import type { ViolationProceeding } from '../../../types/app'
import { AttachmentList } from '../AttachmentList'

export function ProceedingDetailPage() {
  const { t } = useTranslation()
  const { id: violationId = '', proceedingId = '' } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['violation-proceeding', violationId, proceedingId],
    enabled: Boolean(violationId && proceedingId),
    queryFn: async () =>
      (await api.get<ViolationProceeding>(`/violations/${violationId}/proceedings/${proceedingId}`)).data,
  })

  const item = query.data
  if (!item) return <LoadingState />

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={ClipboardList}
        title={t('violationProceedings.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={ClipboardList} />}
      />
      <FormCard icon={ClipboardList} title={item.title}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={ClipboardList}>{t('violationProceedings.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={FileText} label={t('violationProceedings.titleField')} value={item.title} tone="teal" />
            <FormFactTile
              icon={CalendarDays}
              label={t('violationProceedings.occurredAt')}
              value={<DateText value={item.occurredAt} />}
              tone="mint"
            />
            <FormFactTile
              icon={FileText}
              label={t('violationProceedings.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <AttachmentList
            items={item.attachments ?? []}
            hrefFor={(attachmentId) =>
              `/violations/${violationId}/proceedings/${proceedingId}/attachments/${attachmentId}`
            }
          />
          <DetailActions
            editTo={violationProceedingEditPath(violationId, proceedingId)}
            editLabel={t('common.edit')}
            deleteLabel={t('violationProceedings.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('violationProceedings.confirmDelete'),
                successMessage: t('violationProceedings.deleted'),
                path: `/violations/${violationId}/proceedings/${proceedingId}`,
                queryKey: ['violation-proceedings', violationId],
                onDeleted: () => navigate(violationProceedingsPath(violationId)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
