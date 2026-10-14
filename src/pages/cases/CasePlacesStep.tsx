import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { InquiryCard, InquiryLetterModal } from './CaseInquiriesStep'

export function CasePlacesStep({
  caseId,
  item,
  loading,
  autoAdvance,
  showAdvance = true,
  locked = false,
  answerOnly = false,
  headerAction,
  onAdvanced,
  onRewound,
  onChanged,
  onAutoAdvance,
}: {
  caseId: string
  item: CaseInquiryRow | null
  loading: boolean
  autoAdvance: boolean
  /** در تمدید، ادامه را صفحهٔ فرایند می‌زند */
  showAdvance?: boolean
  locked?: boolean
  /** فقط ثبت جواب تأییدیه؛ ادامه و بازگشایی نظر بسته است */
  answerOnly?: boolean
  headerAction?: ReactNode
  onAdvanced: (formationStep: number) => void
  onRewound: () => void
  onChanged?: () => void
  /** اگر نظر اماکن ثبت شده باشد، به‌جای مرحلهٔ صدور به تأییدهای مدیریتی همین فرایند برو */
  onAutoAdvance?: () => void
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
        caseId,
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
    if (answerOnly || !autoAdvance || loading) return
    if (pending) {
      autoAdvanceStarted.current = false
      return
    }
    if (autoAdvanceStarted.current || advance.isPending) return
    autoAdvanceStarted.current = true
    if (onAutoAdvance) onAutoAdvance()
    else advance.mutate()
  }, [advance, answerOnly, autoAdvance, loading, onAutoAdvance, pending])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['cases', 'formation-places', caseId] })
    onChanged?.()
  }

  return (
    <FormCard
      icon={Landmark}
      title={t('cases.steps.places')}
      action={
        headerAction ??
        (!answerOnly && showAdvance ? (
          <Button type="button" disabled={loading || pending || advance.isPending} onClick={() => advance.mutate()}>
            <Check className="size-4" aria-hidden />
            {t('cases.placesContinue')}
          </Button>
        ) : undefined)
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
                decisionUrl={answerOnly ? `/cases/places/${item.id}/decision` : `/cases/formation/places/${item.id}/decision`}
                reopenUrl={`/cases/formation/places/${item.id}/reopen`}
                letterUrl={answerOnly ? `/cases/places/${item.id}/letter` : `/cases/formation/places/${item.id}/letter`}
                filesPath="/cases/places/files"
                attachmentLabelKey="cases.placesAddAttachment"
                locked={locked}
                allowReopen={!answerOnly && !locked}
                onChanged={() => void refresh()}
                onReopened={onRewound}
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
          letterUrl={answerOnly ? `/cases/places/${printId}/letter` : `/cases/formation/places/${printId}/letter`}
          onClose={() => setPrintId(null)}
        />
      ) : null}
    </FormCard>
  )
}
