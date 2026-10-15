import { HandCoins, Plus, ScrollText } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Button,
  EntityNameSubtitle,
  LoadingState,
  PageHeader,
  baseInfoFormShellClassName,
} from '../../components/ui/Form'
import { FormCard } from '../../components/ui/FormLayout'
import { api } from '../../lib/api'
import type { FinancialHeading } from '../../types/app'
import { FinancialHeadingForm } from './FinancialHeadingForm'
import {
  FinancialHeadingFees,
  FinancialHeadingSectionTabs,
  addMunicipalFeePath,
  useFinancialHeadingSection,
} from './FinancialHeadingSections'
import { accountHeadingsReturnTo } from './account-return'

export function FinancialHeadingEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const returnTo = accountHeadingsReturnTo(searchParams.get('returnTo'))
  const { section, setSection } = useFinancialHeadingSection()
  const query = useQuery({
    queryKey: ['financial-heading', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<FinancialHeading>(`/financial-headings/${id}`)
      return data
    },
  })

  if (!query.data || !query.isFetchedAfterMount) {
    return <LoadingState />
  }

  const heading = query.data
  const feesTab = section === 'fees'

  return (
    <div className={baseInfoFormShellClassName}>
      <PageHeader
        icon={ScrollText}
        title={t('financialHeadings.edit')}
        subtitle={<EntityNameSubtitle name={heading.title} icon={ScrollText} />}
      />
      <FormCard
        icon={feesTab ? HandCoins : ScrollText}
        title={heading.title}
        action={
          feesTab ? (
            <Link to={addMunicipalFeePath(heading.id, pathname)}>
              <Button>
                <Plus className="size-4" aria-hidden />
                {t('financialHeadings.addFee')}
              </Button>
            </Link>
          ) : undefined
        }
      >
        <FinancialHeadingSectionTabs section={section} onChange={setSection} />
        {feesTab ? (
          <FinancialHeadingFees headingId={heading.id} />
        ) : (
          <FinancialHeadingForm
            embedded
            initial={heading}
            onSubmit={async (payload) => {
              await api.patch(`/financial-headings/${id}`, payload)
              await queryClient.invalidateQueries({ queryKey: ['financial-heading', id] })
              await queryClient.invalidateQueries({ queryKey: ['financial-headings'] })
              toast.success(t('financialHeadings.updated'))
              navigate(returnTo ?? '/base-info/financial-headings')
            }}
          />
        )}
      </FormCard>
    </div>
  )
}
