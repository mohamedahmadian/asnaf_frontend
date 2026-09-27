import { Rows3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { commercialLanesApi, commercialLanesPath } from '../../lib/paths/commercial-complexes'
import { CommercialLaneForm } from './CommercialLaneForm'

export function CommercialLaneCreatePage() {
  const { t } = useTranslation()
  const { complexId = '', floorId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Rows3} title={t('commercialLanes.create')} />
      <CommercialLaneForm
        onSubmit={async (payload) => {
          await api.post(commercialLanesApi(complexId, floorId), payload)
          toast.success(t('commercialLanes.created'))
          navigate(commercialLanesPath(complexId, floorId))
        }}
      />
    </div>
  )
}
