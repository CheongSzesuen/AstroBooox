import { useEffect, useMemo, useState } from 'react'

export type CcTheme = 'claude' | 'supabase' | 'vercel'

export const CC_THEMES: Array<{ label: string; value: CcTheme }> = [
  { label: 'Claude', value: 'claude' },
  { label: 'Supabase', value: 'supabase' },
  { label: 'Vercel', value: 'vercel' }
]

const STORAGE_KEY = 'astrobooox-cc-theme'
const DEFAULT_THEME: CcTheme = 'vercel'

const applyCcTheme = (theme: CcTheme): void => {
  document.documentElement.setAttribute('data-cc-theme', theme)
}

const resolveSavedTheme = (): CcTheme => {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'claude' || saved === 'supabase' || saved === 'vercel') {
    return saved
  }
  return DEFAULT_THEME
}

export function useCcTheme() {
  const [activeCcTheme, setActiveCcTheme] = useState<CcTheme>(DEFAULT_THEME)

  useEffect(() => {
    const theme = resolveSavedTheme()
    setActiveCcTheme(theme)
    applyCcTheme(theme)
  }, [])

  const setCcTheme = (next: CcTheme) => {
    setActiveCcTheme(next)
    applyCcTheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return useMemo(
    () => ({
      activeCcTheme,
      setCcTheme
    }),
    [activeCcTheme]
  )
}
