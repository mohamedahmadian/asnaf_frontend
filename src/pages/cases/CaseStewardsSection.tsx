import { Ban, Eye, IdCard, Plus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Form'
import { ActionsTh, EntityRowActions, TableCard, actionsColClassName } from '../../components/ui/ListControls'
import { DateText } from '../../components/ui/DateText'
import { FormCard } from '../../components/ui/FormLayout'
import { localizeDigits } from '../../lib/datetime'
import { CaseStewardRevokeDialog } from './CaseSuspensions'

export type StewardRow = {
  id: string
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED'
  fullName: string
  nationalId: string | null
  requestNumber: string | null
  requestStatus: string | null
  cardNumber: string | null
  requestCreatedAt: string | null
  cardIssuedAt: string | null
  cardExpiresAt: string | null
  revokeSource: 'HOST' | 'STEWARD' | 'LICENSE' | null
}

function stewardStatusKey(row: StewardRow) {
  if (row.status === 'REVOKED') return 'revoked'
  if (row.cardNumber && row.requestStatus !== 'OPEN') return 'active'
  return 'reviewing'
}

const STATUS_BADGE: Record<ReturnType<typeof stewardStatusKey>, string> = {
  reviewing: 'bg-amber-50 text-amber-900 ring-amber-200',
  active: 'bg-mint-50 text-teal-900 ring-mint-200',
  revoked: 'bg-red-50 text-red-700 ring-red-200',
}

export function CaseStewardsSection({
  caseId,
  items,
  readOnly = false,
}: {
  caseId: string
  items: StewardRow[]
  readOnly?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const navigate = useNavigate()
  const [revokeId, setRevokeId] = useState<string | null>(null)

  if (items.length === 0) return null

  return (
    <FormCard
      icon={IdCard}
      title={t('cases.stewardship.title')}
      action={
        readOnly ? undefined : (
        <Button type="button" variant="soft" onClick={() => navigate(`/cases/${caseId}/stewards/new`)}>
          <Plus className="size-4" aria-hidden />
          {t('cases.stewardship.add')}
        </Button>
        )
      }
    >
      <div className="p-5 sm:p-6">
        <TableCard hasRows empty={t('cases.stewardship.empty')}>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('users.fullName')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('users.nationalId')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('cases.stewardship.cardNumber')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('cases.stewardship.requestAt')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('cases.stewardship.cardIssuedOn')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('cases.stewardship.cardExpiresOn')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('cases.listStep')}</th>
                  <ActionsTh />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const revoked = row.status === 'REVOKED'
                  const issued = Boolean(row.cardNumber) && !revoked && row.requestStatus !== 'OPEN'
                  const viewTo = revoked
                    ? `/cases/${row.id}/dossier`
                    : issued
                      ? `/cases/${row.id}/stewardship/card`
                      : readOnly
                        ? `/cases/${row.id}/stewardship?focus=places`
                        : `/cases/${row.id}/stewardship`
                  return (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="size-4 text-teal-600" aria-hidden />
                          {row.fullName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.nationalId ? (
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-200">
                            {localizeDigits(row.nationalId, locale)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.cardNumber
                          ? localizeDigits(row.cardNumber, locale)
                          : row.requestNumber
                            ? localizeDigits(row.requestNumber, locale)
                            : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.requestCreatedAt ? <DateText value={row.requestCreatedAt} /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.cardIssuedAt ? <DateText value={row.cardIssuedAt} /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.cardExpiresAt ? <DateText value={row.cardExpiresAt} /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_BADGE[stewardStatusKey(row)]}`}
                        >
                          {t(`cases.stewardship.${stewardStatusKey(row)}`)}
                        </span>
                      </td>
                      <td className={actionsColClassName}>
                        <EntityRowActions
                          viewTo={viewTo}
                          viewLabel={
                            revoked
                              ? t('cases.viewDossier')
                              : issued
                                ? t('cases.stewardship.viewCard')
                                : readOnly
                                  ? t('cases.viewRequest')
                                  : t('cases.stewardship.continue')
                          }
                          viewIcon={issued ? IdCard : Eye}
                          rowOpensView
                          rowTo={issued ? `/cases/${row.id}/stewardship` : undefined}
                            extra={
                            readOnly || row.status === 'REVOKED' ? null : (
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => setRevokeId(row.id)}
                              >
                                <Ban className="size-4" aria-hidden />
                                {t('cases.stewardship.revokeRequest')}
                              </Button>
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableCard>
      </div>
      {revokeId ? (
        <CaseStewardRevokeDialog caseId={revokeId} onClose={() => setRevokeId(null)} />
      ) : null}
    </FormCard>
  )
}
