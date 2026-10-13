import { Pencil, Shield } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, LoadingState, ToggleField } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'

type RoleOption = {
  id: string
  name: string
}

type GeneralSettings = {
  editAfterIssuance: boolean
  editorRoleId: string | null
  contractYears: number
  stewardContractYears: number
  roles: RoleOption[]
}

export function CaseGeneralSettingsPanel() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['cases', 'general-settings'],
    queryFn: async () => (await api.get<GeneralSettings>('/cases/settings/general')).data,
  })

  if (query.isLoading) return <LoadingState />
  if (!query.data) return <p className="text-sm text-red-700">{t('common.error')}</p>
  return <GeneralSettingsForm initial={query.data} />
}

function GeneralSettingsForm({ initial }: { initial: GeneralSettings }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editAfterIssuance, setEditAfterIssuance] = useState(initial.editAfterIssuance)
  const [editorRoleId, setEditorRoleId] = useState(initial.editorRoleId ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditAfterIssuance(initial.editAfterIssuance)
    setEditorRoleId(initial.editorRoleId ?? '')
  }, [initial.editAfterIssuance, initial.editorRoleId])

  function reset() {
    setEditAfterIssuance(initial.editAfterIssuance)
    setEditorRoleId(initial.editorRoleId ?? '')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put<GeneralSettings>('/cases/settings/general', {
        editAfterIssuance,
        editorRoleId: editorRoleId || null,
      })
      queryClient.setQueryData(['cases', 'general-settings'], data)
      setEditAfterIssuance(data.editAfterIssuance)
      setEditorRoleId(data.editorRoleId ?? '')
      toast.success(t('cases.generalSettingsSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const options = [
    { value: '', label: t('cases.editAfterIssuanceRolePlaceholder') },
    ...(initial.roles ?? []).map((role) => ({ value: role.id, label: role.name })),
  ]

  return (
    <AppForm onSubmit={submit} className="space-y-4" autoFocusFirst={false}>
      <FormField icon={Pencil} label={t('cases.editAfterIssuance')} htmlFor="case-edit-after-issuance">
        <ToggleField
          id="case-edit-after-issuance"
          checked={editAfterIssuance}
          onChange={setEditAfterIssuance}
          onLabel={t('geo.active')}
          offLabel={t('geo.inactive')}
        />
      </FormField>
      {editAfterIssuance ? (
        <FormField icon={Shield} label={t('cases.editAfterIssuanceRole')} htmlFor="case-edit-after-issuance-role">
          <SearchSelect
            id="case-edit-after-issuance-role"
            value={editorRoleId}
            onChange={setEditorRoleId}
            placeholder={t('cases.editAfterIssuanceRolePlaceholder')}
            options={options}
          />
        </FormField>
      ) : null}
      <FormActions
        headerIcons={false}
        submitting={saving}
        submitLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onCancel={reset}
      />
    </AppForm>
  )
}
