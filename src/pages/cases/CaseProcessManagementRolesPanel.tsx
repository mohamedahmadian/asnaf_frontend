import { Plus, Shield, Trash2, Type } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, FormField, fieldClassName } from '../../components/ui/Form'
import { FormEmptyHint } from '../../components/ui/FormLayout'
import { LoadingState } from '../../components/ui/LoadingState'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import type { AppRole } from '../../types/app'

type RequestType = 'ISSUANCE' | 'RENEWAL' | 'LOCATION_CHANGE' | 'AUCTION' | 'STEWARDSHIP'

type RoleRow = {
  id: string
  roleId: string
  roleName: string
  title: string
}

export function CaseProcessManagementRolesPanel({ requestType }: { requestType: RequestType }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [roleId, setRoleId] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['cases', 'settings', 'process-management-roles', requestType],
    queryFn: async () =>
      (await api.get<RoleRow[]>('/cases/settings/process-management-roles', { params: { requestType } })).data,
  })
  const rolesQuery = useQuery({
    queryKey: ['roles', 'lookup'],
    queryFn: async () => (await api.get<AppRole[]>('/roles')).data,
  })

  const rows = query.data ?? []
  const taken = new Set(rows.map((item) => item.roleId))
  const roleOptions = (rolesQuery.data ?? [])
    .filter((role) => !taken.has(role.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'fa'))
    .map((role) => ({ value: role.id, label: role.name }))

  async function add() {
    const nextTitle = title.trim()
    if (!roleId || !nextTitle || saving) return
    setSaving(true)
    try {
      await api.post('/cases/settings/process-management-roles', {
        requestType,
        roleId,
        title: nextTitle,
      })
      toast.success(t('cases.settingsProcessManagementAdded'))
      setRoleId('')
      setTitle('')
      await queryClient.invalidateQueries({
        queryKey: ['cases', 'settings', 'process-management-roles', requestType],
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  if (query.isLoading) return <LoadingState variant="inline" />

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-ink-500">{t('cases.settingsProcessManagementHint')}</p>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <FormField icon={Shield} label={t('cases.settingsProcessManagementRole')} htmlFor={`${requestType}-management-role`}>
            <SearchSelect
              id={`${requestType}-management-role`}
              value={roleId}
              onChange={setRoleId}
              options={roleOptions}
              placeholder={
                roleOptions.length === 0
                  ? t('cases.settingsProcessManagementNoneToAdd')
                  : t('cases.settingsProcessManagementSelectRole')
              }
              disabled={saving || rolesQuery.isLoading || roleOptions.length === 0}
            />
          </FormField>
        </div>
        <div className="min-w-0 flex-1">
          <FormField icon={Type} label={t('cases.settingsProcessManagementTitle')} htmlFor={`${requestType}-management-title`}>
            <input
              id={`${requestType}-management-title`}
              className={fieldClassName}
              value={title}
              maxLength={120}
              placeholder={t('cases.settingsProcessManagementTitlePlaceholder')}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>
        </div>
        <Button type="button" variant="soft" disabled={!roleId || !title.trim() || saving} onClick={() => void add()}>
          <Plus className="size-4" aria-hidden />
          {t('cases.settingsProcessManagementAdd')}
        </Button>
      </div>
      {rows.length === 0 ? (
        <FormEmptyHint>{t('cases.settingsProcessManagementEmpty')}</FormEmptyHint>
      ) : (
        <div className="grid gap-2">
          {rows.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="min-w-0">
                <div className="font-medium text-ink-900">{item.title}</div>
                <div className="text-sm text-ink-500">{item.roleName}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                icon
                aria-label={t('common.delete')}
                onClick={() =>
                  confirmDelete({
                    message: t('cases.settingsProcessManagementConfirmRemove'),
                    successMessage: t('cases.settingsProcessManagementRemoved'),
                    path: `/cases/settings/process-management-roles/${item.id}`,
                    queryKey: ['cases', 'settings', 'process-management-roles', requestType],
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
