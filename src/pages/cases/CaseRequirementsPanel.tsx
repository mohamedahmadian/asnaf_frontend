import { FileText, Plus, ScanSearch, Trash2, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField } from '../../components/ui/Form'
import { confirmToast } from '../../components/ui/confirmToast'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { documentGenders, type DocumentGender, type DocumentItem, type Paginated } from '../../types/app'

type RequestType = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'AUCTION'

type RequirementDocument = {
  id: string
  title: string
  gender: DocumentGender
  isRequired: boolean
}

type RequirementInquiry = { id: string; name: string; isActive: boolean }

type Requirements = {
  documents: RequirementDocument[]
  inquiries: RequirementInquiry[]
}

function asList<T>(data: T[] | Paginated<T>) {
  return Array.isArray(data) ? data : data.items
}

export function CaseRequirementsPanel({
  requestType,
  jobId,
  scope = 'all',
  section = 'all',
}: {
  requestType: RequestType
  jobId?: string
  scope?: 'all' | 'job'
  section?: 'all' | 'documents' | 'inquiries'
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [documentId, setDocumentId] = useState('')
  const [gender, setGender] = useState<DocumentGender>(documentGenders.BOTH)
  const [isRequired, setIsRequired] = useState(true)
  const [centerId, setCenterId] = useState('')
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['cases', 'requirements', requestType, jobId ?? 'all'],
    queryFn: async () =>
      (
        await api.get<Requirements>('/cases/settings/requirements', {
          params: { requestType, jobId: jobId || undefined },
        })
      ).data,
  })
  const documents = useQuery({
    queryKey: ['documents', 'lookup'],
    queryFn: async () => asList((await api.get<DocumentItem[] | Paginated<DocumentItem>>('/documents')).data),
  })
  const centers = useQuery({
    queryKey: ['inquiry-centers', 'lookup'],
    queryFn: async () =>
      asList(
        (await api.get<{ id: string; name: string; isActive: boolean }[] | Paginated<{ id: string; name: string; isActive: boolean }>>('/inquiry-centers')).data,
      ),
  })

  async function save(next: Requirements, success: string) {
    setSaving(true)
    try {
      const { data } = await api.put<Requirements>('/cases/settings/requirements', {
        requestType,
        documents: next.documents.map((item) => ({
          documentId: item.id,
          gender: item.gender,
          isRequired: item.isRequired,
        })),
        inquiries: next.inquiries.map((item) => ({ inquiryCenterId: item.id })),
      }, { params: jobId ? { jobId } : undefined })
      queryClient.setQueryData(['cases', 'requirements', requestType, jobId ?? 'all'], data)
      toast.success(success)
      setDocumentId('')
      setCenterId('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) return <LoadingState variant="inline" />
  const fieldId = `${jobId ?? 'shared'}-${requestType}`
  const documentsTitle = scope === 'job' ? t('cases.requirementsDocumentsJob') : t('cases.requirementsDocuments')
  const inquiriesTitle = scope === 'job' ? t('cases.requirementsInquiriesJob') : t('cases.requirementsInquiries')
  const emptyDocuments = scope === 'job' ? t('cases.requirementsEmptyDocumentsJob') : t('cases.requirementsEmptyDocuments')
  const emptyInquiries = scope === 'job' ? t('cases.requirementsEmptyInquiriesJob') : t('cases.requirementsEmptyInquiries')
  const current = query.data ?? { documents: [], inquiries: [] }
  const takenDocs = new Set(current.documents.map((item) => item.id))
  const takenCenters = new Set(current.inquiries.map((item) => item.id))
  const documentOptions = (documents.data ?? [])
    .filter((item) => !takenDocs.has(item.id))
    .sort((left, right) => left.title.localeCompare(right.title, 'fa'))
    .map((item) => ({ value: item.id, label: item.title }))
  const centerOptions = (centers.data ?? [])
    .filter((item) => item.isActive && !takenCenters.has(item.id))
    .map((item) => ({ value: item.id, label: item.name }))

  const showDocuments = section !== 'inquiries'
  const showInquiries = section !== 'documents'

  return (
    <div className={showDocuments && showInquiries ? 'space-y-8' : 'space-y-3'}>
      {showDocuments ? (
      <section className="space-y-3">
        <FormSectionTitle icon={FileText}>{documentsTitle}</FormSectionTitle>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <FormField icon={FileText} label={t('jobCatalog.addDocument')} htmlFor={`${fieldId}-document`}>
              <SearchSelect
                id={`${fieldId}-document`}
                value={documentId}
                onChange={setDocumentId}
                options={documentOptions}
                placeholder={t('jobCatalog.selectDocument')}
                disabled={saving}
              />
            </FormField>
          </div>
          <div className="w-full lg:w-44">
            <FormField icon={FileText} label={t('documents.isRequired')} htmlFor={`${fieldId}-required`}>
              <SearchSelect
                id={`${fieldId}-required`}
                value={isRequired ? 'required' : 'optional'}
                onChange={(value) => setIsRequired(value === 'required')}
                options={[
                  { value: 'required', label: t('documents.required') },
                  { value: 'optional', label: t('documents.optional') },
                ]}
                placeholder={t('documents.isRequired')}
                disabled={saving}
              />
            </FormField>
          </div>
          <div className="w-full lg:w-52">
            <FormField icon={Users} label={t('documents.gender')} htmlFor={`${fieldId}-gender`}>
              <SearchSelect
                id={`${fieldId}-gender`}
                value={gender}
                onChange={(value) => setGender(value as DocumentGender)}
                options={Object.values(documentGenders).map((item) => ({
                  value: item,
                  label: t(`documents.genders.${item}`),
                }))}
                placeholder={t('documents.selectGender')}
                disabled={saving}
              />
            </FormField>
          </div>
          <Button
            type="button"
            variant="soft"
            disabled={!documentId || saving}
            onClick={() => {
              const picked = (documents.data ?? []).find((item) => item.id === documentId)
              if (!picked) return
              void save(
                {
                  ...current,
                  documents: [...current.documents, { id: picked.id, title: picked.title, gender, isRequired }],
                },
                t('cases.requirementsSaved'),
              )
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t('jobCatalog.addDocumentAction')}
          </Button>
        </div>
        {current.documents.length === 0 ? (
          <FormEmptyHint>{emptyDocuments}</FormEmptyHint>
        ) : (
          <div className="grid gap-2">
            {current.documents.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div>
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="text-sm text-ink-500">
                    {item.isRequired ? t('documents.required') : t('documents.optional')}
                    {' · '}
                    {t(`documents.genders.${item.gender}`)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  aria-label={t('jobCatalog.removeDocument')}
                  onClick={() =>
                    confirmToast({
                      title: t('jobCatalog.confirmRemoveDocument'),
                      confirmLabel: t('common.yesDelete'),
                      cancelLabel: t('common.cancel'),
                      confirmVariant: 'danger',
                      onConfirm: () =>
                        save(
                          { ...current, documents: current.documents.filter((row) => row.id !== item.id) },
                          t('cases.requirementsSaved'),
                        ),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}
      {showInquiries ? (
      <section className="space-y-3">
        <FormSectionTitle icon={ScanSearch}>{inquiriesTitle}</FormSectionTitle>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <FormField icon={ScanSearch} label={t('jobCatalog.tabInquiryCenters')} htmlFor={`${fieldId}-center`}>
              <SearchSelect
                id={`${fieldId}-center`}
                value={centerId}
                onChange={setCenterId}
                options={centerOptions}
                placeholder={t('cases.requirementsSelectInquiry')}
                disabled={saving}
              />
            </FormField>
          </div>
          <Button
            type="button"
            variant="soft"
            disabled={!centerId || saving}
            onClick={() => {
              const picked = (centers.data ?? []).find((item) => item.id === centerId)
              if (!picked) return
              void save(
                { ...current, inquiries: [...current.inquiries, picked] },
                t('cases.requirementsSaved'),
              )
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t('cases.requirementsAddInquiry')}
          </Button>
        </div>
        {current.inquiries.length === 0 ? (
          <FormEmptyHint>{emptyInquiries}</FormEmptyHint>
        ) : (
          <div className="grid gap-2">
            {current.inquiries.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="font-medium text-ink-900">{item.name}</div>
                <Button
                  type="button"
                  variant="ghost"
                  icon
                  aria-label={t('common.delete')}
                  onClick={() =>
                    confirmToast({
                      title: t('cases.requirementsConfirmRemoveInquiry'),
                      confirmLabel: t('common.yesDelete'),
                      cancelLabel: t('common.cancel'),
                      confirmVariant: 'danger',
                      onConfirm: () =>
                        save(
                          { ...current, inquiries: current.inquiries.filter((row) => row.id !== item.id) },
                          t('cases.requirementsSaved'),
                        ),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}
    </div>
  )
}

