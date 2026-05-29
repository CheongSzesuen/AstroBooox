import type { DeviceOption, DeviceSelectorEntry } from './resourcePublishWorkbenchDeviceCatalog'

const SOURCES = [
  { label: 'github-raw', v2: (f: string) => `https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}`, json5: (f: string) => `https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}` },
  { label: 'jsdelivr', v2: (f: string) => `https://cdn.jsdelivr.net/gh/AstralSightStudios/AstroBox-Repo@main/${f}`, json5: (f: string) => `https://cdn.jsdelivr.net/gh/AstralSightStudios/AstroBox-Repo@main/${f}` },
  { label: 'ghproxy', v2: (f: string) => `https://ghproxy.net/https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}`, json5: (f: string) => `https://ghproxy.net/https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}` },
  { label: 'ghproxy-com', v2: (f: string) => `https://ghproxy.com/https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}`, json5: (f: string) => `https://ghproxy.com/https://raw.githubusercontent.com/AstralSightStudios/AstroBox-Repo/main/${f}` },
  { label: 'fastgit', v2: (f: string) => `https://raw.fastgit.org/AstralSightStudios/AstroBox-Repo/main/${f}`, json5: (f: string) => `https://raw.fastgit.org/AstralSightStudios/AstroBox-Repo/main/${f}` },
]

async function fetchFirst(urls: string[], signal: AbortSignal): Promise<string> {
  const errors: unknown[] = []
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal })
      if (res.ok) return await res.text()
      errors.push(new Error(`${url} → ${res.status}`))
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e
      errors.push(e)
    }
  }
  throw new AggregateError(errors, '所有设备数据源均不可用')
}

function json5ToJson(text: string): string {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'/g, '"')
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
    .replace(/,(\s*[}\]])/g, '$1')
}

interface V2Entry {
  id: string
  name: string
  description?: string
  chip?: string
  fetch?: boolean
}

type V2Data = Record<string, Record<string, V2Entry>>

interface Json5Entry {
  name: string
  codename: string
  chip?: string
  fetch?: boolean
}

type Json5Data = Record<string, Json5Entry>

interface CatalogResult {
  deviceOptions: DeviceOption[]
  deviceSelectorEntries: DeviceSelectorEntry[]
  normalizeDeviceToken: (token: string) => string
}

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

function parseV2(text: string): V2Data | null {
  try {
    return JSON.parse(text) as V2Data
  } catch {
    return null
  }
}

function parseJson5(text: string): Json5Data | null {
  try {
    return JSON.parse(json5ToJson(text)) as Json5Data
  } catch {
    return null
  }
}

function mergeCatalogs(v2: V2Data, j5: Json5Data | null): CatalogResult {
  const optionMap = new Map<string, { vendor: string; name: string; models: string[]; codenames: string[] }>()

  for (const [vendor, devices] of Object.entries(v2)) {
    for (const [model, entry] of Object.entries(devices)) {
      let group = optionMap.get(entry.id)
      if (!group) {
        group = { vendor, name: entry.name, models: [], codenames: [] }
        optionMap.set(entry.id, group)
      }
      group.models.push(model)
      if (j5?.[model]?.codename) {
        group.codenames.push(j5[model].codename)
      }
    }
  }

  const deviceOptions: DeviceOption[] = []
  for (const [id, group] of optionMap) {
    const uniqueCodename = [...new Set(group.codenames)]
    const aliases = [...new Set([...uniqueCodename, ...group.models])]
    deviceOptions.push({ id, name: group.name, vendor: group.vendor, aliases })
  }

  const deviceSelectorEntries: DeviceSelectorEntry[] = []
  for (const devices of Object.values(v2)) {
    for (const [model, entry] of Object.entries(devices)) {
      const codename = j5?.[model]?.codename ?? ''
      deviceSelectorEntries.push({
        key: model,
        model,
        codename,
        id: entry.id,
        name: entry.name,
      })
    }
  }

  const tokenMap = buildTokenMap(deviceOptions)
  const normalizeDeviceToken = (token: string): string => {
    const key = token.trim().toLowerCase()
    return tokenMap[key] ?? token.trim()
  }

  return { deviceOptions, deviceSelectorEntries, normalizeDeviceToken }
}

export async function fetchDeviceCatalog(signal?: AbortSignal): Promise<CatalogResult | null> {
  const ctrl = new AbortController()
  const s = signal ?? ctrl.signal

  try {
    const v2Urls = SOURCES.map((src) => src.v2('devices_v2.json'))
    const json5Urls = SOURCES.map((src) => src.json5('devices.json5'))

    const [v2Text, json5Text] = await Promise.all([
      fetchFirst(v2Urls, s),
      fetchFirst(json5Urls, s).catch(() => null as string | null),
    ])

    const v2 = parseV2(v2Text)
    if (!v2) return null

    const j5 = json5Text ? parseJson5(json5Text) : null
    return mergeCatalogs(v2, j5)
  } catch {
    return null
  }
}
