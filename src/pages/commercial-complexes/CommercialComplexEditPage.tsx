import { Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import {
  commercialComplexApi,
  commercialComplexesPath,
} from '../../lib/paths/commercial-complexes'
import type { CommercialComplex } from '../../types/app'
import { CommercialComplexForm } from './CommercialComplexForm'
import { useComplexName } from './shared'

export function CommercialComplexEditPage() {
  const { t } = useTranslation()
  const { complexId } = useParams()
  const navigate = useNavigate()
  const name = useComplexName()
  const query = useQuery({
    queryKey: ['commercial-complex', complexId],
    enabled: Boolean(complexId),
    queryFn: async () => {
      const { data } = await api.get<CommercialComplex>(commercialComplexApi(complexId!))
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Building2}
        title={t('commercialComplexes.edit')}
        subtitle={<EntityNameSubtitle name={name(query.data)} icon={Building2} />}
      />
      <CommercialComplexForm
        initial={{
          name: query.data.name,
          nameEn: query.data.nameEn,
          address: query.data.address ?? '',
          postalCode: query.data.postalCode ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(commercialComplexApi(complexId!), payload)
          toast.success(t('commercialComplexes.updated'))
          navigate(commercialComplexesPath())
        }}
      />
    </div>
  )
}
