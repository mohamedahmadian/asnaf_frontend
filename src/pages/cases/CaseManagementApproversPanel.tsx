import { Building2, Plus, Shield, Trash2 } from 'lucide-react'
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
import type { AppRole, Paginated, WorkUnit } from '../../types/app'

type ApproverRow = {
  id: string
  workUnitId: string
  workUnitTitle: string
  roleId: string
  roleName: string
  createdAt: string
}

export function CaseManagementApproversPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const { q, page, term, setTerm, applySearch, setPage, searchParams, setParams } = useListParams({
    q: 'aq',
    page: 'apage',
  })
  const { sortBy, sortDir, sortParams, onSort } = useListSort(searchParams, setParams, {
    sortBy: 'asortBy',
    sortDir: 'asortDir',
  })
  const [unitId, setUnitId] = useState('')
  const [roleId, setRoleId] = useState('')
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: ['cases', 'settings', 'management-approvers', q, page, sortBy, sortDir],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ApproverRow>>('/cases/settings/management-approvers', {
        params: { q: q || undefined, page, ...sortParams },
      })
      return data
    },
  })
  const unitsQuery = useQuery({
    queryKey: ['work-units', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<WorkUnit[]>('/work-units')
      return data
    },
  })
  const rolesQuery = useQuery({
    queryKey: ['roles', 'lookup'],
    queryFn: async () => {
      const { data } = await api.get<AppRole[]>('/roles')
      return data
    },
  })

  const rows = query.data?.items ?? []
  const unitOptions = (unitsQuery.data ?? [])
    .filter((unit) => unit.isActive)
    .sort((a, b) => a.title.localeCompare(b.title, 'fa'))
    .map((unit) => ({ value: unit.id, label: unit.title }))
  const roleOptions = (rolesQuery.data ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
    .map((role) => ({ value: role.id, label: role.name }))

  async function add() {
    if (!unitId || !roleId || saving) return
    setSaving(true)
    try {
      await api.post('/cases/settings/management-approvers', { workUnitId: unitId, roleId })
      toast.success(t('cases.settingsManagementAdded'))
      setUnitId('')
      setRoleId('')
      await queryClient.invalidateQueries({ queryKey: ['cases', 'settings', 'management-approvers'] })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">{t('cases.settingsManagementHint')}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <FormField icon={Building2} label={t('cases.settingsManagementUnit')} htmlFor="case-management-unit">
            <SearchSelect
              id="case-management-unit"
              value={unitId}
              onChange={setUnitId}
              placeholder={t('cases.settingsManagementSelectUnit')}
              disabled={saving || unitsQuery.isLoading || unitOptions.length === 0}
              options={unitOptions}
            />
          </FormField>
          <FormField icon={Shield} label={t('cases.settingsManagementRole')} htmlFor="case-management-role">
            <SearchSelect
              id="case-management-role"
              value={roleId}
              onChange={setRoleId}
              placeholder={t('cases.settingsManagementSelectRole')}
              disabled={saving || rolesQuery.isLoading || roleOptions.length === 0}
              options={roleOptions}
            />
          </FormField>
        </div>
        <Button
          type="button"
          variant="soft"
          className="shrink-0"
          disabled={!unitId || !roleId || saving}
          onClick={() => void add()}
        >
          <Plus className="size-4" aria-hidden />
          {t('cases.settingsManagementAdd')}
        </Button>
      </div>
      <SearchBar
        autoFocus={false}
        term={term}
        onTermChange={setTerm}
        onSubmit={() => applySearch()}
        label={t('cases.settingsManagementSearch')}
        placeholder={t('cases.settingsManagementSearchPlaceholder')}
      />
      <TableCard
        rowClick={false}
        loading={query.isLoading}
        empty={q ? t('cases.settingsManagementNoResults') : t('cases.settingsManagementEmpty')}
        hasRows={rows.length > 0}
      >
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <SortableTh
                column="unit"
                label={t('cases.settingsManagementUnit')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                column="role"
                label={t('cases.settingsManagementRole')}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={onSort}
              />
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-4 py-3 text-start">{item.workUnitTitle}</td>
                <td className="px-4 py-3 text-start">{item.roleName}</td>
                <td className={actionsColClassName}>
                  <div data-row-actions className="flex flex-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      icon
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={t('cases.settingsManagementRemove')}
                      title={t('cases.settingsManagementRemove')}
                      onClick={() =>
                        confirmDelete({
                          message: t('cases.settingsManagementConfirmRemove'),
                          successMessage: t('cases.settingsManagementRemoved'),
                          path: `/cases/settings/management-approvers/${item.id}`,
                          queryKey: ['cases', 'settings', 'management-approvers'],
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
