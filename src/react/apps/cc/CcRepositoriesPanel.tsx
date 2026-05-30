import { useEffect, useMemo, useRef, useState } from 'react'
import { FolderNotchOpenIcon, UserPlus, Users } from '@phosphor-icons/react'
import { Button } from '@/react/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'
import { Skeleton } from '@/react/components/ui/skeleton'
import {
  inviteRepositoryCollaborator,
  listRepositoryCollaborators,
  searchGitHubUsers,
  type GitHubUserSearchResult,
  type RepositoryCollaborator,
  type RepositoryCollaboratorPermission
} from '@/utils/githubGitApi'
import { loadOwnedResources, type OwnedResourceEntry } from '@/utils/resourcePublishApi'

type RepositoryListItem = {
  fullName: string
  owner: string
  name: string
  htmlUrl: string
  defaultBranch: string
  latestCommitDate: string
  sources: string[]
  restypes: string[]
  resourceNames: string[]
  collaborators: RepositoryCollaborator[]
}

type InviteTargetRepo = {
  owner: string
  name: string
}

const formatRestypeLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'quickapp') return '快应用'
  if (normalized === 'watchface') return '表盘'
  return value || '-'
}

const formatRestypeLabels = (values: string[]): string => {
  const labels = values.map((item) => formatRestypeLabel(item)).filter(Boolean)
  return labels.length ? labels.join('、') : '-'
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', { hour12: false })
}

const normalizeInviteQuery = (value: string): string => {
  const raw = value.trim().replace(/^@+/, '')
  if (!raw) return ''
  if (raw.includes('://github.com/')) {
    const matched = raw.match(/github\.com\/([^/?#]+)/i)
    return (matched?.[1] || '').trim()
  }
  if (raw.includes('@')) {
    const local = raw.split('@')[0]?.trim() || ''
    return local || raw
  }
  return raw
}

export function CcRepositoriesPanel(props: {
  token: string
  currentUser: string
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
}) {
  const { token, currentUser, defaultTargetOwner, defaultTargetRepo, defaultCatalogPath } = props
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [repositories, setRepositories] = useState<RepositoryListItem[]>([])

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteSearchLoading, setInviteSearchLoading] = useState(false)
  const [inviteSearchError, setInviteSearchError] = useState('')
  const [inviteSearchResults, setInviteSearchResults] = useState<GitHubUserSearchResult[]>([])
  const [inviteTargetRepo, setInviteTargetRepo] = useState<InviteTargetRepo | null>(null)
  const [inviteForm, setInviteForm] = useState<{ username: string; permission: RepositoryCollaboratorPermission }>({
    username: '',
    permission: 'admin'
  })

  const inviteSearchRequestIdRef = useRef(0)
  const inviteSearchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (inviteSearchTimerRef.current) {
        window.clearTimeout(inviteSearchTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        setRepositories([])

        const username = currentUser.trim()
        if (!username) {
          throw new Error('请先校验 Token')
        }

        const items: OwnedResourceEntry[] = await loadOwnedResources({
          token: token.trim(),
          username,
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: 'main',
          catalogPath: defaultCatalogPath.trim()
        })

        if (cancelled) return

        const grouped = new Map<
          string,
          {
            fullName: string
            owner: string
            name: string
            htmlUrl: string
            defaultBranch: string
            latestCommitDate: string
            sources: Set<string>
            restypes: Set<string>
            resourceNames: Set<string>
            collaborators: RepositoryCollaborator[]
          }
        >()

        for (const item of items) {
          const owner = item.repo_owner.trim()
          const repo = item.repo_name.trim()
          if (!owner || !repo) continue
          if (owner.toLowerCase() !== username.toLowerCase()) continue
          const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`
          const existing = grouped.get(key)
          if (!existing) {
            grouped.set(key, {
              fullName: `${owner}/${repo}`,
              owner,
              name: repo,
              htmlUrl: `https://github.com/${owner}/${repo}`,
              defaultBranch: item.repo_commit_hash?.trim() || 'main',
              latestCommitDate: item.commitDate || '',
              sources: new Set([item.source]),
              restypes: new Set([item.restype]),
              resourceNames: new Set(item.name ? [item.name] : []),
              collaborators: []
            })
            continue
          }
          if (item.source) existing.sources.add(item.source)
          if (item.restype) existing.restypes.add(item.restype)
          if (item.name) existing.resourceNames.add(item.name)
          if (item.commitDate && (!existing.latestCommitDate || item.commitDate > existing.latestCommitDate)) {
            existing.latestCommitDate = item.commitDate
            existing.defaultBranch = item.repo_commit_hash?.trim() || existing.defaultBranch
          }
        }

        const baseList = Array.from(grouped.values())
          .map((item) => ({
            fullName: item.fullName,
            owner: item.owner,
            name: item.name,
            htmlUrl: item.htmlUrl,
            defaultBranch: item.defaultBranch,
            latestCommitDate: item.latestCommitDate,
            sources: Array.from(item.sources).sort((a, b) => a.localeCompare(b, 'zh-CN')),
            restypes: Array.from(item.restypes).sort((a, b) => a.localeCompare(b, 'zh-CN')),
            resourceNames: Array.from(item.resourceNames).sort((a, b) => a.localeCompare(b, 'zh-CN')),
            collaborators: []
          }))
          .sort((a, b) => (b.latestCommitDate || '').localeCompare(a.latestCommitDate || ''))

        if (cancelled) return

        const resolvedToken = token.trim()
        if (!resolvedToken || baseList.length === 0) {
          setRepositories(baseList)
          return
        }

        const collaboratorEntries = await Promise.all(
          baseList.map(async (repo) => {
            try {
              const list = await listRepositoryCollaborators({
                token: resolvedToken,
                owner: repo.owner,
                repo: repo.name
              })
              return {
                fullName: repo.fullName,
                collaborators: list.filter((item) => item.login.toLowerCase() !== repo.owner.toLowerCase())
              }
            } catch {
              return {
                fullName: repo.fullName,
                collaborators: [] as RepositoryCollaborator[]
              }
            }
          })
        )

        if (cancelled) return

        const collaboratorMap = new Map(collaboratorEntries.map((item) => [item.fullName, item.collaborators]))
        setRepositories(
          baseList.map((repo) => ({
            ...repo,
            collaborators: collaboratorMap.get(repo.fullName) || []
          }))
        )
      } catch (cause: unknown) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : '加载仓库失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()
    return () => { cancelled = true }
  }, [currentUser, defaultCatalogPath, defaultTargetOwner, defaultTargetRepo, token])

  const inviteDialogTitle = useMemo(() => {
    if (!inviteTargetRepo) return '-'
    return `${inviteTargetRepo.owner}/${inviteTargetRepo.name}`
  }, [inviteTargetRepo])

  const refreshRepositoryCollaborators = async (owner: string, repoName: string): Promise<void> => {
    const resolvedToken = token.trim()
    if (!resolvedToken) return
    try {
      const list = await listRepositoryCollaborators({
        token: resolvedToken,
        owner,
        repo: repoName
      })
      const ownerLower = owner.toLowerCase()
      const filtered = list.filter((item) => item.login.toLowerCase() !== ownerLower)
      setRepositories((prev) =>
        prev.map((item) => {
          if (item.owner === owner && item.name === repoName) {
            return { ...item, collaborators: filtered }
          }
          return item
        })
      )
    } catch {
      // 协作者信息仅用于展示，不阻塞主流程
    }
  }

  const openInviteDialog = (repo: InviteTargetRepo) => {
    setInviteTargetRepo({ owner: repo.owner, name: repo.name })
    setInviteForm({ username: '', permission: 'admin' })
    setInviteError('')
    setInviteSuccess('')
    setInviteSearchError('')
    setInviteSearchResults([])
    setInviteDialogOpen(true)
  }

  const handleInviteDialogOpenChange = (open: boolean) => {
    setInviteDialogOpen(open)
    if (open) return
    setInviteSubmitting(false)
    setInviteError('')
    setInviteSuccess('')
    setInviteSearchLoading(false)
    setInviteSearchError('')
    setInviteSearchResults([])
    if (inviteSearchTimerRef.current) {
      window.clearTimeout(inviteSearchTimerRef.current)
      inviteSearchTimerRef.current = null
    }
  }

  const searchInviteCandidates = async (keyword: string): Promise<void> => {
    const normalizedToken = token.trim()
    const normalized = normalizeInviteQuery(keyword)
    if (!inviteDialogOpen || !normalizedToken || !normalized) {
      setInviteSearchLoading(false)
      setInviteSearchError('')
      setInviteSearchResults([])
      return
    }

    const requestId = inviteSearchRequestIdRef.current + 1
    inviteSearchRequestIdRef.current = requestId

    try {
      setInviteSearchLoading(true)
      setInviteSearchError('')
      const results = await searchGitHubUsers({
        token: normalizedToken,
        query: normalized,
        perPage: 8
      })
      if (requestId !== inviteSearchRequestIdRef.current) return
      setInviteSearchResults(results)
    } catch (cause: unknown) {
      if (requestId !== inviteSearchRequestIdRef.current) return
      setInviteSearchResults([])
      setInviteSearchError(cause instanceof Error ? cause.message : '搜索用户失败')
    } finally {
      if (requestId === inviteSearchRequestIdRef.current) {
        setInviteSearchLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!inviteDialogOpen) return
    if (inviteSearchTimerRef.current) {
      window.clearTimeout(inviteSearchTimerRef.current)
      inviteSearchTimerRef.current = null
    }
    inviteSearchTimerRef.current = window.setTimeout(() => {
      void searchInviteCandidates(inviteForm.username)
    }, 220)
  }, [inviteDialogOpen, inviteForm.username, token])

  const selectInviteCandidate = (user: GitHubUserSearchResult) => {
    setInviteForm((prev) => ({ ...prev, username: user.login }))
    setInviteError('')
    setInviteSearchError('')
    setInviteSearchResults([])
    if (inviteSearchTimerRef.current) {
      window.clearTimeout(inviteSearchTimerRef.current)
      inviteSearchTimerRef.current = null
    }
  }

  const submitInvite = async (): Promise<void> => {
    if (inviteSubmitting) return
    const targetRepo = inviteTargetRepo
    if (!targetRepo) {
      setInviteError('未找到目标仓库')
      return
    }

    const resolvedToken = token.trim()
    if (!resolvedToken) {
      setInviteError('请先登录 GitHub Token')
      return
    }

    const username = normalizeInviteQuery(inviteForm.username)
    if (!username) {
      setInviteError('请先填写协作者用户名')
      return
    }

    try {
      setInviteSubmitting(true)
      setInviteError('')
      setInviteSuccess('')
      const result = await inviteRepositoryCollaborator({
        token: resolvedToken,
        owner: targetRepo.owner,
        repo: targetRepo.name,
        username,
        permission: inviteForm.permission
      })
      if (result.status === 204) {
        setInviteSuccess(`@${username} 已经是协作者`)
        await refreshRepositoryCollaborators(targetRepo.owner, targetRepo.name)
        return
      }
      setInviteSuccess(result.invitationUrl ? `邀请已发送：${result.invitationUrl}` : `已向 @${username} 发送邀请`)
      await refreshRepositoryCollaborators(targetRepo.owner, targetRepo.name)
    } catch (cause: unknown) {
      setInviteError(cause instanceof Error ? cause.message : '邀请失败')
    } finally {
      setInviteSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[1120px] space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">仓库</h2>
        <p className="mt-1 text-sm text-muted-foreground">展示当前账号在发布目录中出现过的资源仓库。</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={`repo-skeleton-${index}`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-64 max-w-full" />
                  <Skeleton className="h-4 w-56 max-w-full" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : null}
      {!loading && !error && repositories.length === 0 ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">暂无可展示仓库</div> : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {repositories.map((repo) => (
            <article key={repo.fullName} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    <FolderNotchOpenIcon size={16} weight="duotone" />
                    {repo.fullName}
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">默认分支：{repo.defaultBranch || '-'} · 来源版本：{repo.sources.join(' + ')}</div>
                </div>
                <Button size="sm" variant="outline" className="h-8" onClick={() => openInviteDialog({ owner: repo.owner, name: repo.name })}>
                  <UserPlus size={14} weight="duotone" />
                  邀请协作者
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span className="text-muted-foreground">最近更新时间</span>
                  <div className="mt-0.5 text-foreground">{formatDate(repo.latestCommitDate)}</div>
                </div>
                <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span className="text-muted-foreground">资源类型</span>
                  <div className="mt-0.5 text-foreground">{formatRestypeLabels(repo.restypes)}</div>
                </div>
                <div className="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span className="text-muted-foreground">资源名称</span>
                  <div className="mt-0.5 text-foreground">{repo.resourceNames.join('、') || '-'}</div>
                </div>
              </div>

              {repo.collaborators.length > 0 ? (
                <div className="mt-3 rounded border border-border bg-muted/20 px-3 py-2">
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users size={13} weight="duotone" />
                    协作者
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {repo.collaborators.map((user) => (
                      <a
                        key={`${repo.fullName}-${user.login}`}
                        href={user.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                      >
                        <img src={user.avatarUrl} alt={user.login} className="h-5 w-5 rounded-full border border-border object-cover" />
                        <span className="font-medium text-foreground">{user.login}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <Dialog open={inviteDialogOpen} onOpenChange={handleInviteDialogOpenChange}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>邀请协作者</DialogTitle>
            <DialogDescription>目标仓库：{inviteDialogTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="invite-username">GitHub 用户名 / 邮箱 / 主页链接</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="invite-username"
                  value={inviteForm.username}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="例如：octocat 或 octocat@example.com"
                  disabled={inviteSubmitting}
                  className="flex-1"
                />
                <Select
                  value={inviteForm.permission}
                  disabled={inviteSubmitting}
                  onValueChange={(value: RepositoryCollaboratorPermission) => setInviteForm((prev) => ({ ...prev, permission: value }))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="权限" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pull">只读（pull）</SelectItem>
                    <SelectItem value="push">读写（push）</SelectItem>
                    <SelectItem value="triage">分流（triage）</SelectItem>
                    <SelectItem value="maintain">维护（maintain）</SelectItem>
                    <SelectItem value="admin">管理员（admin）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/20">
              {inviteSearchLoading ? <div className="px-3 py-2 text-xs text-muted-foreground">搜索中...</div> : null}
              {!inviteSearchLoading && inviteSearchError ? <div className="px-3 py-2 text-xs text-destructive">{inviteSearchError}</div> : null}
              {!inviteSearchLoading && !inviteSearchError && inviteForm.username.trim() && inviteSearchResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">没有找到匹配用户</div>
              ) : null}
              {!inviteSearchLoading && !inviteSearchError && inviteSearchResults.length > 0 ? (
                <ul className="max-h-[220px] overflow-y-auto py-1">
                  {inviteSearchResults.map((user) => (
                    <li key={user.login}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                        onClick={() => selectInviteCandidate(user)}
                      >
                        <img src={user.avatarUrl} alt={user.login} className="h-6 w-6 rounded-full border border-border object-cover" />
                        <span className="text-sm font-medium text-foreground">{user.login}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!inviteSearchLoading && !inviteSearchError && !inviteForm.username.trim() && inviteSearchResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">输入用户名或邮箱后显示候选结果</div>
              ) : null}
            </div>

            {inviteError ? <div className="text-xs text-destructive">{inviteError}</div> : null}
            {!inviteError && inviteSuccess ? <div className="text-xs text-emerald-600 dark:text-emerald-400">{inviteSuccess}</div> : null}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={inviteSubmitting} onClick={() => setInviteDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={inviteSubmitting} onClick={() => void submitInvite()}>
              {inviteSubmitting ? '邀请中...' : '发送邀请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
