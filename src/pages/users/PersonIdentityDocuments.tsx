import { Files } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { api, getApiErrorMessage } from '../../lib/api'
import { optimizeImageFile } from '../../lib/optimize-image'
import { CaseDocumentList } from '../cases/CaseDocumentList'
import {
  matchesDocumentGender,
  type DocumentTypeRow,
  type StoredVersion,
} from '../cases/formation-types'

type Bundle = {
  types: DocumentTypeRow[]
  stored: { documentId: string; current: StoredVersion | null }[]
}

export function PersonIdentityDocuments({
  userId,
  gender,
  scope,
  enabled = true,
}: {
  userId: string
  gender: 'MALE' | 'FEMALE' | null
  scope: 'user' | 'account'
  enabled?: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const base =
    scope === 'account' ? '/account/identity-documents' : `/users/${userId}/identity-documents`
  const documents = useQuery({
    queryKey: ['identity-documents', scope, userId],
    enabled,
    queryFn: async () => (await api.get<Bundle>(base)).data,
  })
  const visible = useMemo(
    () => (documents.data?.types ?? []).filter((item) => matchesDocumentGender(item.gender, gender)),
    [documents.data?.types, gender],
  )

  async function upload(documentId: string, file: File) {
    setUploadingId(documentId)
    try {
      const prepared = file.type.startsWith('image/') ? await optimizeImageFile(file) : file
      const body = new FormData()
      body.append('documentId', documentId)
      body.append('file', prepared)
      await api.post(base, body)
      toast.success(t('cases.documentUploaded'))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['identity-documents', scope, userId] }),
        queryClient.invalidateQueries({ queryKey: ['cases', 'documents', userId] }),
      ])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setUploadingId(null)
    }
  }

  async function remove(documentId: string) {
    setRemovingId(documentId)
    try {
      await api.delete(`${base}/${documentId}`)
      toast.success(t('cases.documentRemoved'))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['identity-documents', scope, userId] }),
        queryClient.invalidateQueries({ queryKey: ['cases', 'documents', userId] }),
      ])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('cases.saveFailed')))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="space-y-3">
      <FormSectionTitle icon={Files}>{t('users.identityDocumentsTitle')}</FormSectionTitle>
      {documents.isLoading ? null : visible.length === 0 ? (
        <FormEmptyHint>{t('cases.identityDocumentsEmpty')}</FormEmptyHint>
      ) : (
        <CaseDocumentList
          items={visible}
          stored={documents.data?.stored ?? []}
          uploadingId={uploadingId}
          removingId={removingId}
          disabled={false}
          layout="tabs"
          emphasizeRequired
          fileBase={base}
          onFile={(documentId, file) => void upload(documentId, file)}
          onDelete={(documentId) => void remove(documentId)}
        />
      )}
    </section>
  )
}
