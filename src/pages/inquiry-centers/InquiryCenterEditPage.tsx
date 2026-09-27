import { ScanSearch } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { InquiryCenter } from '../../types/app'
import { InquiryCenterForm } from './InquiryCenterForm'

export function InquiryCenterEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['inquiry-center', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<InquiryCenter>(`/inquiry-centers/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ScanSearch}
        title={t('inquiryCenters.edit')}
        subtitle={<EntityNameSubtitle name={query.data.name} icon={ScanSearch} />}
      />
      <InquiryCenterForm
        initial={{
          name: query.data.name,
          description: query.data.description ?? '',
          phone: query.data.phone ?? '',
          officerId: query.data.officerId ?? '',
          officer: query.data.officer,
          letterTitle: query.data.letterTitle ?? '',
          letterBody: query.data.letterBody ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/inquiry-centers/${id}`, payload)
          toast.success(t('inquiryCenters.updated'))
          navigate('/base-info/inquiry-centers')
        }}
      />
    </div>
  )
}
