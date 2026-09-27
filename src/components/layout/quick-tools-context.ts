import { createContext, useContext } from 'react'

export type QuickToolsContextValue = {
  registerFocus: (fn: () => void) => () => void
  registerFileFocus: (fn: () => void) => () => void
}

export const QuickToolsContext = createContext<QuickToolsContextValue | null>(null)

export function useQuickTools() {
  return useContext(QuickToolsContext)
}
