import {
  ArrowBendDownRight,
  ArrowsClockwise,
  CaretDoubleRight,
  CaretDown,
  CaretRight,
  ChartLineUp,
  Check,
  Circle,
  File,
  Folder,
  GitDiff,
  GitPullRequest,
  GithubLogo,
  Info,
  MagnifyingGlass,
  MinusSquare,
  PlusSquare
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/dateUtils'
import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'

type TabType = 'files' | 'analysis'

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

interface PullRequest {
  id: number
  number: number
  title: string
  user: GitHubUser
  created_at: string
  html_url: string
  head: {
    sha: string
    label: string
  }
  base: {
    label: string
  }
  commits?: number
  state: string
}

interface FileChange {
  filename: string
  status: string
  changes: number
  patch?: string
  contents_url: string
}

interface CSVChange {
  appName: string
  iconUrl: string
  previewUrl: string
  type: string
  tags: string
  supportedDevices: string
  resourceFile: string
  paidType: string
}

interface ResourceChange extends Record<string, unknown> {
  manifest_ver: number
  repo_url: string
}

interface AnalyzedData {
  csvChange?: CSVChange
  resourceChange?: ResourceChange
}

interface ManifestAuthor {
  name: string
  author_url: string
}

interface ManifestItem {
  name: string
  description: string
  preview: string[]
  icon: string
  source_url: string
  author: ManifestAuthor[]
}

interface ManifestDownload {
  version?: string
  file_name?: string
}

interface ManifestData {
  item: ManifestItem
  downloads: Record<string, ManifestDownload>
}

interface RepoData {
  repo_url: string
}

interface PullRequestApiItem {
  id?: number
  number?: number
  title?: string
  user?: {
    login?: string
    avatar_url?: string
    html_url?: string
  }
  created_at?: string
  html_url?: string
  head?: {
    sha?: string
    label?: string
  }
  base?: {
    label?: string
  }
  commits?: number
  state?: string
}

interface GitHubFileContentResponse {
  content?: string
}

type GitHubGetOptions = {
  params?: Record<string, unknown>
}

type GitHubGetFn = <T>(pathOrUrl: string, options?: GitHubGetOptions) => Promise<T>

const DEFAULT_REPO_OWNER = 'AstralSightStudios'
const DEFAULT_REPO_NAME = 'AstroBox-Repo'
const SITE_DEFAULT_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''
const GITHUB_TOKEN_SETUP_HINT = '当前未检测到 GitHub Token，请配置 .env.local 的 VITE_GITHUB_TOKEN 或在会话中提供 token。'

const decodeBase64Utf8 = (base64: string): string => {
  const normalized = base64.replace(/\n/g, '')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '')

const isDataFile = (filename: string): boolean => filename.endsWith('.csv') || (filename.includes('resources/') && filename.endsWith('.json'))

const avatarCache = new Map<string, string>()

const getOptimizedAvatarUrl = (avatarUrl: string, size: number): string => {
  if (!avatarUrl) return 'https://github.com/ghost.png'
  if (!avatarUrl.includes('githubusercontent.com')) return avatarUrl
  return `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}s=${size}&q=70`
}

const getAvatarCacheKey = (login: string, size: number): string => `${login}_${size}`

const getCachedAvatarUrl = (login: string, avatarUrl: string, size: number): string => {
  const optimized = getOptimizedAvatarUrl(avatarUrl, size)
  if (!login) return optimized

  const cacheKey = getAvatarCacheKey(login, size)
  if (avatarCache.has(cacheKey)) {
    return avatarCache.get(cacheKey) as string
  }

  try {
    const stored = localStorage.getItem(`avatar_${cacheKey}`)
    if (stored) {
      avatarCache.set(cacheKey, stored)
      return stored
    }
  } catch {
    // ignore storage read failure
  }

  avatarCache.set(cacheKey, optimized)
  return optimized
}

const cacheAvatarUrl = (login: string, avatarUrl: string, size: number): void => {
  if (!login) return
  const optimized = getOptimizedAvatarUrl(avatarUrl, size)
  const cacheKey = getAvatarCacheKey(login, size)
  avatarCache.set(cacheKey, optimized)
  try {
    localStorage.setItem(`avatar_${cacheKey}`, optimized)
  } catch {
    // ignore storage write failure
  }
}

const getTimeAgo = (dateString: string): string => {
  const now = Date.now()
  const created = new Date(dateString).getTime()
  const diffInSeconds = Math.max(0, Math.floor((now - created) / 1000))

  if (diffInSeconds < 60) return `${diffInSeconds} 秒前`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} 分钟前`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} 小时前`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} 天前`
}

const getFileCardId = (filename: string): string => `file-card-${filename.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const getStatusText = (status: string): string => {
  switch (status) {
    case 'added':
      return 'Added'
    case 'removed':
      return 'Removed'
    case 'renamed':
      return 'Renamed'
    case 'modified':
      return 'Modified'
    default:
      return status
  }
}

const normalizeRepoPath = (repoUrl: string): string =>
  repoUrl
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(escape(value))
  } catch {
    return value
  }
}

const createDefaultManifest = (): ManifestData => ({
  item: {
    name: '获取失败',
    description: '无法加载manifest.json',
    preview: [],
    icon: '',
    source_url: '',
    author: []
  },
  downloads: {}
})

const processManifestData = (manifest: unknown): ManifestData => {
  const root = manifest && typeof manifest === 'object' ? (manifest as Record<string, unknown>) : {}
  const item = root.item && typeof root.item === 'object' ? (root.item as Record<string, unknown>) : {}
  const authorRaw = Array.isArray(item.author) ? item.author : []

  const author = authorRaw
    .map((entry) => {
      const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
      return {
        name: safeDecode(toStringValue(row.name)),
        author_url: toStringValue(row.author_url)
      }
    })
    .filter((entry) => entry.name || entry.author_url)

  const previewRaw = Array.isArray(item.preview) ? item.preview : []
  const downloadsRaw = root.downloads && typeof root.downloads === 'object' ? (root.downloads as Record<string, ManifestDownload>) : {}

  return {
    item: {
      name: safeDecode(toStringValue(item.name)),
      description: safeDecode(toStringValue(item.description)),
      preview: previewRaw.map((entry) => toStringValue(entry)).filter(Boolean),
      icon: toStringValue(item.icon),
      source_url: toStringValue(item.source_url),
      author
    },
    downloads: downloadsRaw
  }
}

const analyzeCSVFile = (file: FileChange, content: string): CSVChange | null => {
  try {
    if (file.status === 'added') {
      const lines = content.split('\n')
      if (lines.length > 1) {
        const line = lines[1].trim()
        if (!line) return null
        const [name, icon, cover, restype, tags, devices, path, paid_type] = line.split(',')
        return {
          appName: name || '',
          iconUrl: icon || '',
          previewUrl: cover || '',
          type: restype || '',
          tags: tags || '',
          supportedDevices: devices || '',
          resourceFile: path || '',
          paidType: paid_type || ''
        }
      }
      return null
    }

    if (!file.patch) return null

    const patchLines = file.patch.split('\n')
    const addedLines: Array<{ line: string; originalLineNumber: number }> = []
    let lineNumber = 0
    let startLine = 0

    for (const line of patchLines) {
      if (!line.startsWith('@@')) continue
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?(\d*) @@/)
      if (match) {
        startLine = Number.parseInt(match[1], 10) - 1
      }
      break
    }

    for (const line of patchLines) {
      if (line.startsWith('+') && !line.startsWith('+++') && line.includes(',')) {
        addedLines.push({
          line: line.slice(1),
          originalLineNumber: startLine + lineNumber
        })
      }
      if (!line.startsWith('+') && !line.startsWith('-')) {
        lineNumber += 1
      }
    }

    const contentLines = content.split('\n')
    const trulyAddedLines = addedLines.filter(
      (added) => !contentLines[added.originalLineNumber] || contentLines[added.originalLineNumber].trim() !== added.line.trim()
    )

    if (trulyAddedLines.length === 0) return null

    const addedLine = trulyAddedLines[trulyAddedLines.length - 1].line
    const [name, icon, cover, restype, tags, devices, path, paid_type] = addedLine.split(',')
    return {
      appName: name || '',
      iconUrl: icon || '',
      previewUrl: cover || '',
      type: restype || '',
      tags: tags || '',
      supportedDevices: devices || '',
      resourceFile: path || '',
      paidType: paid_type || ''
    }
  } catch {
    return null
  }
}

const analyzeResourceFile = (content: string): ResourceChange | null => {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return {
      manifest_ver: typeof parsed.manifest_ver === 'number' ? parsed.manifest_ver : 1,
      repo_url: toStringValue(parsed.repo_url),
      ...parsed
    }
  } catch {
    return null
  }
}

const fetchViaGitHubApiWithRef = async (
  owner: string,
  repo: string,
  githubGet: GitHubGetFn,
  ref?: string
): Promise<ManifestData> => {
  const data = await githubGet<GitHubFileContentResponse | string | Record<string, unknown>>(
    `/repos/${owner}/${repo}/contents/manifest.json`,
    ref ? { params: { ref } } : undefined
  )

  if (typeof data === 'string') {
    return processManifestData(JSON.parse(data))
  }

  if (data && typeof data === 'object' && 'content' in data && typeof data.content === 'string') {
    const decoded = decodeBase64Utf8(data.content)
    return processManifestData(JSON.parse(decoded))
  }

  return processManifestData(data)
}

const fetchRepoManifestData = async (repoUrl: string, githubGet: GitHubGetFn): Promise<ManifestData> => {
  const repoPath = normalizeRepoPath(repoUrl)
  const [owner, repo] = repoPath.split('/')
  if (!owner || !repo) {
    throw new Error(`仓库地址无效: ${repoUrl}`)
  }

  const refs: Array<string | undefined> = [undefined, 'main', 'master', 'HEAD']
  for (const ref of refs) {
    try {
      return await fetchViaGitHubApiWithRef(owner, repo, githubGet, ref)
    } catch {
      continue
    }
  }

  throw new Error('所有获取manifest的方案都失败了')
}

const analyzeFile = async (file: FileChange, githubGet: GitHubGetFn): Promise<AnalyzedData> => {
  const data = await githubGet<GitHubFileContentResponse | string | Record<string, unknown>>(file.contents_url)

  let content = ''
  if (typeof data === 'string') {
    content = data
  } else if (data && typeof data === 'object' && 'content' in data && typeof data.content === 'string') {
    content = decodeBase64Utf8(data.content)
  } else {
    content = JSON.stringify(data)
  }

  const result: AnalyzedData = {}
  if (file.filename.endsWith('.csv')) {
    const csvChange = analyzeCSVFile(file, content)
    if (csvChange) {
      result.csvChange = csvChange
    }
  }

  if (file.filename.includes('resources/') && file.filename.endsWith('.json')) {
    const resourceChange = analyzeResourceFile(content)
    if (resourceChange) {
      result.resourceChange = resourceChange
    }
  }

  return result
}

interface SidebarProps {
  pullRequests: PullRequest[]
  selectedPR: PullRequest | null
  loading: boolean
  isCollapsed: boolean
  onSelect: (pr: PullRequest) => void
  onToggle: () => void
  onRefresh: () => void
}

function PullRequestSidebar(props: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
        props.isCollapsed ? 'w-full p-2.5 lg:w-[5.2rem] lg:p-2.5' : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
      )}
    >
      <div
        className={cn(
          'mb-2 hidden items-center border-b border-border pb-2 lg:flex',
          props.isCollapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2'
        )}
      >
        {!props.isCollapsed ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">Pull Requests</p>
            <p className="text-xs text-muted-foreground">{props.pullRequests.length} open</p>
          </div>
        ) : null}

        <button
          type="button"
          title={props.isCollapsed ? '展开边栏' : '收起边栏'}
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            props.isCollapsed ? 'w-8' : 'gap-1.5 px-2.5'
          )}
          aria-label="折叠或展开边栏"
          onClick={props.onToggle}
        >
          {!props.isCollapsed ? <span className="text-xs">收起</span> : null}
          <CaretDoubleRight size={16} weight="bold" className={cn('transition-transform duration-200', props.isCollapsed ? 'rotate-180' : 'rotate-0')} />
        </button>
      </div>

      {props.loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中...</div>
      ) : null}

      {!props.loading && props.pullRequests.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center text-sm text-muted-foreground">
          <p>没有找到 Pull Request</p>
          <Button variant="secondary" size="sm" onClick={props.onRefresh}>
            重试
          </Button>
        </div>
      ) : null}

      {!props.loading && props.pullRequests.length > 0 ? (
        <div className="max-[1023px]:max-h-[20rem] flex-1 overflow-y-auto pr-1">
          {props.pullRequests.map((pr) => {
            const isActive = props.selectedPR?.id === pr.id
            return (
              <button
                key={pr.id}
                type="button"
                className={cn(
                  'group flex items-center rounded-lg border text-left transition-colors',
                  props.isCollapsed ? 'mx-auto h-10 w-10 justify-center p-1.5' : 'w-full gap-2.5 px-2.5 py-2',
                  isActive ? 'border-border bg-muted shadow-sm' : 'border-transparent hover:bg-accent'
                )}
                onClick={() => props.onSelect(pr)}
              >
                <img
                  src={getCachedAvatarUrl(pr.user.login, pr.user.avatar_url, 64)}
                  className="h-8 w-8 shrink-0 rounded-md object-cover"
                  loading="lazy"
                  alt={pr.user.login}
                  onLoad={() => cacheAvatarUrl(pr.user.login, pr.user.avatar_url, 64)}
                />

                {!props.isCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">#{pr.number} {pr.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">by {pr.user.login}</span>
                      <span>{formatDate(pr.created_at)}</span>
                    </div>
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </aside>
  )
}

interface PullRequestHeaderProps {
  pr: PullRequest
  onRefresh: () => void
}

function PullRequestHeader(props: PullRequestHeaderProps) {
  const timeAgo = useMemo(() => getTimeAgo(props.pr.created_at), [props.pr.created_at])

  return (
    <header className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <h1 className="min-w-0 break-words text-xl font-semibold leading-tight text-foreground md:text-2xl">{props.pr.title}</h1>
            <span className="text-sm font-medium text-muted-foreground md:text-base">#{props.pr.number}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge variant="secondary" className="h-6 gap-1.5 rounded-full px-2.5 text-xs">
              <GitPullRequest size={14} weight="duotone" className="shrink-0" />
              Open
            </Badge>

            <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <img
                src={getCachedAvatarUrl(props.pr.user.login, props.pr.user.avatar_url, 40)}
                className="h-6 w-6 shrink-0 rounded-full object-cover"
                loading="lazy"
                alt={props.pr.user.login}
                onLoad={() => cacheAvatarUrl(props.pr.user.login, props.pr.user.avatar_url, 40)}
              />
              <a href={props.pr.user.html_url} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-foreground hover:underline">
                {props.pr.user.login}
              </a>
              <span className="shrink-0">opened {timeAgo}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 px-3"
            onClick={props.onRefresh}
            title="刷新数据"
            aria-label="刷新数据"
          >
            <ArrowsClockwise size={16} weight="bold" />
            刷新
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 px-3"
            title="在 GitHub 查看 PR"
            aria-label="在 GitHub 查看 PR"
          >
            <a href={props.pr.html_url} target="_blank" rel="noopener noreferrer">
              <GithubLogo size={16} weight="duotone" />
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

interface PullRequestTabsProps {
  activeTab: TabType
  analyzedData: AnalyzedData | null
  changedFilesCount: number
  onChange: (tab: TabType) => void
}

function PullRequestTabs(props: PullRequestTabsProps) {
  return (
    <Tabs
      value={props.activeTab}
      className="mb-4"
      onValueChange={(value) => {
        if (value === 'analysis' || value === 'files') {
          props.onChange(value)
        }
      }}
    >
      <TabsList className="h-auto w-full justify-start gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <TabsTrigger value="analysis" className="h-9 shrink-0 px-3 text-xs md:text-sm">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <ChartLineUp size={16} weight="duotone" />
            <span>Analysis</span>
            {props.analyzedData ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5">
                1
              </Badge>
            ) : null}
          </span>
        </TabsTrigger>

        <TabsTrigger value="files" className="h-9 shrink-0 px-3 text-xs md:text-sm">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <GitDiff size={16} weight="duotone" />
            <span>Files changed</span>
            {props.changedFilesCount > 0 ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center rounded-full px-1.5">
                {props.changedFilesCount}
              </Badge>
            ) : null}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

interface TreeNode {
  name: string
  path: string
  folders: Map<string, TreeNode>
  files: FileChange[]
}

type DisplayItem =
  | {
      type: 'folder'
      path: string
      label: string
      depth: number
    }
  | {
      type: 'file'
      file: FileChange
      label: string
      depth: number
    }

const createTreeNode = (name: string, path: string): TreeNode => ({
  name,
  path,
  folders: new Map<string, TreeNode>(),
  files: []
})

const getFileLabel = (filename: string): string => {
  const segments = filename.split('/')
  return segments[segments.length - 1] || filename
}

const sortFiles = (a: FileChange, b: FileChange): number => a.filename.localeCompare(b.filename)

const buildTree = (files: FileChange[]): TreeNode => {
  const root = createTreeNode('', '')

  for (const file of files) {
    const segments = file.filename.split('/')

    if (segments.length <= 1) {
      root.files.push(file)
      continue
    }

    let currentNode = root
    let currentPath = ''

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index]
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      if (!currentNode.folders.has(segment)) {
        currentNode.folders.set(segment, createTreeNode(segment, currentPath))
      }

      currentNode = currentNode.folders.get(segment) as TreeNode
    }

    currentNode.files.push(file)
  }

  return root
}

const flattenTree = (node: TreeNode, depth: number, forceExpand: boolean, opened: Set<string>, items: DisplayItem[]): void => {
  const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name))

  for (const folder of folders) {
    items.push({
      type: 'folder',
      path: folder.path,
      label: folder.name,
      depth
    })

    if (forceExpand || opened.has(folder.path)) {
      flattenTree(folder, depth + 1, forceExpand, opened, items)
    }
  }

  const files = [...node.files].sort(sortFiles)
  for (const file of files) {
    items.push({
      type: 'file',
      file,
      label: getFileLabel(file.filename),
      depth
    })
  }
}

interface FileTreePanelProps {
  changedFiles: FileChange[]
  selectedFilePath: string
  onFileSelected: (file: FileChange) => void
}

function FileTreePanel(props: FileTreePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    const topLevelFolders = new Set<string>()
    for (const file of props.changedFiles) {
      const parts = file.filename.split('/')
      if (parts.length > 1 && parts[0]) {
        topLevelFolders.add(parts[0])
      }
    }
    setOpenFolders(topLevelFolders)
  }, [props.changedFiles])

  const displayItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filesToProcess = query
      ? props.changedFiles.filter((file) => file.filename.toLowerCase().includes(query))
      : props.changedFiles

    if (filesToProcess.length === 0) {
      return [] as DisplayItem[]
    }

    const tree = buildTree(filesToProcess)
    const items: DisplayItem[] = []
    flattenTree(tree, 0, Boolean(query), openFolders, items)
    return items
  }, [openFolders, props.changedFiles, searchQuery])

  const toggleFolder = useCallback((folderPath: string) => {
    setOpenFolders((current) => {
      const next = new Set(current)
      if (next.has(folderPath)) {
        const toRemove = Array.from(next).filter((path) => path === folderPath || path.startsWith(`${folderPath}/`))
        for (const path of toRemove) {
          next.delete(path)
        }
      } else {
        next.add(folderPath)
      }
      return next
    })
  }, [])

  const getStatusIcon = (status: string) => {
    if (status === 'added') {
      return <PlusSquare size={15} weight="fill" className="shrink-0 text-foreground" />
    }
    if (status === 'removed') {
      return <MinusSquare size={15} weight="fill" className="shrink-0 text-foreground" />
    }
    if (status === 'renamed') {
      return <ArrowBendDownRight size={15} weight="fill" className="shrink-0 text-foreground" />
    }
    return <Circle size={15} weight="fill" className="shrink-0 text-muted-foreground" />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-8 pl-8 text-xs"
            placeholder="Filter changed files"
            aria-label="Filter changed files"
            autoComplete="off"
          />
          <MagnifyingGlass
            aria-hidden="true"
            size={15}
            weight="bold"
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      <nav aria-label="File Tree Navigation" className="max-h-[18rem] overflow-y-auto px-3 py-3 lg:max-h-[calc(100vh-16rem)]">
        <ul className="space-y-1" role="tree" aria-label="File Tree">
          {displayItems.map((item) => {
            if (item.type === 'folder') {
              const isOpen = openFolders.has(item.path)
              return (
                <li
                  key={`folder-${item.path}`}
                  role="treeitem"
                  aria-level={item.depth + 1}
                  aria-expanded={isOpen}
                  data-depth={item.depth}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors',
                      isOpen ? 'bg-muted/60' : 'hover:bg-accent'
                    )}
                    style={{ paddingLeft: `${0.75 + item.depth * 1}rem` }}
                    onClick={() => toggleFolder(item.path)}
                  >
                    <CaretDown
                      aria-hidden="true"
                      size={15}
                      weight="bold"
                      className={cn('shrink-0 text-muted-foreground transition-transform duration-200', !isOpen ? '-rotate-90' : '')}
                    />
                    <Folder aria-label="Directory" aria-hidden="true" size={15} weight="fill" className="shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            }

            return (
              <li key={`file-${item.file.filename}`} role="treeitem" aria-level={item.depth + 1} data-depth={item.depth}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors',
                    props.selectedFilePath === item.file.filename ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
                  )}
                  style={{ paddingLeft: `${0.75 + item.depth * 1}rem` }}
                  onClick={() => props.onFileSelected(item.file)}
                >
                  <File aria-label="File" aria-hidden="true" size={15} weight="duotone" className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {getStatusIcon(item.file.status)}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

interface GithubStyleDiffViewProps {
  file: FileChange
}

function GithubStyleDiffView(props: GithubStyleDiffViewProps) {
  const diffData = useMemo(() => {
    if (!props.file.patch) {
      return {
        lines: [] as string[],
        oldLineNumbers: [] as Array<number | ''>,
        newLineNumbers: [] as Array<number | ''>
      }
    }

    const lines = props.file.patch.split('\n')
    const oldLineNumbers: Array<number | ''> = Array(lines.length).fill('')
    const newLineNumbers: Array<number | ''> = Array(lines.length).fill('')

    let oldLine = 0
    let newLine = 0

    lines.forEach((line, index) => {
      if (line.startsWith('@@')) {
        const hunkMatch = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
        if (hunkMatch) {
          oldLine = Number.parseInt(hunkMatch[1], 10) - 1
          newLine = Number.parseInt(hunkMatch[2], 10) - 1
        }
        return
      }

      if (line.startsWith('-')) {
        oldLine += 1
        oldLineNumbers[index] = oldLine
        return
      }

      if (line.startsWith('+')) {
        newLine += 1
        newLineNumbers[index] = newLine
        return
      }

      oldLine += 1
      newLine += 1
      oldLineNumbers[index] = oldLine
      newLineNumbers[index] = newLine
    })

    return {
      lines,
      oldLineNumbers,
      newLineNumbers
    }
  }, [props.file.patch])

  if (!props.file.patch) {
    return (
      <div className="rounded-b-xl p-4 text-center text-sm italic text-muted-foreground">
        <p>Binary file not shown</p>
      </div>
    )
  }

  return (
    <div className="rounded-b-xl bg-card">
      <div className="scrollbar-none overflow-x-auto rounded-b-xl">
        <div className="font-mono text-xs leading-5">
          {diffData.lines.map((line, index) => (
            <div
              key={`${props.file.filename}-${index}`}
              className={cn(
                'grid min-h-[1.5rem] grid-cols-[2.75rem_2.75rem_minmax(0,1fr)] border-b border-border last:border-b-0',
                line.startsWith('@@') ? 'bg-muted/60 text-muted-foreground' : 'bg-transparent',
                line.startsWith('+') || line.startsWith('-') ? 'bg-muted/35' : ''
              )}
            >
              <div className="select-none border-r border-border bg-muted/55 px-1.5 text-right text-muted-foreground">
                {!line.startsWith('+') && !line.startsWith('@@') ? diffData.oldLineNumbers[index] : ''}
              </div>
              <div className="select-none border-l border-border bg-muted/55 px-1.5 text-right text-muted-foreground">
                {!line.startsWith('-') && !line.startsWith('@@') ? diffData.newLineNumbers[index] : ''}
              </div>
              <div className={cn('whitespace-pre px-2.5', line.startsWith('+') || line.startsWith('-') ? 'bg-muted/45' : '')}>
                <span>{line}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface FilesTabContentProps {
  changedFiles: FileChange[]
}

function FilesTabContent(props: FilesTabContentProps) {
  const [selectedFile, setSelectedFile] = useState<FileChange | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const sortedFiles = useMemo(() => {
    return [...props.changedFiles].sort((left, right) => {
      const depthLeft = left.filename.split('/').length
      const depthRight = right.filename.split('/').length
      if (depthLeft !== depthRight) {
        return depthLeft - depthRight
      }
      return left.filename.localeCompare(right.filename)
    })
  }, [props.changedFiles])

  useEffect(() => {
    if (props.changedFiles.length === 0) {
      setSelectedFile(null)
      setExpandedFiles(new Set())
      return
    }

    setSelectedFile(props.changedFiles[0])
    setExpandedFiles(new Set(props.changedFiles.map((file) => file.filename)))
  }, [props.changedFiles])

  const openFilePanel = useCallback((filename: string) => {
    setExpandedFiles((current) => {
      const next = new Set(current)
      next.add(filename)
      return next
    })
  }, [])

  const toggleFilePanel = useCallback((filename: string) => {
    setExpandedFiles((current) => {
      const next = new Set(current)
      if (next.has(filename)) {
        next.delete(filename)
      } else {
        next.add(filename)
      }
      return next
    })
  }, [])

  const handleFileSelected = useCallback(
    (file: FileChange) => {
      setSelectedFile(file)
      openFilePanel(file.filename)
      window.requestAnimationFrame(() => {
        const target = document.getElementById(getFileCardId(file.filename))
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [openFilePanel]
  )

  const toggleFile = useCallback(
    (file: FileChange) => {
      setSelectedFile(file)
      toggleFilePanel(file.filename)
    },
    [toggleFilePanel]
  )

  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)]">
      <div className="min-w-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-13rem)]">
        <FileTreePanel
          changedFiles={props.changedFiles}
          selectedFilePath={selectedFile?.filename || ''}
          onFileSelected={handleFileSelected}
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-4">
          {sortedFiles.map((file) => {
            const expanded = expandedFiles.has(file.filename)
            const selected = selectedFile?.filename === file.filename
            return (
              <Card key={file.filename} id={getFileCardId(file.filename)} className="overflow-hidden border-border bg-card shadow-sm">
                <div
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 border-b border-border px-4 py-3 transition-colors max-[700px]:px-3',
                    selected ? 'bg-accent' : 'bg-muted/50 hover:bg-accent'
                  )}
                  onClick={() => toggleFile(file)}
                >
                  <div className="flex w-full min-w-0 items-center gap-2 font-mono text-xs md:text-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-7 w-7 shrink-0"
                      aria-label="Toggle diff contents"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleFile(file)
                      }}
                    >
                      {expanded ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                    </Button>

                    <div className="shrink-0">
                      <span className="sr-only">{file.changes} changes</span>
                      <span className="cursor-default whitespace-nowrap text-xs font-semibold text-muted-foreground" aria-hidden="true">
                        {file.changes}
                        {Array.from({ length: 5 }).map((_, index) => (
                          <span
                            key={`${file.filename}-dot-${index}`}
                            className={cn(
                              'ml-px inline-block h-[6px] w-[6px]',
                              index + 1 <= Math.min(5, file.changes)
                                ? 'bg-foreground'
                                : 'bg-muted outline outline-1 -outline-offset-1 outline-border'
                            )}
                          />
                        ))}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground md:text-[0.92rem]">{file.filename}</div>

                    <Badge variant="outline" className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.7rem] leading-none">
                      {getStatusText(file.status)}
                    </Badge>
                  </div>
                </div>

                {expanded ? (
                  <div className="border-b border-border">
                    <GithubStyleDiffView file={file} />
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface AnalysisTabContentProps {
  analyzedData: AnalyzedData | null
  repoData: RepoData | null
  manifestData: ManifestData | null
}

function AnalysisTabContent(props: AnalysisTabContentProps) {
  const getFullImageUrl = useCallback(
    (relativePath: string): string => {
      if (!props.repoData?.repo_url || !relativePath) return ''
      if (/^https?:\/\//i.test(relativePath)) return relativePath
      const repoPath = normalizeRepoPath(props.repoData.repo_url)
      const normalizedPath = relativePath
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/')
      return `https://raw.githubusercontent.com/${repoPath}/refs/heads/main/${normalizedPath}`
    },
    [props.repoData]
  )

  if (!props.analyzedData) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 text-muted-foreground">
        <p>暂无数据分析结果</p>
      </div>
    )
  }

  const downloadDevices = props.manifestData ? Object.keys(props.manifestData.downloads || {}) : []

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="border-b border-border px-4 py-3.5">
            <CardTitle className="text-base">PR变更分析</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {props.analyzedData.csvChange ? (
              <div className="mt-2">
                <h4 className="mb-3 mt-1 text-sm font-semibold text-foreground">CSV变更</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">资源名:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.appName || '未提供'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">图标:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">
                      {props.analyzedData.csvChange.iconUrl ? (
                        <a href={props.analyzedData.csvChange.iconUrl} target="_blank" rel="noopener noreferrer" className="break-all text-foreground hover:underline">
                          {props.analyzedData.csvChange.iconUrl}
                        </a>
                      ) : (
                        <span>未提供</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">头图:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">
                      {props.analyzedData.csvChange.previewUrl ? (
                        <a
                          href={props.analyzedData.csvChange.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-foreground hover:underline"
                        >
                          {props.analyzedData.csvChange.previewUrl}
                        </a>
                      ) : (
                        <span>未提供</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">类型:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.type || '未提供'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">标签:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.tags || '未提供'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">支持设备:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.supportedDevices || '未提供'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">JSON路径:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.resourceFile || '未提供'}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                    <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">付费类型:</div>
                    <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.analyzedData.csvChange.paidType || '未提供'}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {props.analyzedData.resourceChange ? (
              <div className="mt-4">
                <h4 className="mb-3 mt-1 text-sm font-semibold text-foreground">资源文件变更</h4>
                <div className="scrollbar-none mt-2 overflow-x-auto rounded-[0.6rem] border border-border bg-muted/45 p-2.5">
                  <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5">
                    {JSON.stringify(props.analyzedData.resourceChange, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {props.repoData ? (
          <Card className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3.5">
              <CardTitle className="text-base">仓库信息分析</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">仓库URL:</div>
                <div className="min-w-0 flex-1 break-words text-sm leading-6">
                  {props.repoData.repo_url ? (
                    <a href={props.repoData.repo_url} target="_blank" rel="noopener noreferrer" className="break-all text-foreground hover:underline">
                      {props.repoData.repo_url}
                    </a>
                  ) : (
                    <span>未提供</span>
                  )}
                </div>
              </div>

              {props.manifestData ? (
                <div className="mt-4">
                  <h4 className="mb-2 mt-2 text-sm font-semibold text-muted-foreground">Manifest 内容</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">应用名称:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.manifestData.item.name || '未提供'}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">描述:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">{props.manifestData.item.description || '未提供'}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">作者:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">
                        {props.manifestData.item.author.length > 0
                          ? props.manifestData.item.author.map((author) => (
                              <a
                                key={`${author.name}-${author.author_url}`}
                                href={author.author_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mr-2 text-foreground hover:underline"
                              >
                                {author.name || '匿名作者'}
                              </a>
                            ))
                          : '未提供'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">支持的设备:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">
                        {downloadDevices.length > 0 ? downloadDevices.join(', ') : '未提供'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">图标:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">
                        {props.manifestData.item.icon ? (
                          <a
                            href={getFullImageUrl(props.manifestData.item.icon)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-foreground hover:underline"
                          >
                            {props.manifestData.item.icon}
                          </a>
                        ) : (
                          <span>未提供</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 py-2 md:flex-row md:gap-3">
                      <div className="w-28 shrink-0 text-sm font-medium text-muted-foreground">预览图:</div>
                      <div className="min-w-0 flex-1 break-words text-sm leading-6">
                        {props.manifestData.item.preview.length > 0 ? (
                          <div>
                            {props.manifestData.item.preview.map((previewPath) => (
                              <div key={previewPath}>
                                <a
                                  href={getFullImageUrl(previewPath)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="break-all text-foreground hover:underline"
                                >
                                  {previewPath}
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>未提供</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-destructive">无法获取或解析manifest.json文件</div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export function CodeReviewPage() {
  const repoOwner = DEFAULT_REPO_OWNER
  const repoName = DEFAULT_REPO_NAME
  const resolvedToken = SITE_DEFAULT_TOKEN
  const hasGithubToken = Boolean(resolvedToken)

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [changedFiles, setChangedFiles] = useState<FileChange[]>([])
  const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null)
  const [repoData, setRepoData] = useState<RepoData | null>(null)
  const [manifestData, setManifestData] = useState<ManifestData | null>(null)
  const [loadingPRs, setLoadingPRs] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFirstSelection, setIsFirstSelection] = useState(true)
  const [showFeatureNotice, setShowFeatureNotice] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('analysis')

  const githubGet = useCallback(
    async <T,>(pathOrUrl: string, options?: GitHubGetOptions): Promise<T> => {
      const { rest } = createGitHubClient(resolvedToken)
      let path = pathOrUrl.startsWith('http') ? pathOrUrl.replace(/^https?:\/\/api\.github\.com/i, '') : pathOrUrl

      if (options?.params && Object.keys(options.params).length > 0) {
        const query = new URLSearchParams()
        for (const [key, value] of Object.entries(options.params)) {
          if (value === null || value === undefined) continue
          query.append(key, String(value))
        }
        const suffix = query.toString()
        if (suffix) {
          path += path.includes('?') ? `&${suffix}` : `?${suffix}`
        }
      }

      const response = await rest.request(`GET ${path}`)
      return response.data as T
    },
    [resolvedToken]
  )

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return '未知错误'
  }

  const getErrorStatus = (error: unknown): number | null => {
    const normalized = normalizeGitHubError(error)
    return typeof normalized.status === 'number' ? normalized.status : null
  }

  const fetchPRDetails = useCallback(
    async (targetPr: PullRequest) => {
      setLoadingDetails(true)
      try {
        const filesData = await githubGet<FileChange[]>(`/repos/${repoOwner}/${repoName}/pulls/${targetPr.number}/files`)
        const files = Array.isArray(filesData)
          ? filesData.map((file) => ({
              filename: file.filename || '',
              status: file.status || 'modified',
              changes: typeof file.changes === 'number' ? file.changes : 0,
              patch: typeof file.patch === 'string' ? file.patch : undefined,
              contents_url: file.contents_url || ''
            }))
          : []

        setChangedFiles(files)

        const dataFiles = files.filter((file) => file.contents_url && isDataFile(file.filename))
        if (dataFiles.length === 0) {
          setAnalyzedData(null)
          setRepoData(null)
          setManifestData(null)
          return
        }

        const nextAnalyzedData: AnalyzedData = {}
        let nextRepoData: RepoData | null = null
        let nextManifestData: ManifestData | null = null

        for (const file of dataFiles) {
          try {
            const analyzed = await analyzeFile(file, githubGet)
            if (analyzed.csvChange) {
              nextAnalyzedData.csvChange = analyzed.csvChange
            }
            if (analyzed.resourceChange) {
              nextAnalyzedData.resourceChange = analyzed.resourceChange
              nextRepoData = {
                repo_url: analyzed.resourceChange.repo_url
              }

              if (analyzed.resourceChange.repo_url) {
                try {
                  nextManifestData = await fetchRepoManifestData(analyzed.resourceChange.repo_url, githubGet)
                } catch (error) {
                  setErrorMessage(`获取manifest.json失败: ${getErrorMessage(error)}`)
                  nextManifestData = createDefaultManifest()
                }
              }
            }
          } catch (error) {
            setErrorMessage(`分析文件失败: ${getErrorMessage(error)}`)
          }
        }

        setAnalyzedData(Object.keys(nextAnalyzedData).length > 0 ? nextAnalyzedData : null)
        setRepoData(nextRepoData)
        setManifestData(nextManifestData)
      } catch (error) {
        setErrorMessage(`获取PR详情失败: ${getErrorMessage(error)}`)
      } finally {
        setLoadingDetails(false)
      }
    },
    [githubGet, repoName, repoOwner]
  )

  const fetchPullRequests = useCallback(async () => {
    setLoadingPRs(true)
    setErrorMessage(hasGithubToken ? '' : GITHUB_TOKEN_SETUP_HINT)

    try {
      const data = await githubGet<PullRequestApiItem[]>(`/repos/${repoOwner}/${repoName}/pulls`, {
        params: {
          state: 'open',
          sort: 'created',
          direction: 'desc',
          per_page: 100
        }
      })

      if (!Array.isArray(data)) {
        throw new Error('返回的PR数据格式不正确')
      }

      const mapped = data
        .filter((pr) => typeof pr.number === 'number' && typeof pr.id === 'number')
        .map((pr) => ({
          id: pr.id as number,
          number: pr.number as number,
          title: pr.title || '',
          user: {
            login: pr.user?.login || '未知用户',
            avatar_url: pr.user?.avatar_url || 'https://github.com/ghost.png',
            html_url: pr.user?.html_url || 'https://github.com'
          },
          created_at: pr.created_at || new Date().toISOString(),
          html_url: pr.html_url || '',
          head: {
            sha: pr.head?.sha || '',
            label: pr.head?.label || 'main'
          },
          base: {
            label: pr.base?.label || 'main'
          },
          commits: pr.commits,
          state: pr.state || 'open'
        }))

      setPullRequests(mapped)
    } catch (error) {
      const status = getErrorStatus(error)
      const detail = `获取PR列表失败: ${getErrorMessage(error)}`
      if (status === 401) {
        setErrorMessage(
          hasGithubToken ? 'GitHub认证失败，请检查Token是否有效' : `${GITHUB_TOKEN_SETUP_HINT} 当前请求返回 401，请先配置可用 token。`
        )
      } else if (status === 404) {
        setErrorMessage(`仓库不存在: ${repoOwner}/${repoName}`)
      } else {
        setErrorMessage(hasGithubToken ? detail : `${GITHUB_TOKEN_SETUP_HINT} ${detail}`)
      }
    } finally {
      setLoadingPRs(false)
    }
  }, [githubGet, hasGithubToken, repoName, repoOwner])

  useEffect(() => {
    if (!hasGithubToken) {
      setErrorMessage(GITHUB_TOKEN_SETUP_HINT)
    }
    void fetchPullRequests()
  }, [fetchPullRequests, hasGithubToken])

  const selectPR = useCallback(
    (pr: PullRequest) => {
      if (isFirstSelection && window.innerWidth >= 1024) {
        setIsSidebarCollapsed(true)
      }
      setIsFirstSelection(false)
      setSelectedPR(pr)
      setAnalyzedData(null)
      setRepoData(null)
      setManifestData(null)
      setActiveTab('analysis')
      setErrorMessage('')
      void fetchPRDetails(pr)
    },
    [fetchPRDetails, isFirstSelection]
  )

  const refreshSelectedPR = useCallback(() => {
    if (!selectedPR) return
    void fetchPRDetails(selectedPR)
  }, [fetchPRDetails, selectedPR])

  return (
    <div className="w-full py-1 md:py-2">
      <Dialog open={showFeatureNotice} onOpenChange={setShowFeatureNotice}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <Info size={36} weight="duotone" className="mt-0.5 text-foreground" />
              <div>
                <DialogTitle>功能说明</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">目前版本为基础版本，更方便的功能还在更新。</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ul className="list-disc space-y-2 pl-6 text-sm leading-6 text-muted-foreground">
            <li>手机端响应有问题</li>
            <li>自动检验 PR 数据未做</li>
            <li>若添加多个 CSV 会导致 manifest 错误，刷新有概率成功，以后会修</li>
            <li>后续会持续更新优化</li>
          </ul>

          <p className="text-sm text-muted-foreground">如有建议或发现问题，欢迎提交 Issue 或直接联系作者</p>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button onClick={() => setShowFeatureNotice(false)}>
              <Check size={16} weight="bold" />
              我知道了
            </Button>
            <Button asChild variant="outline">
              <a href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" rel="noopener noreferrer">
                <GithubLogo size={16} weight="duotone" />
                提交反馈
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
        <PullRequestSidebar
          pullRequests={pullRequests}
          selectedPR={selectedPR}
          loading={loadingPRs}
          isCollapsed={isSidebarCollapsed}
          onSelect={selectPR}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          onRefresh={() => {
            void fetchPullRequests()
          }}
        />

        <div className="min-w-0 flex-1">
          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground">
              {errorMessage}
            </div>
          ) : null}

          {!selectedPR ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              <h3 className="font-medium text-foreground">请从左侧选择一个 Pull Request 进行审查</h3>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <PullRequestHeader pr={selectedPR} onRefresh={refreshSelectedPR} />

              {loadingDetails ? (
                <div className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
                  加载 PR 详情中...
                </div>
              ) : (
                <div className="space-y-4">
                  <PullRequestTabs
                    activeTab={activeTab}
                    analyzedData={analyzedData}
                    changedFilesCount={changedFiles.length}
                    onChange={setActiveTab}
                  />

                  {activeTab === 'files' ? <FilesTabContent changedFiles={changedFiles} /> : null}

                  {activeTab === 'analysis' ? (
                    <AnalysisTabContent analyzedData={analyzedData} repoData={repoData} manifestData={manifestData} />
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
