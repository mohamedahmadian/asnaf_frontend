import { Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { APP_VERSION } from '../../lib/app-version'
import { localizeDigits } from '../../lib/datetime'

export function AdminFooter() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const versionLabel = t('nav.appVersion')
  const versionText = localizeDigits(APP_VERSION, locale)

  return (
    <footer
      id="admin-footer"
      data-admin-footer
      aria-label={versionLabel}
      className="shrink-0 border-t border-line bg-white/90 backdrop-blur"
    >
      <div className="px-4 py-2 sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          <span
            data-app-version
            className="inline-flex items-center gap-1.5 rounded-full bg-cream-50 px-2 py-1 text-[11px] text-ink-500 ring-1 ring-line"
            title={`${versionLabel} ${APP_VERSION}`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-teal-600 ring-1 ring-teal-100">
              <Tag className="size-3" aria-hidden />
            </span>
            <span>{versionLabel}</span>
            <span dir="ltr" className="font-semibold tabular-nums text-teal-800">
              {versionText}
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}
