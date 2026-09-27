import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cancelPendingFormEnter } from '../ui/Form'
import { QuickToolsContext } from './quick-tools-context'
import { UserSearchModal } from './UserSearchModal'

const DOUBLE_ENTER_MS = 500

export function isQuickToolsFabVisible() {
  return false
}

export function QuickToolsProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    let lastAt = 0
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return
      const target = event.target as HTMLElement | null
      if (target?.closest('textarea, [contenteditable="true"], [data-nested-dialog]')) return

      const now = Date.now()
      if (now - lastAt >= DOUBLE_ENTER_MS) {
        lastAt = now
        return
      }

      event.preventDefault()
      event.stopPropagation()
      lastAt = 0
      cancelPendingFormEnter()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const registerFocus = useCallback((_fn: () => void) => () => {}, [])
  const registerFileFocus = useCallback((_fn: () => void) => () => {}, [])
  const value = useMemo(
    () => ({ registerFocus, registerFileFocus }),
    [registerFocus, registerFileFocus],
  )

  return (
    <QuickToolsContext.Provider value={value}>
      {children}
      <UserSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </QuickToolsContext.Provider>
  )
}
