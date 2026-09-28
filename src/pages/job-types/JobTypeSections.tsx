import { Banknote, Briefcase, Check, HardHat, Pencil, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, type KeyboardEvent, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AmountInput } from '../../components/ui/AmountInput'
import { confirmToast } from '../../components/ui/confirmToast'
import { AppForm, Button, FormField, cardClassName } from '../../components/ui/Form'
import { formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import {
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
} from '../../components/ui/ListControls'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatGroupedNumber, formatNumber, parseGroupedAmount } from '../../lib/datetime'
import { jobCatalogApi, jobsCatalogApi } from '../../lib/paths/jobs'
import type { Job, Paginated } from '../../types/app'

export type JobTypeSection = 'info' | 'jobs'

export function useJobTypeSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section: JobTypeSection = searchParams.get('section') === 'jobs' ? 'jobs' : 'info'

  function setSection(next: JobTypeSection) {
    const params = new URLSearchParams(searchParams)
    if (next === 'jobs') params.set('section', 'jobs')
    else params.delete('section')
    setSearchParams(params, { replace: true })
  }

  return { section, setSection }
}

export function JobTypeSectionTabs({
  section,
  onChange,
}: {
  section: JobTypeSection
  onChange: (next: JobTypeSection) => void
}) {
  const { t } = useTranslation()
  const tabs: { id: JobTypeSection; label: string; icon: typeof Briefcase }[] = [
    { id: 'info', label: t('jobTypes.infoTab'), icon: Briefcase },
    { id: 'jobs', label: t('jobTypes.jobsTab'), icon: HardHat },
  ]

  return <FormTabs value={section} onChange={(id) => onChange(id as JobTypeSection)} tabs={tabs} />
}

function JobFeeEditor({
  draft,
  saving,
  onDraft,
  onSave,
  onCancel,
}: {
  draft: string
  saving: boolean
  onDraft: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    rootRef.current?.querySelector('input')?.focus()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Enter') onSave()
    else onCancel()
  }

  return (
    <div
      ref={rootRef}
      data-enter-ignore=""
      className="flex min-w-64 items-start gap-2"
      onKeyDown={onKeyDown}
    >
      <div className="min-w-0 flex-1">
        <AmountInput value={draft} onChange={onDraft} />
      </div>
      <Button type="button" icon disabled={saving} aria-label={t('jobTypes.save')} onClick={onSave}>
        <Check className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        icon
        variant="ghost"
        disabled={saving}
        aria-label={t('jobTypes.cancel')}
        onClick={onCancel}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

export function JobTypeJobs({
  jobTypeId,
  jobTypeTitle,
  annualFee,
}: {
  jobTypeId: string
  jobTypeTitle: string
  annualFee: number | null
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const queryClient = useQueryClient()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const [bulkFee, setBulkFee] = useState(annualFee != null ? String(annualFee) : '')
  const [uniformOpen, setUniformOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const savingRef = useRef(false)
  const query = useQuery({
    queryKey: ['jobs-catalog', 'job-type', jobTypeId, q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Job>>(jobsCatalogApi(), {
        params: { jobTypeId, q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })

  const rows = query.data?.items ?? []
  const bulkAmount = parseGroupedAmount(bulkFee)

  function beginEdit(job: Job) {
    if (editingId === job.id || savingRef.current) return
    setEditingId(job.id)
    setDraft(job.annualFee != null ? String(job.annualFee) : '')
  }

  function cancelEdit() {
    if (savingRef.current) return
    setEditingId(null)
    setDraft('')
  }

  async function saveFee(job: Job) {
    if (savingRef.current) return
    savingRef.current = true
    setSavingId(job.id)
    try {
      await api.patch(jobCatalogApi(job.id), { annualFee: parseGroupedAmount(draft) })
      await queryClient.invalidateQueries({ queryKey: ['jobs-catalog'] })
      toast.success(t('jobTypes.jobFeeUpdated'))
      setEditingId(null)
      setDraft('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      savingRef.current = false
      setSavingId(null)
    }
  }

  async function applyFee(amount: number) {
    setApplying(true)
    try {
      const { data } = await api.patch<{ updated: number }>(`/job-types/${jobTypeId}/jobs-annual-fee`, {
        annualFee: amount,
      })
      await queryClient.invalidateQueries({ queryKey: ['jobs-catalog'] })
      toast.success(t('jobTypes.applyFeeDone', { count: formatNumber(data.updated, locale) }))
      setEditingId(null)
      setDraft('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setApplying(false)
    }
  }

  function requestApply(event: FormEvent) {
    event.preventDefault()
    if (bulkAmount == null) {
      toast.error(t('jobTypes.applyFeeRequired'))
      return
    }
    const amount = bulkAmount
    confirmToast({
      title: t('jobTypes.applyFeeConfirm', { amount: formatGroupedNumber(amount, locale) }),
      confirmLabel: t('common.yes'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => applyFee(amount),
    })
  }

  return (
    <div
      role="tabpanel"
      id="form-panel-jobs"
      aria-labelledby="form-tab-jobs"
      className={formCardBodyClassName}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('jobTypes.jobsSearch')}
        placeholder={t('jobTypes.jobsSearchPlaceholder')}
        endExtra={
          <Button
            type="button"
            variant="ghost"
            aria-expanded={uniformOpen}
            onClick={() => setUniformOpen((open) => !open)}
          >
            <Banknote className="size-4 shrink-0" aria-hidden />
            {t('jobTypes.applyUniformFee')}
          </Button>
        }
      />
      {uniformOpen ? (
        <AppForm
          onSubmit={requestApply}
          className={`mb-4 w-full p-4 ${cardClassName}`}
        >
          <FormField
            icon={Banknote}
            label={t('jobTypes.applyFeeAmount', { title: jobTypeTitle })}
            htmlFor="applyJobsFee"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <AmountInput id="applyJobsFee" value={bulkFee} onChange={setBulkFee} required />
              </div>
              <Button type="submit" disabled={applying} className="shrink-0">
                <Check className="size-4 shrink-0" aria-hidden />
                {t('jobTypes.apply')}
              </Button>
            </div>
          </FormField>
        </AppForm>
      ) : null}
      <TableCard
        loading={query.isLoading}
        empty={q ? t('jobTypes.jobsNoResults') : t('jobTypes.jobsEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('jobCatalog.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="group"
                label={t('jobCatalog.jobGroup')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="annualFee"
                label={t('jobTypes.jobFee')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => {
              const editing = editingId === job.id
              return (
                <tr key={job.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    {editing ? null : (
                      <button
                        type="button"
                        tabIndex={-1}
                        data-row-view=""
                        className="sr-only"
                        onClick={() => beginEdit(job)}
                      >
                        {t('jobTypes.editJobFee')}
                      </button>
                    )}
                    {job.title || '—'}
                  </td>
                  <td className="px-4 py-3">{job.group?.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <JobFeeEditor
                        draft={draft}
                        saving={savingId === job.id}
                        onDraft={setDraft}
                        onSave={() => void saveFee(job)}
                        onCancel={cancelEdit}
                      />
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {job.annualFee == null ? '—' : formatGroupedNumber(job.annualFee, locale)}
                        <Pencil className="size-3.5 text-teal-600" aria-hidden />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableCard>
      {query.data ? (
        <PaginationBar
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  )
}
