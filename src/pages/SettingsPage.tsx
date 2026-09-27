import { Globe } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import {
  AppForm,
  FormField,
  FormActions,
  PageHeader,
  formShellClassName,
} from '../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../components/ui/FormLayout'
import { SearchSelect } from '../components/ui/SearchSelect'
import {
  applyUiLanguage,
  persistPreferredLocale,
  selectableLanguages,
  selectableLocale,
} from '../i18n'
import { api } from '../lib/api'

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, refresh } = useAuth()
  const [locale, setLocale] = useState(selectableLocale(user?.locale))
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const next = selectableLocale(locale)
      await api.patch('/auth/settings', { locale: next })
      persistPreferredLocale(next)
      applyUiLanguage(next)
      await refresh()
      toast.success(t('settings.saved'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formShellClassName}>
      <PageHeader icon={Globe} title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <FormCard icon={Globe} title={t('settings.title')} subtitle={t('settings.subtitle')}>
        <AppForm onSubmit={onSubmit} className={formCardBodyClassName}>
          <FormField icon={Globe} label={t('settings.locale')} htmlFor="locale">
            <SearchSelect
              id="locale"
              value={locale}
              onChange={setLocale}
              options={selectableLanguages().map((code) => ({
                value: code,
                label: t(`languages.${code}`),
              }))}
            />
          </FormField>
          <FormActions submitLabel={t('settings.save')} submitting={saving} />
        </AppForm>
      </FormCard>
    </div>
  )
}
