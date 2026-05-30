import { ArrowsClockwise, GitPullRequest } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createPullRequestIssueComment,
  deletePullRequestIssueComment,
  loadInProgressResources,
  loadPullRequestIssueComments,
  type PullRequestIssueComment,
  type PublishingResource,
  updatePullRequestIssueComment
} from '@/utils/resourcePublishApi'
import { escapeHtml, parseReviewCommentBody, renderCommentMarkdownHtml, renderCommentMarkdownInlineHtml } from '@/utils/reviewComment'
import { ReviewCommentComposer } from '@/react/components/review/ReviewCommentComposer'
import { ReviewCommentTimeline } from '@/react/components/review/ReviewCommentTimeline'
import { ReviewDetailHeader } from '@/react/components/review/ReviewDetailHeader'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const reviewStateText = (state: PublishingResource['status']): string => {
  if (state === 'changes_requested') return '需要修改'
  if (state === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

const normalizeReviewCommentId = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')

const buildReviewReplyContextBlock = (comment: {
  id: number
  body?: string
  user?: { login?: string }
} | null): string => {
  if (!comment) return ''
  const login = comment.user?.login || 'unknown'
  const excerpt = (comment.body || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  return [`> Reply-To: #${comment.id} @${login}`, excerpt ? `> ${excerpt}` : ''].filter(Boolean).join('\n')
}

const buildReviewCommentPreviewCardHtml = (body: string): string => {
  const parsed = parseReviewCommentBody(body)
  const tagClass =
    parsed.tagType === 'NEEDFIX'
      ? 'border-red-500/40 bg-red-500/15 text-red-700'
      : parsed.tagType === 'FIXED'
        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
        : parsed.tagType === 'COLLAB_REQ'
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-700'
          : parsed.tagType === 'COLLAB_APPROVED'
            ? 'border-sky-500/40 bg-sky-500/15 text-sky-700'
            : parsed.tagType === 'COLLAB_REJECTED'
              ? 'border-slate-500/40 bg-slate-500/15 text-slate-700'
        : 'border-border bg-muted/30 text-muted-foreground'
  const tag = parsed.tagId
    ? `<span class="mr-1 inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${tagClass}">${escapeHtml(parsed.tagType || 'COMMENT')} · ${escapeHtml(parsed.tagId)}</span>`
    : ''
  const reply = parsed.replyTarget
    ? `<div class="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"><div class="font-medium text-foreground">回复 ${escapeHtml(parsed.replyTarget)}</div>${parsed.replyExcerpt ? `<div class="mt-1">${renderCommentMarkdownHtml(parsed.replyExcerpt)}</div>` : ''}</div>`
    : ''
  const content = `<div class="pt-1 break-words text-foreground">${tag}<span class="align-middle">${renderCommentMarkdownInlineHtml(parsed.content)}</span></div>`
  return `${reply}${content}`
}

type ReviewCommentTarget = {
  id: number
  body?: string
  user?: { login?: string }
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
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewItems, setReviewItems] = useState<PublishingResource[]>([])
  const [selectedReviewItem, setSelectedReviewItem] = useState<PublishingResource | null>(null)
  const [reviewCommentsLoading, setReviewCommentsLoading] = useState(false)
  const [reviewCommentsError, setReviewCommentsError] = useState('')
  const [selectedReviewComments, setSelectedReviewComments] = useState<PullRequestIssueComment[]>([])

  const [reviewCommentId, setReviewCommentId] = useState('')
  const [reviewCommentMessage, setReviewCommentMessage] = useState('')
  const [reviewCommentTagEnabled, setReviewCommentTagEnabled] = useState(true)
  const [reviewCommentEditorTab, setReviewCommentEditorTab] = useState<'edit' | 'preview'>('edit')
  const [reviewCommentSubmitting, setReviewCommentSubmitting] = useState(false)
  const [reviewCommentResultDialogOpen, setReviewCommentResultDialogOpen] = useState(false)
  const [reviewCommentResultDialogTitle, setReviewCommentResultDialogTitle] = useState('')
  const [reviewCommentResultDialogMessage, setReviewCommentResultDialogMessage] = useState('')
  const [reviewDeleteCommentDialogOpen, setReviewDeleteCommentDialogOpen] = useState(false)
  const [reviewDeleteCommentTarget, setReviewDeleteCommentTarget] = useState<ReviewCommentTarget | null>(null)
  const [reviewEditingCommentTarget, setReviewEditingCommentTarget] = useState<ReviewCommentTarget | null>(null)
  const [reviewReplyTargetComment, setReviewReplyTargetComment] = useState<ReviewCommentTarget | null>(null)

  const canLoadList = Boolean(token.trim() && currentUser.trim())

  const openReviewCommentResultDialog = (title: string, message: string): void => {
    setReviewCommentResultDialogTitle(title)
    setReviewCommentResultDialogMessage(message)
    setReviewCommentResultDialogOpen(true)
  }

  const requireToken = useCallback((): string => {
    const value = token.trim()
    if (!value) {
      throw new Error('请先登录 Token')
    }
    return value
  }, [token])

  const loadReviewComments = useCallback(async (prNumber: number): Promise<void> => {
    try {
      setReviewCommentsLoading(true)
      setReviewCommentsError('')
      const comments = await loadPullRequestIssueComments({
        token: requireToken(),
        owner: targetOwner.trim(),
        repo: targetRepo.trim(),
        prNumber
      })
      setSelectedReviewComments(comments)
    } catch (error: unknown) {
      setReviewCommentsError(`加载评论失败：${error instanceof Error ? error.message : '未知错误'}`)
      setSelectedReviewComments([])
    } finally {
      setReviewCommentsLoading(false)
    }
  }, [requireToken, targetOwner, targetRepo])

  const clearReviewReplyTarget = () => {
    setReviewReplyTargetComment(null)
  }

  const clearReviewEditingTarget = () => {
    setReviewEditingCommentTarget(null)
  }

  const openReviewItem = useCallback((item: PublishingResource, options?: { syncRoute?: boolean }) => {
    const syncRoute = options?.syncRoute ?? true
    setSelectedReviewItem(item)
    clearReviewEditingTarget()
    clearReviewReplyTarget()
    if (syncRoute) {
      onSelectPr(item.prNumber, targetRepo.trim().toLowerCase())
    }
    void loadReviewComments(item.prNumber)
  }, [loadReviewComments, onSelectPr, targetRepo])

  const closeReviewDetail = useCallback((options?: { syncRoute?: boolean }) => {
    const syncRoute = options?.syncRoute ?? true
    setSelectedReviewItem(null)
    setSelectedReviewComments([])
    setReviewCommentsError('')
    setReviewCommentId('')
    setReviewCommentMessage('')
    setReviewCommentEditorTab('edit')
    clearReviewEditingTarget()
    clearReviewReplyTarget()
    setReviewDeleteCommentDialogOpen(false)
    setReviewDeleteCommentTarget(null)
    if (syncRoute) {
      onSelectPr(0, '')
    }
  }, [onSelectPr])

  const loadReviewList = useCallback(async (): Promise<void> => {
    if (!canLoadList) {
      setReviewItems([])
      setReviewError('')
      return
    }
    try {
      setReviewLoading(true)
      setReviewError('')
      const items = await loadInProgressResources({
        token: requireToken(),
        username: currentUser.trim(),
        targetOwner: targetOwner.trim(),
        targetRepo: targetRepo.trim(),
        catalogPath: catalogPath.trim()
      })
      setReviewItems(items)
      setSelectedReviewItem((prev) => {
        if (!prev) return prev
        const matched = items.find((item) => item.prNumber === prev.prNumber && item.id === prev.id)
        return matched || prev
      })
      setReviewError('')
    } catch (cause) {
      setReviewItems([])
      setReviewError(cause instanceof Error ? cause.message : '加载审核列表失败')
    } finally {
      setReviewLoading(false)
    }
  }, [canLoadList, catalogPath, currentUser, requireToken, targetOwner, targetRepo])

  useEffect(() => {
    void loadReviewList()
  }, [loadReviewList])

  useEffect(() => {
    if (reviewLoading) return
    if (!initialPrNumber) {
      if (selectedReviewItem) closeReviewDetail({ syncRoute: false })
      return
    }
    if (reviewItems.length === 0) return
    const matched = reviewItems.find((item) => item.prNumber === initialPrNumber)
    if (!matched) {
      if (selectedReviewItem) closeReviewDetail({ syncRoute: false })
      return
    }
    if (selectedReviewItem?.prNumber === matched.prNumber && selectedReviewItem?.id === matched.id) return
    openReviewItem(matched, { syncRoute: false })
  }, [closeReviewDetail, initialPrNumber, openReviewItem, reviewItems, reviewLoading, selectedReviewItem])

  const reviewDeleteCommentPreviewText = useMemo(() => {
    const raw = reviewDeleteCommentTarget?.body || ''
    const parsed = parseReviewCommentBody(raw)
    const text = (parsed.content || raw).replace(/\s+/g, ' ').trim()
    return text || '（空内容）'
  }, [reviewDeleteCommentTarget])

  const normalizedReviewCommentId = useMemo(() => normalizeReviewCommentId(reviewCommentId), [reviewCommentId])

  const reviewCommentBodyPreview = useMemo(() => {
    const bodyParts = [
      reviewCommentMessage.trim(),
      buildReviewReplyContextBlock(reviewReplyTargetComment)
    ].filter(Boolean)
    const plainBody = bodyParts.join('\n').trim()
    if (!reviewCommentTagEnabled) return plainBody
    const prefixId = normalizedReviewCommentId || '<填写ID>'
    return `[ABCC_NEEDFIX_${prefixId}] ${plainBody}`.trim()
  }, [normalizedReviewCommentId, reviewCommentMessage, reviewCommentTagEnabled, reviewReplyTargetComment])

  const reviewSubmitCommentBody = useMemo(() => {
    const bodyParts = [
      reviewCommentMessage.trim(),
      buildReviewReplyContextBlock(reviewReplyTargetComment)
    ].filter(Boolean)
    const plainBody = bodyParts.join('\n').trim()
    if (!reviewCommentTagEnabled) return plainBody
    if (!normalizedReviewCommentId) return ''
    return `[ABCC_NEEDFIX_${normalizedReviewCommentId}] ${plainBody}`.trim()
  }, [normalizedReviewCommentId, reviewCommentMessage, reviewCommentTagEnabled, reviewReplyTargetComment])

  const reviewRenderedCommentPreviewHtml = useMemo(() => {
    if (!reviewCommentBodyPreview) return '<span class="text-muted-foreground">（这里显示评论内容）</span>'
    return buildReviewCommentPreviewCardHtml(reviewCommentBodyPreview)
  }, [reviewCommentBodyPreview])

  const canSubmitReviewComment = useMemo(() => {
    if (!selectedReviewItem) return false
    if (reviewCommentTagEnabled) return Boolean(normalizedReviewCommentId)
    return Boolean(reviewSubmitCommentBody)
  }, [normalizedReviewCommentId, reviewCommentTagEnabled, reviewSubmitCommentBody, selectedReviewItem])

  const reviewSubmitButtonTitle = useMemo(() => {
    if (!canSubmitReviewComment) return reviewCommentTagEnabled ? '请填写id' : '请输入评论内容'
    return reviewEditingCommentTarget ? '更新现有评论' : ''
  }, [canSubmitReviewComment, reviewCommentTagEnabled, reviewEditingCommentTarget])

  const reviewUnresolvedNeedfixAnchors = useMemo<Array<{ tagId: string; commentId: number }>>(() => {
    const unresolved = new Map<string, number>()
    for (const comment of selectedReviewComments) {
      const parsed = parseReviewCommentBody(comment.body || '')
      const tagId = parsed.tagId.trim()
      if (!tagId) continue
      if (parsed.tagType === 'NEEDFIX') {
        unresolved.set(tagId, comment.id)
        continue
      }
      if (parsed.tagType === 'FIXED') {
        unresolved.delete(tagId)
      }
    }
    return Array.from(unresolved.entries()).map(([tagId, commentId]) => ({ tagId, commentId }))
  }, [selectedReviewComments])

  const highlightReviewCommentElement = (element: HTMLElement): void => {
    element.classList.add('rounded-md', 'bg-primary/10', 'transition-colors')
    setTimeout(() => {
      element.classList.remove('rounded-md', 'bg-primary/10', 'transition-colors')
    }, 1500)
  }

  const scrollToReviewCommentById = async (commentId: number): Promise<void> => {
    const selector = `[data-review-comment-content-id="${commentId}"]`
    for (let i = 0; i < 8; i += 1) {
      const element = document.querySelector(selector)
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightReviewCommentElement(element)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
  }

  const onReviewReplyComment = (comment: ReviewCommentTarget): void => {
    setReviewReplyTargetComment(comment)
    setReviewEditingCommentTarget(null)
    setReviewCommentEditorTab('edit')
  }

  const onReviewEditComment = (comment: ReviewCommentTarget): void => {
    const parsed = parseReviewCommentBody(comment.body || '')
    setReviewCommentTagEnabled(Boolean(parsed.tagId))
    setReviewCommentId(parsed.tagId || `comment_${comment.id}`)
    setReviewCommentMessage(parsed.content)
    setReviewEditingCommentTarget(comment)
    clearReviewReplyTarget()
    setReviewCommentEditorTab('edit')
  }

  const onReviewDeleteComment = (comment: ReviewCommentTarget): void => {
    setReviewDeleteCommentTarget(comment)
    setReviewDeleteCommentDialogOpen(true)
  }

  const confirmReviewDeleteComment = async (): Promise<void> => {
    if (!selectedReviewItem || !reviewDeleteCommentTarget) return
    const target = reviewDeleteCommentTarget
    try {
      await deletePullRequestIssueComment({
        token: requireToken(),
        owner: targetOwner.trim(),
        repo: targetRepo.trim(),
        commentId: target.id
      })
      if (reviewEditingCommentTarget?.id === target.id) clearReviewEditingTarget()
      if (reviewReplyTargetComment?.id === target.id) clearReviewReplyTarget()
      setReviewDeleteCommentDialogOpen(false)
      setReviewDeleteCommentTarget(null)
      setSelectedReviewComments((prev) => prev.filter((item) => item.id !== target.id))
      await loadReviewComments(selectedReviewItem.prNumber)
      openReviewCommentResultDialog('删除成功', `评论 #${target.id} 已删除。`)
    } catch (error: unknown) {
      openReviewCommentResultDialog('删除失败', error instanceof Error ? error.message : '评论删除失败')
    }
  }

  const submitReviewComment = async (): Promise<void> => {
    if (!selectedReviewItem) return
    const body = reviewSubmitCommentBody
    if (!body) {
      openReviewCommentResultDialog('发送失败', reviewCommentTagEnabled ? '评论 ID 不能为空' : '评论内容不能为空')
      return
    }

    setReviewCommentSubmitting(true)
    try {
      if (reviewEditingCommentTarget) {
        const updated = await updatePullRequestIssueComment({
          token: requireToken(),
          owner: targetOwner.trim(),
          repo: targetRepo.trim(),
          commentId: reviewEditingCommentTarget.id,
          body
        })
        await loadReviewComments(selectedReviewItem.prNumber)
        await scrollToReviewCommentById(updated.id)
        setReviewCommentMessage('')
        setReviewCommentEditorTab('edit')
        clearReviewReplyTarget()
        clearReviewEditingTarget()
        openReviewCommentResultDialog('更新成功', '评论已更新。')
      } else {
        const created = await createPullRequestIssueComment({
          token: requireToken(),
          owner: targetOwner.trim(),
          repo: targetRepo.trim(),
          prNumber: selectedReviewItem.prNumber,
          body
        })
        await loadReviewComments(selectedReviewItem.prNumber)
        await scrollToReviewCommentById(created.id)
        setReviewCommentMessage('')
        setReviewCommentEditorTab('edit')
        clearReviewReplyTarget()
        openReviewCommentResultDialog('发送成功', '评论已发送并立即刷新评论列表。')
      }
    } catch (error: unknown) {
      openReviewCommentResultDialog('发送失败', error instanceof Error ? error.message : '评论发送失败')
    } finally {
      setReviewCommentSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1320px] space-y-4">
      {!selectedReviewItem ? (
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">进行中审核</CardTitle>
                <Button disabled={reviewLoading || !canLoadList} onClick={() => void loadReviewList()}>
                  <ArrowsClockwise size={16} weight="duotone" />
                  {reviewLoading ? '加载中...' : '刷新'}
                </Button>
              </div>
              <CardDescription>查看你提交后处于审核中的资源。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {reviewError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {reviewError}
                </div>
              ) : null}
              {!reviewError && reviewItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无数据
                </div>
              ) : null}
              {reviewItems.map((item) => (
                <button
                  key={`${item.prNumber}-${item.id}`}
                  type="button"
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors border-border bg-card hover:bg-accent/30 ${item.unresolvedTagCount > 0 ? 'ring-1 ring-red-500/60' : ''}`}
                  onClick={() => openReviewItem(item)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">{item.id} · {item.name}</div>
                    <div className="inline-flex items-center gap-1.5">
                      <Badge variant="outline">{reviewStateText(item.status)}</Badge>
                      {item.unresolvedTagCount > 0 ? <Badge variant="destructive">待修复 {item.unresolvedTagCount}</Badge> : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.restype} · PR #{item.prNumber} · {formatDate(item.createdAt)}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <ReviewDetailHeader
            title={selectedReviewItem.prTitle}
            number={selectedReviewItem.prNumber}
            showBack
            onBack={() => closeReviewDetail()}
            meta={(
              <>
                <Badge variant="secondary" className="h-6 gap-1.5 rounded-full px-2.5 text-xs">
                  <GitPullRequest size={14} weight="duotone" className="shrink-0" />
                  Open
                </Badge>
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                  {selectedReviewItem.prAuthorAvatar ? (
                    <img
                      src={selectedReviewItem.prAuthorAvatar}
                      className="h-6 w-6 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="truncate font-medium text-foreground">{selectedReviewItem.prAuthor || 'unknown'}</span>
                  <span className="shrink-0">opened {formatDate(selectedReviewItem.createdAt)}</span>
                </span>
              </>
            )}
            actions={(
              <>
                <Button
                  disabled={reviewCommentsLoading}
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 px-3"
                  onClick={() => void loadReviewComments(selectedReviewItem.prNumber)}
                >
                  <ArrowsClockwise size={14} weight="duotone" />
                  刷新评论
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 px-3">
                  <a href={selectedReviewItem.prUrl} target="_blank" rel="noopener noreferrer">
                    <GitPullRequest size={14} weight="duotone" />
                    打开 GitHub
                  </a>
                </Button>
              </>
            )}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">审核评论</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {reviewUnresolvedNeedfixAnchors.length > 0 ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5">
                  <div className="text-xs font-medium text-red-700">需要修复的标签（点击可快速定位评论）</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reviewUnresolvedNeedfixAnchors.map((anchor) => (
                      <button
                        key={anchor.tagId}
                        type="button"
                        className="inline-flex items-center rounded-md border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-500/20"
                        onClick={() => void scrollToReviewCommentById(anchor.commentId)}
                      >
                        {anchor.tagId}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {reviewCommentsError ? <div className="text-xs text-destructive">{reviewCommentsError}</div> : null}

              <ReviewCommentComposer
                avatarUrl={selectedReviewItem.prAuthorAvatar || ''}
                tagEnabled={reviewCommentTagEnabled}
                commentId={reviewCommentId}
                commentMessage={reviewCommentMessage}
                editorTab={reviewCommentEditorTab}
                previewHtml={reviewRenderedCommentPreviewHtml}
                canSubmit={canSubmitReviewComment}
                submitting={reviewCommentSubmitting}
                submitButtonTitle={reviewSubmitButtonTitle}
                submitText={reviewEditingCommentTarget ? '更新评论' : '发送评论'}
                idPlaceholder="自定义 ID，例如 icon_png_check"
                messagePlaceholder="评论说明（文件引用请用上方按钮插入）"
                textareaClass="min-h-[140px]"
                onCommentIdChange={setReviewCommentId}
                onCommentMessageChange={setReviewCommentMessage}
                onTagEnabledChange={setReviewCommentTagEnabled}
                onEditorTabChange={setReviewCommentEditorTab}
                onSubmit={() => void submitReviewComment()}
              />

              {reviewEditingCommentTarget ? (
                <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                  <span className="truncate">正在编辑评论 #{reviewEditingCommentTarget.id}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearReviewEditingTarget}>
                    取消编辑
                  </Button>
                </div>
              ) : null}

              {reviewReplyTargetComment ? (
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    正在回复 #{reviewReplyTargetComment.id} · @{reviewReplyTargetComment.user?.login || 'unknown'}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearReviewReplyTarget}>
                    取消回复
                  </Button>
                </div>
              ) : null}

              {!reviewCommentsLoading ? (
                <ReviewCommentTimeline
                  comments={selectedReviewComments}
                  lineLeft={54}
                  showOpenLink
                  showReplyAction
                  showEditAction
                  showDeleteAction
                  avatarRounded="full"
                  avatarBorder
                  onReply={onReviewReplyComment}
                  onEdit={onReviewEditComment}
                  onDelete={onReviewDeleteComment}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={reviewCommentResultDialogOpen} onOpenChange={setReviewCommentResultDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{reviewCommentResultDialogTitle}</DialogTitle>
            <DialogDescription>{reviewCommentResultDialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setReviewCommentResultDialogOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDeleteCommentDialogOpen} onOpenChange={setReviewDeleteCommentDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>确认删除评论</DialogTitle>
            <DialogDescription>删除后不可恢复，请确认是否继续。</DialogDescription>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {reviewDeleteCommentPreviewText}
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDeleteCommentDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => void confirmReviewDeleteComment()}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
