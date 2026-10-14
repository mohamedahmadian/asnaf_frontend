import { FileText, Plus, ToggleRight, Trash2, Users } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ActionsTh,
  PaginationBar,
  SearchBar,
  SortableTh,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { Button, FormField } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { useListParams } from '../../hooks/useListParams'
import { useListSort } from '../../hooks/useListSort'
import { api, getApiErrorMessage } from '../../lib/api'
import { documentGenders, type DocumentGender, type Paginated } from '../../types/app'
import { DocumentFlag } from '../documents/DocumentFlag'

type IdentityDocumentRow = {
  documentId: string
  title: string
  isRequired: boolean
  gender: DocumentGender
  createdAt: string
}

type DocumentOption = {
  id: string
  title: string
}

export function CaseIdentityDocumentsPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams()
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams)
  const [pick, setPick] = useState('')
  const [gender, setGender] = useState<DocumentGender>(documentGenders.BOTH)
  const [isRequired, setIsRequired] = useState(true)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['cases', 'settings', 'identity-documents', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<IdentityDocumentRow>>('/cases/settings/identity-documents', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const optionsQuery = useQuery({
    queryKey: ['cases', 'settings', 'identity-documents', 'options'],
    queryFn: async () => {
      const { data } = await api.get<DocumentOption[]>('/cases/settings/identity-documents/options')
      return data
    },
  })

  const rows = query.data?.items ?? []
  const optionRows = optionsQuery.data ?? []
  const options = optionRows.map((item) => ({ value: item.id, label: item.title }))
  const genderOptions = Object.values(documentGenders).map((item) => ({
    value: item,
    label: t(`documents.genders.${item}`),
  }))

  const requirementOptions = [
    { value: 'required', label: t('documents.required') },
    { value: 'optional', label: t('documents.optional') },
  ]

  async function add() {
    if (!pick || saving) return
    setSaving(true)
    try {
      await api.post('/cases/settings/identity-documents', { documentId: pick, gender, isRequired })
      toast.success(t('cases.settingsIdentityAdded'))
      setPick('')
      setGender(documentGenders.BOTH)
      setIsRequired(true)
      await queryClient.invalidateQueries({ queryKey: ['cases', 'settings', 'identity-documents'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="w-full lg:w-1/3">
          <FormField icon={FileText} label={t('cases.settingsIdentityAdd')} htmlFor="case-identity-document-add">
            <SearchSelect
              id="case-identity-document-add"
              value={pick}
              onChange={setPick}
              placeholder={
                options.length === 0
                  ? t('cases.settingsIdentityNoneToAdd')
                  : t('cases.settingsIdentitySelect')
              }
              disabled={saving || optionsQuery.isLoading || options.length === 0}
              options={options}
            />
          </FormField>
        </div>
        <div className="w-full lg:w-44">
          <FormField icon={ToggleRight} label={t('documents.isRequired')} htmlFor="case-identity-document-required">
            <SearchSelect
              id="case-identity-document-required"
              value={isRequired ? 'required' : 'optional'}
              onChange={(next) => setIsRequired(next === 'required')}
              placeholder={t('documents.isRequired')}
              disabled={saving}
              options={requirementOptions}
            />
          </FormField>
        </div>
        <div className="w-full lg:w-52">
          <FormField icon={Users} label={t('documents.gender')} htmlFor="case-identity-document-gender">
            <SearchSelect
              id="case-identity-document-gender"
              value={gender}
              onChange={(next) => setGender(next as DocumentGender)}
              placeholder={t('documents.selectGender')}
              disabled={saving}
              options={genderOptions}
            />
          </FormField>
        </div>
        <Button type="button" variant="soft" className="w-full shrink-0 lg:w-auto" disabled={!pick || saving} onClick={() => void add()}>
          <Plus className="size-4" aria-hidden />
          {t('cases.settingsIdentityAddAction')}
        </Button>
      </div>
      <SearchBar
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.settingsIdentitySearch')}
        placeholder={t('cases.settingsIdentitySearchPlaceholder')}
      />
      <TableCard
        rowClick={false}
        loading={query.isLoading}
        empty={q ? t('cases.settingsIdentityNoResults') : t('cases.settingsIdentityEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="title"
                label={t('documents.title')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="isRequired"
                label={t('documents.isRequired')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="gender"
                label={t('documents.gender')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.documentId} className="border-t border-line">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">
                  <DocumentFlag
                    on={item.isRequired}
                    onLabel={t('documents.required')}
                    offLabel={t('documents.optional')}
                  />
                </td>
                <td className="px-4 py-3">{t(`documents.genders.${item.gender}`)}</td>
                <td className={actionsColClassName}>
                  <div data-row-actions className="flex flex-nowrap">
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={t('cases.settingsIdentityRemove')}
                    title={t('cases.settingsIdentityRemove')}
                    onClick={() =>
                      confirmDelete({
                        message: t('cases.settingsIdentityConfirmRemove'),
                        successMessage: t('cases.settingsIdentityRemoved'),
                        path: `/cases/settings/identity-documents/${item.documentId}`,
                        queryKey: ['cases', 'settings', 'identity-documents'],
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                  </div>
                </td>
              </tr>
            ))}
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
