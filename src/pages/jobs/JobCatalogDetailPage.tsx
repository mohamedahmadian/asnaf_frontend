import { Banknote, Briefcase, Files, FolderKanban, HardHat, Languages, Receipt, ScanSearch, Type } from 'lucide-react'
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
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { formatGroupedNumber, localizeDigits } from '../../lib/datetime'
import { jobCatalogApi, jobCatalogEditPath, jobsCatalogPath } from '../../lib/paths/jobs'
import type { Job } from '../../types/app'
import { GeoStatus } from '../geo/GeoShared'
import { InquiryCenterList } from './InquiryCenterPanels'
import { JobDocumentsPanel } from './JobDocumentPanels'

export function JobCatalogDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const [tab, setTab] = useState('details')
  const query = useQuery({
    queryKey: ['jobs-catalog', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Job>(jobCatalogApi(id!))
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
        icon={HardHat}
        title={t('jobCatalog.details')}
        subtitle={<EntityNameSubtitle name={item.title || item.titleEn || ''} icon={HardHat} />}
      />
      <FormCard icon={HardHat} title={item.title || item.titleEn || ''}>
        <FormTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'details', label: t('jobCatalog.tabDetails'), icon: HardHat },
            { id: 'centers', label: t('jobCatalog.tabInquiryCenters'), icon: ScanSearch },
            { id: 'documents', label: t('jobCatalog.tabDocuments'), icon: Files },
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
                icon={Type}
                label={t('jobCatalog.title')}
                value={item.title || '—'}
                empty={!item.title}
                tone="teal"
              />
              <FormFactTile
                icon={Languages}
                label={t('jobCatalog.titleEn')}
                value={item.titleEn || '—'}
                empty={!item.titleEn}
                tone="mint"
              />
              <FormFactTile
                icon={Receipt}
                label={t('jobCatalog.taxIntaCode')}
                value={item.taxIntaCode ? localizeDigits(item.taxIntaCode, locale) : '—'}
                empty={!item.taxIntaCode}
              />
              <FormFactTile icon={Briefcase} label={t('jobCatalog.jobType')} value={item.jobType.title} />
              <FormFactTile
                icon={Banknote}
                label={t('jobCatalog.annualFee')}
                value={item.annualFee == null ? '—' : formatGroupedNumber(item.annualFee, locale)}
                empty={item.annualFee == null}
                tone="mint"
              />
              <FormFactTile
                icon={FolderKanban}
                label={t('jobCatalog.jobGroup')}
                value={item.group?.title ?? '—'}
                empty={!item.group}
              />
              <FormFactTile icon={HardHat} label={t('jobCatalog.isActive')} value={<GeoStatus active={item.isActive} />} />
            </div>
          ) : tab === 'centers' ? (
            <div role="tabpanel" id="form-panel-centers" aria-labelledby="form-tab-centers">
              <InquiryCenterList
                centers={item.inquiryCenters}
                label={t('jobCatalog.tabInquiryCenters')}
                empty={t('jobCatalog.noInquiryCenters')}
              />
            </div>
          ) : (
            <div role="tabpanel" id="form-panel-documents" aria-labelledby="form-tab-documents">
              <JobDocumentsPanel
                jobId={item.id}
                documents={item.documents ?? []}
                queryKey={['jobs-catalog', item.id]}
              />
            </div>
          )}
          <DetailActions
            editTo={jobCatalogEditPath(item.id)}
            editLabel={t('common.edit')}
            deleteLabel={t('jobCatalog.delete')}
            onDelete={() =>
              confirmDelete({
                message: t('jobCatalog.confirmDelete'),
                successMessage: t('jobCatalog.deleted'),
                path: jobCatalogApi(item.id),
                queryKey: ['jobs-catalog'],
                onDeleted: () => navigate(jobsCatalogPath()),
              })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
