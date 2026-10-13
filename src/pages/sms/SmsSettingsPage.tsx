import { Globe, KeyRound, Phone, Settings, ToggleRight, UserRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AppForm,
  FormActions,
  FormField,
  LoadingState,
  PageHeader,
  ToggleField,
  fieldClassName,
  formShellClassName,
} from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { parseDigitString } from '../../lib/datetime'

type SmsSettings = {
  isActive: boolean
  endpoint: string | null
  senderNumber: string | null
  username: string | null
  hasPassword: boolean
}

export function SmsSettingsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async () => {
      const { data } = await api.get<SmsSettings>('/sms/settings')
      return data
    },
  })

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Settings}
        title={t('menus.smsSettings')}
        subtitle={t('sms.settingsSubtitle')}
      />
      {query.isFetchedAfterMount && query.data ? (
        <SmsSettingsForm
          initial={query.data}
          onSubmit={async (payload) => {
            const { data } = await api.patch<SmsSettings>('/sms/settings', payload)
            queryClient.setQueryData(['sms-settings'], data)
            toast.success(t('sms.saved'))
            return data
          }}
        />
      ) : query.isError ? (
        <p className="text-sm text-red-700">{t('common.error')}</p>
      ) : (
        <LoadingState />
      )}
    </div>
  )
}

function SmsSettingsForm({
  initial,
  onSubmit,
}: {
  initial: SmsSettings
  onSubmit: (payload: {
    isActive: boolean
    endpoint: string | null
    senderNumber: string | null
    username: string | null
    password?: string
  }) => Promise<SmsSettings>
}) {
  const { t } = useTranslation()
  const [isActive, setIsActive] = useState(initial.isActive)
  const [endpoint, setEndpoint] = useState(initial.endpoint ?? '')
  const [senderNumber, setSenderNumber] = useState(initial.senderNumber ?? '')
  const [username, setUsername] = useState(initial.username ?? '')
  const [password, setPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(initial.hasPassword)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const next = await onSubmit({
        isActive,
        endpoint: endpoint.trim() || null,
        senderNumber: parseDigitString(senderNumber) || null,
        username: username.trim() || null,
        ...(password.trim() ? { password } : {}),
      })
      setPassword('')
      setHasPassword(next.hasPassword)
      setEndpoint(next.endpoint ?? '')
      setSenderNumber(next.senderNumber ?? '')
      setUsername(next.username ?? '')
      setIsActive(next.isActive)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormCard icon={Settings} title={t('menus.smsSettings')} subtitle={t('sms.settingsSubtitle')}>
      <AppForm onSubmit={submit} className={formCardBodyClassName}>
        <FormField icon={ToggleRight} label={t('sms.status')} htmlFor="smsActive">
          <ToggleField
            id="smsActive"
            checked={isActive}
            onChange={setIsActive}
            onLabel={t('geo.active')}
            offLabel={t('geo.inactive')}
          />
        </FormField>
        <FormField icon={Globe} label={t('sms.endpoint')} htmlFor="smsEndpoint">
          <input
            id="smsEndpoint"
            className={fieldClassName}
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            autoComplete="off"
            dir="ltr"
          />
        </FormField>
        <FormField icon={Phone} label={t('sms.senderNumber')} htmlFor="smsSender">
          <input
            id="smsSender"
            className={`${fieldClassName} digit-field`}
            value={senderNumber}
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            onChange={(event) => setSenderNumber(parseDigitString(event.target.value).slice(0, 20))}
          />
        </FormField>
        <FormField icon={UserRound} label={t('sms.username')} htmlFor="smsUsername">
          <input
            id="smsUsername"
            className={fieldClassName}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
          />
        </FormField>
        <FormField icon={KeyRound} label={t('sms.password')} htmlFor="smsPassword">
          <input
            id="smsPassword"
            type="password"
            className={fieldClassName}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder={hasPassword ? t('sms.passwordKeepHint') : undefined}
          />
        </FormField>
        <FormActions submitLabel={t('sms.save')} submitting={saving} />
      </AppForm>
    </FormCard>
  )
}
