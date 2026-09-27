import { useTranslation } from 'react-i18next'

export const APP_LOGO_SRC = '/logo.png'

export function AppLogo({
  className = 'h-10 w-auto object-contain',
  decorative = false,
  src = APP_LOGO_SRC,
}: {
  className?: string
  decorative?: boolean
  src?: string
}) {
  const { t } = useTranslation()
  return (
    <img
      src={src}
      alt={decorative ? '' : t('app.name')}
      className={className}
      crossOrigin="anonymous"
      draggable={false}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(APP_LOGO_SRC)) return
        event.currentTarget.src = APP_LOGO_SRC
      }}
    />
  )
}
