import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'astrobooox-theme'
const theme = ref<ThemeMode>('light')
let initialized = false

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (nextTheme: ThemeMode): void => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.classList.toggle('dark', nextTheme === 'dark')
  root.setAttribute('data-theme', nextTheme)
}

export const useTheme = () => {
  if (!initialized) {
    theme.value = getPreferredTheme()
    applyTheme(theme.value)
    initialized = true
  }

  const setTheme = (nextTheme: ThemeMode): void => {
    theme.value = nextTheme
    applyTheme(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextTheme)
    }
  }

  const toggleTheme = (): void => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    theme: computed(() => theme.value),
    setTheme,
    toggleTheme
  }
}
