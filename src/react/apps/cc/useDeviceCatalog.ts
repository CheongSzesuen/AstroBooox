import { useEffect, useSyncExternalStore } from 'react'
import {
  deviceOptions,
  deviceSelectorEntries,
  normalizeDeviceToken,
  subscribeToCatalog,
  fetchAndUpdateCatalog
} from './resourcePublishWorkbenchDeviceCatalog'

export function useDeviceCatalog() {
  useSyncExternalStore(
    subscribeToCatalog,
    () => deviceOptions,
    () => deviceOptions
  )

  useEffect(() => {
    fetchAndUpdateCatalog()
  }, [])

  return { deviceOptions, deviceSelectorEntries, normalizeDeviceToken }
}
