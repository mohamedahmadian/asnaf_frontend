import { FileText, Files, Plus, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FormEmptyHint, FormSectionTitle, formToneClass } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { jobCatalogApi } from '../../lib/paths/jobs'
import type { DocumentItem, Job, JobDocumentRef, Paginated } from '../../types/app'

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

export function JobDocumentsPanel({
  jobId,
  documents,
  queryKey,
}: {
  jobId: string
  documents: JobDocumentRef[]
  queryKey: unknown[]
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pick, setPick] = useState('')
  const [saving, setSaving] = useState(false)
  const catalogQuery = useQuery({
    queryKey: ['documents', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<DocumentItem[] | Paginated<DocumentItem>>('/documents')
      return asList(data)
    },
  })

  const byTitle = (left: { title: string }, right: { title: string }) =>
    left.title.localeCompare(right.title, 'fa')
  const fixed = (catalogQuery.data ?? []).filter((item) => item.isFixed).sort(byTitle)
  const extra = documents.filter((item) => !item.isFixed).sort(byTitle)
  const extraIds = new Set(extra.map((item) => item.id))
  const options = (catalogQuery.data ?? [])
    .filter((item) => !item.isFixed && !extraIds.has(item.id))
    .sort(byTitle)
    .map((item) => ({ value: item.id, label: item.title }))

  async function save(documentIds: string[], success: string) {
    setSaving(true)
    try {
      const { data } = await api.patch<Job>(jobCatalogApi(jobId), { documentIds })
      queryClient.setQueryData(queryKey, data)
      toast.success(success)
      setPick('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  function add() {
    if (!pick || saving) return
    void save([...extra.map((item) => item.id), pick], t('jobCatalog.documentAdded'))
  }

  function remove(id: string) {
    confirmToast({
      title: t('jobCatalog.confirmRemoveDocument'),
      confirmLabel: t('common.yesDelete'),
      cancelLabel: t('common.cancel'),
      confirmVariant: 'danger',
      onConfirm: () => save(extra.filter((item) => item.id !== id).map((item) => item.id), t('jobCatalog.documentRemoved')),
    })
  }

  if (catalogQuery.isLoading) {
    return <LoadingState variant="inline" />
  }

  return (
    <div className="space-y-6">
      <section>
        <FormSectionTitle icon={Files}>{t('jobCatalog.fixedDocuments')}</FormSectionTitle>
        {fixed.length === 0 ? (
          <FormEmptyHint>{t('jobCatalog.noFixedDocuments')}</FormEmptyHint>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {fixed.map((item, index) => (
              <DocumentInfoCard key={item.id} item={item} tone={index % 2 === 0 ? 'teal' : 'mint'} />
            ))}
          </div>
        )}
      </section>
      <section>
        <FormSectionTitle icon={FileText} className="mb-5">
          {t('jobCatalog.extraDocuments')}
        </FormSectionTitle>
        <FormField icon={FileText} label={t('jobCatalog.addDocument')} htmlFor="jobDocumentAdd">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchSelect
                id="jobDocumentAdd"
                value={pick}
                onChange={setPick}
                placeholder={
                  options.length === 0 ? t('jobCatalog.noDocumentsToAdd') : t('jobCatalog.selectDocument')
                }
                disabled={saving || options.length === 0}
                options={options}
              />
            </div>
            <Button type="button" variant="soft" className="shrink-0" disabled={!pick || saving} onClick={add}>
              <Plus className="size-4" aria-hidden />
              {t('jobCatalog.addDocumentAction')}
            </Button>
          </div>
        </FormField>
        <div className="mt-3">
        {extra.length === 0 ? (
          <FormEmptyHint>{t('jobCatalog.noExtraDocuments')}</FormEmptyHint>
        ) : (
          <div className="grid gap-2">
            {extra.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <DocumentInfoCard
                  className="min-w-0 flex-1"
                  item={item}
                  tone={index % 2 === 0 ? 'teal' : 'mint'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  className="shrink-0"
                  disabled={saving}
                  aria-label={t('jobCatalog.removeDocument')}
                  title={t('jobCatalog.removeDocument')}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  )
}

function DocumentInfoCard({
  item,
  tone,
  className = '',
}: {
  item: { title: string; isRequired: boolean; gender: DocumentItem['gender'] }
  tone: 'teal' | 'mint'
  className?: string
}) {
  const { t } = useTranslation()
  const colors = formToneClass[tone]
  const gender =
    item.gender === 'BOTH' ? t('jobCatalog.genderMaleAndFemale') : t(`documents.genders.${item.gender}`)
  return (
    <article
      className={`flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 py-3 ${colors.wrap} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${colors.factIcon}`}>
          <FileText className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col items-start">
          <p className="text-sm font-semibold break-words text-ink-900">{item.title}</p>
          <span
            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
              item.isRequired
                ? 'bg-teal-50 text-teal-700 ring-teal-200'
                : 'bg-white text-ink-600 ring-line'
            }`}
          >
            {item.isRequired ? t('documents.required') : t('documents.optional')}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[11px] font-medium text-ink-500">{t('documents.gender')}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink-900">{gender}</p>
      </div>
    </article>
  )
}
