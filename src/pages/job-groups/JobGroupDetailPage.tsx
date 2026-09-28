import { Briefcase, FileText, FolderKanban, Hash, Languages } from 'lucide-react'
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
import { jobGroupApi, jobGroupEditPath, jobGroupsPath, jobsPath } from '../../lib/paths/job-groups'
import type { JobGroup } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { JobGroupJobs, JobGroupRepresentatives, JobGroupSectionTabs, useJobGroupSection } from './JobGroupSections'

export function JobGroupDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const { section, setSection } = useJobGroupSection()
  const query = useQuery({
    queryKey: ['job-group', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<JobGroup>(jobGroupApi(id!))
      return data
    },
  })

  const item = query.data
  if (!item) {
    return <LoadingState />
  }

  const infoTab = section === 'info'

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={FolderKanban}
        title={t('jobGroups.details')}
        subtitle={<EntityNameSubtitle name={item.title} icon={FolderKanban} />}
      />
      <FormCard icon={FolderKanban} title={item.title}>
        <JobGroupSectionTabs section={section} onChange={setSection} />
        {section === 'representatives' ? <JobGroupRepresentatives jobGroupId={item.id} /> : null}
        {section === 'jobs' ? <JobGroupJobs jobGroupId={item.id} /> : null}
        <div
          role="tabpanel"
          id="form-panel-info"
          aria-labelledby="form-tab-info"
          hidden={!infoTab}
          className={infoTab ? 'space-y-6 p-5 sm:p-6' : 'hidden'}
        >
          <FormSectionTitle icon={FolderKanban}>{t('jobGroups.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={FolderKanban} label={t('jobGroups.title')} value={item.title} tone="teal" />
            <FormFactTile
              icon={Languages}
              label={t('jobGroups.titleEn')}
              value={item.titleEn ? <span dir="ltr">{item.titleEn}</span> : '—'}
              empty={!item.titleEn}
              tone="mint"
            />
            <FormFactTile
              icon={Hash}
              label={t('jobGroups.code')}
              value={item.code ? localizeDigits(item.code, locale) : '—'}
              empty={!item.code}
              tone="mint"
            />
            <FormFactTile
              icon={Briefcase}
              label={t('jobGroups.jobCount')}
              value={formatNumber(item._count?.jobs ?? 0, locale)}
            />
            <FormFactTile
              icon={FolderKanban}
              label={t('jobGroups.isActive')}
              value={<GeoStatus active={item.isActive} />}
            />
            <FormFactTile
              icon={FileText}
              label={t('jobGroups.description')}
              value={item.description || '—'}
              empty={!item.description}
              className="sm:col-span-2"
            />
          </div>
          <DetailActions
            editTo={
              infoTab ? jobGroupEditPath(item.id) : `${jobGroupEditPath(item.id)}?section=${section}`
            }
            editLabel={t('common.edit')}
            deleteLabel={t('jobGroups.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('jobGroups.confirmDelete'),
                successMessage: t('jobGroups.deleted'),
                path: jobGroupApi(item.id),
                queryKey: ['job-groups'],
                onDeleted: () => navigate(jobGroupsPath()),
              })
            }
            extraItems={[
              {
                to: jobsPath(item.id),
                icon: Briefcase,
                label: t('jobs.manage'),
              },
            ]}
          />
        </div>
      </FormCard>
    </div>
  )
}
