import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'astrobooox-theme-mode'

const resolveSystemTheme = (): ResolvedTheme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

const applyTheme = (nextTheme: ResolvedTheme): void => {
  const root = document.documentElement
  root.classList.toggle('dark', nextTheme === 'dark')
  root.setAttribute('data-theme', nextTheme)
}

const resolveThemeFromMode = (mode: ThemeMode): ResolvedTheme => (mode === 'system' ? resolveSystemTheme() : mode)

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [theme, setThemeState] = useState<ResolvedTheme>('light')
  const themeModeRef = useRef<ThemeMode>('system')
  themeModeRef.current = themeMode

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      const mode: ThemeMode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
      const resolved = resolveThemeFromMode(mode)
      setThemeModeState(mode)
      setThemeState(resolved)
      applyTheme(resolved)
    } catch {
      applyTheme('light')
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (themeModeRef.current !== 'system') return
      const resolved = resolveSystemTheme()
      setThemeState(resolved)
      applyTheme(resolved)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    const resolved = resolveThemeFromMode(nextMode)
    setThemeModeState(nextMode)
    setThemeState(resolved)
    applyTheme(resolved)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode)
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeMode(theme === 'light' ? 'dark' : 'light')
  }, [setThemeMode, theme])

  const setFollowSystem = useCallback(
    (follow: boolean) => {
      if (follow) {
        setThemeMode('system')
        return
      }
      setThemeMode(theme)
    },
    [setThemeMode, theme]
  )

  const isFollowingSystem = useMemo(() => themeMode === 'system', [themeMode])

  return {
    theme,
    themeMode,
    isFollowingSystem,
    setThemeMode,
    setFollowSystem,
    toggleTheme
  }
}
