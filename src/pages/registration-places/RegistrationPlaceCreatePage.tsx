import { MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { RegistrationPlaceForm } from './RegistrationPlaceForm'

export function RegistrationPlaceCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={MapPinned} title={t('registrationPlaces.create')} />
      <RegistrationPlaceForm
        onSubmit={async (payload) => {
          await api.post('/registration-places', payload)
          toast.success(t('registrationPlaces.created'))
          navigate('/base-info/registration-places')
        }}
      />
    </div>
  )
}
