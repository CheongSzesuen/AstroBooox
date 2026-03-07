import { ArrowsClockwise, ChatCircleDots, GitPullRequest, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import {
  loadInProgressResources,
  loadPullRequestIssueComments,
  type PullRequestIssueComment,
  type PublishingResource
} from '@/utils/resourcePublishApi'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'

const statusText = (status: PublishingResource['status']): string => {
  if (status === 'changes_requested') return '需要修改'
  if (status === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

const statusTone = (status: PublishingResource['status']): string => {
  if (status === 'changes_requested') return 'bg-red-500/10 text-red-700 border-red-500/30'
  if (status === 'fixed_waiting') return 'bg-amber-500/10 text-amber-700 border-amber-500/30'
  return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
}

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function CcPullRequestPanel(props: {
  token: string
  currentUser: string
  targetOwner: string
  targetRepo: string
  catalogPath: string
  initialPrNumber?: number
  onSelectPr: (prNumber: number, targetRepo: string) => void
}) {
  const { token, currentUser, targetOwner, targetRepo, catalogPath, initialPrNumber = 0, onSelectPr } = props

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<PublishingResource[]>([])
  const [selectedPrNumber, setSelectedPrNumber] = useState(0)

  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [comments, setComments] = useState<PullRequestIssueComment[]>([])

  const selectedItem = useMemo(() => items.find((item) => item.prNumber === selectedPrNumber) || null, [items, selectedPrNumber])

  const reload = async () => {
    try {
      setLoading(true)
      setError('')
      setItems([])

      const resolvedToken = token.trim()
      const username = currentUser.trim()
      if (!resolvedToken) {
        throw new Error('请先登录 Token')
      }
      if (!username) {
        throw new Error('无法识别当前用户')
      }

      const list = await loadInProgressResources({
        token: resolvedToken,
        username,
        targetOwner: targetOwner.trim(),
        targetRepo: targetRepo.trim(),
        catalogPath: catalogPath.trim()
      })

      setItems(list)

      if (list.length === 0) {
        setSelectedPrNumber(0)
        return
      }

      const preferred = initialPrNumber > 0 ? list.find((item) => item.prNumber === initialPrNumber) : null
      const next = preferred || list[0]
      setSelectedPrNumber(next.prNumber)
      onSelectPr(next.prNumber, targetRepo)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : '加载等待审核资源失败')
      setItems([])
      setSelectedPrNumber(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [catalogPath, currentUser, initialPrNumber, targetOwner, targetRepo, token])

  useEffect(() => {
    const run = async () => {
      if (!selectedItem) {
        setComments([])
        setCommentsError('')
        return
      }
      try {
        setCommentsLoading(true)
        setCommentsError('')
        const data = await loadPullRequestIssueComments({
          token: token.trim(),
          owner: targetOwner,
          repo: targetRepo,
          prNumber: selectedItem.prNumber
        })
        const sorted = [...data].sort((a, b) => {
          const ta = new Date(a.created_at).getTime()
          const tb = new Date(b.created_at).getTime()
          return ta - tb
        })
        setComments(sorted)
      } catch (cause: unknown) {
        setCommentsError(cause instanceof Error ? cause.message : '加载评论失败')
        setComments([])
      } finally {
        setCommentsLoading(false)
      }
    }

    void run()
  }, [selectedItem, targetOwner, targetRepo, token])

  return (
    <div className="w-full py-1 md:py-2">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
        <aside className="w-full rounded-xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-0 lg:w-80 lg:p-3">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <p className="truncate text-xs font-semibold text-foreground">等待审核</p>
            <Button size="sm" variant="outline" className="h-8" disabled={loading} onClick={() => void reload()}>
              <ArrowsClockwise size={14} weight="duotone" />
              刷新
            </Button>
          </div>

          {loading ? <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">加载中...</div> : null}
          {error ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}
          {!loading && !error && items.length === 0 ? <div className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">暂无等待审核资源</div> : null}

          <div className="mt-2 space-y-2 overflow-y-auto max-[1023px]:max-h-[18rem] lg:max-h-[calc(100vh-170px)]">
            {items.map((item) => {
              const active = selectedPrNumber === item.prNumber
              return (
                <button
                  key={`${item.id}-${item.prNumber}`}
                  type="button"
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${active ? 'border-border bg-muted shadow-sm' : 'border-transparent hover:bg-accent'}`}
                  onClick={() => {
                    setSelectedPrNumber(item.prNumber)
                    onSelectPr(item.prNumber, targetRepo)
                  }}
                >
                  <div className="line-clamp-1 text-sm font-semibold text-foreground">{item.name || item.id || '(未命名资源)'}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Badge variant="outline">{item.restype || '-'}</Badge>
                    <span>#{item.prNumber}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{statusText(item.status)}</div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {!selectedItem ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">请先从左侧选择一个资源</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">资源审核状态</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCell label="资源名" value={selectedItem.name || '-'} />
                    <InfoCell label="资源 ID" value={selectedItem.id || '-'} />
                    <InfoCell label="资源类型" value={selectedItem.restype || '-'} />
                    <InfoCell label="提交时间" value={formatDate(selectedItem.createdAt)} />
                  </div>

                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <div className="text-xs text-muted-foreground">审核状态</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusTone(selectedItem.status)}`}>{statusText(selectedItem.status)}</span>
                      {selectedItem.unresolvedTagCount > 0 ? <Badge variant="secondary">未解决标签：{selectedItem.unresolvedTagCount}</Badge> : <Badge variant="outline">暂无待修标签</Badge>}
                    </div>
                    {selectedItem.unresolvedTagIds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedItem.unresolvedTagIds.map((tagId) => (
                          <Badge key={tagId} variant="outline">{tagId}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={selectedItem.prUrl} target="_blank" rel="noopener noreferrer">
                        <GitPullRequest size={14} weight="duotone" />
                        打开 PR
                      </a>
                    </Button>
                    <span className="text-xs text-muted-foreground">{selectedItem.prTitle}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">评论时间线</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {commentsLoading ? <div className="text-xs text-muted-foreground">加载评论中...</div> : null}
                  {commentsError ? <div className="text-xs text-destructive">{commentsError}</div> : null}
                  {!commentsLoading && !commentsError && comments.length === 0 ? <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">暂无评论</div> : null}
                  {!commentsLoading && !commentsError
                    ? comments.map((comment) => (
                        <article key={comment.id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <ChatCircleDots size={13} weight="duotone" />
                              #{comment.id} · {comment.user?.login || 'unknown'}
                            </span>
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words text-foreground">{comment.body || '(空内容)'}</div>
                        </article>
                      ))
                    : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">建议动作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">若状态为“需要修改”，请根据评论逐条处理后再次提交。</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">若状态为“已修复待审”，请等待审核者下一轮确认。</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 inline-flex items-start gap-2">
                    <WarningCircle size={14} weight="duotone" className="mt-0.5 shrink-0" />
                    如需查看文件级别审核详情，可切换到“审核”页。
                  </div>
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
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}
