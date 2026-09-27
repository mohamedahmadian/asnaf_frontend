import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialComplexesApi, commercialComplexesPath } from '../../lib/paths/commercial-complexes'
import { CommercialComplexForm } from './CommercialComplexForm'

export function CommercialComplexCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('commercialComplexes.create')}
      />
      <CommercialComplexForm
        onSubmit={async (payload) => {
          await api.post(commercialComplexesApi(), payload)
          toast.success(t('commercialComplexes.created'))
          navigate(commercialComplexesPath())
        }}
      />
    </div>
  )
}
