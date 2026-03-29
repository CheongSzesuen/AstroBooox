import { ArrowsClockwise, CheckCircle, ClockCounterClockwise, WarningCircle } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadInProgressResources, loadOwnedResources, type OwnedResourceEntry, type PublishingResource } from '@/utils/resourcePublishApi'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

type OwnedMergedItem = {
  key: string
  catalogId: string
  name: string
  repo_name: string
  commitDate: string
  sources: Array<'v1' | 'v2'>
  v2NeedsFollowUp: boolean
}

const reviewStateText = (state: PublishingResource['status']): string => {
  if (state === 'changes_requested') return '需要修改'
  if (state === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function CcHomePanel(props: {
  token: string
  currentUser: string
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  ownedDisplayPriority: 'v2' | 'v1'
  onOpenPublish: () => void
  onOpenPullRequest: (prNumber: number, targetRepo: string) => void
  onOpenPublished: () => void
}) {
  const {
    token,
    currentUser,
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    ownedDisplayPriority,
    onOpenPublish,
    onOpenPullRequest,
    onOpenPublished
  } = props

  const [loading, setLoading] = useState(false)
  const [ownedItems, setOwnedItems] = useState<OwnedResourceEntry[]>([])
  const [reviewItems, setReviewItems] = useState<PublishingResource[]>([])
  const canLoad = Boolean(token.trim() && currentUser.trim())

  const requireToken = useCallback((): string => {
    const value = token.trim()
    if (!value) throw new Error('请先登录 Token')
    return value
  }, [token])

  const mergedOwnedItems = useMemo<OwnedMergedItem[]>(() => {
    const grouped = new Map<string, OwnedMergedItem>()
    const preferredSource = ownedDisplayPriority === 'v1' ? 'v1' : 'v2'

    for (const item of ownedItems) {
      const key = `${item.repo_owner.trim().toLowerCase()}|${item.repo_name.trim().toLowerCase()}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          key,
          catalogId: item.catalogId,
          name: item.name,
          repo_name: item.repo_name,
          commitDate: item.commitDate,
          sources: [item.source],
          v2NeedsFollowUp: item.v2NeedsFollowUp
        })
        continue
      }

      if (!existing.sources.includes(item.source)) {
        existing.sources.push(item.source)
      }
      if (item.source === 'v2' && item.v2NeedsFollowUp) {
        existing.v2NeedsFollowUp = true
      }
      if (item.source === preferredSource && item.commitDate >= existing.commitDate) {
        existing.catalogId = item.catalogId || existing.catalogId
        existing.name = item.name || existing.name
        existing.repo_name = item.repo_name || existing.repo_name
        existing.commitDate = item.commitDate || existing.commitDate
      }
    }

    return Array.from(grouped.values()).sort((a, b) => (b.commitDate || '').localeCompare(a.commitDate || ''))
  }, [ownedDisplayPriority, ownedItems])

  const v2FollowUpItems = useMemo(
    () => mergedOwnedItems.filter((item) => item.v2NeedsFollowUp),
    [mergedOwnedItems]
  )

  const needFixPrItems = useMemo(
    () => reviewItems.filter((item) => item.status === 'changes_requested'),
    [reviewItems]
  )

  const needChangeList = useMemo(
    () => [
      ...needFixPrItems.slice(0, 3).map((item) => ({
        key: `pr-${item.prNumber}`,
        title: `PR #${item.prNumber} ${item.name || item.id || ''}`.trim(),
        kind: 'pr' as const
      })),
      ...v2FollowUpItems.slice(0, 3).map((item) => ({
        key: `v2-${item.key}`,
        title: item.name || item.catalogId || item.repo_name,
        kind: 'v2' as const
      }))
    ],
    [needFixPrItems, v2FollowUpItems]
  )

  const loadDashboard = useCallback(async () => {
    if (!canLoad) {
      setOwnedItems([])
      setReviewItems([])
      return
    }
    try {
      setLoading(true)
      const [owned, review] = await Promise.all([
        loadOwnedResources({
          token: requireToken(),
          username: currentUser.trim(),
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: 'main',
          catalogPath: defaultCatalogPath.trim()
        }),
        loadInProgressResources({
          token: requireToken(),
          username: currentUser.trim(),
          targetOwner: defaultTargetOwner.trim(),
          targetRepo: defaultTargetRepo.trim(),
          catalogPath: defaultCatalogPath.trim()
        })
      ])
      setOwnedItems(owned)
      setReviewItems(review)
    } finally {
      setLoading(false)
    }
  }, [canLoad, currentUser, defaultCatalogPath, defaultTargetOwner, defaultTargetRepo, requireToken])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.16) 1px, transparent 0)',
            backgroundSize: '14px 14px'
          }}
        />
        <CardHeader className="relative">
          <CardTitle>Creator Console 首页</CardTitle>
          <CardDescription>快速查看我的资源待办、PR 状态和 v2 跟进情况。</CardDescription>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenPublish}>去发布资源</Button>
            <Button size="sm" variant="outline" onClick={() => onOpenPullRequest(0, '')}>去看 PR</Button>
            <Button size="sm" variant="outline" onClick={onOpenPublished}>去资源管理</Button>
            <Button size="sm" variant="ghost" onClick={() => void loadDashboard()} disabled={loading}>
              <ArrowsClockwise size={14} weight="bold" className={loading ? 'animate-spin' : ''} />
              刷新
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>需要更改</CardDescription>
            <CardTitle className="text-2xl">{needChangeList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>待处理 PR</CardDescription>
            <CardTitle className="text-2xl">{reviewItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>v2 需要跟进</CardDescription>
            <CardTitle className="text-2xl">{v2FollowUpItems.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">需要更改</CardTitle>
            <CardDescription>优先处理问题项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {needChangeList.length === 0 ? (
              <p className="text-muted-foreground">当前没有紧急待改项。</p>
            ) : (
              needChangeList.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="truncate pr-2">{item.title}</span>
                  {item.kind === 'pr' ? <Badge variant="destructive">PR需改</Badge> : <Badge variant="secondary">v2跟进</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">PR 状态</CardTitle>
            <CardDescription>仅显示我的待处理 PR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {reviewItems.length === 0 ? (
              <p className="text-muted-foreground">暂无待处理 PR。</p>
            ) : (
              reviewItems.slice(0, 5).map((item) => (
                <button
                  key={`${item.prNumber}-${item.id}`}
                  type="button"
                  onClick={() => onOpenPullRequest(item.prNumber, '')}
                  className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted/30"
                >
                  <span className="truncate pr-2">#{item.prNumber} {item.name || item.id || '-'}</span>
                  <Badge variant={item.status === 'changes_requested' ? 'destructive' : 'outline'}>{reviewStateText(item.status)}</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">v2 跟进</CardTitle>
            <CardDescription>复用资源管理的跟进判定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {v2FollowUpItems.length === 0 ? (
              <p className="text-muted-foreground">当前没有 v2 跟进项。</p>
            ) : (
              v2FollowUpItems.slice(0, 5).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={onOpenPublished}
                  className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted/30"
                >
                  <span className="truncate pr-2">{item.name || item.catalogId || item.repo_name}</span>
                  <Badge variant="destructive">v2需要跟进</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><WarningCircle size={14} weight="duotone" /> 需改 PR：{needFixPrItems.length}</span>
          <span className="inline-flex items-center gap-1"><ClockCounterClockwise size={14} weight="duotone" /> 待审核 PR：{reviewItems.filter((item) => item.status !== 'changes_requested').length}</span>
          <span className="inline-flex items-center gap-1"><CheckCircle size={14} weight="duotone" /> 资源总数：{mergedOwnedItems.length}</span>
          {reviewItems[0]?.createdAt ? <span>最新 PR 时间：{formatDate(reviewItems[0].createdAt)}</span> : null}
        </CardContent>
      </Card>
    </div>
  )
}
