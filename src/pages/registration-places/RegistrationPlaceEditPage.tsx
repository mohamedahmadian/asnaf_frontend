import { MapPinned } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { RegistrationPlace } from '../../types/app'
import { RegistrationPlaceForm } from './RegistrationPlaceForm'

export function RegistrationPlaceEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['registration-place', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<RegistrationPlace>(`/registration-places/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={MapPinned}
        title={t('registrationPlaces.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={MapPinned} />}
      />
      <RegistrationPlaceForm
        initial={{
          title: query.data.title,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/registration-places/${id}`, payload)
          toast.success(t('registrationPlaces.updated'))
          navigate('/base-info/registration-places')
        }}
      />
    </div>
  )
}
