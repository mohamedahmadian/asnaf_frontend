import { Globe } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { Country } from '../../types/app'
import { CountryForm } from './CountryForm'

export function CountryEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['country', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Country>(`/countries/${id}`)
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader icon={Globe} title={t('countries.edit')} subtitle={t('countries.editSubtitle')} />
      <CountryForm
        initial={{
          iso2: query.data.iso2,
          iso3: query.data.iso3 ?? '',
          phoneCode: query.data.phoneCode ?? '',
          nameFa: query.data.nameFa,
          nameEn: query.data.nameEn,
          isActive: query.data.isActive,
          sortOrder: query.data.sortOrder,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/countries/${id}`, payload)
          await queryClient.invalidateQueries({ queryKey: ['country', id] })
          await queryClient.invalidateQueries({ queryKey: ['countries'] })
          toast.success(t('countries.updated'))
          navigate('/base-info/countries')
        }}
      />
    </div>
  )
}
