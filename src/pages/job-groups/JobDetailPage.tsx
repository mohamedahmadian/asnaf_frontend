import { Briefcase, FileText, Hash, Receipt, ScanSearch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormFactTile } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { InquiryCenterList } from '../jobs/InquiryCenterPanels'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'
import { jobApi, jobEditPath, jobsPath } from '../../lib/paths/job-groups'
import type { Job } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'

export function JobDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { groupId = '', jobId = '' } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const [tab, setTab] = useState('details')
  const query = useQuery({
    queryKey: ['job', groupId, jobId],
    enabled: Boolean(groupId && jobId),
    queryFn: async () => {
      const { data } = await api.get<Job>(jobApi(groupId, jobId))
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
        icon={Briefcase}
        title={t('jobs.details')}
        subtitle={<EntityNameSubtitle name={item.title || item.titleEn || ''} icon={Briefcase} />}
      />
      <FormCard icon={Briefcase} title={item.title || item.titleEn || ''}>
        <FormTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'details', label: t('jobs.tabDetails'), icon: Briefcase },
            { id: 'centers', label: t('jobs.tabInquiryCenters'), icon: ScanSearch },
          ]}
        />
        <div className="space-y-6 p-5 sm:p-6">
          {tab === 'details' ? (
          <div
            role="tabpanel"
            id="form-panel-details"
            aria-labelledby="form-tab-details"
            className="grid gap-2 sm:grid-cols-2 sm:gap-3"
          >
            <FormFactTile
              icon={Briefcase}
              label={t('jobs.titleLabel')}
              value={item.title || '—'}
              empty={!item.title}
              tone="teal"
            />
            <FormFactTile
              icon={Hash}
              label={t('jobs.code')}
              value={localizeDigits(item.code, locale)}
              tone="mint"
            />
            <FormFactTile
              icon={Receipt}
              label={t('jobs.taxIntaCode')}
              value={item.taxIntaCode ? localizeDigits(item.taxIntaCode, locale) : '—'}
              empty={!item.taxIntaCode}
            />
            <FormFactTile icon={Briefcase} label={t('jobs.jobType')} value={item.jobType.title} />
            <FormFactTile
              icon={Briefcase}
              label={t('jobs.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('jobs.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          ) : (
            <div role="tabpanel" id="form-panel-centers" aria-labelledby="form-tab-centers">
              <InquiryCenterList
                centers={item.inquiryCenters}
                label={t('jobs.inquiryCenters')}
                empty={t('jobs.noInquiryCenters')}
              />
            </div>
          )}
          <DetailActions
            editTo={jobEditPath(groupId, item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('jobs.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('jobs.confirmDelete'),
                successMessage: t('jobs.deleted'),
                path: jobApi(groupId, item.id),
                queryKey: ['jobs', groupId],
                onDeleted: () => navigate(jobsPath(groupId)),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
