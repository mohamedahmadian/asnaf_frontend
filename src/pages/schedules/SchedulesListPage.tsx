import { CalendarClock, Play } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, PageHeader, listShellClassName } from '../../components/ui/Form'
import { DateText } from '../../components/ui/DateText'
import {
  ActionsTh,
  EntityRowActions,
  TableCard,
  actionsColClassName,
} from '../../components/ui/ListControls'
import { api, getApiErrorMessage } from '../../lib/api'
import { type ScheduledJob, schedulePath, scheduleStatusClass } from './schedules'

export function SchedulesListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['scheduled-jobs'],
    queryFn: async () => (await api.get<ScheduledJob[]>('/scheduled-jobs')).data,
  })

  const run = useMutation({
    mutationFn: async (code: string) => (await api.post(`/scheduled-jobs/${code}/run`)).data,
    onSuccess: async () => {
      toast.success(t('schedules.runStarted'))
      await queryClient.invalidateQueries({ queryKey: ['scheduled-jobs'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('common.error'))),
  })

  const rows = query.data ?? []

  return (
    <div className={listShellClassName}>
      <PageHeader icon={CalendarClock} title={t('menus.schedules')} subtitle={t('schedules.subtitle')} />
      <TableCard loading={query.isLoading} empty={t('schedules.empty')} hasRows={rows.length > 0}>
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-700">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('schedules.job')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('schedules.schedule')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('schedules.lastRun')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('schedules.lastStatus')}</th>
              <ActionsTh />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.code} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{t(item.nameKey)}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{t(item.descriptionKey)}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-700">{t(item.scheduleKey)}</td>
                <td className="px-4 py-3">
                  {item.lastRunAt ? <DateText value={item.lastRunAt} withTime /> : '—'}
                </td>
                <td className="px-4 py-3">
                  {item.lastStatus ? (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${scheduleStatusClass[item.lastStatus]}`}
                    >
                      {t(`schedules.statuses.${item.lastStatus}`)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className={actionsColClassName}>
                  <EntityRowActions
                    viewTo={schedulePath(item.code)}
                    rowOpensView
                    extra={
                      <Button
                        type="button"
                        variant="soft"
                        disabled={item.running || run.isPending}
                        onClick={() => run.mutate(item.code)}
                      >
                        <Play className="size-4" aria-hidden />
                        {t('schedules.runNow')}
                      </Button>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}
