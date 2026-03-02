import { ref } from 'vue'

interface CcSettingsPayload {
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
}

const STORAGE_KEY = 'cc.settings.v1'

const defaultSettings: CcSettingsPayload = {
  defaultTargetOwner: 'AstralSightStudios',
  defaultTargetRepo: 'AstroBox-Repo',
  defaultCatalogPath: 'index_v2.csv'
}

const defaultTargetOwner = ref(defaultSettings.defaultTargetOwner)
const defaultTargetRepo = ref(defaultSettings.defaultTargetRepo)
const defaultCatalogPath = ref(defaultSettings.defaultCatalogPath)

let initialized = false

const normalizeValue = (value: string, fallback: string): string => {
  const trimmed = value.trim()
  return trimmed || fallback
}

const persistSettings = (): void => {
  if (typeof window === 'undefined') return
  const payload: CcSettingsPayload = {
    defaultTargetOwner: defaultTargetOwner.value,
    defaultTargetRepo: defaultTargetRepo.value,
    defaultCatalogPath: defaultCatalogPath.value
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const loadSettings = (): void => {
  if (initialized) return
  initialized = true
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<CcSettingsPayload>
    defaultTargetOwner.value = normalizeValue(parsed.defaultTargetOwner || '', defaultSettings.defaultTargetOwner)
    defaultTargetRepo.value = normalizeValue(parsed.defaultTargetRepo || '', defaultSettings.defaultTargetRepo)
    defaultCatalogPath.value = normalizeValue(parsed.defaultCatalogPath || '', defaultSettings.defaultCatalogPath)
  } catch {
    defaultTargetOwner.value = defaultSettings.defaultTargetOwner
    defaultTargetRepo.value = defaultSettings.defaultTargetRepo
    defaultCatalogPath.value = defaultSettings.defaultCatalogPath
  }
}

export const useCcSettings = () => {
  loadSettings()

  const saveDefaults = (payload: {
    defaultTargetOwner: string
    defaultTargetRepo: string
    defaultCatalogPath: string
  }): void => {
    defaultTargetOwner.value = normalizeValue(payload.defaultTargetOwner, defaultSettings.defaultTargetOwner)
    defaultTargetRepo.value = normalizeValue(payload.defaultTargetRepo, defaultSettings.defaultTargetRepo)
    defaultCatalogPath.value = normalizeValue(payload.defaultCatalogPath, defaultSettings.defaultCatalogPath)
    persistSettings()
  }

  return {
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    saveDefaults
  }
}
