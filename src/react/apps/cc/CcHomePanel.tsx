import { ArrowsClockwise, CheckCircle, ClockCounterClockwise, Sparkle, TrendUp, WarningCircle } from '@phosphor-icons/react'
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
    <div className="relative space-y-5">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.08) 1px, transparent 0)',
          backgroundSize: '16px 16px'
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(820px_300px_at_10%_-15%,hsl(var(--primary)/0.05),transparent)] dark:bg-[radial-gradient(900px_360px_at_10%_-15%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/0 via-background/38 to-background/72 dark:from-background/15 dark:via-background/55 dark:to-background/82" />

      <Card className="relative z-10 overflow-hidden border bg-card/75 shadow-sm backdrop-blur">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-chart-2/8 blur-3xl dark:bg-chart-2/16" />
        <CardHeader className="relative gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              <Sparkle size={13} weight="duotone" />
              mission control
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight md:text-4xl">
              CC 首页总览
            </CardTitle>
            <CardDescription className="max-w-[680px] text-sm leading-6 md:text-[15px]">
              快速聚焦需要修改的资源、待处理 PR 与 v2 跟进项，优先级在一屏内完成判断。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button size="sm" className="shadow-md" onClick={onOpenPublish}>去发布资源</Button>
            <Button size="sm" variant="outline" onClick={() => onOpenPullRequest(0, '')}>去看 PR</Button>
            <Button size="sm" variant="outline" onClick={onOpenPublished}>去资源管理</Button>
            <Button size="sm" variant="ghost" onClick={() => void loadDashboard()} disabled={loading}>
              <ArrowsClockwise size={14} weight="bold" className={loading ? 'animate-spin' : ''} />
              刷新
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="relative z-10 grid gap-3 md:grid-cols-6">
        <Card className="md:col-span-3 border bg-gradient-to-br from-amber-300/14 via-amber-200/8 to-card shadow-sm dark:from-amber-500/18 dark:via-amber-400/12">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs tracking-wide uppercase">需要更改</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{needChangeList.length}</CardTitle>
            <div className="inline-flex items-center gap-1 text-xs text-amber-700/90 dark:text-amber-400">
              <WarningCircle size={13} weight="duotone" />
              优先处理
            </div>
          </CardHeader>
        </Card>
        <Card className="md:col-span-2 border bg-gradient-to-br from-amber-300/12 via-amber-200/6 to-card shadow-sm dark:from-amber-500/16 dark:via-amber-400/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs tracking-wide uppercase">待处理 PR</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{reviewItems.length}</CardTitle>
            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ClockCounterClockwise size={13} weight="duotone" />
              审核流转中
            </div>
          </CardHeader>
        </Card>
        <Card className="md:col-span-1 border bg-gradient-to-br from-amber-300/12 via-amber-200/6 to-card shadow-sm dark:from-amber-500/16 dark:via-amber-400/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs tracking-wide uppercase">v2 需要跟进</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{v2FollowUpItems.length}</CardTitle>
            <div className="inline-flex items-center gap-1 text-xs text-amber-700/90 dark:text-amber-400">
              <TrendUp size={13} weight="duotone" />
              迁移推进
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5 border bg-gradient-to-br from-amber-300/10 via-card to-card/90 shadow-sm backdrop-blur dark:from-amber-500/12">
          <CardHeader>
            <CardTitle className="text-base">需要更改</CardTitle>
            <CardDescription>优先处理问题项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {needChangeList.length === 0 ? (
              <p className="text-muted-foreground">当前没有紧急待改项。</p>
            ) : (
              needChangeList.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-xl border bg-background/55 px-3.5 py-2.5 shadow-xs">
                  <span className="truncate pr-2">{item.title}</span>
                  {item.kind === 'pr' ? <Badge variant="destructive">PR需改</Badge> : <Badge variant="secondary">v2跟进</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border bg-card/75 shadow-sm backdrop-blur">
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
                  className="flex w-full items-center justify-between rounded-xl border bg-background/55 px-3.5 py-2.5 text-left shadow-xs"
                >
                  <span className="truncate pr-2">#{item.prNumber} {item.name || item.id || '-'}</span>
                  <Badge variant={item.status === 'changes_requested' ? 'destructive' : 'outline'}>{reviewStateText(item.status)}</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border bg-card/75 shadow-sm backdrop-blur">
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
                  className="flex w-full items-center justify-between rounded-xl border bg-background/55 px-3.5 py-2.5 text-left shadow-xs"
                >
                  <span className="truncate pr-2">{item.name || item.catalogId || item.repo_name}</span>
                  <Badge variant="destructive">v2需要跟进</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="relative z-10 border bg-card/75 shadow-sm backdrop-blur">
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
