import { useEffect, useMemo, useState } from 'react'

export interface CcSettingsPayload {
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  ownedDisplayPriority: 'v2' | 'v1'
  showV2FollowUpTag: boolean
  customDisplayName: string
  customAvatarUrl: string
}

export interface CcSettingsState extends CcSettingsPayload {
  saveDefaults: (payload: CcSettingsPayload) => void
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

const normalizeValue = (value: string, fallback: string): string => {
  const trimmed = value.trim()
  return trimmed || fallback
}

const normalizePayload = (payload: Partial<CcSettingsPayload>): CcSettingsPayload => ({
  defaultTargetOwner: normalizeValue(payload.defaultTargetOwner || '', defaultSettings.defaultTargetOwner),
  defaultTargetRepo: normalizeValue(payload.defaultTargetRepo || '', defaultSettings.defaultTargetRepo),
  defaultCatalogPath: normalizeValue(payload.defaultCatalogPath || '', defaultSettings.defaultCatalogPath),
  ownedDisplayPriority: payload.ownedDisplayPriority === 'v1' ? 'v1' : 'v2',
  showV2FollowUpTag: payload.showV2FollowUpTag !== false,
  customDisplayName: normalizeValue(payload.customDisplayName || '', defaultSettings.customDisplayName),
  customAvatarUrl: normalizeValue(payload.customAvatarUrl || '', defaultSettings.customAvatarUrl)
})

export function useCcSettings() {
  const [settings, setSettings] = useState<CcSettingsPayload>(defaultSettings)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setSettings(defaultSettings)
        return
      }
      const parsed = JSON.parse(raw) as Partial<CcSettingsPayload>
      setSettings(normalizePayload(parsed))
    } catch {
      setSettings(defaultSettings)
    }
  }, [])

  const saveDefaults = (payload: CcSettingsPayload): void => {
    const next = normalizePayload(payload)
    setSettings(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return useMemo<CcSettingsState>(() => ({ ...settings, saveDefaults }), [settings])
}
