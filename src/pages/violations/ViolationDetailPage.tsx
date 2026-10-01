import { CalendarDays, ClipboardList, Files, FileText, Gavel, IdCard, ShieldAlert, Tag, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { DateText } from '../../components/ui/DateText'
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
import { formatNumber, localizeDigits } from '../../lib/datetime'
import { violationEditPath, violationProceedingsPath, violationsPath } from '../../lib/paths/violations'
import type { Violation } from '../../types/app'
import { AttachmentList } from './AttachmentList'

export function ViolationDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['violation', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Violation>(`/violations/${id}`)).data,
  })

  const item = query.data
  if (!item || !id) return <LoadingState />
  const name = item.person?.fullName || localizeDigits(item.nationalId, locale)

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t('violations.details')}
        subtitle={<EntityNameSubtitle name={name} icon={Gavel} />}
      />
      <FormCard icon={Gavel} title={name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Gavel}>{t('violations.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile
              icon={IdCard}
              label={t('violations.nationalId')}
              copyValue={item.nationalId}
              tone="teal"
            />
            <FormFactTile
              icon={UserRound}
              label={t('violations.personName')}
              value={item.person?.fullName || '—'}
              empty={!item.person}
              tone="mint"
            />
            <FormFactTile icon={Tag} label={t('violations.violationType')} value={item.violationType.title} tone="teal" />
            <FormFactTile
              icon={ShieldAlert}
              label={t('violations.status')}
              value={t(`violationStatuses.${item.status}`)}
              tone="mint"
            />
            <FormFactTile
              icon={Files}
              label={t('violations.caseFile')}
              value={
                item.caseFile
                  ? [
                      item.caseFile.caseTrackingCode
                        ? localizeDigits(item.caseFile.caseTrackingCode, locale)
                        : t('violations.caseNoCode'),
                      item.caseFile.businessUnitTitle,
                      item.caseFile.jobGroupTitle,
                      item.caseFile.jobTitle,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : '—'
              }
              empty={!item.caseFile}
              tone="teal"
            />
            <FormFactTile
              icon={CalendarDays}
              label={t('violations.occurredAt')}
              value={<DateText value={item.occurredAt} />}
              tone="ink"
            />
            <FormFactTile
              icon={ClipboardList}
              label={t('violations.proceedingCount')}
              value={formatNumber(item._count.proceedings, locale)}
              tone="ink"
            />
            <FormFactTile
              icon={FileText}
              label={t('violations.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <AttachmentList
            items={item.attachments}
            hrefFor={(attachmentId) => `/violations/${id}/attachments/${attachmentId}`}
          />
          <DetailActions
            editTo={violationEditPath(id)}
            editLabel={t('common.edit')}
            deleteLabel={t('violations.delete')}
            extraItems={[
              {
                to: violationProceedingsPath(id),
                label: t('violations.manageProceedings'),
                icon: ClipboardList,
                variant: 'soft',
              },
            ]}
            onDelete={() =>
              confirmDelete({
                message: t('violations.confirmDelete'),
                successMessage: t('violations.deleted'),
                path: `/violations/${id}`,
                queryKey: ['violations'],
                onDeleted: () => navigate(violationsPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
