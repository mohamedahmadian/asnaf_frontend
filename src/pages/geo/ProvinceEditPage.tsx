import { Map } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { Country, Province } from '../../types/app'
import { ProvinceForm } from './ProvinceForm'

export function ProvinceEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['province', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Province>(`/provinces/${id}`)
      return data
    },
  })
  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  if (!query.data || !countries.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Map} title={t('provinces.edit')} subtitle={t('provinces.editSubtitle')} />
      <ProvinceForm
        initial={{
          countryId: query.data.countryId,
          code: query.data.code,
          nameFa: query.data.nameFa,
          nameEn: query.data.nameEn,
          neshanAddress: query.data.neshanAddress,
          latitude: query.data.latitude,
          longitude: query.data.longitude,
          hasRailway: query.data.hasRailway,
          hasAirport: query.data.hasAirport,
          isActive: query.data.isActive,
          sortOrder: query.data.sortOrder,
        }}
        countries={countries.data}
        onSubmit={async (payload) => {
          await api.patch(`/provinces/${id}`, payload)
          toast.success(t('provinces.updated'))
          navigate('/base-info/provinces')
        }}
      />
    </div>
  )
}
