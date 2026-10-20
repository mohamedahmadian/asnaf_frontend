import {
  BadgeCheck,
  Ban,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Eye,
  Fingerprint,
  FolderKanban,
  IdCard,
  MessageSquareText,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, PageHeader, caseShellClassName } from '../../components/ui/Form'
import { CopyableDigits } from '../../components/ui/CopyableDigits'
import { FormCard, FormEmptyHint, FormFactTile } from '../../components/ui/FormLayout'
import { DateText } from '../../components/ui/DateText'
import { LoadingState } from '../../components/ui/LoadingState'
import { api } from '../../lib/api'
import { localizeDigits } from '../../lib/datetime'

type CardState = {
  id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED'
  cardNumber: string | null
  cardIssuedAt: string | null
  cardExpiresAt: string | null
  revokeReason: string | null
  revokeSource: 'HOST' | 'STEWARD' | 'LICENSE' | null
  revokeRequestedAt: string | null
  revokedAt: string | null
  revokedBy: { firstName: string; lastName: string; fullName: string } | null
  person: { fullName: string; firstName: string; lastName: string; nationalId: string | null }
  host: {
    id: string
    licenseNumber: string | null
    businessUnitTitle: string | null
    firstName: string
    lastName: string
    jobTitle: string | null
    jobGroupTitle: string | null
  } | null
}

export function CaseStewardCard({ caseId }: { caseId: string }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['cases', 'stewardship', caseId],
    enabled: Boolean(caseId),
    queryFn: async () => (await api.get<CardState>(`/cases/${caseId}/stewardship`)).data,
  })
  const item = query.data
  const holderName = item ? `${item.person.firstName} ${item.person.lastName}`.replace(/\s+/g, ' ').trim() || item.person.fullName : ''
  const hostPath = item?.host ? `/cases/${item.host.id}` : null
  const openHost = hostPath ? () => navigate(hostPath) : undefined

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={IdCard}
        title={t('cases.stewardship.cardTitle')}
        subtitle={
          item ? (
            <span className="flex flex-wrap gap-1.5">
              {holderName ? (
                <HeaderBadge icon={UserRound}>
                  <span>{holderName}</span>
                </HeaderBadge>
              ) : null}
              {item.person.nationalId ? (
                <HeaderBadge icon={Fingerprint}>
                  <span className="text-ink-500">{t('users.nationalId')}</span>
                  <CopyableDigits value={item.person.nationalId} />
                </HeaderBadge>
              ) : null}
            </span>
          ) : undefined
        }
        backTo={item?.host ? `/cases/${item.host.id}/dossier` : `/cases/${caseId}`}
      />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <FormEmptyHint>{t('cases.dossierLoadFailed')}</FormEmptyHint> : null}
      {item ? (
        <div className="space-y-4">
          <FormCard
            className={item.status === 'REVOKED' ? '!border-2 !border-red-200' : undefined}
            icon={IdCard}
            title={holderName || t('cases.stewardship.cardTitle')}
            titleExtra={
              item.cardNumber ? (
                <span
                  className="inline-flex max-w-full items-center gap-1.5 rounded-2xl bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800"
                  aria-label={t('cases.stewardship.cardNumber')}
                >
                  <IdCard className="size-4 shrink-0" aria-hidden />
                  <CopyableDigits value={item.cardNumber} />
                </span>
              ) : undefined
            }
          >
            <div className="grid gap-2 p-5 sm:grid-cols-2 sm:gap-3 sm:p-6">
              <FormFactTile
                icon={CalendarDays}
                label={t('cases.stewardship.cardIssued')}
                value={item.cardIssuedAt ? <DateText value={item.cardIssuedAt} /> : '—'}
                empty={!item.cardIssuedAt}
                tone="teal"
              />
              <FormFactTile
                icon={CalendarDays}
                label={t('cases.stewardship.cardExpires')}
                value={item.cardExpiresAt ? <DateText value={item.cardExpiresAt} /> : '—'}
                empty={!item.cardExpiresAt}
                tone="mint"
              />
              <FormFactTile icon={UserRound} label={t('cases.stewardship.hostName')} value={item.host?.firstName || '—'} tone="teal" />
              <FormFactTile icon={UserRound} label={t('cases.stewardship.hostLastName')} value={item.host?.lastName || '—'} />
              <FormFactTile
                icon={BadgeCheck}
                label={t('cases.stewardship.hostLicense')}
                value={item.host?.licenseNumber ? localizeDigits(item.host.licenseNumber, locale) : '—'}
                empty={!item.host?.licenseNumber}
                tone="mint"
                onClick={item.host?.licenseNumber ? openHost : undefined}
              />
              <FormFactTile
                icon={Building2}
                label={t('cases.unitTitle')}
                value={item.host?.businessUnitTitle || '—'}
                empty={!item.host?.businessUnitTitle}
                action={
                  hostPath ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2.5 !py-1 !text-xs"
                      onClick={() => navigate(hostPath)}
                    >
                      <Eye className="size-3.5" aria-hidden />
                      {t('cases.stewardship.viewHostLicense')}
                    </Button>
                  ) : undefined
                }
              />
              <FormFactTile
                icon={FolderKanban}
                label={t('cases.activityGroup')}
                value={item.host?.jobGroupTitle || '—'}
                empty={!item.host?.jobGroupTitle}
                tone="mint"
              />
              <FormFactTile
                icon={Briefcase}
                label={t('cases.activityJob')}
                value={item.host?.jobTitle || '—'}
                empty={!item.host?.jobTitle}
              />
            </div>
          </FormCard>
          {item.status === 'REVOKED' ? (
            <FormCard className="!border-2 !border-red-200" icon={Ban} title={t('cases.stewardship.revokeInfoTitle')}>
              <div className="grid gap-2 p-5 sm:grid-cols-2 sm:gap-3 sm:p-6">
                <FormFactTile
                  icon={UserRound}
                  label={t('cases.revokedBy')}
                  value={
                    item.revokedBy
                      ? `${item.revokedBy.firstName} ${item.revokedBy.lastName}`.replace(/\s+/g, ' ').trim() ||
                        item.revokedBy.fullName
                      : '—'
                  }
                  tone="teal"
                />
                <FormFactTile
                  icon={CalendarClock}
                  label={t('cases.revokeRequestedAt')}
                  value={item.revokeRequestedAt ? <DateText value={item.revokeRequestedAt} withTime /> : '—'}
                />
                <FormFactTile
                  icon={CalendarDays}
                  label={t('cases.revokedAt')}
                  value={item.revokedAt ? <DateText value={item.revokedAt} /> : '—'}
                  empty={!item.revokedAt}
                  tone="mint"
                />
                <FormFactTile
                  icon={MessageSquareText}
                  label={t('cases.stewardship.requestText')}
                  value={item.revokeReason || '—'}
                  empty={!item.revokeReason}
                  className="sm:col-span-2"
                />
              </div>
            </FormCard>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function HeaderBadge({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-[0_4px_10px_rgba(20,40,40,0.05)] ring-1 ring-teal-100">
      <Icon className="size-3.5 shrink-0 text-teal-600" aria-hidden />
      {children}
    </span>
  )
}
