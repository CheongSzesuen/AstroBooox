import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'astrobooox-theme-mode'
const themeMode = ref<ThemeMode>('system')
const theme = ref<ResolvedTheme>('light')
let initialized = false
let systemThemeMedia: MediaQueryList | null = null

const resolveSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getPreferredThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved
  }

  return 'system'
}

const applyTheme = (nextTheme: ResolvedTheme): void => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.classList.toggle('dark', nextTheme === 'dark')
  root.setAttribute('data-theme', nextTheme)
}

const resolveThemeFromMode = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? resolveSystemTheme() : mode

export const useTheme = () => {
  if (!initialized) {
    themeMode.value = getPreferredThemeMode()
    theme.value = resolveThemeFromMode(themeMode.value)
    applyTheme(theme.value)
    if (typeof window !== 'undefined') {
      systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
      systemThemeMedia.addEventListener('change', () => {
        if (themeMode.value !== 'system') return
        theme.value = resolveSystemTheme()
        applyTheme(theme.value)
      })
    }
    initialized = true
  }

  const setThemeMode = (nextMode: ThemeMode): void => {
    themeMode.value = nextMode
    theme.value = resolveThemeFromMode(nextMode)
    applyTheme(theme.value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextMode)
    }
  }

  const setTheme = (nextTheme: ResolvedTheme): void => {
    setThemeMode(nextTheme)
  }

  const setFollowSystem = (follow: boolean): void => {
    if (follow) {
      setThemeMode('system')
      return
    }
    setThemeMode(theme.value)
  }

  const toggleTheme = (): void => {
    setThemeMode(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    theme: computed(() => theme.value),
    themeMode: computed(() => themeMode.value),
    isFollowingSystem: computed(() => themeMode.value === 'system'),
    setTheme,
    setThemeMode,
    setFollowSystem,
    toggleTheme
  }
}
