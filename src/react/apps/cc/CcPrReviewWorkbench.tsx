import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowsClockwise,
  CaretDown,
  CaretRight,
  CheckCircle,
  File,
  Folder,
  GithubLogo,
  GitPullRequest,
  MagnifyingGlass,
  UserCircle,
  WarningCircle
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { PreviewImageCarousel } from '@/react/components/cc/PreviewImageCarousel'
import { buildRawGithubUrl } from '@/react/components/cc/resource-manifest'
import { ReviewCommentComposer } from '@/react/components/review/ReviewCommentComposer'
import { ReviewCommentTimeline } from '@/react/components/review/ReviewCommentTimeline'
import { ReviewDetailHeader } from '@/react/components/review/ReviewDetailHeader'
import { deviceOptions, normalizeDeviceToken } from '@/components/resourcePublishWorkbenchDeviceCatalog'

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
  resourceRepoOwner: string
  resourceRepoName: string
  resourceRepoRef: string
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

interface DownloadItem {
  device: string
  version: string
  file: string
  raw: string
}

interface LinkItem {
  title: string
  type: string
  url: string
}

interface SubmissionOverview {
  resourceInfo: Array<{ key: string; value: string }>
  supportedDevices: string[]
  repoUrl: string
  shortHash: string
  images: {
    icon: { file: string; url: string } | null
    cover: { file: string; url: string } | null
    previews: Array<{ file: string; url: string }>
  }
  downloads: DownloadItem[]
  links: LinkItem[]
}

interface CsvV2Row {
  id: string
  name: string
  restype: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  icon: string
  cover: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
}

type PickerTreeItem = {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

type RuleCheckItem = {
  title: string
  status: 'pass' | 'fail' | 'warn' | 'manual'
  detail: string
}

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i
const SITE_DEFAULT_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''
const deviceNameById = new Map(deviceOptions.map((device) => [device.id, device.name]))

const toNonEmptyString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => toNonEmptyString(item)).filter(Boolean)
}

const resolveDeviceName = (deviceToken: string): string => {
  const normalized = deviceToken.trim()
  if (!normalized) return ''
  const canonicalId = normalizeDeviceToken(normalized)
  return deviceNameById.get(canonicalId) || ''
}

const isKnownDeviceToken = (deviceToken: string): boolean => Boolean(resolveDeviceName(deviceToken))

const formatDeviceLabel = (deviceToken: string): string => {
  const normalized = deviceToken.trim()
  if (!normalized) return ''
  const name = resolveDeviceName(normalized)
  if (!name) return `未知设备（${normalized}）`
  return `${name}（${normalized}）`
}

const formatDeviceLabels = (deviceIds: string[]): string =>
  deviceIds
    .map((id) => formatDeviceLabel(id))
    .filter(Boolean)
    .join(' / ')

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

const splitCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }
  result.push(current)
  return result.map((value) => value.trim())
}

const normalizeUrlLikeText = (input: string): string => {
  let next = input.trim()
  if (!next) return ''

  next = next.replace(/\\\//g, '/')
  next = next.replace(/^https?:\\\\\/\\\\\//i, (matched) => (matched.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
  next = next.replace(/^https?:\\\/\\\//i, (matched) => (matched.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
  next = next.replace(/^['"`<]+|[>'"`]+$/g, '')
  next = next.replace(/[),.;]+$/g, '')
  if (/^raw\.githubusercontent\.com\//i.test(next)) {
    next = `https://${next}`
  }
  return next
}

const extractUrlCandidate = (value: string): string => {
  const raw = normalizeUrlLikeText(value)
  if (!raw) return ''
  const markdownMatch = raw.match(/\[[^\]]*]\(([^)\s]+)\)/i)
  if (markdownMatch?.[1]) return normalizeUrlLikeText(markdownMatch[1])
  const angleWrapped = raw.match(/^<\s*([^>\s]+)\s*>$/i)
  if (angleWrapped?.[1]) return normalizeUrlLikeText(angleWrapped[1])
  const directUrl = raw.match(/(?:https?:\/\/|raw\.githubusercontent\.com\/)[^\s)]+/i)
  if (directUrl?.[0]) return normalizeUrlLikeText(directUrl[0])
  return raw
}

const parseCsvV2Row = (line: string): CsvV2Row | null => {
  const cells = splitCsvLine(line)
  if (cells.length >= 12) {
    return {
      id: cells[0],
      name: cells[1],
      restype: cells[2],
      repo_owner: cells[3],
      repo_name: cells[4],
      repo_commit_hash: cells[5],
      icon: cells[6],
      cover: cells[7],
      tags: cells[8],
      device_vendors: cells[9],
      devices: cells[10],
      paid_type: cells[11]
    }
  }
  if (cells.length >= 8) {
    return {
      id: '',
      name: cells[0],
      restype: cells[3],
      repo_owner: '',
      repo_name: '',
      repo_commit_hash: '',
      icon: cells[1],
      cover: cells[2],
      tags: cells[4],
      device_vendors: '',
      devices: cells[5],
      paid_type: cells[7]
    }
  }
  return null
}

const isCsvHeaderRow = (row: CsvV2Row): boolean => {
  const id = row.id.trim().toLowerCase()
  const name = row.name.trim().toLowerCase()
  const restype = row.restype.trim().toLowerCase()
  const icon = row.icon.trim().toLowerCase()
  const cover = row.cover.trim().toLowerCase()
  if (id === 'id') return true
  if (name === 'name') return true
  if (restype === 'restype') return true
  if (icon === 'icon' && cover === 'cover') return true
  return false
}

const parseCsvRowsFromPrPatch = (files: PullFileItem[]): CsvV2Row[] => {
  const rows: CsvV2Row[] = []
  for (const file of files) {
    if (!/(^|\/)index(_v2)?\.csv$/i.test(file.filename)) continue
    if (!file.patch) continue
    const addedLines = file.patch
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1).trim())
      .filter((line) => line && !line.startsWith('id,') && line.includes(','))
    for (const line of addedLines) {
      const row = parseCsvV2Row(line)
      if (row && !isCsvHeaderRow(row)) rows.push(row)
    }
  }
  return rows
}

const pickPreferredCsvRow = (rows: CsvV2Row[]): CsvV2Row | null => {
  if (rows.length === 0) return null
  let best: CsvV2Row | null = null
  let bestScore = -1

  for (const row of rows) {
    let score = 0
    if (row.repo_owner && row.repo_name) score += 5
    if (checkRawGithubUrl(row.icon).ok) score += 2
    if (checkRawGithubUrl(row.cover).ok) score += 2
    if (row.name.trim()) score += 1
    if (['watchface', 'quickapp'].includes(row.restype.trim().toLowerCase())) score += 1
    if (score >= bestScore) {
      best = row
      bestScore = score
    }
  }

  return best || rows[rows.length - 1]
}

const parseRawGithubUrl = (rawUrl: string): { owner: string; repo: string; ref: string; path: string } | null => {
  const matched = rawUrl.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i)
  if (!matched) return null
  const decodeSafe = (value: string): string => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }
  const decodedRef = decodeSafe(matched[3])
  const decodedPath = matched[4]
    .split('/')
    .map((segment) => decodeSafe(segment))
    .join('/')
  return {
    owner: matched[1],
    repo: matched[2],
    ref: decodedRef,
    path: decodedPath
  }
}

const getCsvAssetRepoPath = (value: string): string => {
  const raw = extractUrlCandidate(value)
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) {
    const parsed = parseRawGithubUrl(raw)
    return parsed?.path || ''
  }
  return raw
}

const buildManifestCandidatesByCsvRow = (repoPaths: string[], csvRow: CsvV2Row | null): string[] => {
  const manifestPaths = repoPaths.filter((path) => /(^|\/)manifest_v2\.json$/i.test(path) || /(^|\/)manifest\.json$/i.test(path))
  if (manifestPaths.length === 0) return []

  const priorityDirs: string[] = []
  const pushDirWithParents = (fullPath: string): void => {
    let dir = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : ''
    while (true) {
      if (!priorityDirs.includes(dir)) priorityDirs.push(dir)
      if (!dir.includes('/')) break
      dir = dir.slice(0, dir.lastIndexOf('/'))
    }
    if (!priorityDirs.includes('')) priorityDirs.push('')
  }

  if (csvRow) {
    const iconPath = getCsvAssetRepoPath(csvRow.icon)
    const coverPath = getCsvAssetRepoPath(csvRow.cover)
    if (iconPath) pushDirWithParents(iconPath)
    if (coverPath) pushDirWithParents(coverPath)
  }
  if (!priorityDirs.includes('')) priorityDirs.push('')

  const ranked: string[] = []
  for (const dir of priorityDirs) {
    const manifestV2 = dir ? `${dir}/manifest_v2.json` : 'manifest_v2.json'
    const manifestV1 = dir ? `${dir}/manifest.json` : 'manifest.json'
    if (manifestPaths.includes(manifestV2)) ranked.push(manifestV2)
    if (manifestPaths.includes(manifestV1)) ranked.push(manifestV1)
  }

  for (const path of manifestPaths) {
    if (!ranked.includes(path)) ranked.push(path)
  }
  return ranked
}

const getPathDirname = (path: string): string => {
  const normalized = path.trim().replace(/^\/+/, '')
  const index = normalized.lastIndexOf('/')
  return index >= 0 ? normalized.slice(0, index) : ''
}

const joinRepoPath = (baseDir: string, relativePath: string): string => {
  const left = baseDir.replace(/^\/+|\/+$/g, '')
  const right = relativePath.replace(/^\/+/, '')
  if (!left) return right
  if (!right) return left
  return `${left}/${right}`
}

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
  return false
}

const checkPublicUrl = (raw: string): { ok: boolean; reason: string } => {
  const urlText = extractUrlCandidate(raw)
  if (!urlText) return { ok: false, reason: '缺少链接' }
  try {
    const url = new URL(urlText)
    if (!/^https?:$/.test(url.protocol)) return { ok: false, reason: '链接协议不是 http/https' }
    if (isPrivateHost(url.hostname)) return { ok: false, reason: '链接使用了私有域名/内网地址' }
    return { ok: true, reason: '链接格式正常' }
  } catch {
    return { ok: false, reason: '链接格式无效' }
  }
}

const checkRawGithubUrl = (raw: string): { ok: boolean; reason: string } => {
  const base = checkPublicUrl(raw)
  if (!base.ok) return base
  try {
    const url = new URL(extractUrlCandidate(raw))
    if (url.hostname !== 'raw.githubusercontent.com') {
      return { ok: false, reason: '不是 raw.githubusercontent.com 链接' }
    }
    return { ok: true, reason: 'Raw 链接格式正确' }
  } catch {
    return { ok: false, reason: '链接格式无效' }
  }
}

const hasUrl = (value: string): boolean => /https?:\/\/[^\s)]+/.test(value)

const renderTextWithLinks = (value: string): string => {
  const escaped = escapeHtml(value)
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`
  )
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

const getTopLevelFolders = (paths: string[]): string[] =>
  Array.from(new Set(paths.map((path) => path.split('/').filter(Boolean)[0]).filter(Boolean)))

const buildPickerTreeItems = (paths: string[], openFolders: string[]): PickerTreeItem[] => {
  interface TreeNode {
    path: string
    depth: number
    label: string
    folders: Map<string, TreeNode>
    files: Array<{ path: string; label: string; depth: number }>
  }

  const root: TreeNode = {
    path: '',
    depth: -1,
    label: '',
    folders: new Map(),
    files: []
  }

  for (const path of paths) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let current = root
    for (let i = 0; i < parts.length - 1; i += 1) {
      const folderPath = parts.slice(0, i + 1).join('/')
      const existing = current.folders.get(parts[i])
      if (existing) {
        current = existing
        continue
      }
      const node: TreeNode = {
        path: folderPath,
        depth: i,
        label: parts[i],
        folders: new Map(),
        files: []
      }
      current.folders.set(parts[i], node)
      current = node
    }

    current.files.push({
      path,
      label: parts[parts.length - 1],
      depth: Math.max(parts.length - 1, 0)
    })
  }

  const output: PickerTreeItem[] = []
  const walk = (node: TreeNode): void => {
    const folders = Array.from(node.folders.values()).sort((a, b) => a.path.localeCompare(b.path))
    for (const folder of folders) {
      output.push({ type: 'folder', path: folder.path, label: folder.label, depth: folder.depth })
      if (openFolders.includes(folder.path)) {
        walk(folder)
      }
    }

    const files = [...node.files].sort((a, b) => a.path.localeCompare(b.path))
    for (const file of files) {
      output.push({ type: 'file', path: file.path, label: file.label, depth: file.depth })
    }
  }

  walk(root)
  return output
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
  const [csvRowFromPrDiff, setCsvRowFromPrDiff] = useState<CsvV2Row | null>(null)
  const [repoFiles, setRepoFiles] = useState<string[]>([])
  const [repoFilesError, setRepoFilesError] = useState('')
  const [manifestData, setManifestData] = useState<Record<string, unknown> | null>(null)
  const [manifestFilePath, setManifestFilePath] = useState('')
  const [manifestLoadError, setManifestLoadError] = useState('')

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

  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [filePickerStep, setFilePickerStep] = useState<'file' | 'line'>('file')
  const [filePickerTab, setFilePickerTab] = useState<'pr' | 'repo'>('pr')
  const [prPickerOpenFolders, setPrPickerOpenFolders] = useState<string[]>([])
  const [repoPickerOpenFolders, setRepoPickerOpenFolders] = useState<string[]>([])
  const [filePickerSearch, setFilePickerSearch] = useState('')
  const [selectedPickerPath, setSelectedPickerPath] = useState('')
  const [selectedPickerContent, setSelectedPickerContent] = useState('')
  const [selectedPickerLine, setSelectedPickerLine] = useState<number | null>(null)
  const [pickerLineSearch, setPickerLineSearch] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')

  const commentComposerWrapperRef = useRef<HTMLDivElement | null>(null)
  const [commentCursorStart, setCommentCursorStart] = useState<number | null>(null)
  const [commentCursorEnd, setCommentCursorEnd] = useState<number | null>(null)

  const pickerLineRowRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [pickerMatchCursor, setPickerMatchCursor] = useState(-1)

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

  const pickerPaths = useMemo(() => {
    const source = filePickerTab === 'pr' ? prFiles.map((file) => file.filename) : repoFiles
    const query = filePickerSearch.trim().toLowerCase()
    if (!query) return source
    return source.filter((path) => path.toLowerCase().includes(query))
  }, [filePickerSearch, filePickerTab, prFiles, repoFiles])

  const pickerOpenFolders = useMemo(() => (filePickerTab === 'pr' ? prPickerOpenFolders : repoPickerOpenFolders), [filePickerTab, prPickerOpenFolders, repoPickerOpenFolders])

  const pickerTreeItems = useMemo(() => buildPickerTreeItems(pickerPaths, pickerOpenFolders), [pickerOpenFolders, pickerPaths])

  const pickerContentLines = useMemo(() => selectedPickerContent.split('\n'), [selectedPickerContent])

  const pickerMatchedLineNumbers = useMemo(() => {
    const query = pickerLineSearch.trim().toLowerCase()
    if (!query) return [] as number[]
    const numbers: number[] = []
    pickerContentLines.forEach((line, index) => {
      if (line.toLowerCase().includes(query)) {
        numbers.push(index + 1)
      }
    })
    return numbers
  }, [pickerContentLines, pickerLineSearch])

  const submissionOverview = useMemo<SubmissionOverview>(() => {
    const manifest = manifestData || {}
    const item = (manifest.item && typeof manifest.item === 'object') ? (manifest.item as Record<string, unknown>) : {}
    const downloads = (manifest.downloads && typeof manifest.downloads === 'object') ? (manifest.downloads as Record<string, unknown>) : {}
    const links = Array.isArray(manifest.links) ? (manifest.links as Array<Record<string, unknown>>) : []
    const ownerValue = selectedPr?.resourceRepoOwner || selectedPr?.headOwner || ''
    const repoValue = selectedPr?.resourceRepoName || selectedPr?.headRepo || ''
    const refValue = selectedPr?.resourceRepoRef || selectedPr?.headRef || 'main'
    const baseDir = getPathDirname(manifestFilePath)
    const existingRepoPaths = new Set(repoFiles)

    const toImageAsset = (pathValue: unknown): { file: string; url: string } | null => {
      const raw = toNonEmptyString(pathValue)
      if (!raw || raw === '--') return null
      const file = raw.split('/').filter(Boolean).pop() || raw
      if (/^https?:\/\//i.test(raw)) {
        return { file, url: raw }
      }
      if (!ownerValue || !repoValue || !refValue) return null
      const normalizedRaw = raw.replace(/^\/+/, '')
      const normalizedByBase = joinRepoPath(baseDir, normalizedRaw)
      const resolvedPath = existingRepoPaths.has(normalizedRaw)
        ? normalizedRaw
        : (existingRepoPaths.has(normalizedByBase) ? normalizedByBase : normalizedRaw)
      return {
        file,
        url: buildRawGithubUrl(ownerValue, repoValue, refValue, resolvedPath)
      }
    }

    const previewAssets = toStringArray(item.preview)
      .map((path) => toImageAsset(path))
      .filter((asset): asset is { file: string; url: string } => Boolean(asset))

    const overview: SubmissionOverview = {
      resourceInfo: [],
      supportedDevices: [],
      repoUrl: ownerValue && repoValue ? `https://github.com/${ownerValue}/${repoValue}` : '',
      shortHash: toNonEmptyString(selectedPr?.resourceRepoRef || selectedPr?.headRef),
      images: {
        icon: toImageAsset(item.icon),
        cover: toImageAsset(item.cover),
        previews: previewAssets
      },
      downloads: [],
      links: links
        .map((link) => ({
          title: toNonEmptyString(link.title),
          type: toNonEmptyString(link.icon),
          url: toNonEmptyString(link.url)
        }))
        .filter((link) => link.title || link.type || link.url)
    }

    const pushResourceInfo = (key: string, value: unknown): void => {
      const normalized = toNonEmptyString(value)
      if (!normalized) return
      overview.resourceInfo.push({ key, value: normalized })
    }

    pushResourceInfo('资源名称', item.name)
    pushResourceInfo('资源 ID', item.id)
    pushResourceInfo('资源类型', item.restype)
    pushResourceInfo('资源描述', item.description)

    for (const [device, entry] of Object.entries(downloads)) {
      const record = (entry && typeof entry === 'object') ? (entry as Record<string, unknown>) : {}
      const file = toNonEmptyString(record.file_name) || toNonEmptyString(record.file)
      const version = toNonEmptyString(record.version)
      const raw = file && ownerValue && repoValue && refValue ? buildRawGithubUrl(ownerValue, repoValue, refValue, file) : ''
      if (device) {
        overview.supportedDevices.push(device)
      }
      overview.downloads.push({
        device,
        version,
        file,
        raw
      })
    }

    return overview
  }, [manifestData, manifestFilePath, repoFiles, selectedPr])

  const groupedDownloads = useMemo<Array<{ raw: string; file: string; version: string; devices: string[] }>>(() => {
    const map = new Map<string, { raw: string; file: string; version: string; devices: string[] }>()
    for (const item of submissionOverview.downloads) {
      const key = `${item.raw || ''}||${item.file || ''}||${item.version || ''}`
      if (!map.has(key)) {
        map.set(key, {
          raw: item.raw || '',
          file: item.file || '',
          version: item.version || '',
          devices: []
        })
      }
      const target = map.get(key)
      if (!target) continue
      if (item.device && !target.devices.includes(item.device)) {
        target.devices.push(item.device)
      }
    }
    return Array.from(map.values())
  }, [submissionOverview.downloads])

  const hasSubmissionOverview = useMemo(
    () =>
      submissionOverview.resourceInfo.length > 0
      || submissionOverview.supportedDevices.length > 0
      || Boolean(submissionOverview.repoUrl)
      || submissionOverview.downloads.length > 0
      || submissionOverview.links.length > 0
      || Boolean(submissionOverview.images.icon)
      || Boolean(submissionOverview.images.cover)
      || submissionOverview.images.previews.length > 0,
    [submissionOverview]
  )

  const ruleChecks = useMemo<RuleCheckItem[]>(() => {
    const checks: RuleCheckItem[] = []
    const csvRow = csvRowFromPrDiff
    const resourceName = csvRow?.name || submissionOverview.resourceInfo.find((entry) => entry.key === '资源名称')?.value || ''
    const iconRaw = csvRow?.icon || ''
    const coverRaw = csvRow?.cover || ''
    const repoExists = !repoFilesError && repoFiles.length > 0
    const manifestCandidates = buildManifestCandidatesByCsvRow(repoFiles, csvRow)

    checks.push({
      title: 'index.csv / index_v2.csv 已新增资源行',
      status: csvRow ? 'pass' : 'fail',
      detail: csvRow ? `检测到新增行：${csvRow.id || csvRow.name}` : '未检测到 CSV 新增资源行（严重）'
    })

    const iconCheck = checkRawGithubUrl(iconRaw)
    checks.push({
      title: 'CSV icon 链接可访问且为 Raw，且非私有域名',
      status: iconCheck.ok ? 'pass' : 'fail',
      detail: iconCheck.reason
    })

    const coverCheck = checkRawGithubUrl(coverRaw)
    checks.push({
      title: 'CSV cover 链接可访问且为 Raw，且非私有域名',
      status: coverCheck.ok ? 'pass' : 'fail',
      detail: coverCheck.reason
    })

    checks.push({
      title: '资源目标仓库真实存在',
      status: repoExists ? 'pass' : 'fail',
      detail: repoExists ? '已可访问并读取仓库文件树' : (repoFilesError || '仓库不可访问')
    })

    checks.push({
      title: 'manifest 文件存在且 JSON 可解析',
      status: manifestData ? 'pass' : (manifestCandidates.length > 0 ? 'warn' : 'fail'),
      detail: manifestData ? 'manifest 解析成功' : (manifestLoadError || (manifestCandidates.length > 0 ? '存在 manifest 但未解析成功' : '仓库缺少 manifest_v2.json/manifest.json'))
    })

    const manifestName = toNonEmptyString((manifestData?.item as Record<string, unknown> | undefined)?.name)
    checks.push({
      title: 'manifest 名称与 CSV 名称一致',
      status: manifestName && resourceName ? (manifestName === resourceName ? 'pass' : 'fail') : 'warn',
      detail: manifestName && resourceName ? `manifest: ${manifestName} / csv: ${resourceName}` : '缺少可比对字段'
    })

    const downloads = manifestData?.downloads && typeof manifestData.downloads === 'object'
      ? Object.entries(manifestData.downloads as Record<string, Record<string, unknown>>)
      : []
    const unknownDeviceIds = downloads
      .map(([device]) => device)
      .filter((device) => !isKnownDeviceToken(device))
    checks.push({
      title: 'manifest downloads 设备标识有效性',
      status: downloads.length === 0 ? 'warn' : (unknownDeviceIds.length === 0 ? 'pass' : 'fail'),
      detail: downloads.length === 0 ? '未检测到 downloads 字典' : (unknownDeviceIds.length === 0 ? '设备标识均可识别（支持 v1 codename / v2 id）' : `未知设备标识：${unknownDeviceIds.join(', ')}`)
    })

    const missingDownloadFiles = downloads
      .map(([, item]) => toNonEmptyString(item?.file_name) || toNonEmptyString(item?.file))
      .filter((file) => file && !repoFiles.includes(file))
    checks.push({
      title: 'manifest downloads 文件存在性',
      status: downloads.length === 0 ? 'warn' : (missingDownloadFiles.length === 0 ? 'pass' : 'fail'),
      detail: downloads.length === 0 ? '未检测到 downloads 字典' : (missingDownloadFiles.length === 0 ? '下载文件均存在' : `缺失文件：${missingDownloadFiles.join(', ')}`)
    })

    checks.push({
      title: '资源内容合规性（人工审核）',
      status: 'manual',
      detail: '色情低俗/政治敏感/盗传/低质量/实际可运行等需人工确认'
    })

    return checks
  }, [csvRowFromPrDiff, manifestData, manifestLoadError, repoFiles, repoFilesError, submissionOverview.resourceInfo])

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

  const readRepoTextFile = async (repoOwner: string, repoName: string, ref: string, path: string): Promise<string> => {
    const encodedPath = path
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    if (!encodedPath) return ''

    const file = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${repoOwner}/${repoName}/contents/${encodedPath}?ref=${encodeURIComponent(ref || 'main')}`
    )
    if (!file.content) return ''
    if (file.encoding && file.encoding !== 'base64') return ''
    return decodeBase64Utf8(file.content.replace(/\n/g, ''))
  }

  const fetchRepoJsonFile = async (repoOwner: string, repoName: string, ref: string, path: string): Promise<Record<string, unknown> | null> => {
    try {
      const text = await readRepoTextFile(repoOwner, repoName, ref, path)
      if (!text) return null
      return JSON.parse(text) as Record<string, unknown>
    } catch {
      return null
    }
  }

  const loadRepoFiles = async (targetPr: PullListItem, csvRow: CsvV2Row | null): Promise<void> => {
    setRepoFilesError('')
    setRepoFiles([])
    setManifestData(null)
    setManifestFilePath('')
    setManifestLoadError('')

    try {
      if (!targetPr.resourceRepoOwner || !targetPr.resourceRepoName) {
        setRepoFilesError('无法从 PR 文件解析资源仓库信息')
        return
      }

      const repoBranch = targetPr.resourceRepoRef || 'main'
      const commit = await githubGet<{ commit?: { tree?: { sha?: string } } }>(
        `/repos/${targetPr.resourceRepoOwner}/${targetPr.resourceRepoName}/commits/${encodeURIComponent(repoBranch)}`
      )

      const treeSha = commit.commit?.tree?.sha
      if (!treeSha) {
        setRepoFiles([])
        return
      }

      const tree = await githubGet<{ tree?: Array<{ path?: string; type?: string }> }>(
        `/repos/${targetPr.resourceRepoOwner}/${targetPr.resourceRepoName}/git/trees/${treeSha}?recursive=1`
      )

      const files = (tree.tree || [])
        .filter((item) => item.type === 'blob' && item.path)
        .map((item) => item.path as string)
        .slice(0, 4000)
      setRepoFiles(files)
      setRepoPickerOpenFolders(getTopLevelFolders(files))

      const manifestCandidates = buildManifestCandidatesByCsvRow(files, csvRow)
      if (manifestCandidates.length === 0) {
        setManifestLoadError('仓库内未找到 manifest_v2.json 或 manifest.json')
        return
      }

      let bestManifest: Record<string, unknown> | null = null
      let bestManifestPath = ''
      let bestScore = -1

      for (const path of manifestCandidates) {
        const parsed = await fetchRepoJsonFile(targetPr.resourceRepoOwner, targetPr.resourceRepoName, repoBranch, path)
        if (!parsed) continue
        const item = (parsed.item && typeof parsed.item === 'object') ? (parsed.item as Record<string, unknown>) : {}
        const itemId = toNonEmptyString(item.id)
        const itemName = toNonEmptyString(item.name)
        let score = 0
        if (csvRow) {
          if (csvRow.id && itemId && csvRow.id === itemId) score += 2
          if (csvRow.name && itemName && csvRow.name === itemName) score += 2
          if (csvRow.id && !itemId && csvRow.name && itemName && csvRow.name === itemName) score += 1
        }
        if (score > bestScore) {
          bestScore = score
          bestManifest = parsed
          bestManifestPath = path
        }
        if (score >= 4) break
      }

      if (bestManifest) {
        setManifestData(bestManifest)
        setManifestFilePath(bestManifestPath)
      } else {
        setManifestLoadError('manifest 文件不存在或不是有效 JSON')
      }
    } catch (cause: unknown) {
      setRepoFilesError(cause instanceof Error ? cause.message : '加载资源仓库文件失败')
      setRepoFiles([])
      setManifestData(null)
      setManifestFilePath('')
      setManifestLoadError('')
    }
  }

  const loadPrDetails = async (targetPr: PullListItem): Promise<void> => {
    setDetailsLoading(true)
    setDetailsError('')
    setFilePickerSearch('')
    setSelectedPickerPath('')
    setSelectedPickerContent('')
    setSelectedPickerLine(null)
    setPickerLineSearch('')
    setPickerMatchCursor(-1)
    setPickerError('')
    setCsvRowFromPrDiff(null)

    try {
      const [pullDetail, comments, files] = await Promise.all([
        githubGet<{ body?: string }>(`/repos/${owner}/${repo}/pulls/${targetPr.number}`),
        fetchIssueComments(targetPr.number),
        githubGet<PullFileItem[]>(`/repos/${owner}/${repo}/pulls/${targetPr.number}/files?per_page=100`)
      ])

      const resolvedBody = pullDetail.body || targetPr.body
      const csvRows = parseCsvRowsFromPrPatch(files)
      const resolvedCsvRow = pickPreferredCsvRow(csvRows)
      const resourceRepoOwner = resolvedCsvRow?.repo_owner || targetPr.headOwner
      const resourceRepoName = resolvedCsvRow?.repo_name || targetPr.headRepo
      const resourceRepoRef = resolvedCsvRow?.repo_commit_hash || targetPr.headRef || 'main'
      const review = deriveReviewStatus(comments)

      const updatedPr: PullListItem = {
        ...targetPr,
        body: resolvedBody,
        review,
        status: review.state,
        resourceRepoOwner,
        resourceRepoName,
        resourceRepoRef
      }

      setSelectedPr(updatedPr)
      setPrComments(comments)
      setPrFiles(files)
      setCsvRowFromPrDiff(resolvedCsvRow)
      setPrPickerOpenFolders(getTopLevelFolders(files.map((file) => file.filename)))
      setPullRequests((prev) => prev.map((item) => (item.number === updatedPr.number ? updatedPr : item)))

      await loadRepoFiles(updatedPr, resolvedCsvRow)
    } catch (cause: unknown) {
      setDetailsError(cause instanceof Error ? cause.message : '加载 PR 详情失败')
      setPrComments([])
      setPrFiles([])
      setCsvRowFromPrDiff(null)
      setRepoFiles([])
      setManifestData(null)
      setManifestFilePath('')
      setManifestLoadError('')
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
            resourceRepoOwner: headOwner,
            resourceRepoName: headRepo,
            resourceRepoRef: headRef,
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
        setCsvRowFromPrDiff(null)
        setRepoFiles([])
        setManifestData(null)
        setManifestFilePath('')
        setManifestLoadError('')
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

  const getCommentTextareaElement = (): HTMLTextAreaElement | null => {
    const element = commentComposerWrapperRef.current?.querySelector('textarea')
    return element instanceof HTMLTextAreaElement ? element : null
  }

  const syncCommentCursor = () => {
    const textarea = getCommentTextareaElement()
    if (!textarea) return
    setCommentCursorStart(textarea.selectionStart)
    setCommentCursorEnd(textarea.selectionEnd)
  }

  const buildRepoBlobUrl = (path: string, forLineRef = false): string => {
    if (!selectedPr) return ''
    const ownerValue = filePickerTab === 'repo' ? selectedPr.resourceRepoOwner : selectedPr.headOwner
    const repoValue = filePickerTab === 'repo' ? selectedPr.resourceRepoName : selectedPr.headRepo
    const refValue = filePickerTab === 'repo' ? selectedPr.resourceRepoRef : selectedPr.headRef
    if (!ownerValue || !repoValue || !refValue) return ''
    const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
    const base = `https://github.com/${ownerValue}/${repoValue}/blob/${encodeURIComponent(refValue)}/${encodedPath}`
    return forLineRef ? `${base}` : base
  }

  const addCommentReference = (path: string, line: number | null) => {
    if (!path) return
    const baseUrl = buildRepoBlobUrl(path, true)
    if (!baseUrl) return
    const label = line ? `${path}#L${line}` : path
    const url = line ? `${baseUrl}#L${line}` : baseUrl
    const markdown = `[\`${label}\`](${url})`

    const source = commentMessage
    const start = commentCursorStart ?? source.length
    const end = commentCursorEnd ?? start
    const nextText = `${source.slice(0, start)}${markdown}${source.slice(end)}`
    const nextCursor = start + markdown.length
    setCommentMessage(nextText)
    setCommentCursorStart(nextCursor)
    setCommentCursorEnd(nextCursor)
    setCommentEditorTab('edit')

    window.requestAnimationFrame(() => {
      const textarea = getCommentTextareaElement()
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const isImageFile = (filename: string): boolean => /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i.test(filename)

  const openFilePicker = () => {
    syncCommentCursor()
    setFilePickerOpen(true)
    setFilePickerStep('file')
    setFilePickerTab('pr')
    setPrPickerOpenFolders(getTopLevelFolders(prFiles.map((file) => file.filename)))
    setRepoPickerOpenFolders(getTopLevelFolders(repoFiles))
    setFilePickerSearch('')
    setSelectedPickerPath('')
    setSelectedPickerContent('')
    setSelectedPickerLine(null)
    setPickerLineSearch('')
    setPickerMatchCursor(-1)
    setPickerError('')
    pickerLineRowRefs.current.clear()
  }

  const togglePickerFolder = (path: string) => {
    if (filePickerTab === 'pr') {
      setPrPickerOpenFolders((prev) => (prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]))
      return
    }
    setRepoPickerOpenFolders((prev) => (prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]))
  }

  const selectPickerPath = (path: string) => {
    setSelectedPickerPath(path)
    setSelectedPickerLine(null)
    setPickerLineSearch('')
    setPickerMatchCursor(-1)
    setPickerError('')
    pickerLineRowRefs.current.clear()
  }

  const readSelectedPickerFileContent = async (path: string): Promise<string> => {
    if (!selectedPr) return ''
    const ownerValue = filePickerTab === 'repo' ? selectedPr.resourceRepoOwner : selectedPr.headOwner
    const repoValue = filePickerTab === 'repo' ? selectedPr.resourceRepoName : selectedPr.headRepo
    const refValue = filePickerTab === 'repo' ? selectedPr.resourceRepoRef : selectedPr.headRef
    if (!ownerValue || !repoValue || !refValue) return ''

    return readRepoTextFile(ownerValue, repoValue, refValue, path)
  }

  const enterPickerLineStep = async () => {
    if (!selectedPickerPath || isImageFile(selectedPickerPath)) return
    setFilePickerStep('line')
    setPickerLineSearch('')
    setPickerMatchCursor(-1)
    setPickerError('')
    pickerLineRowRefs.current.clear()
    setPickerLoading(true)

    try {
      const text = await readSelectedPickerFileContent(selectedPickerPath)
      setSelectedPickerContent(text || '无法预览该文件内容（可能是二进制文件）')
    } catch (cause: unknown) {
      setPickerError(cause instanceof Error ? cause.message : '读取文件失败')
      setSelectedPickerContent('')
    } finally {
      setPickerLoading(false)
    }
  }

  const scrollToPickerLine = (lineNumber: number) => {
    const row = pickerLineRowRefs.current.get(lineNumber)
    row?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
  }

  const focusPickerMatchByCursor = () => {
    if (pickerMatchCursor < 0 || pickerMatchedLineNumbers.length === 0) return
    const lineNumber = pickerMatchedLineNumbers[pickerMatchCursor]
    setSelectedPickerLine(lineNumber)
    scrollToPickerLine(lineNumber)
  }

  useEffect(() => {
    if (!pickerLineSearch.trim()) {
      setPickerMatchCursor(-1)
      return
    }
    setPickerMatchCursor(pickerMatchedLineNumbers.length > 0 ? 0 : -1)
  }, [pickerLineSearch, pickerMatchedLineNumbers.length])

  useEffect(() => {
    focusPickerMatchByCursor()
  }, [pickerMatchCursor])

  const gotoNextPickerMatch = () => {
    const total = pickerMatchedLineNumbers.length
    if (total === 0) return
    setPickerMatchCursor((prev) => (prev + 1 + total) % total)
  }

  const gotoPrevPickerMatch = () => {
    const total = pickerMatchedLineNumbers.length
    if (total === 0) return
    setPickerMatchCursor((prev) => (prev - 1 + total) % total)
  }

  const insertSelectedFileReference = () => {
    if (!selectedPickerPath) return
    addCommentReference(selectedPickerPath, null)
    setFilePickerOpen(false)
  }

  const insertSelectedLineReference = () => {
    if (!selectedPickerPath || !selectedPickerLine) return
    addCommentReference(selectedPickerPath, selectedPickerLine)
    setFilePickerOpen(false)
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
                  <ArrowsClockwise size={14} weight="duotone" />
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
              <ReviewDetailHeader
                title={selectedPr.title}
                number={selectedPr.number}
                meta={(
                  <>
                    <Badge variant="secondary" className="h-6 gap-1.5 rounded-full px-2.5 text-xs">
                      <GitPullRequest size={14} weight="duotone" className="shrink-0" />
                      Open
                    </Badge>
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                      {selectedPr.authorAvatar ? (
                        <img src={selectedPr.authorAvatar} className="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" />
                      ) : (
                        <UserCircle size={16} weight="duotone" />
                      )}
                      <span className="truncate font-medium text-foreground">{selectedPr.author}</span>
                      <span className="shrink-0">opened {formatDate(selectedPr.createdAt)}</span>
                    </span>
                  </>
                )}
                actions={(
                  <>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3" disabled={detailsLoading} onClick={() => void refreshSelectedPrDetails()}>
                      <ArrowsClockwise size={16} weight="bold" />
                      刷新
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 px-3">
                      <a href={selectedPr.url} target="_blank" rel="noopener noreferrer">
                        <GithubLogo size={16} weight="duotone" />
                        GitHub
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
                  {detailsError ? <div className="text-xs text-destructive">{detailsError}</div> : null}
                  {repoFilesError ? <div className="text-xs text-destructive">{repoFilesError}</div> : null}
                  {detailsLoading ? <div className="text-xs text-muted-foreground">正在加载文件变更...</div> : null}

                  <div ref={commentComposerWrapperRef}>
                    <ReviewCommentComposer
                      avatarUrl={selectedPr.authorAvatar || ''}
                      tagEnabled={commentTagEnabled}
                      commentId={commentId}
                      commentMessage={commentMessage}
                      editorTab={commentEditorTab}
                      previewHtml={renderedCommentPreviewHtml}
                      canSubmit={canSubmitComment}
                      submitting={commentSubmitting}
                      submitButtonTitle={submitButtonTitle}
                      submitText={editingCommentTarget ? '更新评论' : '发送评论'}
                      showFilePickerButton
                      idPlaceholder="自定义 ID，例如 icon_png_check"
                      messagePlaceholder="评论说明（文件引用请用上方按钮插入）"
                      textareaClass="min-h-[140px]"
                      onCommentIdChange={setCommentId}
                      onCommentMessageChange={setCommentMessage}
                      onTagEnabledChange={setCommentTagEnabled}
                      onEditorTabChange={setCommentEditorTab}
                      onOpenFilePicker={openFilePicker}
                      onSubmit={() => void submitPresetComment()}
                      onCursorEvent={syncCommentCursor}
                    />
                  </div>

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

                  <div className="pt-1 text-xs font-medium text-muted-foreground">最近评论</div>
                  <ReviewCommentTimeline
                    comments={prComments}
                    lineLeft={54}
                    showOpenLink
                    showReplyAction
                    showEditAction
                    showDeleteAction
                    avatarRounded="full"
                    onReply={onReplyComment}
                    onEdit={onEditComment}
                    onDelete={onDeleteComment}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">资源提交信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoCell label="资源仓库" value={`${selectedPr.resourceRepoOwner}/${selectedPr.resourceRepoName}`} />
                    <InfoCell label="资源分支" value={selectedPr.resourceRepoRef || '-'} />
                    <InfoCell label="CSV 新增行" value={csvRowFromPrDiff ? (csvRowFromPrDiff.id || csvRowFromPrDiff.name || '-') : '-'} />
                    <InfoCell label="Manifest 路径" value={manifestFilePath || '-'} />
                  </div>

                  {manifestLoadError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{manifestLoadError}</div> : null}
                  {detailsLoading ? <div className="text-xs text-muted-foreground">正在加载文件变更...</div> : null}
                  {!detailsLoading && !hasSubmissionOverview ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                      未在 PR 内容中识别到结构化资源信息
                    </div>
                  ) : null}

                  {hasSubmissionOverview ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 xl:grid-cols-2">
                        <div className="rounded-md border border-border p-3">
                          <div className="mb-2 text-xs font-semibold text-muted-foreground">资源信息</div>
                          <div className="space-y-2">
                            {submissionOverview.resourceInfo.map((item) => (
                              <div key={item.key} className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between">
                                <span className="text-xs text-muted-foreground">{item.key}</span>
                                {hasUrl(item.value) ? (
                                  <span
                                    className="min-w-0 break-all text-sm font-medium text-foreground"
                                    dangerouslySetInnerHTML={{ __html: renderTextWithLinks(item.value || '-') }}
                                  />
                                ) : (
                                  <span className="min-w-0 break-all text-sm font-medium text-foreground">{item.value || '-'}</span>
                                )}
                              </div>
                            ))}
                            <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between">
                              <span className="text-xs text-muted-foreground">仓库信息</span>
                              {submissionOverview.repoUrl ? (
                                <a href={submissionOverview.repoUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-sm font-medium text-primary hover:underline">
                                  {submissionOverview.repoUrl}
                                </a>
                              ) : (
                                <span className="text-sm font-medium text-foreground">-</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                              <span className="text-xs text-muted-foreground">链接（manifest_v2.links）</span>
                              {submissionOverview.links.length > 0 ? (
                                <div className="space-y-1 text-sm font-medium text-foreground">
                                  {submissionOverview.links.map((link) => (
                                    <a
                                      key={`resource-links-${link.title}-${link.url}`}
                                      href={link.url || '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-primary hover:underline"
                                    >
                                      <span className="min-w-0 break-all text-foreground">{link.title || '-'}</span>
                                      {link.type ? <span className="min-w-0 break-all text-muted-foreground">{link.type}</span> : null}
                                      <span className="min-w-0 break-all">{link.url || '-'}</span>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-foreground">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border border-border p-3">
                          <div className="mb-2 text-xs font-semibold text-muted-foreground">支持设备</div>
                          <div className="space-y-2">
                            {groupedDownloads.map((group) => (
                              <div key={`${group.raw || group.file}-${group.version}`} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                                <div className="text-xs text-muted-foreground">支持设备：{formatDeviceLabels(group.devices) || '-'}</div>
                                <div className="mt-1 text-xs text-muted-foreground">版本：{group.version || '-'}</div>
                                <div className="mt-1 break-all text-xs text-muted-foreground">文件：{group.file || '-'}</div>
                                {group.raw ? (
                                  <a href={group.raw} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-primary hover:underline">
                                    {group.raw}
                                  </a>
                                ) : null}
                              </div>
                            ))}
                            {groupedDownloads.length === 0 ? (
                              <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground">
                                {formatDeviceLabels(submissionOverview.supportedDevices) || '-'}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-border p-3">
                        <div className="mb-2 text-xs font-semibold text-muted-foreground">图片资源（Raw）</div>
                        <div className="space-y-3">
                          {submissionOverview.images.icon || submissionOverview.images.cover ? (
                            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                              {submissionOverview.images.icon ? (
                                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                                  <div className="text-xs text-muted-foreground">Icon · {submissionOverview.images.icon.file}</div>
                                  <a href={submissionOverview.images.icon.url} target="_blank" rel="noopener noreferrer" className="mt-2 mx-auto flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/70">
                                    <img src={submissionOverview.images.icon.url} alt="Icon 预览" className="h-full w-full rounded-full object-contain p-3" loading="lazy" />
                                  </a>
                                </div>
                              ) : null}
                              {submissionOverview.images.cover ? (
                                <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                                  <div className="text-xs text-muted-foreground">Cover · {submissionOverview.images.cover.file}</div>
                                  <a href={submissionOverview.images.cover.url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-md border border-border/60 bg-background/70">
                                    <img src={submissionOverview.images.cover.url} alt="Cover 预览" className="max-h-[30vh] w-full object-contain" loading="lazy" />
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <PreviewImageCarousel items={submissionOverview.images.previews} emptyText="未检测到预览图" />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="text-xs font-semibold text-muted-foreground">规范自动检查</div>
                    {ruleChecks.map((item) => (
                      <div key={item.title} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <div className="flex items-start gap-2">
                          {item.status === 'pass' ? (
                            <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
                          ) : item.status === 'fail' ? (
                            <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-red-600" />
                          ) : item.status === 'warn' ? (
                            <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
                          ) : (
                            <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-slate-500" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{item.title}</div>
                            <div className="text-xs text-muted-foreground">{item.detail}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={filePickerOpen} onOpenChange={setFilePickerOpen}>
        <DialogContent className="h-[88vh] w-[96vw] max-w-[1360px] overflow-hidden p-0">
          <div className="flex h-full flex-col overflow-hidden">
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle>插入文件定位</DialogTitle>
              <DialogDescription>{filePickerStep === 'file' ? '第一步：先选择文件。' : '第二步：选择具体行并插入定位。'}</DialogDescription>
            </DialogHeader>

            {filePickerStep === 'file' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Tabs
                      value={filePickerTab}
                      onValueChange={(value) => {
                        setFilePickerTab(value as 'pr' | 'repo')
                        setSelectedPickerPath('')
                        setSelectedPickerLine(null)
                        setSelectedPickerContent('')
                        setPickerLineSearch('')
                        setPickerMatchCursor(-1)
                        setPickerError('')
                        setFilePickerStep('file')
                      }}
                    >
                      <TabsList className="grid w-[260px] grid-cols-2">
                        <TabsTrigger value="pr">PR 文件</TabsTrigger>
                        <TabsTrigger value="repo">作者仓库文件</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="text-xs text-muted-foreground">
                      {filePickerTab === 'pr' ? '来源：当前 PR 变更文件' : `来源：${selectedPr?.resourceRepoOwner || '-'} / ${selectedPr?.resourceRepoName || '-'}`}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Input value={filePickerSearch} onChange={(event) => setFilePickerSearch(event.target.value)} placeholder="筛选文件..." className="h-8 text-xs" />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3">
                  {pickerTreeItems.map((item) => (
                    <div key={`tree-${filePickerTab}-${item.type}-${item.path}`} className="mb-1" style={{ paddingLeft: `${0.5 + Math.min(item.depth, 8) * 0.7}rem` }}>
                      {item.type === 'folder' ? (
                        <button type="button" className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => togglePickerFolder(item.path)}>
                          {pickerOpenFolders.includes(item.path) ? <CaretDown size={13} weight="bold" className="shrink-0 text-muted-foreground" /> : <CaretRight size={13} weight="bold" className="shrink-0 text-muted-foreground" />}
                          <Folder size={14} weight="fill" className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition ${selectedPickerPath === item.path ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                          onClick={() => selectPickerPath(item.path)}
                        >
                          <File size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="shrink-0 border-t border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs text-muted-foreground">{selectedPickerPath ? `已选择：${selectedPickerPath}` : '请选择文件后继续'}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={!selectedPickerPath} onClick={insertSelectedFileReference}>直接插入文件</Button>
                      <Button size="sm" disabled={!selectedPickerPath || isImageFile(selectedPickerPath)} onClick={() => void enterPickerLineStep()}>下一步：选择具体行</Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFilePickerStep('file')}>
                          <ArrowLeft size={14} weight="bold" />
                        </Button>
                        <File size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                        <span className="truncate">{selectedPickerPath || '未选择文件'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" disabled={!selectedPickerPath} onClick={insertSelectedFileReference}>不选行，插入文件</Button>
                      <Button size="sm" disabled={!selectedPickerPath || !selectedPickerLine} onClick={insertSelectedLineReference}>插入行定位</Button>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 space-y-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={gotoNextPickerMatch}>
                      <MagnifyingGlass size={14} weight="bold" />
                    </Button>
                    <Input value={pickerLineSearch} onChange={(event) => setPickerLineSearch(event.target.value)} placeholder="搜索当前文件内容..." className="h-8 min-w-0 flex-1 text-xs" />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{pickerMatchedLineNumbers.length} 个匹配</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={pickerMatchedLineNumbers.length === 0} onClick={gotoPrevPickerMatch}>
                        <ArrowUp size={14} weight="bold" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={pickerMatchedLineNumbers.length === 0} onClick={gotoNextPickerMatch}>
                        <ArrowDown size={14} weight="bold" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/20 p-4">
                  {pickerLoading ? <div className="text-xs text-muted-foreground">加载文件内容中...</div> : null}
                  {!pickerLoading && pickerError ? <div className="text-xs text-destructive">{pickerError}</div> : null}
                  {!pickerLoading && !pickerError && !selectedPickerPath ? <div className="text-xs text-muted-foreground">请先返回上一步选择文件</div> : null}
                  {!pickerLoading && !pickerError && selectedPickerPath ? (
                    <div className="h-full font-mono text-xs leading-5">
                      {pickerContentLines.map((line, index) => {
                        const lineNumber = index + 1
                        const matched = pickerMatchedLineNumbers.includes(lineNumber)
                        const active = selectedPickerLine === lineNumber
                        return (
                          <button
                            key={`line-${lineNumber}`}
                            ref={(node) => {
                              if (!node) {
                                pickerLineRowRefs.current.delete(lineNumber)
                                return
                              }
                              pickerLineRowRefs.current.set(lineNumber, node)
                            }}
                            type="button"
                            className={`flex w-full items-start gap-3 rounded px-2 py-0.5 text-left hover:bg-accent/60 ${active ? 'bg-accent text-accent-foreground' : ''} ${matched ? 'ring-1 ring-primary/40' : ''}`}
                            onClick={() => setSelectedPickerLine(lineNumber)}
                          >
                            <span className="w-10 shrink-0 text-right text-muted-foreground">{lineNumber}</span>
                            <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

function InfoCell(props: { label: string; value: string }) {
  const { label, value } = props
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}
