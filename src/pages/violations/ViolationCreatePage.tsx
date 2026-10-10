import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarClock, Gavel, Store, type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { DateText } from '../../components/ui/DateText'
import { PageHeader, formShellClassName } from '../../components/ui/Form'
import { api } from '../../lib/api'
import { violationsPath } from '../../lib/paths/violations'
import { appendFiles } from './files'
import { ViolationForm } from './ViolationForm'

type LinkedCase = {
  licenseNumber: string | null
  businessUnitTitle: string | null
  licenseExpiresAt: string | null
}

export function ViolationCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nationalId = searchParams.get('nationalId')?.trim() ?? ''
  const caseId = searchParams.get('caseId')?.trim() ?? ''
  const preset = nationalId && caseId ? { nationalId, caseId } : undefined
  const linked = useQuery({
    queryKey: ['cases', 'home', caseId],
    enabled: Boolean(caseId),
    queryFn: async () => (await api.get<LinkedCase>(`/cases/${caseId}`)).data,
  })

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={Gavel}
        title={t('violations.create')}
        subtitle={linked.data ? <LinkedCaseFacts item={linked.data} /> : undefined}
      />
      <ViolationForm
        preset={preset}
        onSubmit={async (payload) => {
          const body = new FormData()
          body.append('nationalId', payload.nationalId)
          body.append('violationTypeId', payload.violationTypeId)
          body.append('occurredAt', payload.occurredAt)
          body.append('description', payload.description ?? '')
          body.append('status', payload.status)
          body.append('caseUserId', payload.caseUserId ?? '')
          appendFiles(body, payload.files)
          await api.post('/violations', body)
          toast.success(t('violations.created'))
          navigate(violationsPath())
        }}
      />
    </div>
  )
}

function LinkedCaseFacts({ item }: { item: LinkedCase }) {
  const { t } = useTranslation()
  return (
    <span className="mt-2 flex flex-wrap gap-2">
      <CaseFact
        icon={BadgeCheck}
        label={t('cases.licenseNumber')}
        value={item.licenseNumber ? <CopyableDigits value={item.licenseNumber} /> : '—'}
      />
      <CaseFact icon={Store} label={t('cases.unitTitle')} value={item.businessUnitTitle || '—'} />
      <CaseFact
        icon={CalendarClock}
        label={t('cases.licenseExpires')}
        value={item.licenseExpiresAt ? <DateText value={item.licenseExpiresAt} /> : '—'}
      />
    </span>
  )
}

function CaseFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-white/80 px-3 py-1.5 text-sm text-ink-800 ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </span>
  )
}
