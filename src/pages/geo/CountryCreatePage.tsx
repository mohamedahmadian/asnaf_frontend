import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { CountryForm } from './CountryForm'

export function CountryCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Globe} title={t('countries.create')} />
      <CountryForm
        onSubmit={async (payload) => {
          await api.post('/countries', payload)
          toast.success(t('countries.created'))
          navigate('/base-info/countries')
        }}
      />
    </div>
  )
}
