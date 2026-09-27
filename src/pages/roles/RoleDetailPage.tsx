import { FileText, KeyRound, Shield, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DetailActions,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  formShellClassName,
} from '../../components/ui/Form'
import { FormCard, FormEmptyHint, FormFactTile, FormSectionTitle } from '../../components/ui/FormLayout'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import { ADMIN_ROLE_CODE, isRolePermissionsLocked, isSystemRoleLocked } from '../../lib/roles'
import type { AppRole } from '../../types/app'
import { PermissionTree } from './PermissionTree'

export function RoleDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirmDelete } = useConfirmDelete()
  const query = useQuery({
    queryKey: ['role', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<AppRole>(`/roles/${id}`)
      return data
    },
  })

  const role = query.data
  if (!role) {
    return <LoadingState />
  }

  const systemLocked = isSystemRoleLocked(role)
  const permissionsLocked = isRolePermissionsLocked(role)

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Shield}
        title={t('accessRoles.details')}
        subtitle={<EntityNameSubtitle name={role.name} icon={Shield} />}
      />
      <FormCard icon={Shield} title={role.name}>
        <div className="space-y-6 p-5 sm:p-6">
          <FormSectionTitle icon={Shield}>{t('accessRoles.details')}</FormSectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <FormFactTile icon={Shield} label={t('accessRoles.name')} value={role.name} tone="teal" />
            <FormFactTile icon={KeyRound} label={t('accessRoles.code')} value={role.code} tone="mint" />
            <FormFactTile
              icon={Users}
              label={t('accessRoles.userCount')}
              value={formatNumber(role._count?.users ?? 0, locale)}
            />
            <FormFactTile
              icon={FileText}
              label={t('accessRoles.description')}
              value={role.description || '—'}
              empty={!role.description}
              className="sm:col-span-2"
            />
          </div>
          <FormSectionTitle icon={Shield}>{t('accessRoles.permissions')}</FormSectionTitle>
          {permissionsLocked ? (
            <FormEmptyHint>
              {t(
                role.code === ADMIN_ROLE_CODE
                  ? 'accessRoles.adminBypass'
                  : 'accessRoles.systemPermissionsLocked',
              )}
            </FormEmptyHint>
          ) : role.permissionCodes.length ? (
            <PermissionTree selected={role.permissionCodes} onChange={() => undefined} disabled />
          ) : (
            <FormEmptyHint>{t('accessRoles.noPermissions')}</FormEmptyHint>
          )}
          <DetailActions
            editTo={`/base-info/roles/${role.id}/edit`}
            editLabel={t('common.edit')}
            deleteLabel={systemLocked ? undefined : t('accessRoles.delete')}
            onDelete={
              systemLocked
                ? undefined
                : () =>
                    confirmDelete({
                      message: t('accessRoles.confirmDelete'),
                      successMessage: t('accessRoles.deleted'),
                      path: `/roles/${role.id}`,
                      queryKey: ['roles'],
                      onDeleted: () => navigate('/base-info/roles'),
                    })
            }
          />
        </div>
      </FormCard>
    </div>
  )
}
