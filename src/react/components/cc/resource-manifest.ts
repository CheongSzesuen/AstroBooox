import type { PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'

export type ResourceManifestLink = {
  title: string
  type: string
  url: string
}

export type ResourceManifestDownload = {
  version: string
  file_name: string
}

export type ResourceManifestExt = {
  enableAstroBoxCreatorFeatures?: boolean
  downloads?: Record<string, ResourceManifestDownload>
}

export type ResourceManifestView = {
  name: string
  description: string
  restype: string
  icon: { file: string; url: string } | null
  cover: { file: string; url: string } | null
  previews: PreviewImageItem[]
  links: ResourceManifestLink[]
}

export const buildRawGithubUrl = (owner: string, repo: string, ref: string, path: string): string => {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`
}

const toNonEmptyString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => toNonEmptyString(item)).filter(Boolean)
}

const toImageAsset = (rawPath: string, owner: string, repo: string, ref: string): { file: string; url: string } | null => {
  const raw = rawPath.trim()
  if (!raw) return null
  const file = raw.split('/').filter(Boolean).pop() || raw
  if (/^https?:\/\//i.test(raw)) {
    return { file, url: raw }
  }
  return {
    file,
    url: buildRawGithubUrl(owner, repo, ref, raw.replace(/^\/+/, ''))
  }
}

const toDownloadMap = (value: unknown): Record<string, ResourceManifestDownload> => {
  const downloads = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return Object.entries(downloads).reduce<Record<string, ResourceManifestDownload>>((acc, [key, entry]) => {
    const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const device = key.trim()
    if (!device) return acc
    acc[device] = {
      version: toNonEmptyString(row.version),
      file_name: toNonEmptyString(row.file_name)
    }
    return acc
  }, {})
}

export const getManifestV2Ext = (manifest: Record<string, unknown>): ResourceManifestExt => {
  const ext = manifest.ext && typeof manifest.ext === 'object' ? (manifest.ext as Record<string, unknown>) : {}
  return {
    enableAstroBoxCreatorFeatures: Boolean(ext.enableAstroBoxCreatorFeatures),
    downloads: toDownloadMap(ext.downloads)
  }
}

export const getManifestV2Downloads = (manifest: Record<string, unknown>): Record<string, ResourceManifestDownload> => {
  const topLevelDownloads = toDownloadMap(manifest.downloads)
  if (Object.keys(topLevelDownloads).length > 0) return topLevelDownloads
  return getManifestV2Ext(manifest).downloads || {}
}

export const isAstroBoxCreatorFeatureEnabled = (manifest: Record<string, unknown>): boolean =>
  Boolean(getManifestV2Ext(manifest).enableAstroBoxCreatorFeatures)

export const parseManifestView = (
  manifestText: string,
  owner: string,
  repo: string,
  ref: string
): ResourceManifestView => {
  if (!manifestText.trim()) {
    return {
      name: '',
      description: '',
      restype: '',
      icon: null,
      cover: null,
      previews: [],
      links: []
    }
  }

  try {
    const parsed = JSON.parse(manifestText) as Record<string, unknown>
    const item = (parsed.item && typeof parsed.item === 'object') ? (parsed.item as Record<string, unknown>) : parsed

    const icon = toImageAsset(toNonEmptyString(item.icon), owner, repo, ref)
    const cover = toImageAsset(toNonEmptyString(item.cover), owner, repo, ref)
    const previews = toStringArray(item.preview)
      .map((path) => toImageAsset(path, owner, repo, ref))
      .filter((asset): asset is { file: string; url: string } => Boolean(asset))

    const linksSource = Array.isArray(parsed.links) ? parsed.links : []
    const links = linksSource
      .map((entry) => {
        const row = (entry && typeof entry === 'object') ? (entry as Record<string, unknown>) : {}
        return {
          title: toNonEmptyString(row.title),
          type: toNonEmptyString(row.icon),
          url: toNonEmptyString(row.url)
        }
      })
      .filter((link) => link.title || link.type || link.url)

    return {
      name: toNonEmptyString(item.name),
      description: toNonEmptyString(item.description) || toNonEmptyString(parsed.description),
      restype: toNonEmptyString(item.restype),
      icon,
      cover,
      previews,
      links
    }
  } catch {
    return {
      name: '',
      description: '',
      restype: '',
      icon: null,
      cover: null,
      previews: [],
      links: []
    }
  }
}
