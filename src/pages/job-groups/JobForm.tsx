import { Briefcase, FileText, Hash, Receipt, ScanSearch, ToggleRight, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, ToggleField, fieldClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { InquiryCenterPicker } from '../jobs/InquiryCenterPanels'
import { api, getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'
import type { InquiryCenter, JobInquiryCenterRef, JobType, Paginated } from '../../types/app'

export type JobPayload = {
  title: string
  jobTypeId: string
  description?: string | null
  code: string
  taxIntaCode: string
  inquiryCenterIds: string[]
  isActive: boolean
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

export function JobForm({
  initial,
  onSubmit,
}: {
  initial?: JobPayload & { inquiryCenters?: JobInquiryCenterRef[] }
  onSubmit: (payload: JobPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [jobTypeId, setJobTypeId] = useState(initial?.jobTypeId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [taxIntaCode, setTaxIntaCode] = useState(initial?.taxIntaCode ?? '')
  const [inquiryCenterIds, setInquiryCenterIds] = useState<string[]>(initial?.inquiryCenterIds ?? [])
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [tab, setTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const typesQuery = useQuery({
    queryKey: ['job-types', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<JobType[] | Paginated<JobType>>('/job-types')
      return asList(data)
    },
  })
  const centersQuery = useQuery({
    queryKey: ['inquiry-centers', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<InquiryCenter[] | Paginated<InquiryCenter>>('/inquiry-centers')
      return asList(data)
    },
  })

  const typeOptions = useMemo(() => {
    const types = typesQuery.data ?? []
    return [
      { value: '', label: t('jobs.selectJobType') },
      ...types.map((item) => ({ value: item.id, label: item.title })),
    ]
  }, [t, typesQuery.data])

  const centers = useMemo(() => {
    const list = centersQuery.data ?? []
    const extras = (initial?.inquiryCenters ?? []).filter(
      (center) => !list.some((item) => item.id === center.id),
    )
    return [...extras.map((center) => ({ id: center.id, name: center.name })), ...list]
  }, [centersQuery.data, initial?.inquiryCenters])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        jobTypeId,
        description: description.trim() || null,
        code: code.trim(),
        taxIntaCode: toLatinDigits(taxIntaCode).trim(),
        inquiryCenterIds,
        isActive,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Briefcase}
      title={initial ? initial.title : t('jobs.create')}
      subtitle={initial ? undefined : t('jobs.createSubtitle')}
    >
      {initial ? (
        <FormTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'details', label: t('jobs.tabDetails'), icon: Briefcase },
            { id: 'centers', label: t('jobs.tabInquiryCenters'), icon: ScanSearch },
          ]}
        />
      ) : null}
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        {tab === 'centers' && initial ? (
          <div role="tabpanel" id="form-panel-centers" aria-labelledby="form-tab-centers">
            <InquiryCenterPicker
              centers={centers}
              selectedIds={inquiryCenterIds}
              onChange={setInquiryCenterIds}
              label={t('jobs.inquiryCenters')}
              empty={t('jobs.noInquiryCenters')}
            />
          </div>
        ) : (
          <div
            role={initial ? 'tabpanel' : undefined}
            id={initial ? 'form-panel-details' : undefined}
            aria-labelledby={initial ? 'form-tab-details' : undefined}
            className="space-y-4"
          >
        <FormField icon={Type} label={t('jobs.titleLabel')} htmlFor="jobTitle">
          <input
            id="jobTitle"
            className={fieldClassName}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Briefcase} label={t('jobs.jobType')} htmlFor="jobTypeId">
          <SearchSelect
            id="jobTypeId"
            value={jobTypeId}
            onChange={setJobTypeId}
            placeholder={t('jobs.selectJobType')}
            required
            options={typeOptions}
          />
        </FormField>
        <FormField icon={Hash} label={t('jobs.code')} htmlFor="jobCode">
          <input
            id="jobCode"
            className={`${fieldClassName} digit-field`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            minLength={1}
            maxLength={32}
          />
        </FormField>
        <FormField icon={Receipt} label={t('jobs.taxIntaCode')} htmlFor="jobTaxIntaCode">
          <input
            id="jobTaxIntaCode"
            className={`${fieldClassName} digit-field`}
            dir="ltr"
            value={taxIntaCode}
            onChange={(e) => setTaxIntaCode(toLatinDigits(e.target.value))}
            required
            minLength={1}
            maxLength={32}
          />
        </FormField>
        <FormField icon={FileText} label={t('jobs.description')} htmlFor="jobDescription">
          <textarea
            id="jobDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('jobs.isActive')} htmlFor="jobActive">
            <ToggleField
              id="jobActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
        {initial ? null : (
          <InquiryCenterPicker
            centers={centers}
            selectedIds={inquiryCenterIds}
            onChange={setInquiryCenterIds}
            label={t('jobs.inquiryCenters')}
            empty={t('jobs.noInquiryCenters')}
          />
        )}
          </div>
        )}
        <FormActions
          submitLabel={t('jobs.save')}
          cancelLabel={t('jobs.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
