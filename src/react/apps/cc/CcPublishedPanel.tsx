import { ClockCounterClockwise, LinkSimple, Package } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { loadOwnedResourceDetail, loadOwnedResources, type OwnedResourceDetail, type OwnedResourceEntry } from '@/utils/resourcePublishApi'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import { PreviewImageCarousel, type PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'

type ResourceManifestView = {
  name: string
  description: string
  restype: string
  icon: { file: string; url: string } | null
  cover: { file: string; url: string } | null
  previews: PreviewImageItem[]
  links: Array<{ title: string; type: string; url: string }>
}

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const buildRawGithubUrl = (owner: string, repo: string, ref: string, path: string): string => {
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

const parseManifestView = (
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

export function CcPublishedPanel(props: {
  token: string
  currentUser: string
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  resourceDetailKey: string
  onResourceDetailKeyChange: (key: string) => void
}) {
  const {
    token,
    currentUser,
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    resourceDetailKey,
    onResourceDetailKeyChange
  } = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resources, setResources] = useState<OwnedResourceEntry[]>([])
  const [reloadSeed, setReloadSeed] = useState(0)

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detail, setDetail] = useState<OwnedResourceDetail | null>(null)
  const [manifestView, setManifestView] = useState<ResourceManifestView | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        setResources([])

        const username = currentUser.trim()
        if (!username) {
          throw new Error('请先登录并校验 Token')
        }

        const items = await loadOwnedResources({
          token: token.trim(),
          username,
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: 'main',
          catalogPath: defaultCatalogPath.trim()
        })

        const sorted = [...items].sort((a, b) => {
          const left = `${a.commitDate || ''} ${a.name || ''}`
          const right = `${b.commitDate || ''} ${b.name || ''}`
          return right.localeCompare(left)
        })

        setResources(sorted)
        if (!resourceDetailKey && sorted.length > 0) {
          onResourceDetailKeyChange(sorted[0].key)
        }
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '加载资源失败')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [currentUser, defaultCatalogPath, defaultTargetOwner, defaultTargetRepo, onResourceDetailKeyChange, reloadSeed, resourceDetailKey, token])

  const selectedResource = useMemo(() => {
    if (!resourceDetailKey) return null
    return resources.find((item) => item.key === resourceDetailKey || item.catalogId === resourceDetailKey) || null
  }, [resourceDetailKey, resources])

  useEffect(() => {
    const run = async () => {
      if (!selectedResource) {
        setDetail(null)
        setManifestView(null)
        setDetailError('')
        return
      }

      try {
        setDetailLoading(true)
        setDetailError('')

        const v1Ref = selectedResource.source === 'v1' ? selectedResource.repo_commit_hash : undefined
        const v2Ref = selectedResource.source === 'v2' ? selectedResource.repo_commit_hash : undefined

        const loaded = await loadOwnedResourceDetail({
          token: token.trim(),
          owner: selectedResource.repo_owner,
          repo: selectedResource.repo_name,
          ...(v1Ref ? { v1Ref } : {}),
          ...(v2Ref ? { v2Ref } : {})
        })

        setDetail(loaded)

        const hasV2 = Boolean(loaded.v2ManifestText)
        const activeRef = hasV2 ? (loaded.v2Ref || loaded.defaultBranch) : (loaded.v1Ref || loaded.defaultBranch)
        const activeManifestText = hasV2 ? loaded.v2ManifestText : loaded.v1ManifestText
        setManifestView(parseManifestView(activeManifestText, loaded.owner, loaded.repo, activeRef || 'main'))
      } catch (cause: unknown) {
        setDetailError(cause instanceof Error ? cause.message : '加载资源详情失败')
        setDetail(null)
        setManifestView(null)
      } finally {
        setDetailLoading(false)
      }
    }

    void run()
  }, [selectedResource, token])

  return (
    <div className="w-full py-1 md:py-2">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
        <aside className="w-full rounded-xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-0 lg:w-80 lg:p-3">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <p className="truncate text-xs font-semibold text-foreground">资源列表</p>
            <Button size="sm" variant="outline" className="h-8" disabled={loading} onClick={() => setReloadSeed((prev) => prev + 1)}>
              <ClockCounterClockwise size={14} weight="duotone" />
              刷新
            </Button>
          </div>

          {loading ? <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">加载中...</div> : null}
          {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}
          {!loading && !error && resources.length === 0 ? <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">暂无可管理资源</div> : null}

          <div className="mt-2 space-y-2 overflow-y-auto max-[1023px]:max-h-[18rem] lg:max-h-[calc(100vh-170px)]">
            {resources.map((item) => {
              const active = selectedResource?.key === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${active ? 'border-border bg-muted shadow-sm' : 'border-transparent hover:bg-accent'}`}
                  onClick={() => onResourceDetailKeyChange(item.key)}
                >
                  <div className="line-clamp-2 text-sm font-semibold text-foreground">{item.name || '(未命名资源)'}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline">{item.source.toUpperCase()}</Badge>
                    <span>{item.restype || '-'}</span>
                    {item.v2NeedsFollowUp ? <Badge variant="secondary">v2需跟进</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.repo_owner}/{item.repo_name}</div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {!selectedResource ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">请先从左侧选择一个资源</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">资源信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCell label="资源名" value={selectedResource.name || '-'} />
                    <InfoCell label="资源类型" value={manifestView?.restype || selectedResource.restype || '-'} />
                    <InfoCell label="仓库" value={`${selectedResource.repo_owner}/${selectedResource.repo_name}`} />
                    <InfoCell label="提交时间" value={formatDate(selectedResource.commitDate)} />
                  </div>

                  {manifestView?.description ? (
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">描述</div>
                      <div className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{manifestView.description}</div>
                    </div>
                  ) : null}

                  {detailLoading ? <div className="text-xs text-muted-foreground">正在加载详情...</div> : null}
                  {detailError ? <div className="text-xs text-destructive">{detailError}</div> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">图片预览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {manifestView?.icon ? (
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Icon · {manifestView.icon.file}</div>
                      <a href={manifestView.icon.url} target="_blank" rel="noopener noreferrer" className="mt-2 mx-auto flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/70">
                        <img src={manifestView.icon.url} alt="Icon 预览" className="h-full w-full rounded-full object-contain p-3" loading="lazy" />
                      </a>
                    </div>
                  ) : null}

                  {manifestView?.cover ? (
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Cover · {manifestView.cover.file}</div>
                      <a href={manifestView.cover.url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-md border border-border/60 bg-background/70">
                        <img src={manifestView.cover.url} alt="Cover 预览" className="max-h-[50vh] w-full object-contain" loading="lazy" />
                      </a>
                    </div>
                  ) : null}

                  <PreviewImageCarousel items={manifestView?.previews || []} emptyText="未检测到预览图" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {!manifestView || manifestView.links.length === 0 ? <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">暂无 links</div> : null}
                  {manifestView?.links.map((link) => (
                    <a
                      key={`${link.title}-${link.url}`}
                      href={link.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <LinkSimple size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 break-all text-foreground">{link.title || link.url || '-'}</span>
                      {link.type ? <Badge variant="outline">{link.type}</Badge> : null}
                    </a>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">版本信息</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 pt-0 sm:grid-cols-2">
                  <InfoCell label="默认分支" value={detail?.defaultBranch || '-'} />
                  <InfoCell label="最新 Commit" value={detail?.latestCommitSha || '-'} />
                  <InfoCell label="最新提交时间" value={formatDate(detail?.latestCommitDate)} />
                  <InfoCell
                    label="V2 是否最新"
                    value={detail?.isV2HashLatest == null ? '-' : detail.isV2HashLatest ? '是' : '否'}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCell(props: { label: string; value: string }) {
  const { label, value } = props
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Package size={13} weight="duotone" />
        {label}
      </div>
      <div className="mt-1 break-all text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}
