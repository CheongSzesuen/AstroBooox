import type { PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'

export type ResourceManifestLink = {
  title: string
  type: string
  url: string
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
