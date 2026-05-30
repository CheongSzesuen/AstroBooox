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
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'claude' || saved === 'supabase' || saved === 'vercel') {
      return saved
    }
  } catch {
    // localStorage 不可用时静默回退到默认主题
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
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage 不可用时静默忽略
    }
  }

  return useMemo(
    () => ({
      activeCcTheme,
      setCcTheme
    }),
    [activeCcTheme]
  )
}
