import { Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { FormEmptyHint, FormSectionTitle } from '../../components/ui/FormLayout'
import { getApiErrorMessage } from '../../lib/api'
import type { ViolationAttachment } from '../../types/app'
import { openViolationFile } from './files'

export function AttachmentList({
  items,
  hrefFor,
}: {
  items: ViolationAttachment[]
  hrefFor: (id: string) => string
}) {
  const { t } = useTranslation()
  if (!items.length) {
    return <FormEmptyHint>{t('violations.noAttachments')}</FormEmptyHint>
  }
  return (
    <div className="space-y-3">
      <FormSectionTitle icon={Paperclip}>{t('violations.attachments')}</FormSectionTitle>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                openViolationFile(hrefFor(item.id)).catch((error) => {
                  toast.error(getApiErrorMessage(error, t('common.error')))
                })
              }}
            >
              <Paperclip className="size-4" aria-hidden />
              {item.originalName || t('violations.openAttachment')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
