import { useEffect, useRef, useState } from 'react'
import { Check, Landmark } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { FormCard, FormEmptyHint, formCardBodyClassName } from '../../components/ui/FormLayout'
import { FormTabs } from '../../components/ui/FormTabs'
import { LoadingState } from '../../components/ui/LoadingState'
import { api, getApiErrorMessage } from '../../lib/api'
import { MANAGEMENT_FORMATION_STEP } from './formation-types'
import type { CaseInquiryRow } from './inquiry-types'
import { InquiryCard, InquiryLetterModal, InquiryProgressChart } from './CaseInquiriesStep'

export function CasePlacesStep({
  userId,
  item,
  loading,
  autoAdvance,
  onAdvanced,
}: {
  userId: string
  item: CaseInquiryRow | null
  loading: boolean
  autoAdvance: boolean
  onAdvanced: (formationStep: number) => void
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const pending = !item || item.status === 'PENDING'
  const [printId, setPrintId] = useState<string | null>(null)
  const autoAdvanceStarted = useRef(false)

  const advance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ formationStep: number }>('/cases/formation/step', {
        userId,
        step: MANAGEMENT_FORMATION_STEP,
      })
      return data.formationStep
    },
    onSuccess: (formationStep) => {
      toast.success(t('cases.placesAdvanced'))
      onAdvanced(formationStep)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t('cases.saveFailed'))),
  })

  useEffect(() => {
    if (!autoAdvance || loading) return
    if (pending) {
      autoAdvanceStarted.current = false
      return
    }
    if (autoAdvanceStarted.current || advance.isPending) return
    autoAdvanceStarted.current = true
    advance.mutate()
  }, [advance, autoAdvance, loading, pending])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'formation-places', userId] })
  }

  const done = item && item.status !== 'PENDING' ? 1 : 0

  return (
    <FormCard
      icon={Landmark}
      title={t('cases.steps.places')}
      titleExtra={item ? <InquiryProgressChart done={done} total={1} locale={locale} /> : null}
      action={
        <Button type="button" disabled={loading || pending || advance.isPending} onClick={() => advance.mutate()}>
          <Check className="size-4" aria-hidden />
          {t('cases.placesContinue')}
        </Button>
      }
    >
      {loading ? (
        <div className={formCardBodyClassName}>
          <LoadingState variant="inline" />
        </div>
      ) : null}
      {!loading && !item ? (
        <div className={formCardBodyClassName}>
          <FormEmptyHint>{t('cases.placesEmpty')}</FormEmptyHint>
        </div>
      ) : null}
      {item ? (
        <>
          <div className="overflow-x-auto">
            <FormTabs
              tabs={[{ id: item.id, label: item.center.name, approved: item.status === 'APPROVED', pending: item.status === 'PENDING' }]}
              value={item.id}
              onChange={() => undefined}
            />
          </div>
          <div className={formCardBodyClassName}>
            <div id={`form-panel-${item.id}`} role="tabpanel" aria-labelledby={`form-tab-${item.id}`}>
              <InquiryCard
                item={item}
                locale={locale}
                decisionUrl={`/cases/formation/places/${item.id}/decision`}
                reopenUrl={`/cases/formation/places/${item.id}/reopen`}
                letterUrl={`/cases/formation/places/${item.id}/letter`}
                filesPath="/cases/places/files"
                attachmentLabelKey="cases.placesAddAttachment"
                onChanged={() => void refresh()}
                onPrint={() => setPrintId(item.id)}
              />
            </div>
          </div>
        </>
      ) : null}
      {printId ? (
        <InquiryLetterModal
          inquiryId={printId}
          locale={locale}
          letterUrl={`/cases/formation/places/${printId}/letter`}
          onClose={() => setPrintId(null)}
        />
      ) : null}
    </FormCard>
  )
}
