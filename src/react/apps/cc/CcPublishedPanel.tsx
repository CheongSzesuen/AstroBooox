import { ClockCounterClockwise, Package } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { loadOwnedResourceDetail, loadOwnedResources, type OwnedResourceDetail, type OwnedResourceEntry } from '@/utils/resourcePublishApi'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import { ResourceManifestOverview } from '@/react/components/cc/ResourceManifestOverview'
import { parseManifestView, type ResourceManifestView } from '@/react/components/cc/resource-manifest'

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
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
                  <CardTitle className="text-base">预览与链接</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResourceManifestOverview manifestView={manifestView} />
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
