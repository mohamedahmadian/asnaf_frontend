import { Map } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { Country } from '../../types/app'
import { ProvinceForm } from './ProvinceForm'

export function ProvinceCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const countryId = searchParams.get('countryId') ?? undefined
  const countries = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data } = await api.get<Country[]>('/countries')
      return data
    },
  })

  if (!countries.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Map} title={t('provinces.create')} />
      <ProvinceForm
        initial={
          countryId
            ? {
                countryId,
                code: '',
                nameFa: '',
                nameEn: '',
                neshanAddress: null,
                latitude: null,
                longitude: null,
                hasRailway: false,
                hasAirport: false,
                isActive: true,
                sortOrder: 0,
              }
            : undefined
        }
        countries={countries.data}
        onSubmit={async (payload) => {
          await api.post('/provinces', payload)
          toast.success(t('provinces.created'))
          navigate('/base-info/provinces')
        }}
      />
    </div>
  )
}
