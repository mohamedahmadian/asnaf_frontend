import { CalendarClock, Play, UserRound } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, EntityNameSubtitle, PageHeader, formShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import { FormCard, FormFactTile, formCardBodyClassName } from '../../components/ui/FormLayout'
import { PaginationBar, TableCard } from '../../components/ui/ListControls'
import { LoadingState } from '../../components/ui/LoadingState'
import { useListParams } from '../../hooks/useListParams'
import { api, getApiErrorMessage } from '../../lib/api'
import { formatNumber } from '../../lib/datetime'
import type { Paginated } from '../../types/app'
import {
  type ScheduledJob,
  type ScheduledJobRun,
  scheduleStatusClass,
  schedulesPath,
} from './schedules'

export function ScheduleDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const { code = '' } = useParams()
  const queryClient = useQueryClient()
  const { page, setPage } = useListParams()

  const job = useQuery({
    queryKey: ['scheduled-jobs', code],
    enabled: Boolean(code),
    queryFn: async () => (await api.get<ScheduledJob>(`/scheduled-jobs/${code}`)).data,
  })

  const runs = useQuery({
    queryKey: ['scheduled-jobs', code, 'runs', page],
    enabled: Boolean(code),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ScheduledJobRun>>(`/scheduled-jobs/${code}/runs`, {
        params: { page },
      })
      return data
    },
  })

  const run = useMutation({
    mutationFn: async () => (await api.post(`/scheduled-jobs/${code}/run`)).data,
    onSuccess: async () => {
      toast.success(t('schedules.runStarted'))
      await queryClient.invalidateQueries({ queryKey: ['scheduled-jobs', code] })
      await queryClient.invalidateQueries({ queryKey: ['scheduled-jobs', code, 'runs'] })
      await queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('common.error'))),
  })

  const item = job.data

  return (
    <div className={formShellClassName}>
      <PageHeader
        icon={CalendarClock}
        title={t('schedules.details')}
        subtitle={
          item ? <EntityNameSubtitle icon={CalendarClock} name={t(item.nameKey)} /> : undefined
        }
        backTo={schedulesPath()}
        action={
          item ? (
            <Button
              type="button"
              variant="soft"
              disabled={item.running || run.isPending}
              onClick={() => run.mutate()}
            >
              <Play className="size-4" aria-hidden />
              {t('schedules.runNow')}
            </Button>
          ) : undefined
        }
      />
      {job.isLoading ? <LoadingState /> : null}
      {item ? (
        <div className="space-y-4">
          <FormCard icon={CalendarClock} title={t(item.nameKey)} subtitle={t(item.descriptionKey)}>
            <div className={`${formCardBodyClassName} grid gap-2 sm:grid-cols-2 sm:gap-3`}>
              <FormFactTile
                icon={CalendarClock}
                label={t('schedules.schedule')}
                value={t(item.scheduleKey)}
                tone="teal"
              />
              <FormFactTile
                icon={CalendarClock}
                label={t('schedules.lastRun')}
                value={item.lastRunAt ? <DateText value={item.lastRunAt} withTime /> : '—'}
                empty={!item.lastRunAt}
                tone="mint"
              />
              <FormFactTile
                icon={CalendarClock}
                label={t('schedules.lastStatus')}
                value={
                  item.lastStatus ? t(`schedules.statuses.${item.lastStatus}`) : '—'
                }
                empty={!item.lastStatus}
                tone={item.lastStatus === 'FAILED' ? 'red' : 'teal'}
              />
              <FormFactTile
                icon={CalendarClock}
                label={t('schedules.lastMessage')}
                value={item.lastMessage || '—'}
                empty={!item.lastMessage}
              />
            </div>
          </FormCard>

          <FormCard icon={CalendarClock} title={t('schedules.history')}>
            <div className="space-y-4 p-5 sm:p-6">
              <TableCard
                loading={runs.isLoading}
                empty={t('schedules.historyEmpty')}
                hasRows={(runs.data?.items.length ?? 0) > 0}
                rowClick={false}
              >
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 text-ink-700">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium">{t('schedules.startedAt')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('schedules.trigger')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('schedules.lastStatus')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('schedules.triggeredBy')}</th>
                      <th className="px-4 py-3 text-start font-medium">{t('schedules.lastMessage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(runs.data?.items ?? []).map((row) => (
                      <tr key={row.id} className="border-t border-line">
                        <td className="px-4 py-3">
                          <DateText value={row.startedAt} withTime />
                        </td>
                        <td className="px-4 py-3">{t(`schedules.triggers.${row.trigger}`)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${scheduleStatusClass[row.status]}`}
                          >
                            {t(`schedules.statuses.${row.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.trigger === 'MANUAL' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="size-3.5 text-ink-400" aria-hidden />
                              {row.triggeredBy?.fullName || '—'}
                            </span>
                          ) : (
                            t('schedules.systemActor')
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.message || '—'}
                          {row.detail?.total != null ? (
                            <span className="mt-0.5 block text-xs text-ink-500">
                              {t('schedules.detailSummary', {
                                total: formatNumber(row.detail.total, locale),
                                changed: formatNumber(row.detail.changed ?? 0, locale),
                              })}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
              {runs.data ? (
                <PaginationBar
                  page={runs.data.page}
                  pageSize={runs.data.pageSize}
                  total={runs.data.total}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
          </FormCard>
        </div>
      ) : null}
    </div>
  )
}
