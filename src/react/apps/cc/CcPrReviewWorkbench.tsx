import { ClockCounterClockwise, GithubLogo, UserCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'
import { escapeHtml, parseReviewCommentBody, renderCommentMarkdownHtml, renderCommentMarkdownInlineHtml } from '@/utils/reviewComment'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'
import { Switch } from '@/react/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { Textarea } from '@/react/components/ui/textarea'

type ReviewState = 'waiting_review' | 'changes_requested' | 'fixed_waiting'

interface NeedFixItem {
  id: string
  message: string
  fixed: boolean
}

interface ReviewStatusResult {
  state: ReviewState
  items: NeedFixItem[]
}

interface PullListItem {
  number: number
  title: string
  body: string
  author: string
  authorAvatar: string
  createdAt: string
  url: string
  headOwner: string
  headRepo: string
  headRef: string
  status: ReviewState
  review: ReviewStatusResult
}

interface IssueCommentItem {
  id: number
  body?: string
  user?: { login?: string; avatar_url?: string; html_url?: string }
  created_at?: string
  html_url?: string
}

interface PullFileItem {
  sha: string
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  blob_url?: string
  raw_url?: string
  patch?: string
}

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i
const SITE_DEFAULT_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const buildReplyContextBlock = (comment: IssueCommentItem | null): string => {
  if (!comment) return ''
  const login = comment.user?.login || 'unknown'
  const excerpt = (comment.body || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  return [`> Reply-To: #${comment.id} @${login}`, excerpt ? `> ${excerpt}` : ''].filter(Boolean).join('\n')
}

const normalizeCommentId = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')

const deriveReviewStatus = (comments: Array<{ body?: string }>): ReviewStatusResult => {
  const needFixes = new Map<string, string>()
  const fixed = new Set<string>()
  const fixedMessages = new Map<string, string>()

  for (const comment of comments) {
    const body = comment.body?.trim()
    if (!body) continue
    const match = body.match(COMMENT_PATTERN)
    if (!match) continue
    const kind = match[1].toUpperCase()
    const id = match[2].trim()
    const message = (match[3] || '').trim()

    if (kind === 'NEEDFIX') {
      needFixes.set(id, message)
      fixed.delete(id)
      fixedMessages.delete(id)
      continue
    }
    if (kind === 'FIXED' && needFixes.has(id)) {
      fixed.add(id)
      if (message) fixedMessages.set(id, message)
    }
  }

  if (needFixes.size === 0) {
    return { state: 'waiting_review', items: [] }
  }

  const items = Array.from(needFixes.entries()).map(([id, message]) => ({
    id,
    message: fixedMessages.get(id) ? `${message}（${fixedMessages.get(id)}）` : message,
    fixed: fixed.has(id)
  }))

  const hasUnresolved = items.some((item) => !item.fixed)
  return {
    state: hasUnresolved ? 'changes_requested' : 'fixed_waiting',
    items
  }
}

const sortCommentsByTime = (comments: IssueCommentItem[]): IssueCommentItem[] =>
  [...comments].sort((a, b) => {
    const ta = new Date(a.created_at || '').getTime()
    const tb = new Date(b.created_at || '').getTime()
    if (Number.isNaN(ta) || Number.isNaN(tb)) return a.id - b.id
    return ta - tb
  })

const buildCommentPreviewCardHtml = (body: string): string => {
  const parsed = parseReviewCommentBody(body)
  const tagClass =
    parsed.tagType === 'NEEDFIX'
      ? 'border-red-500/40 bg-red-500/15 text-red-700'
      : parsed.tagType === 'FIXED'
        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
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

export function CcPrReviewWorkbench(props: {
  owner: string
  repo: string
  token: string
  initialPrNumber?: number
}) {
  const { owner, repo, token, initialPrNumber = 0 } = props
  const resolvedToken = (token || '').trim() || SITE_DEFAULT_TOKEN

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [pullRequests, setPullRequests] = useState<PullListItem[]>([])
  const [selectedPr, setSelectedPr] = useState<PullListItem | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [prComments, setPrComments] = useState<IssueCommentItem[]>([])
  const [prFiles, setPrFiles] = useState<PullFileItem[]>([])

  const [commentId, setCommentId] = useState('')
  const [commentMessage, setCommentMessage] = useState('')
  const [commentTagEnabled, setCommentTagEnabled] = useState(true)
  const [commentEditorTab, setCommentEditorTab] = useState<'edit' | 'preview'>('edit')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [replyTargetComment, setReplyTargetComment] = useState<IssueCommentItem | null>(null)
  const [editingCommentTarget, setEditingCommentTarget] = useState<IssueCommentItem | null>(null)

  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [resultDialogTitle, setResultDialogTitle] = useState('')
  const [resultDialogMessage, setResultDialogMessage] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetComment, setDeleteTargetComment] = useState<IssueCommentItem | null>(null)

  const canLoad = Boolean(owner.trim() && repo.trim() && resolvedToken)

  const normalizedCommentId = useMemo(() => normalizeCommentId(commentId), [commentId])

  const submitCommentBody = useMemo(() => {
    const bodyParts = [commentMessage.trim(), buildReplyContextBlock(replyTargetComment)].filter(Boolean)
    const plainBody = bodyParts.join('\n').trim()
    if (!commentTagEnabled) return plainBody
    if (!normalizedCommentId) return ''
    return `[ABCC_NEEDFIX_${normalizedCommentId}] ${plainBody}`.trim()
  }, [commentMessage, commentTagEnabled, normalizedCommentId, replyTargetComment])

  const commentBodyPreview = useMemo(() => {
    const bodyParts = [commentMessage.trim(), buildReplyContextBlock(replyTargetComment)].filter(Boolean)
    const plainBody = bodyParts.join('\n').trim()
    if (!commentTagEnabled) return plainBody
    const prefixId = normalizedCommentId || '<填写ID>'
    return `[ABCC_NEEDFIX_${prefixId}] ${plainBody}`.trim()
  }, [commentMessage, commentTagEnabled, normalizedCommentId, replyTargetComment])

  const renderedCommentPreviewHtml = useMemo(() => {
    if (!commentBodyPreview) return '<span class="text-muted-foreground">（这里显示评论内容）</span>'
    return buildCommentPreviewCardHtml(commentBodyPreview)
  }, [commentBodyPreview])

  const canSubmitComment = useMemo(() => {
    if (commentTagEnabled) return Boolean(normalizedCommentId)
    return Boolean(submitCommentBody)
  }, [commentTagEnabled, normalizedCommentId, submitCommentBody])

  const submitButtonTitle = useMemo(() => {
    if (!canSubmitComment) return commentTagEnabled ? '请填写ID' : '请输入评论内容'
    return editingCommentTarget ? '更新现有评论' : ''
  }, [canSubmitComment, commentTagEnabled, editingCommentTarget])

  const deleteCommentPreviewText = useMemo(() => {
    const raw = deleteTargetComment?.body || ''
    const parsed = parseReviewCommentBody(raw)
    const text = (parsed.content || raw).replace(/\s+/g, ' ').trim()
    return text || '（空内容）'
  }, [deleteTargetComment])

  const openResultDialog = (title: string, message: string) => {
    setResultDialogTitle(title)
    setResultDialogMessage(message)
    setResultDialogOpen(true)
  }

  const githubGet = async <T,>(path: string): Promise<T> => {
    try {
      const { rest } = createGitHubClient(resolvedToken)
      const response = await rest.request(`GET ${path}`)
      return response.data as T
    } catch (cause: unknown) {
      const normalized = normalizeGitHubError(cause)
      throw new Error(normalized.message)
    }
  }

  const githubPost = async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
    try {
      const { rest } = createGitHubClient(resolvedToken)
      const response = await rest.request(`POST ${path}`, { data: body })
      return response.data as T
    } catch (cause: unknown) {
      const normalized = normalizeGitHubError(cause)
      throw new Error(normalized.message)
    }
  }

  const githubPatch = async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
    try {
      const { rest } = createGitHubClient(resolvedToken)
      const response = await rest.request(`PATCH ${path}`, { data: body })
      return response.data as T
    } catch (cause: unknown) {
      const normalized = normalizeGitHubError(cause)
      throw new Error(normalized.message)
    }
  }

  const githubDelete = async (path: string): Promise<void> => {
    try {
      const { rest } = createGitHubClient(resolvedToken)
      await rest.request(`DELETE ${path}`)
    } catch (cause: unknown) {
      const normalized = normalizeGitHubError(cause)
      throw new Error(normalized.message)
    }
  }

  const fetchIssueComments = async (prNumber: number): Promise<IssueCommentItem[]> => {
    const comments = await githubGet<IssueCommentItem[]>(
      `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100&sort=updated&direction=desc`
    )
    return sortCommentsByTime(comments)
  }

  const refreshPrCommentsAndStatus = async (targetPr: PullListItem): Promise<void> => {
    const comments = await fetchIssueComments(targetPr.number)
    setPrComments(comments)
    const review = deriveReviewStatus(comments)
    setPullRequests((prev) =>
      prev.map((item) => {
        if (item.number !== targetPr.number) return item
        return { ...item, review, status: review.state }
      })
    )
    setSelectedPr((prev) => {
      if (!prev || prev.number !== targetPr.number) return prev
      return { ...prev, review, status: review.state }
    })
  }

  const loadPrDetails = async (targetPr: PullListItem): Promise<void> => {
    setDetailsLoading(true)
    setDetailsError('')
    try {
      const [pullDetail, comments, files] = await Promise.all([
        githubGet<{ body?: string }>(`/repos/${owner}/${repo}/pulls/${targetPr.number}`),
        fetchIssueComments(targetPr.number),
        githubGet<PullFileItem[]>(`/repos/${owner}/${repo}/pulls/${targetPr.number}/files?per_page=100`)
      ])

      const updatedPr = {
        ...targetPr,
        body: pullDetail.body || targetPr.body,
        review: deriveReviewStatus(comments),
        status: deriveReviewStatus(comments).state
      }

      setSelectedPr(updatedPr)
      setPrComments(comments)
      setPrFiles(files)
      setPullRequests((prev) => prev.map((item) => (item.number === updatedPr.number ? updatedPr : item)))
    } catch (cause: unknown) {
      setDetailsError(cause instanceof Error ? cause.message : '加载 PR 详情失败')
      setPrComments([])
      setPrFiles([])
    } finally {
      setDetailsLoading(false)
    }
  }

  const selectPr = async (targetPr: PullListItem): Promise<void> => {
    setSelectedPr(targetPr)
    await loadPrDetails(targetPr)
  }

  const loadPullRequests = async (preferredPrNumber = 0): Promise<void> => {
    setLoading(true)
    setErrorMessage('')
    try {
      if (!canLoad) {
        throw new Error('请先配置目标仓库与 GitHub Token（支持 .env.local 的 VITE_GITHUB_TOKEN）')
      }

      const pulls = await githubGet<
        Array<{
          number: number
          title: string
          html_url: string
          created_at: string
          body?: string
          user?: { login?: string; avatar_url?: string }
          head?: { ref?: string; repo?: { name?: string; owner?: { login?: string } } }
        }>
      >(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`)

      const list: PullListItem[] = await Promise.all(
        pulls.map(async (pr) => {
          const comments = await fetchIssueComments(pr.number)
          const review = deriveReviewStatus(comments)
          const headOwner = pr.head?.repo?.owner?.login || ''
          const headRepo = pr.head?.repo?.name || ''
          const headRef = pr.head?.ref || 'main'
          return {
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            author: pr.user?.login || 'unknown',
            authorAvatar: pr.user?.avatar_url || '',
            createdAt: pr.created_at,
            url: pr.html_url,
            headOwner,
            headRepo,
            headRef,
            status: review.state,
            review
          }
        })
      )

      const sorted = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      setPullRequests(sorted)
      if (sorted.length === 1) {
        setIsSidebarCollapsed(true)
      }
      if (sorted.length > 0) {
        const preferred = preferredPrNumber > 0 ? sorted.find((item) => item.number === preferredPrNumber) : null
        await selectPr(preferred || sorted[0])
      } else {
        setSelectedPr(null)
        setPrComments([])
        setPrFiles([])
      }
    } catch (cause: unknown) {
      setErrorMessage(cause instanceof Error ? cause.message : '加载 PR 失败')
      setPullRequests([])
      setSelectedPr(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPullRequests(initialPrNumber)
  }, [initialPrNumber, owner, repo, token])

  const refreshSelectedPrDetails = async (): Promise<void> => {
    if (!selectedPr) return
    await loadPrDetails(selectedPr)
  }

  const clearReplyTarget = () => {
    setReplyTargetComment(null)
  }

  const clearEditingComment = () => {
    setEditingCommentTarget(null)
  }

  const onReplyComment = (comment: IssueCommentItem) => {
    setReplyTargetComment(comment)
    setEditingCommentTarget(null)
    setCommentEditorTab('edit')
  }

  const onEditComment = (comment: IssueCommentItem) => {
    const parsed = parseReviewCommentBody(comment.body || '')
    setCommentTagEnabled(Boolean(parsed.tagId))
    setCommentId(parsed.tagId || `comment_${comment.id}`)
    setCommentMessage(parsed.content)
    setEditingCommentTarget(comment)
    setReplyTargetComment(null)
    setCommentEditorTab('edit')
  }

  const onDeleteComment = (comment: IssueCommentItem) => {
    setDeleteTargetComment(comment)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteComment = async (): Promise<void> => {
    if (!selectedPr || !deleteTargetComment) return
    const target = deleteTargetComment
    try {
      await githubDelete(`/repos/${owner}/${repo}/issues/comments/${target.id}`)
      if (editingCommentTarget?.id === target.id) clearEditingComment()
      if (replyTargetComment?.id === target.id) clearReplyTarget()
      setDeleteDialogOpen(false)
      setDeleteTargetComment(null)
      setPrComments((prev) => prev.filter((item) => item.id !== target.id))
      await refreshPrCommentsAndStatus(selectedPr)
      openResultDialog('删除成功', `评论 #${target.id} 已删除。`)
    } catch (cause: unknown) {
      openResultDialog('删除失败', cause instanceof Error ? cause.message : '评论删除失败')
    }
  }

  const submitPresetComment = async (): Promise<void> => {
    if (!selectedPr) return
    const body = submitCommentBody
    if (!body) {
      openResultDialog('发送失败', commentTagEnabled ? '评论 ID 不能为空' : '评论内容不能为空')
      return
    }

    setCommentSubmitting(true)
    try {
      if (editingCommentTarget) {
        await githubPatch<IssueCommentItem>(`/repos/${owner}/${repo}/issues/comments/${editingCommentTarget.id}`, { body })
        setCommentMessage('')
        setCommentEditorTab('edit')
        clearReplyTarget()
        clearEditingComment()
        await refreshPrCommentsAndStatus(selectedPr)
        openResultDialog('更新成功', '评论已更新。')
      } else {
        await githubPost<IssueCommentItem>(`/repos/${owner}/${repo}/issues/${selectedPr.number}/comments`, { body })
        setCommentMessage('')
        setCommentEditorTab('edit')
        clearReplyTarget()
        await refreshPrCommentsAndStatus(selectedPr)
        openResultDialog('发送成功', '评论已发送。')
      }
    } catch (cause: unknown) {
      openResultDialog('发送失败', cause instanceof Error ? cause.message : '评论发送失败')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const sidebarClass = useMemo(
    () =>
      [
        'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
        isSidebarCollapsed ? 'w-full p-2.5 lg:w-[5.2rem] lg:p-2.5' : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
      ].join(' '),
    [isSidebarCollapsed]
  )

  return (
    <div className="w-full py-1 md:py-2">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
        <aside className={sidebarClass}>
          <div className={`mb-2 hidden items-center border-b border-border pb-2 lg:flex ${isSidebarCollapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2'}`}>
            {!isSidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">Pull Requests</p>
              </div>
            ) : null}
            <div className={`flex items-center gap-1.5 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
              {!isSidebarCollapsed ? (
                <Button disabled={loading || !canLoad} size="sm" variant="outline" onClick={() => void loadPullRequests(initialPrNumber)}>
                  <ClockCounterClockwise size={14} weight="duotone" />
                  <span>{loading ? '加载中' : '刷新'}</span>
                </Button>
              ) : null}
              <button
                type="button"
                title={isSidebarCollapsed ? '展开边栏' : '收起边栏'}
                className={`inline-flex h-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${isSidebarCollapsed ? 'w-8' : 'w-[72px] gap-1.5 px-2'}`}
                aria-label="折叠或展开边栏"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              >
                {!isSidebarCollapsed ? <span className="shrink-0 whitespace-nowrap text-xs">收起</span> : null}
                <span className={`text-xs transition-transform duration-200 ${isSidebarCollapsed ? 'rotate-180' : ''}`}>»</span>
              </button>
            </div>
          </div>

          {errorMessage ? <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{errorMessage}</div> : null}

          {pullRequests.length === 0 && !loading && !errorMessage ? (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">暂无可审核 PR</div>
          ) : null}

          <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-[1023px]:max-h-[20rem]">
            {pullRequests.map((item) => (
              <button
                key={item.number}
                type="button"
                className={`group flex items-center rounded-lg border text-left transition-colors ${
                  selectedPr?.number === item.number
                    ? isSidebarCollapsed
                      ? 'mx-auto h-12 w-12 justify-center p-0.5 border-border bg-muted shadow-sm'
                      : 'w-full gap-2.5 px-2.5 py-2 border-border bg-muted shadow-sm'
                    : isSidebarCollapsed
                      ? 'mx-auto h-12 w-12 justify-center p-0.5 border-transparent hover:bg-accent'
                      : 'w-full gap-2.5 px-2.5 py-2 border-transparent hover:bg-accent'
                }`}
                onClick={() => void selectPr(item)}
              >
                {item.authorAvatar ? (
                  <img src={item.authorAvatar} className={`${isSidebarCollapsed ? 'h-10 w-10 rounded-md' : 'h-8 w-8 rounded-md'} shrink-0 object-cover object-center`} loading="lazy" />
                ) : (
                  <div className={`${isSidebarCollapsed ? 'h-10 w-10 rounded-md' : 'h-8 w-8 rounded-md'} inline-flex shrink-0 items-center justify-center border border-border bg-muted/30`}>
                    <UserCircle size={16} weight="duotone" className="text-muted-foreground" />
                  </div>
                )}

                {!isSidebarCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-foreground">#{item.number} {item.title}</div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{item.author}</span>
                      <span>{item.status === 'changes_requested' ? '需修复' : item.status === 'fixed_waiting' ? '待复审' : '待审核'}</span>
                    </div>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {!selectedPr ? (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">请先从左侧选择一个 PR</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">#{selectedPr.number} {selectedPr.title}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">Open</Badge>
                        <span className="inline-flex min-w-0 items-center gap-2">
                          {selectedPr.authorAvatar ? (
                            <img src={selectedPr.authorAvatar} className="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" />
                          ) : (
                            <UserCircle size={16} weight="duotone" />
                          )}
                          <span className="truncate font-medium text-foreground">{selectedPr.author}</span>
                          <span className="shrink-0">opened {formatDate(selectedPr.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" disabled={detailsLoading} onClick={() => void refreshSelectedPrDetails()}>
                        <ClockCounterClockwise size={16} weight="bold" />
                        刷新
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 px-3">
                        <a href={selectedPr.url} target="_blank" rel="noopener noreferrer">
                          <GithubLogo size={16} weight="duotone" />
                          GitHub
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">审核评论</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {detailsError ? <div className="text-xs text-destructive">{detailsError}</div> : null}
                  {detailsLoading ? <div className="text-xs text-muted-foreground">正在加载文件变更...</div> : null}

                  <div className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <LabelledSwitch label="启用 ABCC 标签" checked={commentTagEnabled} onCheckedChange={setCommentTagEnabled} />
                      <div className="text-xs text-muted-foreground">文件定位器下一批接入</div>
                    </div>

                    {commentTagEnabled ? (
                      <div className="space-y-1.5">
                        <Input
                          value={commentId}
                          onChange={(event) => setCommentId(event.target.value)}
                          placeholder="自定义 ID，例如 icon_png_check"
                        />
                      </div>
                    ) : null}

                    <Textarea
                      id="review-comment-message"
                      value={commentMessage}
                      onChange={(event) => setCommentMessage(event.target.value)}
                      placeholder="评论说明（支持 Markdown）"
                      className="min-h-[140px]"
                    />

                    <Tabs value={commentEditorTab} onValueChange={(value) => setCommentEditorTab(value as 'edit' | 'preview')}>
                      <TabsList className="grid w-[180px] grid-cols-2">
                        <TabsTrigger value="edit">编辑</TabsTrigger>
                        <TabsTrigger value="preview">预览</TabsTrigger>
                      </TabsList>
                      <TabsContent value="edit" className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        评论将以 Markdown 渲染。
                      </TabsContent>
                      <TabsContent value="preview" className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderedCommentPreviewHtml }} />
                      </TabsContent>
                    </Tabs>

                    {editingCommentTarget ? (
                      <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                        <span className="truncate">正在编辑评论 #{editingCommentTarget.id}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearEditingComment}>
                          取消编辑
                        </Button>
                      </div>
                    ) : null}

                    {replyTargetComment ? (
                      <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        <span className="truncate">正在回复 #{replyTargetComment.id} · @{replyTargetComment.user?.login || 'unknown'}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={clearReplyTarget}>
                          取消回复
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">{submitButtonTitle}</span>
                      <Button disabled={commentSubmitting || !canSubmitComment} onClick={() => void submitPresetComment()}>
                        {commentSubmitting ? '提交中...' : editingCommentTarget ? '更新评论' : '发送评论'}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-1 text-xs font-medium text-muted-foreground">最近评论</div>
                  <div className="space-y-2">
                    {prComments.length === 0 ? <div className="rounded-md border border-border bg-muted/10 px-3 py-3 text-xs text-muted-foreground">暂无评论</div> : null}
                    {prComments.map((comment) => {
                      const parsed = parseReviewCommentBody(comment.body || '')
                      const tagTone =
                        parsed.tagType === 'NEEDFIX'
                          ? 'border-red-500/40 bg-red-500/10 text-red-700'
                          : parsed.tagType === 'FIXED'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                            : 'border-border bg-muted/20 text-muted-foreground'

                      return (
                        <article key={comment.id} data-review-comment-id={comment.id} className="rounded-md border border-border bg-card p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                              {comment.user?.avatar_url ? (
                                <img src={comment.user.avatar_url} className="h-6 w-6 rounded-full object-cover" loading="lazy" />
                              ) : (
                                <UserCircle size={16} weight="duotone" />
                              )}
                              <span className="font-medium text-foreground">{comment.user?.login || 'unknown'}</span>
                              <span>#{comment.id}</span>
                              <span>{formatDate(comment.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {comment.html_url ? (
                                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                                  <a href={comment.html_url} target="_blank" rel="noopener noreferrer">打开</a>
                                </Button>
                              ) : null}
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onReplyComment(comment)}>
                                回复
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEditComment(comment)}>
                                编辑
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onDeleteComment(comment)}>
                                删除
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {parsed.tagId ? <span className={`rounded border px-2 py-0.5 ${tagTone}`}>{parsed.tagType} · {parsed.tagId}</span> : null}
                            {parsed.replyTarget ? <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-muted-foreground">回复 {parsed.replyTarget}</span> : null}
                          </div>

                          {parsed.replyExcerpt ? <blockquote className="mt-2 rounded border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{parsed.replyExcerpt}</blockquote> : null}

                          <div
                            className="prose prose-sm dark:prose-invert mt-2 max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderCommentMarkdownHtml(parsed.content || '(空内容)') }}
                          />
                        </article>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">变更文件（{prFiles.length}）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {prFiles.length === 0 ? <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">暂无文件变更</div> : null}
                  {prFiles.slice(0, 30).map((file) => (
                    <div key={file.sha} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                      <div className="font-medium text-foreground">{file.filename}</div>
                      <div className="mt-1 text-muted-foreground">
                        {file.status} · +{file.additions} / -{file.deletions}
                      </div>
                    </div>
                  ))}
                  {prFiles.length > 30 ? <div className="text-xs text-muted-foreground">仅显示前 30 个文件，完整检查将在下一批接入文件定位器。</div> : null}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{resultDialogTitle}</DialogTitle>
            <DialogDescription>{resultDialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>确认删除评论</DialogTitle>
            <DialogDescription>删除后不可恢复，请确认是否继续。</DialogDescription>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{deleteCommentPreviewText}</div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => void confirmDeleteComment()}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LabelledSwitch(props: { label: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  const { label, checked, onCheckedChange } = props
  return (
    <div className="inline-flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} aria-label={label} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
