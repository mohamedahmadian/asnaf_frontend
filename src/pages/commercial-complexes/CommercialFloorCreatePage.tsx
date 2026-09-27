import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialFloorsApi, commercialFloorsPath } from '../../lib/paths/commercial-complexes'
import { CommercialFloorForm } from './CommercialFloorForm'

export function CommercialFloorCreatePage() {
  const { t } = useTranslation()
  const { complexId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Layers} title={t('commercialFloors.create')} />
      <CommercialFloorForm
        onSubmit={async (payload) => {
          await api.post(commercialFloorsApi(complexId), payload)
          toast.success(t('commercialFloors.created'))
          navigate(commercialFloorsPath(complexId))
        }}
      />
    </div>
  )
}
