import { Percent } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EntityNameSubtitle, LoadingState, PageHeader, baseInfoFormShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import type { Discount } from '../../types/app'
import { DiscountForm } from './DiscountForm'

export function DiscountEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['discount', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<Discount>(`/discounts/${id}`)
      return data
    },
  })

  if (!query.data) {
    return <LoadingState />
  }

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={Percent}
        title={t('discounts.edit')}
        subtitle={<EntityNameSubtitle name={query.data.title} icon={Percent} />}
      />
      <DiscountForm
        initial={{
          year: query.data.year,
          title: query.data.title,
          percent: query.data.percent,
          description: query.data.description ?? '',
          isActive: query.data.isActive,
        }}
        onSubmit={async (payload) => {
          await api.patch(`/discounts/${id}`, payload)
          toast.success(t('discounts.updated'))
          navigate('/base-info/discounts')
        }}
      />
    </div>
  )
}
