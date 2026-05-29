export interface DeviceOption {
  id: string
  name: string
  vendor: string
  aliases: string[]
}

export interface DeviceSelectorEntry {
  key: string
  model: string
  codename: string
  id: string
  name: string
}

const HARDCODED_DEVICE_OPTIONS: DeviceOption[] = [
  { id: 'xmb9', name: 'Xiaomi Smart Band 9', vendor: 'xiaomi', aliases: ['n66', 'M2345B1', 'M2346B1'] },
  { id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro', vendor: 'xiaomi', aliases: ['n67', 'M2401B1', 'M2402B1'] },
  { id: 'xmb10', name: 'Xiaomi Smart Band 10', vendor: 'xiaomi', aliases: ['o66', 'M2457B1'] },
  { id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC', vendor: 'xiaomi', aliases: ['o66nfc', 'M2456B1'] },
  { id: 'xmb10p', name: 'Xiaomi Smart Band 10 Pro', vendor: 'xiaomi', aliases: ['p67', 'M2553B1'] },
  { id: 'xmws3', name: 'Xiaomi Watch S3 系列', vendor: 'xiaomi', aliases: ['n62', 'M2313W1', 'M2311W1', 'M2323W1'] },
  { id: 'xmws4', name: 'Xiaomi Watch S4 系列', vendor: 'xiaomi', aliases: ['o62', 'M2425W1', 'M2424W1', 'M2312W1', 'M2502W1'] },
  { id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版', vendor: 'xiaomi', aliases: ['o62m', 'M2426W1'] },
  { id: 'xmws5', name: 'Xiaomi Watch S5 系列', vendor: 'xiaomi', aliases: ['p62', 'M2530W1', 'M2517W1'] },
  { id: 'xmrw5', name: 'REDMI Watch 5', vendor: 'xiaomi', aliases: ['o65', 'M2427W1'] },
  { id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM', vendor: 'xiaomi', aliases: ['o65m', 'M2428W1'] },
  { id: 'xmrw6', name: 'REDMI Watch 6', vendor: 'xiaomi', aliases: ['p65', 'M2523W1'] },
  { id: 'vivowgt2', name: 'vivo WATCH GT 2', vendor: 'vivo', aliases: ['WA2536B'] }
]

const HARDCODED_DEVICE_SELECTOR_ENTRIES: DeviceSelectorEntry[] = [
  { key: 'M2345B1', model: 'M2345B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2346B1', model: 'M2346B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2401B1', model: 'M2401B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro' },
  { key: 'M2402B1', model: 'M2402B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro 国际版' },
  { key: 'M2457B1', model: 'M2457B1', codename: 'o66', id: 'xmb10', name: 'Xiaomi Smart Band 10' },
  { key: 'M2456B1', model: 'M2456B1', codename: 'o66nfc', id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC' },
  { key: 'M2553B1', model: 'M2553B1', codename: 'p67', id: 'xmb10p', name: 'Xiaomi Smart Band 10 Pro' },
  { key: 'M2313W1', model: 'M2313W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列' },
  { key: 'M2311W1', model: 'M2311W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 eSIM' },
  { key: 'M2323W1', model: 'M2323W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 国际版' },
  { key: 'M2425W1', model: 'M2425W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列' },
  { key: 'M2424W1', model: 'M2424W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列 eSIM' },
  { key: 'M2426W1', model: 'M2426W1', codename: 'o62m', id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版' },
  { key: 'M2312W1', model: 'M2312W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 Sport' },
  { key: 'M2502W1', model: 'M2502W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 41mm' },
  { key: 'M2530W1', model: 'M2530W1', codename: 'p62', id: 'xmws5', name: 'Xiaomi Watch S5 系列' },
  { key: 'M2517W1', model: 'M2517W1', codename: 'p62', id: 'xmws5', name: 'Xiaomi Watch S5 系列 eSIM' },
  { key: 'M2427W1', model: 'M2427W1', codename: 'o65', id: 'xmrw5', name: 'REDMI Watch 5' },
  { key: 'M2428W1', model: 'M2428W1', codename: 'o65m', id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM' },
  { key: 'M2523W1', model: 'M2523W1', codename: 'p65', id: 'xmrw6', name: 'REDMI Watch 6' },
  { key: 'WA2536B', model: 'WA2536B', codename: 'vivowgt2', id: 'vivowgt2', name: 'vivo WATCH GT 2' }
]

function buildTokenMap(options: DeviceOption[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const device of options) {
    map[device.id.toLowerCase()] = device.id
    for (const alias of device.aliases) {
      map[alias.toLowerCase()] = device.id
    }
  }
  return map
}

export let deviceOptions: DeviceOption[] = HARDCODED_DEVICE_OPTIONS
export let deviceSelectorEntries: DeviceSelectorEntry[] = HARDCODED_DEVICE_SELECTOR_ENTRIES

let deviceTokenToId = buildTokenMap(deviceOptions)

export function normalizeDeviceToken(token: string): string {
  const key = token.trim().toLowerCase()
  return deviceTokenToId[key] || token.trim()
}

type CatalogListener = () => void
const listeners = new Set<CatalogListener>()

export function subscribeToCatalog(listener: CatalogListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function notifyListeners(): void {
  listeners.forEach((l) => l())
}

export async function fetchAndUpdateCatalog(): Promise<void> {
  const { fetchDeviceCatalog } = await import('./deviceCatalogFetcher')
  const result = await fetchDeviceCatalog()
  if (!result) return

  deviceOptions = result.deviceOptions
  deviceSelectorEntries = result.deviceSelectorEntries
  deviceTokenToId = buildTokenMap(deviceOptions)
  notifyListeners()
}
