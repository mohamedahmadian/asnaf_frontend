import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type Point = { top: number; left: number }

function placePanel(trigger: DOMRect, panel: DOMRect): Point {
  const gap = 10
  const margin = 8
  let top = trigger.bottom + gap
  if (top + panel.height > window.innerHeight - margin) {
    top = trigger.top - panel.height - gap
  }
  top = Math.min(Math.max(margin, top), window.innerHeight - panel.height - margin)

  const rtl = document.documentElement.dir === 'rtl'
  let left = rtl ? trigger.right - panel.width : trigger.left
  left = Math.min(Math.max(margin, left), window.innerWidth - panel.width - margin)
  return { top, left }
}

export function HoverTooltip({
  content,
  children,
  label,
  className = '',
}: {
  content: ReactNode
  children: ReactNode
  label?: string
  className?: string
}) {
  const tooltipId = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number>(0)
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState<Point | null>(null)

  const clearHide = useCallback(() => {
    window.clearTimeout(hideTimer.current)
  }, [])

  const show = useCallback(() => {
    clearHide()
    setOpen(true)
  }, [clearHide])

  const hide = useCallback(() => {
    clearHide()
    hideTimer.current = window.setTimeout(() => {
      setOpen(false)
      setPoint(null)
    }, 120)
  }, [clearHide])

  const updatePlace = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect()
    const panel = panelRef.current?.getBoundingClientRect()
    if (!trigger || !panel || !panel.width) return
    setPoint(placePanel(trigger, panel))
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePlace()
  }, [open, content, updatePlace])

  useEffect(() => {
    if (!open) return
    function onScrollOrResize() {
      updatePlace()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updatePlace])

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex min-w-0 max-w-full ${className}`.trim()}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={tooltipId}
              role="tooltip"
              aria-label={label}
              onMouseEnter={show}
              onMouseLeave={hide}
              style={{
                top: point?.top ?? 0,
                left: point?.left ?? 0,
                visibility: point ? 'visible' : 'hidden',
              }}
              className="pointer-events-auto fixed z-[90] w-max max-w-[min(18rem,calc(100vw-1.5rem))]"
            >
              <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-[0_18px_40px_rgba(20,40,40,0.14)] ring-1 ring-teal-50">
                {content}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
