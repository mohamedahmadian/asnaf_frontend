import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function BrandSvg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      {children}
    </svg>
  )
}

export function EitaaIcon(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="currentColor"
        d="M4.3 11.1 18.2 5.2c1.3-.5 2.5.8 1.9 2L14.2 21c-.5 1.3-2.3 1.3-2.8 0l-2.3-5.5-5.3-2.2c-1.2-.5-1.2-2.2.5-2.2Z"
      />
    </BrandSvg>
  )
}

export function BaleIcon(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 3a9 9 0 0 0-7.7 13.6L3.2 21l4.6-1.2A9 9 0 1 0 12 3Zm3.7 11.6c-.2.6-1.1 1-1.8.6-1-.5-3-1.6-4.2-3.6-.9-1.4-.9-2.6-.6-3.1.2-.5.6-.8.9-.9h.8c.2 0 .5 0 .8.7.2.7.7 1.9.8 2 .1.2.1.4 0 .6l-.4.5c-.1.2-.3.4-.1.7.5.7 1.1 1.4 1.8 1.8.3.2.5.2.7 0l.6-.6c.2-.2.4-.2.7 0 .7.4 1.7.8 1.9.9.3.1.6.2.7.5.1.3 0 .9-.6 1Z"
        clipRule="evenodd"
      />
    </BrandSvg>
  )
}

export function TelegramIcon(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="currentColor"
        d="M21.2 5.1 18.3 19.4c-.2 1-1.5 1.4-2.4.8l-4.6-3.4-2.2 2.1c-.3.3-.7.1-.8-.3l-.7-4.3-4.6-1.6c-1-.3-1-1.8.1-2.1l16.6-6c.9-.3 1.8.6 1.5 1.5ZM9.9 13.8l.4 2.8 1.5-1.5 3.8 2.8 2.6-12.3-11.4 7.2 3.1 1Z"
      />
    </BrandSvg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <BrandSvg {...props}>
      <path
        fill="currentColor"
        d="M9.2 3h5.6A6.2 6.2 0 0 1 21 9.2v5.6A6.2 6.2 0 0 1 14.8 21H9.2A6.2 6.2 0 0 1 3 14.8V9.2A6.2 6.2 0 0 1 9.2 3Zm0 1.8A4.4 4.4 0 0 0 4.8 9.2v5.6a4.4 4.4 0 0 0 4.4 4.4h5.6a4.4 4.4 0 0 0 4.4-4.4V9.2a4.4 4.4 0 0 0-4.4-4.4H9.2ZM12 8.3A3.7 3.7 0 1 1 8.3 12 3.7 3.7 0 0 1 12 8.3Zm0 1.7A2 2 0 1 0 14 12a2 2 0 0 0-2-2Zm4.7-2.7a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"
      />
    </BrandSvg>
  )
}
