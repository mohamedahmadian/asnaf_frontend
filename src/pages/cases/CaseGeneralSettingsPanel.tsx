import { CalendarClock, Pencil, Shield } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, LoadingState, ToggleField, fieldClassName } from '../../components/ui/Form'
import { SearchSelect } from '../../components/ui/SearchSelect'
import { api, getApiErrorMessage } from '../../lib/api'
import { toLatinDigits } from '../../lib/datetime'

type RoleOption = {
  id: string
  name: string
}

type GeneralSettings = {
  editAfterIssuance: boolean
  editorRoleId: string | null
  contractYears: number
  stewardContractYears: number
  inquiryResponseDays: number
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
  const [inquiryResponseDays, setInquiryResponseDays] = useState(String(initial.inquiryResponseDays ?? 5))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditAfterIssuance(initial.editAfterIssuance)
    setEditorRoleId(initial.editorRoleId ?? '')
    setInquiryResponseDays(String(initial.inquiryResponseDays ?? 5))
  }, [initial.editAfterIssuance, initial.editorRoleId, initial.inquiryResponseDays])

  function reset() {
    setEditAfterIssuance(initial.editAfterIssuance)
    setEditorRoleId(initial.editorRoleId ?? '')
    setInquiryResponseDays(String(initial.inquiryResponseDays ?? 5))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const days = Number(toLatinDigits(inquiryResponseDays))
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error(t('cases.inquiryResponseDaysInvalid'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put<GeneralSettings>('/cases/settings/general', {
        editAfterIssuance,
        editorRoleId: editorRoleId || null,
        inquiryResponseDays: days,
      })
      queryClient.setQueryData(['cases', 'general-settings'], data)
      setEditAfterIssuance(data.editAfterIssuance)
      setEditorRoleId(data.editorRoleId ?? '')
      setInquiryResponseDays(String(data.inquiryResponseDays ?? 5))
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
      <FormField icon={CalendarClock} label={t('cases.inquiryResponseDays')} htmlFor="case-inquiry-response-days">
        <div className="flex items-center gap-2">
          <input
            id="case-inquiry-response-days"
            type="number"
            min={1}
            max={90}
            required
            className={`${fieldClassName} digit-field !w-16 !min-w-16 !max-w-16 !px-2`}
            value={inquiryResponseDays}
            onChange={(event) => setInquiryResponseDays(event.target.value)}
          />
          <span className="text-sm text-ink-700">{t('cases.responseDaysUnit')}</span>
        </div>
        <p className="text-xs text-ink-500">{t('cases.inquiryResponseDaysHint')}</p>
      </FormField>
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
