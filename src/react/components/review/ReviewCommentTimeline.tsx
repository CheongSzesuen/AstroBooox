import { useEffect, useMemo, useState } from 'react'
import {
  ArrowBendUpLeft,
  ArrowSquareOut,
  DotsThreeVertical,
  PencilSimple,
  Trash
} from '@phosphor-icons/react'
import {
  parseReviewCommentBody,
  renderCommentMarkdownHtml,
  renderCommentMarkdownInlineHtml,
  type ParsedReviewComment
} from '@/utils/reviewComment'
import { Button } from '@/react/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/react/components/ui/dropdown-menu'

interface ReviewCommentUser {
  login?: string
  avatar_url?: string
}

export interface ReviewCommentTimelineItem {
  id: number
  body?: string
  created_at?: string
  html_url?: string
  user?: ReviewCommentUser
}

export function ReviewCommentTimeline(props: {
  comments: ReviewCommentTimelineItem[]
  emptyText?: string
  showOpenLink?: boolean
  showReplyAction?: boolean
  showEditAction?: boolean
  showDeleteAction?: boolean
  lineLeft?: number
  avatarRounded?: 'full' | 'md'
  avatarBorder?: boolean
  getAvatarUrl?: (login: string, avatarUrl: string) => string
  onAvatarLoad?: (login: string, avatarUrl: string) => void
  onReply?: (comment: ReviewCommentTimelineItem) => void
  onEdit?: (comment: ReviewCommentTimelineItem) => void
  onDelete?: (comment: ReviewCommentTimelineItem) => void
}) {
  const {
    comments,
    emptyText = '当前 PR 暂无评论',
    showOpenLink = false,
    showReplyAction = false,
    showEditAction = false,
    showDeleteAction = false,
    lineLeft = 54,
    avatarRounded = 'full',
    avatarBorder = false,
    getAvatarUrl,
    onAvatarLoad,
    onReply,
    onEdit,
    onDelete
  } = props

  const [missingReplyDialogOpen, setMissingReplyDialogOpen] = useState(false)
  const [missingReplyDialogMessage, setMissingReplyDialogMessage] = useState('原始消息内容不在了。')
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({})

  const parsedMap = useMemo(() => {
    const next = new Map<string, ParsedReviewComment>()
    for (const comment of comments) {
      next.set(String(comment.id), parseReviewCommentBody(comment.body || ''))
    }
    return next
  }, [comments])

  useEffect(() => {
    setCollapsedState((prev) => {
      const next: Record<string, boolean> = {}
      for (const comment of comments) {
        const key = String(comment.id)
        next[key] = prev[key] ?? isLongContent(parsedMap.get(key))
      }
      return next
    })
  }, [comments, parsedMap])

  const avatarClass = [
    'relative z-10 h-8 w-8 shrink-0 bg-background object-cover',
    avatarRounded === 'md' ? 'rounded-md' : 'rounded-full',
    avatarBorder ? 'border border-border' : ''
  ].join(' ')

  const resolveAvatarUrl = (login: string, avatarUrl: string): string => {
    if (getAvatarUrl) return getAvatarUrl(login, avatarUrl)
    return avatarUrl
  }

  const handleAvatarLoad = (login: string, avatarUrl: string): void => {
    onAvatarLoad?.(login, avatarUrl)
  }

  const parsedOf = (comment: ReviewCommentTimelineItem): ParsedReviewComment =>
    parsedMap.get(String(comment.id)) || {
      tagType: '',
      tagId: '',
      replyTarget: '',
      replyExcerpt: '',
      content: comment.body || ''
    }

  const getTagBadgeClass = (tagType: ParsedReviewComment['tagType']): string => {
    if (tagType === 'NEEDFIX') return 'border-red-500/40 bg-red-500/15 text-red-700'
    if (tagType === 'FIXED') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
    return 'border-border bg-muted/30 text-muted-foreground'
  }

  const getReplyTargetId = (replyTarget: string): number | null => {
    const match = replyTarget.match(/#(\d+)/)
    if (!match) return null
    const id = Number(match[1])
    return Number.isFinite(id) ? id : null
  }

  const highlightReviewCommentElement = (element: HTMLElement): void => {
    element.classList.add('rounded-md', 'bg-primary/10', 'transition-colors')
    setTimeout(() => {
      element.classList.remove('rounded-md', 'bg-primary/10', 'transition-colors')
    }, 1500)
  }

  const scrollToReplyTarget = async (replyTarget: string): Promise<void> => {
    const id = getReplyTargetId(replyTarget)
    if (!id) {
      setMissingReplyDialogMessage('原始消息内容不在了。')
      setMissingReplyDialogOpen(true)
      return
    }
    const selector = `[data-review-comment-content-id="${id}"]`
    for (let i = 0; i < 8; i += 1) {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightReviewCommentElement(element)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    setMissingReplyDialogMessage(`原始消息内容不在了（目标评论 #${id} 未找到）。`)
    setMissingReplyDialogOpen(true)
  }

  const formatCommentRelativeTime = (value: string): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'commented just now'
    const diffMs = Date.now() - date.getTime()
    const absMs = Math.abs(diffMs)
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const month = 30 * day
    const year = 365 * day

    if (absMs < minute) return 'commented just now'
    if (absMs < hour) {
      const amount = Math.max(1, Math.round(absMs / minute))
      return `commented ${amount} minute${amount > 1 ? 's' : ''} ago`
    }
    if (absMs < day) {
      const amount = Math.max(1, Math.round(absMs / hour))
      return `commented ${amount} hour${amount > 1 ? 's' : ''} ago`
    }
    if (absMs < month) {
      const amount = Math.max(1, Math.round(absMs / day))
      return `commented ${amount} day${amount > 1 ? 's' : ''} ago`
    }
    if (absMs < year) {
      const amount = Math.max(1, Math.round(absMs / month))
      return `commented ${amount} month${amount > 1 ? 's' : ''} ago`
    }
    const amount = Math.max(1, Math.round(absMs / year))
    return `commented ${amount} year${amount > 1 ? 's' : ''} ago`
  }

  const isCollapsed = (comment: ReviewCommentTimelineItem): boolean =>
    collapsedState[String(comment.id)] ?? isLongContent(parsedMap.get(String(comment.id)))

  const toggleCollapsed = (comment: ReviewCommentTimelineItem): void => {
    const key = String(comment.id)
    setCollapsedState((prev) => ({
      ...prev,
      [key]: !isCollapsed(comment)
    }))
  }

  const openCommentLink = (url?: string): void => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <>
      <div className="relative space-y-5">
        <div className="pointer-events-none absolute bottom-4 top-5 w-0.5 bg-border/90" style={{ left: `${lineLeft}px` }} />

        {comments.map((comment) => {
          const parsed = parsedOf(comment)
          const longContent = isLongContent(parsed)
          const collapsed = isCollapsed(comment)
          const hasReplyTarget = Boolean(getReplyTargetId(parsed.replyTarget))

          return (
            <div
              key={comment.id}
              className="relative flex items-start gap-3"
              data-review-comment-id={String(comment.id)}
            >
              {comment.user?.avatar_url && comment.user?.login ? (
                <img
                  src={resolveAvatarUrl(comment.user.login, comment.user.avatar_url)}
                  className={`${avatarClass} hidden sm:block`}
                  loading="lazy"
                  onLoad={() => handleAvatarLoad(comment.user!.login!, comment.user!.avatar_url!)}
                />
              ) : null}
              <div className="relative z-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                <div className="mb-3 border-b border-border pb-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      {comment.user?.avatar_url && comment.user?.login ? (
                        <img
                          src={resolveAvatarUrl(comment.user.login, comment.user.avatar_url)}
                          className={`${avatarClass} sm:hidden`}
                          loading="lazy"
                          onLoad={() => handleAvatarLoad(comment.user!.login!, comment.user!.avatar_url!)}
                        />
                      ) : null}
                      <span className="truncate font-medium text-foreground">{comment.user?.login || 'unknown'}</span>
                      <span className="hidden shrink-0 sm:inline">{formatCommentRelativeTime(comment.created_at || '')}</span>
                    </span>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                        >
                          <DotsThreeVertical size={12} />
                          详情
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="min-w-[150px]">
                        {showReplyAction ? (
                          <DropdownMenuItem onSelect={() => onReply?.(comment)} className="gap-2">
                            <ArrowBendUpLeft size={14} />
                            回复
                          </DropdownMenuItem>
                        ) : null}
                        {showEditAction ? (
                          <DropdownMenuItem onSelect={() => onEdit?.(comment)} className="gap-2">
                            <PencilSimple size={14} />
                            编辑
                          </DropdownMenuItem>
                        ) : null}
                        {showDeleteAction ? (
                          <DropdownMenuItem onSelect={() => onDelete?.(comment)} className="gap-2 text-destructive">
                            <Trash size={14} />
                            删除
                          </DropdownMenuItem>
                        ) : null}
                        {showOpenLink && comment.html_url ? <DropdownMenuSeparator /> : null}
                        {showOpenLink && comment.html_url ? (
                          <DropdownMenuItem onSelect={() => openCommentLink(comment.html_url)} className="gap-2">
                            <ArrowSquareOut size={14} />
                            打开评论
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-1 pl-10 text-muted-foreground sm:hidden">
                    {formatCommentRelativeTime(comment.created_at || '')}
                  </div>
                </div>

                {parsed.replyTarget ? (
                  <div className="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground">回复 {parsed.replyTarget}</div>
                      {hasReplyTarget ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={() => void scrollToReplyTarget(parsed.replyTarget)}
                        >
                          <ArrowSquareOut size={12} />
                          定位
                        </button>
                      ) : null}
                    </div>
                    {parsed.replyExcerpt ? (
                      <div
                        className="mt-1 break-words"
                        dangerouslySetInnerHTML={{ __html: renderCommentMarkdownHtml(parsed.replyExcerpt) }}
                      />
                    ) : null}
                  </div>
                ) : null}

                <div
                  data-review-comment-content-id={String(comment.id)}
                  className={`pt-1 break-words text-foreground ${collapsed ? 'max-h-36 overflow-hidden' : ''}`}
                >
                  {parsed.tagId ? (
                    <span
                      className={`mr-1 inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${getTagBadgeClass(parsed.tagType)}`}
                    >
                      {parsed.tagType || 'COMMENT'} · {parsed.tagId}
                    </span>
                  ) : null}
                  <span className="align-middle" dangerouslySetInnerHTML={{ __html: renderCommentMarkdownInlineHtml(parsed.content) }} />
                </div>

                {longContent ? (
                  <button
                    type="button"
                    className="mt-2 text-xs text-primary hover:underline"
                    onClick={() => toggleCollapsed(comment)}
                  >
                    {collapsed ? '展开' : '收起'}
                  </button>
                ) : null}

                {collapsed && longContent ? (
                  <div className="pointer-events-none absolute bottom-10 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent" />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={missingReplyDialogOpen} onOpenChange={setMissingReplyDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>无法定位原评论</DialogTitle>
            <DialogDescription>{missingReplyDialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setMissingReplyDialogOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const isLongText = (text: string): boolean => (text || '').length > 360 || (text || '').split('\n').length > 8

const isLongContent = (parsed?: ParsedReviewComment): boolean => isLongText(parsed?.content || '')
