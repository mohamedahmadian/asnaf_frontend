import { PenLine, Type, UserRound } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, LoadingState, fieldClassName } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormSectionTitle } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'

type ActivityLicenseSettings = {
  signerName: string | null
  signerTitle: string | null
  signatureId: string | null
}

export function CaseActivityLicensePanel() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['cases', 'activity-license-settings'],
    queryFn: async () => (await api.get<ActivityLicenseSettings>('/cases/settings/activity-license')).data,
  })

  if (query.isLoading) return <LoadingState />
  if (!query.data) return <p className="text-sm text-red-700">{t('common.error')}</p>
  return <ActivityLicenseForm initial={query.data} />
}

function ActivityLicenseForm({ initial }: { initial: ActivityLicenseSettings }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [signerName, setSignerName] = useState(initial.signerName ?? '')
  const [signerTitle, setSignerTitle] = useState(initial.signerTitle ?? '')
  const [signatureId, setSignatureId] = useState(initial.signatureId)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSignerName(initial.signerName ?? '')
    setSignerTitle(initial.signerTitle ?? '')
    setSignatureId(initial.signatureId)
    setSignatureFile(null)
  }, [initial.signerName, initial.signerTitle, initial.signatureId])

  function reset() {
    setSignerName(initial.signerName ?? '')
    setSignerTitle(initial.signerTitle ?? '')
    setSignatureId(initial.signatureId)
    setSignatureFile(null)
    setRevision((value) => value + 1)
  }

  async function upload(file: File) {
    const prepared = await optimizeImageFile(file)
    const body = new FormData()
    body.append('file', prepared)
    const { data } = await api.post<{ id: string }>('/images', body)
    return data.id
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const nextSignatureId = signatureFile ? await upload(signatureFile) : signatureId
      const { data } = await api.put<ActivityLicenseSettings>('/cases/settings/activity-license', {
        signerName: signerName.trim() || null,
        signerTitle: signerTitle.trim() || null,
        signatureId: nextSignatureId,
      })
      queryClient.setQueryData(['cases', 'activity-license-settings'], data)
      setSignatureFile(null)
      setRevision((value) => value + 1)
      toast.success(t('cases.activityLicenseSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppForm onSubmit={submit} className="space-y-5" autoFocusFirst={false}>
      <p className="text-xs leading-6 text-ink-500">{t('cases.activityLicenseHint')}</p>
      <FormSectionTitle icon={PenLine} className="mb-3">{t('cases.letterheadSignSection')}</FormSectionTitle>
      <FormField icon={PenLine} label={t('cases.letterheadSignature')} htmlFor="activity-license-signature">
        <FileDropField
          key={`signature-${revision}`}
          id="activity-license-signature"
          accept="image/*"
          allowCamera={false}
          previewUrl={signatureId ? getImageUrl(signatureId) : undefined}
          previewClassName="mx-auto mb-4 h-24 max-w-full object-contain"
          uploading={saving && Boolean(signatureFile)}
          onFile={setSignatureFile}
          onClear={() => {
            if (signatureFile) {
              setSignatureFile(null)
              return
            }
            setSignatureId(null)
          }}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={UserRound} label={t('cases.letterheadSignerName')} htmlFor="activity-license-signer-name">
          <input
            id="activity-license-signer-name"
            className={fieldClassName}
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            maxLength={120}
          />
        </FormField>
        <FormField icon={Type} label={t('cases.letterheadSignerTitle')} htmlFor="activity-license-signer-title">
          <input
            id="activity-license-signer-title"
            className={fieldClassName}
            value={signerTitle}
            onChange={(event) => setSignerTitle(event.target.value)}
            maxLength={120}
          />
        </FormField>
      </div>
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
