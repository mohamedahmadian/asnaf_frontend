import { useEffect } from 'react'

function isEditableNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'number' &&
    !target.readOnly &&
    !target.disabled
  )
}

/** Select all content when a number input is focused (mouse or keyboard). */
export function useSelectNumberOnFocus() {
  useEffect(() => {
    const justFocused = new WeakSet<HTMLInputElement>()

    function onFocusIn(event: FocusEvent) {
      if (!isEditableNumberInput(event.target)) return
      const input = event.target
      justFocused.add(input)
      queueMicrotask(() => {
        if (document.activeElement === input) input.select()
      })
    }

    function onMouseUp(event: MouseEvent) {
      if (!isEditableNumberInput(event.target)) return
      const input = event.target
      if (!justFocused.has(input)) return
      justFocused.delete(input)
      // Prevent mouseup from collapsing the selection made on focus.
      event.preventDefault()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('mouseup', onMouseUp, true)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('mouseup', onMouseUp, true)
    }
  }, [])
}
