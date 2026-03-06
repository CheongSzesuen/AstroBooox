import { computed, ref } from 'vue'

export type CcTheme = 'claude' | 'supabase' | 'vercel'

export const CC_THEMES: Array<{ label: string; value: CcTheme }> = [
  { label: 'Claude', value: 'claude' },
  { label: 'Supabase', value: 'supabase' },
  { label: 'Vercel', value: 'vercel' }
]

const STORAGE_KEY = 'astrobooox-cc-theme'
const DEFAULT_THEME: CcTheme = 'vercel'
const activeTheme = ref<CcTheme>(DEFAULT_THEME)
let initialized = false

const applyCcTheme = (theme: CcTheme): void => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-cc-theme', theme)
}

const resolveSavedTheme = (): CcTheme => {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'claude' || saved === 'supabase' || saved === 'vercel') {
    return saved
  }
  return DEFAULT_THEME
}

export const useCcTheme = () => {
  if (!initialized) {
    activeTheme.value = resolveSavedTheme()
    applyCcTheme(activeTheme.value)
    initialized = true
  }

  const setCcTheme = (theme: CcTheme): void => {
    activeTheme.value = theme
    applyCcTheme(theme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  return {
    activeCcTheme: computed({
      get: () => activeTheme.value,
      set: (next) => setCcTheme(next)
    }),
    setCcTheme
  }
}
