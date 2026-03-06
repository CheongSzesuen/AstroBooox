import { useEffect, useState } from 'react'
import { FolderNotchOpenIcon, UserPlus, Users } from '@phosphor-icons/react'
import { Button } from '@/react/components/ui/button'
import { listRepositoryCollaborators, type RepositoryCollaborator } from '@/utils/githubGitApi'
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

  useEffect(() => {
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

        const collaboratorMap = new Map(collaboratorEntries.map((item) => [item.fullName, item.collaborators]))
        setRepositories(
          baseList.map((repo) => ({
            ...repo,
            collaborators: collaboratorMap.get(repo.fullName) || []
          }))
        )
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '加载仓库失败')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [currentUser, defaultCatalogPath, defaultTargetOwner, defaultTargetRepo, token])

  return (
    <div className="w-full max-w-[1120px] space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">仓库</h2>
        <p className="mt-1 text-sm text-muted-foreground">展示当前账号在发布目录中出现过的资源仓库。</p>
      </div>

      {loading ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">正在加载仓库列表...</div> : null}
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
                <Button size="sm" variant="outline" className="h-8" disabled>
                  <UserPlus size={14} weight="duotone" />
                  邀请协作者（下一批）
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
    </div>
  )
}
