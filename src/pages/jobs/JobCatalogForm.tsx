import { Banknote, Briefcase, Files, FolderKanban, HardHat, Languages, Receipt, ScanSearch, ToggleRight, Type } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { AppForm, Button, FormActions, FormField, ToggleField, fieldClassName, inputClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseGroupedAmount, toLatinDigits } from '../../lib/datetime'
import type { InquiryCenter, JobDocumentRef, JobGroup, JobInquiryCenterRef, JobType, Paginated } from '../../types/app'
import { InquiryCenterPicker } from './InquiryCenterPanels'
import { JobDocumentsPanel } from './JobDocumentPanels'

export type JobCatalogPayload = {
  title: string
  titleEn?: string | null
  taxIntaCode?: string | null
  jobTypeId: string
  annualFee?: number | null
  groupId: string
  isActive: boolean
  inquiryCenterIds?: string[]
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

export function JobCatalogForm({
  jobId,
  initial,
  onSubmit,
}: {
  jobId?: string
  initial?: JobCatalogPayload & { inquiryCenters?: JobInquiryCenterRef[]; documents?: JobDocumentRef[] }
  onSubmit: (payload: JobCatalogPayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('details')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '')
  const [taxIntaCode, setTaxIntaCode] = useState(initial?.taxIntaCode ?? '')
  const [jobTypeId, setJobTypeId] = useState(initial?.jobTypeId ?? '')
  const [annualFee, setAnnualFee] = useState(
    initial?.annualFee != null ? String(initial.annualFee) : '',
  )
  const [groupId, setGroupId] = useState(initial?.groupId ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [inquiryCenterIds, setInquiryCenterIds] = useState<string[]>(initial?.inquiryCenterIds ?? [])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const typesQuery = useQuery({
    queryKey: ['job-types', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<JobType[] | Paginated<JobType>>('/job-types')
      return asList(data)
    },
  })
  const groupsQuery = useQuery({
    queryKey: ['job-groups', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<JobGroup[] | Paginated<JobGroup>>('/job-groups')
      return asList(data)
    },
  })
  const centersQuery = useQuery({
    queryKey: ['inquiry-centers', 'lookup'],
    enabled: Boolean(initial),
    queryFn: async () => {
      const { data } = await api.get<InquiryCenter[] | Paginated<InquiryCenter>>('/inquiry-centers')
      return asList(data)
    },
  })

  const typeOptions = useMemo(
    () => (typesQuery.data ?? []).map((item) => ({ value: item.id, label: item.title })),
    [typesQuery.data],
  )

  function feeFromType(typeId: string) {
    const type = (typesQuery.data ?? []).find((item) => item.id === typeId)
    return type?.annualFee != null ? String(type.annualFee) : ''
  }

  function clearError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function onJobTypeChange(typeId: string) {
    setJobTypeId(typeId)
    clearError('jobTypeId')
    if (!initial) {
      setAnnualFee(feeFromType(typeId))
    }
  }

  function showTypeFee() {
    if (!jobTypeId) return
    setAnnualFee(feeFromType(jobTypeId))
  }
  const groupOptions = useMemo(
    () =>
      (groupsQuery.data ?? [])
        .filter((item) => item.isActive || item.id === groupId)
        .map((item) => ({ value: item.id, label: item.title })),
    [groupId, groupsQuery.data],
  )
  const centers = useMemo(() => {
    const list = centersQuery.data ?? []
    const extras = (initial?.inquiryCenters ?? []).filter(
      (center) => !list.some((item) => item.id === center.id),
    )
    return [...extras.map((center) => ({ id: center.id, name: center.name })), ...list]
  }, [centersQuery.data, initial?.inquiryCenters])

  function validate() {
    const next: Record<string, string> = {}
    const trimmedTitle = title.trim()
    const trimmedTitleEn = titleEn.trim()
    if (!trimmedTitle) next.title = t('jobCatalog.titleRequired')
    else if (trimmedTitle.length < 2) next.title = t('jobCatalog.titleMin')
    if (trimmedTitleEn && trimmedTitleEn.length < 2) next.titleEn = t('jobCatalog.titleEnMin')
    if (!jobTypeId) next.jobTypeId = t('jobCatalog.jobTypeRequired')
    if (!groupId) next.groupId = t('jobCatalog.jobGroupRequired')
    setFieldErrors(next)
    if (next.title) document.getElementById('jobCatalogTitle')?.focus()
    else if (next.titleEn) document.getElementById('jobCatalogTitleEn')?.focus()
    else if (next.jobTypeId) document.getElementById('jobCatalogType')?.focus()
    else if (next.groupId) document.getElementById('jobCatalogGroup')?.focus()
    return Object.keys(next).length === 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!validate()) {
      setTab('details')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        titleEn: titleEn.trim() || null,
        taxIntaCode: toLatinDigits(taxIntaCode).trim() || null,
        jobTypeId,
        annualFee: parseGroupedAmount(annualFee),
        groupId,
        isActive,
        ...(initial ? { inquiryCenterIds } : {}),
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={HardHat}
      title={initial ? initial.title || initial.titleEn || '' : t('jobCatalog.create')}
      subtitle={initial ? undefined : t('jobCatalog.createSubtitle')}
    >
      {initial ? (
        <FormTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'details', label: t('jobCatalog.tabDetails'), icon: HardHat },
            { id: 'centers', label: t('jobCatalog.tabInquiryCenters'), icon: ScanSearch },
            { id: 'documents', label: t('jobCatalog.tabDocuments'), icon: Files },
          ]}
        />
      ) : null}
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        {tab === 'details' || !initial ? (
          <div
            role={initial ? 'tabpanel' : undefined}
            id={initial ? 'form-panel-details' : undefined}
            aria-labelledby={initial ? 'form-tab-details' : undefined}
            className="space-y-4"
          >
        <FormField icon={Type} label={t('jobCatalog.title')} htmlFor="jobCatalogTitle" error={fieldErrors.title}>
          <input
            id="jobCatalogTitle"
            className={inputClassName(Boolean(fieldErrors.title))}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              clearError('title')
            }}
            aria-invalid={Boolean(fieldErrors.title)}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Languages} label={t('jobCatalog.titleEn')} htmlFor="jobCatalogTitleEn" error={fieldErrors.titleEn}>
          <input
            id="jobCatalogTitleEn"
            className={inputClassName(Boolean(fieldErrors.titleEn))}
            dir="ltr"
            value={titleEn}
            onChange={(e) => {
              setTitleEn(e.target.value)
              clearError('titleEn')
            }}
            aria-invalid={Boolean(fieldErrors.titleEn)}
            maxLength={160}
          />
        </FormField>
        <FormField icon={Receipt} label={t('jobCatalog.taxIntaCode')} htmlFor="jobCatalogTaxIntaCode">
          <input
            id="jobCatalogTaxIntaCode"
            className={`${fieldClassName} digit-field`}
            dir="ltr"
            value={taxIntaCode}
            onChange={(e) => setTaxIntaCode(toLatinDigits(e.target.value))}
            maxLength={32}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField icon={Briefcase} label={t('jobCatalog.jobType')} htmlFor="jobCatalogType" error={fieldErrors.jobTypeId}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SearchSelect
                  id="jobCatalogType"
                  value={jobTypeId}
                  onChange={onJobTypeChange}
                  placeholder={t('jobCatalog.selectJobType')}
                  invalid={Boolean(fieldErrors.jobTypeId)}
                  options={typeOptions}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 !rounded-xl !px-2 !py-1.5 !text-xs whitespace-nowrap"
                disabled={!jobTypeId}
                onClick={showTypeFee}
              >
                {t('jobCatalog.showAnnualFee')}
              </Button>
            </div>
          </FormField>
          <FormField icon={Banknote} label={t('jobCatalog.annualFee')} htmlFor="jobCatalogAnnualFee">
            <AmountInput id="jobCatalogAnnualFee" value={annualFee} onChange={setAnnualFee} />
          </FormField>
        </div>
        <FormField icon={FolderKanban} label={t('jobCatalog.jobGroup')} htmlFor="jobCatalogGroup" error={fieldErrors.groupId}>
          <SearchSelect
            id="jobCatalogGroup"
            value={groupId}
            onChange={(value) => {
              setGroupId(value)
              clearError('groupId')
            }}
            placeholder={t('jobCatalog.selectJobGroup')}
            invalid={Boolean(fieldErrors.groupId)}
            options={groupOptions}
          />
        </FormField>
        {initial ? (
          <FormField icon={ToggleRight} label={t('jobCatalog.isActive')} htmlFor="jobCatalogActive">
            <ToggleField
              id="jobCatalogActive"
              checked={isActive}
              onChange={setIsActive}
              onLabel={t('geo.active')}
              offLabel={t('geo.inactive')}
            />
          </FormField>
        ) : null}
          </div>
        ) : tab === 'centers' ? (
          <div role="tabpanel" id="form-panel-centers" aria-labelledby="form-tab-centers">
            <InquiryCenterPicker
              centers={centers}
              selectedIds={inquiryCenterIds}
              onChange={setInquiryCenterIds}
              label={t('jobCatalog.tabInquiryCenters')}
              empty={t('jobCatalog.noInquiryCenters')}
            />
          </div>
        ) : (
          <div role="tabpanel" id="form-panel-documents" aria-labelledby="form-tab-documents">
            {jobId ? (
              <JobDocumentsPanel
                jobId={jobId}
                documents={initial?.documents ?? []}
                queryKey={['jobs-catalog', jobId]}
              />
            ) : null}
          </div>
        )}
        <FormActions
          submitLabel={t('jobCatalog.save')}
          cancelLabel={t('jobCatalog.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
