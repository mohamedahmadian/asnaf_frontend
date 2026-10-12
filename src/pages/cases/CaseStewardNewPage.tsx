import { Fingerprint, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, PageHeader, caseShellClassName, inputClassName } from '../../components/ui/Form'
import { FormCard, formCardBodyClassName } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { isValidIranianNationalId, normalizeNationalId } from '../../lib/national-id'

export function CaseStewardNewPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [nationalId, setNationalId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    const normalized = normalizeNationalId(nationalId)
    if (!isValidIranianNationalId(normalized)) {
      toast.error(t('users.nationalIdInvalid'))
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post<{ id: string }>(`/cases/${id}/stewards`, { nationalId: normalized })
      toast.success(t('cases.stewardship.created'))
      navigate(`/cases/${data.id}/stewardship`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
      setSaving(false)
    }
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={UserRound}
        title={t('cases.stewardship.addTitle')}
        subtitle={t('cases.stewardship.addSubtitle')}
        backTo={`/cases/${id}`}
      />
      <FormCard icon={UserRound} title={t('cases.stewardship.addTitle')} subtitle={t('cases.stewardship.addSubtitle')}>
        <AppForm onSubmit={() => void submit()} className={formCardBodyClassName}>
          <FormField icon={Fingerprint} label={t('users.nationalId')} htmlFor="steward-national-id">
            <input
              id="steward-national-id"
              required
              inputMode="numeric"
              className={`${inputClassName()} digit-field`}
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
            />
          </FormField>
          <FormActions
            submitting={saving}
            submitLabel={t('cases.stewardship.add')}
            cancelLabel={t('common.cancel')}
            onCancel={() => navigate(`/cases/${id}`)}
          />
        </AppForm>
      </FormCard>
    </div>
  )
}
