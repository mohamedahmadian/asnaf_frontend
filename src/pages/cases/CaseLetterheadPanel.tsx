import { Globe, Image, MapPin, PenLine, Phone, Type, UserRound } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AppForm, FormActions, FormField, LoadingState, fieldClassName } from '../../components/ui/Form'
import { FileDropField } from '../../components/ui/FileDropField'
import { FormSectionTitle } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage, getImageUrl } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'

type LetterheadSettings = {
  organizationName: string | null
  address: string | null
  phone: string | null
  website: string | null
  signerName: string | null
  signerTitle: string | null
  logoId: string | null
  signatureId: string | null
}

export function CaseLetterheadPanel() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['cases', 'letterhead'],
    queryFn: async () => (await api.get<LetterheadSettings>('/cases/settings/letterhead')).data,
  })

  if (query.isLoading) return <LoadingState />
  if (!query.data) return <p className="text-sm text-red-700">{t('common.error')}</p>
  return <LetterheadForm initial={query.data} />
}

function LetterheadForm({ initial }: { initial: LetterheadSettings }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [organizationName, setOrganizationName] = useState(initial.organizationName ?? '')
  const [address, setAddress] = useState(initial.address ?? '')
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [website, setWebsite] = useState(initial.website ?? '')
  const [signerName, setSignerName] = useState(initial.signerName ?? '')
  const [signerTitle, setSignerTitle] = useState(initial.signerTitle ?? '')
  const [logoId, setLogoId] = useState(initial.logoId)
  const [signatureId, setSignatureId] = useState(initial.signatureId)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setOrganizationName(initial.organizationName ?? '')
    setAddress(initial.address ?? '')
    setPhone(initial.phone ?? '')
    setWebsite(initial.website ?? '')
    setSignerName(initial.signerName ?? '')
    setSignerTitle(initial.signerTitle ?? '')
    setLogoId(initial.logoId)
    setSignatureId(initial.signatureId)
    setLogoFile(null)
    setSignatureFile(null)
  }, [
    initial.organizationName,
    initial.address,
    initial.phone,
    initial.website,
    initial.signerName,
    initial.signerTitle,
    initial.logoId,
    initial.signatureId,
  ])

  function reset() {
    setOrganizationName(initial.organizationName ?? '')
    setAddress(initial.address ?? '')
    setPhone(initial.phone ?? '')
    setWebsite(initial.website ?? '')
    setSignerName(initial.signerName ?? '')
    setSignerTitle(initial.signerTitle ?? '')
    setLogoId(initial.logoId)
    setSignatureId(initial.signatureId)
    setLogoFile(null)
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
      const nextLogoId = logoFile ? await upload(logoFile) : logoId
      const nextSignatureId = signatureFile ? await upload(signatureFile) : signatureId
      const { data } = await api.put<LetterheadSettings>('/cases/settings/letterhead', {
        organizationName: organizationName.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        signerName: signerName.trim() || null,
        signerTitle: signerTitle.trim() || null,
        logoId: nextLogoId,
        signatureId: nextSignatureId,
      })
      queryClient.setQueryData(['cases', 'letterhead'], data)
      setLogoFile(null)
      setSignatureFile(null)
      setRevision((value) => value + 1)
      toast.success(t('cases.letterheadSaved'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppForm onSubmit={submit} className="space-y-5" autoFocusFirst={false}>
      <p className="text-xs leading-6 text-ink-500">{t('cases.letterheadHint')}</p>
      <FormSectionTitle icon={Image} className="mb-3">{t('cases.letterheadHeaderSection')}</FormSectionTitle>
      <FormField icon={Image} label={t('cases.letterheadLogo')} htmlFor="letterhead-logo">
        <FileDropField
          key={`logo-${revision}`}
          id="letterhead-logo"
          accept="image/*"
          allowCamera={false}
          previewUrl={logoId ? getImageUrl(logoId) : undefined}
          previewClassName="mx-auto mb-4 h-20 max-w-full object-contain"
          uploading={saving && Boolean(logoFile)}
          onFile={setLogoFile}
          onClear={() => {
            if (logoFile) {
              setLogoFile(null)
              return
            }
            setLogoId(null)
          }}
        />
      </FormField>
      <FormField icon={Type} label={t('cases.letterheadOrganization')} htmlFor="letterhead-organization">
        <input
          id="letterhead-organization"
          className={fieldClassName}
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          maxLength={200}
        />
      </FormField>
      <FormSectionTitle icon={MapPin} className="mb-3">{t('cases.letterheadFooterSection')}</FormSectionTitle>
      <FormField icon={MapPin} label={t('cases.letterheadAddress')} htmlFor="letterhead-address">
        <textarea
          id="letterhead-address"
          className={fieldClassName}
          rows={3}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          maxLength={2000}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField icon={Phone} label={t('cases.letterheadPhone')} htmlFor="letterhead-phone">
          <input
            id="letterhead-phone"
            inputMode="tel"
            className={`${fieldClassName} digit-field`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={30}
          />
        </FormField>
        <FormField icon={Globe} label={t('cases.letterheadWebsite')} htmlFor="letterhead-website">
          <input
            id="letterhead-website"
            dir="ltr"
            className={fieldClassName}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            maxLength={300}
          />
        </FormField>
      </div>
      <FormSectionTitle icon={PenLine} className="mb-3">{t('cases.letterheadSignSection')}</FormSectionTitle>
      <FormField icon={PenLine} label={t('cases.letterheadSignature')} htmlFor="letterhead-signature">
        <FileDropField
          key={`signature-${revision}`}
          id="letterhead-signature"
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
        <FormField icon={UserRound} label={t('cases.letterheadSignerName')} htmlFor="letterhead-signer-name">
          <input
            id="letterhead-signer-name"
            className={fieldClassName}
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
            maxLength={120}
          />
        </FormField>
        <FormField icon={Type} label={t('cases.letterheadSignerTitle')} htmlFor="letterhead-signer-title">
          <input
            id="letterhead-signer-title"
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
