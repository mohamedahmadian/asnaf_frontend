import { Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialUnitsApi, commercialUnitsPath } from '../../lib/paths/commercial-complexes'
import { CommercialUnitForm } from './CommercialUnitForm'

export function CommercialUnitCreatePage() {
  const { t } = useTranslation()
  const { complexId = '', floorId = '', laneId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Store} title={t('commercialUnits.create')} />
      <CommercialUnitForm
        onSubmit={async (payload) => {
          await api.post(commercialUnitsApi(complexId, floorId, laneId), payload)
          toast.success(t('commercialUnits.created'))
          navigate(commercialUnitsPath(complexId, floorId, laneId))
        }}
      />
    </div>
  )
}
