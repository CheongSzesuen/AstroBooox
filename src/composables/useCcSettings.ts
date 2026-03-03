import { ref } from 'vue'

interface CcSettingsPayload {
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  ownedDisplayPriority: 'v2' | 'v1'
  showV2FollowUpTag: boolean
  customDisplayName: string
  customAvatarUrl: string
}

const STORAGE_KEY = 'cc.settings.v1'

const defaultSettings: CcSettingsPayload = {
  defaultTargetOwner: 'AstralSightStudios',
  defaultTargetRepo: 'AstroBox-Repo',
  defaultCatalogPath: 'index_v2.csv',
  ownedDisplayPriority: 'v2',
  showV2FollowUpTag: true,
  customDisplayName: '',
  customAvatarUrl: ''
}

const defaultTargetOwner = ref(defaultSettings.defaultTargetOwner)
const defaultTargetRepo = ref(defaultSettings.defaultTargetRepo)
const defaultCatalogPath = ref(defaultSettings.defaultCatalogPath)
const ownedDisplayPriority = ref<CcSettingsPayload['ownedDisplayPriority']>(defaultSettings.ownedDisplayPriority)
const showV2FollowUpTag = ref(defaultSettings.showV2FollowUpTag)
const customDisplayName = ref(defaultSettings.customDisplayName)
const customAvatarUrl = ref(defaultSettings.customAvatarUrl)

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
    defaultCatalogPath: defaultCatalogPath.value,
    ownedDisplayPriority: ownedDisplayPriority.value,
    showV2FollowUpTag: showV2FollowUpTag.value,
    customDisplayName: customDisplayName.value,
    customAvatarUrl: customAvatarUrl.value
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
    ownedDisplayPriority.value = parsed.ownedDisplayPriority === 'v1' ? 'v1' : 'v2'
    showV2FollowUpTag.value = parsed.showV2FollowUpTag !== false
    customDisplayName.value = normalizeValue(parsed.customDisplayName || '', defaultSettings.customDisplayName)
    customAvatarUrl.value = normalizeValue(parsed.customAvatarUrl || '', defaultSettings.customAvatarUrl)
  } catch {
    defaultTargetOwner.value = defaultSettings.defaultTargetOwner
    defaultTargetRepo.value = defaultSettings.defaultTargetRepo
    defaultCatalogPath.value = defaultSettings.defaultCatalogPath
    ownedDisplayPriority.value = defaultSettings.ownedDisplayPriority
    showV2FollowUpTag.value = defaultSettings.showV2FollowUpTag
    customDisplayName.value = defaultSettings.customDisplayName
    customAvatarUrl.value = defaultSettings.customAvatarUrl
  }
}

export const useCcSettings = () => {
  loadSettings()

  const saveDefaults = (payload: {
    defaultTargetOwner: string
    defaultTargetRepo: string
    defaultCatalogPath: string
    ownedDisplayPriority: CcSettingsPayload['ownedDisplayPriority']
    showV2FollowUpTag: boolean
    customDisplayName: string
    customAvatarUrl: string
  }): void => {
    defaultTargetOwner.value = normalizeValue(payload.defaultTargetOwner, defaultSettings.defaultTargetOwner)
    defaultTargetRepo.value = normalizeValue(payload.defaultTargetRepo, defaultSettings.defaultTargetRepo)
    defaultCatalogPath.value = normalizeValue(payload.defaultCatalogPath, defaultSettings.defaultCatalogPath)
    ownedDisplayPriority.value = payload.ownedDisplayPriority === 'v1' ? 'v1' : 'v2'
    showV2FollowUpTag.value = Boolean(payload.showV2FollowUpTag)
    customDisplayName.value = normalizeValue(payload.customDisplayName, defaultSettings.customDisplayName)
    customAvatarUrl.value = normalizeValue(payload.customAvatarUrl, defaultSettings.customAvatarUrl)
    persistSettings()
  }

  return {
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    ownedDisplayPriority,
    showV2FollowUpTag,
    customDisplayName,
    customAvatarUrl,
    saveDefaults
  }
}
