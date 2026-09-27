import { FileText, KeyRound, Shield, Type } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, fieldClassName } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'
import { ADMIN_ROLE_CODE, isRolePermissionsLocked, isSystemRoleLocked } from '../../lib/roles'
import type { AppRole } from '../../types/app'
import { PermissionTree } from './PermissionTree'

export type RolePayload = {
  name: string
  code: string
  description?: string
  permissionCodes: string[]
}

export function RoleForm({
  initial,
  onSubmit,
}: {
  initial?: AppRole
  onSubmit: (payload: RolePayload) => Promise<void>
}) {
  const { t } = useTranslation()
  const systemLocked = isSystemRoleLocked(initial)
  const permissionsLocked = isRolePermissionsLocked(initial)
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [permissionCodes, setPermissionCodes] = useState<string[]>(initial?.permissionCodes ?? [])
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!permissionsLocked && !systemLocked && permissionCodes.length === 0) {
      toast.error(t('accessRoles.permissionsRequired'))
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        permissionCodes: permissionsLocked ? [] : permissionCodes,
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard
      icon={Shield}
      title={initial ? initial.name : t('accessRoles.create')}
      subtitle={initial ? undefined : t('accessRoles.createSubtitle')}
    >
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={Type} label={t('accessRoles.name')} htmlFor="roleName">
          <input
            id="roleName"
            className={fieldClassName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </FormField>
        <FormField icon={KeyRound} label={t('accessRoles.code')} htmlFor="roleCode">
          <input
            id="roleCode"
            lang="en"
            dir="ltr"
            className={`${fieldClassName} latin-field`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={40}
            pattern="[A-Za-z][A-Za-z0-9_]*"
            title={t('accessRoles.codeHint')}
            disabled={systemLocked}
          />
        </FormField>
        <FormField icon={FileText} label={t('accessRoles.description')} htmlFor="roleDescription">
          <textarea
            id="roleDescription"
            className={fieldClassName}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </FormField>
        <FormField icon={Shield} label={t('accessRoles.permissions')}>
          {permissionsLocked ? (
            <FormEmptyHint>
              {t(
                initial?.code === ADMIN_ROLE_CODE
                  ? 'accessRoles.adminBypass'
                  : 'accessRoles.systemPermissionsLocked',
              )}
            </FormEmptyHint>
          ) : (
            <PermissionTree selected={permissionCodes} onChange={setPermissionCodes} />
          )}
        </FormField>
        <FormActions
          submitLabel={t('accessRoles.save')}
          cancelLabel={t('accessRoles.cancel')}
          submitting={saving}
          onCancel={() => history.back()}
        />
      </AppForm>
    </FormCard>
  )
}
