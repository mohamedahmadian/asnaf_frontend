import { useEffect, useRef } from 'react'

const cancelFns = new Set<() => void>()
const backFns = new Set<() => void>()
let attached = false

function lastOf<T>(set: Set<T>): T | undefined {
  let value: T | undefined
  for (const item of set) value = item
  return value
}

function isEscapeBlocked() {
  return Boolean(
    document.querySelector(
      [
        '[aria-modal="true"]',
        '[role="listbox"]',
        '[role="menu"]',
        '[data-enter-ignore]',
        '[data-nested-dialog]',
        '[data-confirm-toast]',
        '.rmdp-wrapper',
      ].join(','),
    ),
  )
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.repeat || event.isComposing) return
  if (event.defaultPrevented) return
  if (isEscapeBlocked()) return
  const cancel = lastOf(cancelFns)
  if (cancel) {
    event.preventDefault()
    cancel()
    return
  }
  const back = lastOf(backFns)
  if (back) {
    event.preventDefault()
    back()
  }
}

function attach() {
  if (attached) return
  attached = true
  document.addEventListener('keydown', onKeyDown)
}

function detachIfIdle() {
  if (cancelFns.size || backFns.size) return
  document.removeEventListener('keydown', onKeyDown)
  attached = false
}

function useEscapeAction(bucket: Set<() => void>, enabled: boolean, fn?: () => void) {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    if (!enabled) return
    const run = () => fnRef.current?.()
    attach()
    bucket.add(run)
    return () => {
      bucket.delete(run)
      detachIfIdle()
    }
  }, [bucket, enabled])
}

const DOUBLE_SAVE_MS = 500

function isSaveShortcutKey(key: string) {
  return key === 's' || key === 'S' || key === 'س'
}

function sameSaveKey(previous: string, next: string) {
  if (previous === 'س' || next === 'س') return previous === next
  return previous.toLowerCase() === next.toLowerCase()
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const field = target.closest('input, textarea, [contenteditable="true"]')
  if (!field) return false
  if (field instanceof HTMLInputElement) {
    const type = field.type
    if (
      type === 'button' ||
      type === 'submit' ||
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'file' ||
      type === 'reset' ||
      type === 'range' ||
      type === 'color'
    ) {
      return false
    }
  }
  return true
}

function clickFormSave(formId: string) {
  const form = document.getElementById(formId)
  if (!(form instanceof HTMLFormElement)) return
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]:not([disabled])')
  if (!button) return
  button.click()
}

/** روی صفحهٔ ویرایش: دو بار «س» یا s دکمهٔ ذخیره را می‌زند */
export function useEditFormDoubleSave(enabled: boolean, formId?: string | null) {
  useEffect(() => {
    if (!enabled || !formId) return
    let lastKey = ''
    let lastAt = 0
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.defaultPrevented) return
      if (event.ctrlKey || event.altKey || event.metaKey) return
      if (!isSaveShortcutKey(event.key)) {
        lastKey = ''
        lastAt = 0
        return
      }
      if (isEscapeBlocked() || isTypingTarget(event.target)) {
        lastKey = ''
        lastAt = 0
        return
      }
      const now = Date.now()
      const doubled = lastKey !== '' && sameSaveKey(lastKey, event.key) && now - lastAt <= DOUBLE_SAVE_MS
      lastKey = ''
      lastAt = 0
      if (!doubled) {
        lastKey = event.key
        lastAt = now
        return
      }
      event.preventDefault()
      clickFormSave(formId)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, formId])
}

/** انصراف فرم با Escape — اولویت بالاتر از بازگشت */
export function useEscapeCancel(onCancel?: () => void) {
  useEscapeAction(cancelFns, Boolean(onCancel), onCancel)
}

/** بازگشت صفحه جزئیات با Escape اگر انصراف نباشد */
export function useEscapeBack(enabled: boolean, onBack?: () => void) {
  useEscapeAction(backFns, enabled && Boolean(onBack), onBack)
}
