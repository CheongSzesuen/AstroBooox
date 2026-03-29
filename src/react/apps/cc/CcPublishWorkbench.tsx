import {
  CaretDown,
  CaretRight,
  CheckCircle,
  DotsThreeVertical,
  File,
  FolderNotchOpenIcon,
  FolderPlus,
  GitBranch,
  MagnifyingGlass,
  NotePencil,
  Trash,
  UploadSimple
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  arrayBufferToBase64,
  base64ToText,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadOwnedResourceDetail,
  loadOwnedResources,
  loadRepositoryTree,
  putRepoFile,
  type LegacyCatalogEntry,
  type RepoTreeItem,
  textToBase64,
  updateCatalogInForkBranch,
  updateLegacyCatalogAndResourceJsonInForkBranch
} from '@/utils/resourcePublishApi'
import { listAuthenticatedRepositories, type GitHubOwnedRepositorySummary } from '@/utils/githubGitApi'
import { deviceSelectorEntries, deviceOptions, normalizeDeviceToken } from '@/react/apps/cc/resourcePublishWorkbenchDeviceCatalog'
import { buildRawGithubUrl } from '@/react/components/cc/resource-manifest'
import { PreviewImageCarousel, type PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'
import { LinkIconPickerDialog, PhosphorIconByName } from '@/react/components/cc/LinkIconPickerDialog'
import { WatchfaceIdEditor } from '@/react/components/cc/WatchfaceIdEditor'
import { Button } from '@/react/components/ui/button'
import { Badge } from '@/react/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/react/components/ui/command'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/react/components/ui/context-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/react/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/react/components/ui/dropdown-menu'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/react/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/react/components/ui/sheet'
import { Skeleton } from '@/react/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { Textarea } from '@/react/components/ui/textarea'

type PublishPreviewItem = PreviewImageItem & {
  id: string
  path: string
  objectUrl?: string
  fileObject?: File
}

type DeletedPreviewEntry = {
  id: string
  item: PublishPreviewItem
  originalIndex: number
  prevId: string | null
  nextId: string | null
}

type ExtraUploadFile = {
  id: string
  path: string
  fileName: string
  fileObject: File
}

type ManifestAuthorDraft = {
  name: string
  authorUrl: string
  bindABAccount: boolean
}

type ManifestLinkDraft = {
  icon: string
  title: string
  url: string
}

type ManifestDownloadDraft = {
  device: string
  version: string
  file_name: string
}

type RemotePickerMode = 'icon' | 'cover' | 'preview' | 'download'
type SubmitMode = 'v2' | 'v1' | 'both'

type ResourceEditContext = {
  resourceId: string
  targetRepo: string
  user: string
}

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const normalizeLower = (value: string): string => value.trim().toLowerCase()
const normalizeRepoPath = (value: string): string => value.trim().replace(/^\/+/, '')
const MAIN_BRANCH = 'main'
const MANIFEST_FILE = 'manifest_v2.json'
const LEGACY_MANIFEST_FILE = 'manifest.json'
const LEGACY_CATALOG_PATH = 'index.csv'
const LEGACY_RESOURCES_DIR = 'resources'
const PREVIEW_UNDO_LIMIT = 12
const REMOTE_PICKER_LOCAL_OPFS_ROOT = 'astrobooox-local'
const IMAGE_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']
const DESKTOP_PR_BODY_MIN_HEIGHT = 120

type Restype = 'quickapp' | 'watchface'
type StepKey = '0' | '1' | '2' | '3'

type ManifestDraft = {
  rawObject: Record<string, unknown> | null
  id: string
  name: string
  description: string
  restype: string
  icon: string
  cover: string
  previewPaths: string[]
}

type UpdateChangeBaseline = {
  name: string
  description: string
  restype: string
  paidType: string
  icon: string
  cover: string
  previews: string[]
  tags: string[]
  links: ManifestLinkDraft[]
  authors: ManifestAuthorDraft[]
  downloads: ManifestDownloadDraft[]
}

type WorkspaceFileHandle = {
  kind: 'file'
  name: string
  getFile: () => Promise<File>
}

type WorkspaceDirectoryHandle = {
  kind: 'directory'
  name: string
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<WorkspaceFileHandle>
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<WorkspaceDirectoryHandle>
  resolve?: (possibleDescendant: WorkspaceFileHandle) => Promise<string[] | null>
  [Symbol.asyncIterator]: () => AsyncIterableIterator<[string, WorkspaceFileHandle | WorkspaceDirectoryHandle]>
}

type PickedWorkspaceFile = {
  path: string
  file: File
}

type VisibleTreeItem = RepoTreeItem & { collapsed: boolean }

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const toString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const normalizeRestype = (value: string): Restype => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'watchface' || normalized === 'watch_face') {
    return 'watchface'
  }
  return 'quickapp'
}

const RELEASE_FOLDER_SUFFIX = '_AstroBox_Release'

const getDefaultV1AuthorUrl = (): string => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/publish`
}
const MAX_GITHUB_REPO_NAME_LENGTH = 100
const MAX_RELEASE_REPO_PREFIX_LENGTH = MAX_GITHUB_REPO_NAME_LENGTH - RELEASE_FOLDER_SUFFIX.length
const REPO_AUTOCOMPLETE_LIMIT = 8
const REPO_DIALOG_RESULT_LIMIT = 40

const stripReleaseFolderSuffix = (raw: string): string =>
  raw
    .trim()
    .replace(/_AstroBox_Release$/i, '')
    .replace(/_+$/g, '')

const toReleaseFolderName = (raw: string): string => {
  const normalized = stripReleaseFolderSuffix(raw)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const prefix = normalized || `Resource_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  return `${prefix}${RELEASE_FOLDER_SUFFIX}`
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const tokenizeSearch = (value: string): string[] =>
  value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

const buildOwnedRepoKeywords = (repo: GitHubOwnedRepositorySummary): string => (
  [
    repo.name,
    stripReleaseFolderSuffix(repo.name),
    repo.fullName,
    repo.description,
    repo.defaultBranch
  ]
    .join(' ')
    .toLowerCase()
)

const scoreOwnedRepoSearch = (repo: GitHubOwnedRepositorySummary, tokens: string[]): number => {
  if (tokens.length === 0) return 0
  const repoName = repo.name.toLowerCase()
  const strippedRepoName = stripReleaseFolderSuffix(repo.name).toLowerCase()
  const fullName = repo.fullName.toLowerCase()
  const keywords = buildOwnedRepoKeywords(repo)
  let score = 0

  for (const token of tokens) {
    if (!keywords.includes(token)) return -1
    if (repoName === token) {
      score += 260
      continue
    }
    if (strippedRepoName === token) {
      score += 220
      continue
    }
    if (repoName.startsWith(token)) {
      score += 180
      continue
    }
    if (strippedRepoName.startsWith(token)) {
      score += 160
      continue
    }
    if (fullName.startsWith(token)) {
      score += 130
      continue
    }
    if (repo.description.toLowerCase().includes(token)) {
      score += 70
      continue
    }
    score += 40
  }

  return score
}

const filterOwnedRepositories = (repositories: GitHubOwnedRepositorySummary[], query: string): GitHubOwnedRepositorySummary[] => {
  const tokens = tokenizeSearch(query)
  return [...repositories]
    .map((repo) => ({
      repo,
      score: scoreOwnedRepoSearch(repo, tokens)
    }))
    .filter((entry) => tokens.length === 0 || entry.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const updatedDiff = (b.repo.updatedAt || '').localeCompare(a.repo.updatedAt || '')
      if (updatedDiff !== 0) return updatedDiff
      return a.repo.name.localeCompare(b.repo.name, 'zh-CN')
    })
    .map((entry) => entry.repo)
}

const highlightMatchedText = (text: string, query: string) => {
  const tokens = Array.from(new Set(tokenizeSearch(query))).sort((a, b) => b.length - a.length)
  if (!text || tokens.length === 0) return text
  const pattern = new RegExp(`(${tokens.map((token) => escapeRegExp(token)).join('|')})`, 'ig')
  return text.split(pattern).map((part, index) => {
    const matched = tokens.some((token) => part.toLowerCase() === token)
    if (!matched) return <span key={`${part}-${index}`}>{part}</span>
    return (
      <mark key={`${part}-${index}`} className="rounded bg-primary/15 px-0.5 text-foreground">
        {part}
      </mark>
    )
  })
}

const formatRepoUpdatedAt = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未知'
  return date.toLocaleString('zh-CN', { hour12: false })
}

const validateGitHubRepoName = (name: string): string | null => {
  if (!name) return '名称不能为空'
  if (name.length > MAX_GITHUB_REPO_NAME_LENGTH) return `长度不能超过 ${MAX_GITHUB_REPO_NAME_LENGTH} 个字符`
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return '仅允许英文、数字、点号(.)、下划线(_)和连字符(-)'
  if (!/^[A-Za-z0-9]/.test(name) || !/[A-Za-z0-9]$/.test(name)) return '必须以英文或数字开头和结尾'
  if (name.includes('..')) return '不能包含连续点号(..)'
  if (/\.git$/i.test(name)) return '不能以 .git 结尾'
  return null
}

const isImagePath = (path: string): boolean => {
  const normalized = path.trim().toLowerCase()
  return IMAGE_FILE_EXTENSIONS.some((ext) => normalized.endsWith(ext))
}

const sanitizeRepoFileName = (name: string, fallback = ''): string => {
  const normalized = name
    .trim()
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001F]+/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
  return normalized || fallback
}

const sanitizeRepoFolderPath = (folderPath: string): string =>
  folderPath
    .split('/')
    .map((segment) => sanitizeRepoFileName(segment))
    .filter(Boolean)
    .join('/')

const FOLDER_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/

const isValidEnglishFolderSegment = (segment: string): boolean =>
  Boolean(segment) && FOLDER_SEGMENT_PATTERN.test(segment)

const findInvalidFolderSegmentFromPath = (path: string): { folderPath: string; segment: string } | null => {
  const normalized = normalizeRepoPath(path)
  if (!normalized) return null
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length <= 1) return null
  const folderSegments = segments.slice(0, -1)
  for (let i = 0; i < folderSegments.length; i++) {
    const segment = folderSegments[i]
    if (isValidEnglishFolderSegment(segment)) continue
    return {
      folderPath: folderSegments.slice(0, i + 1).join('/'),
      segment
    }
  }
  return null
}

const parseTagText = (raw: string): string[] => (
  raw
    .split(/[;；,，]/)
    .map((token) => token.trim())
    .filter(Boolean)
)

const getVisibleTreeItems = (tree: RepoTreeItem[], collapsedPaths: string[]): VisibleTreeItem[] => {
  const collapsedSet = new Set(collapsedPaths)
  const stack: string[] = []
  const visible: VisibleTreeItem[] = []

  for (const item of tree) {
    while (stack.length > item.depth) {
      stack.pop()
    }
    const hidden = stack.some((path) => collapsedSet.has(path))
    if (!hidden) {
      visible.push({
        ...item,
        collapsed: item.type === 'folder' && collapsedSet.has(item.path)
      })
    }
    if (item.type === 'folder') {
      stack.push(item.path)
    }
  }
  return visible
}

const formatCatalogRestype = (value: Restype): string => (value === 'watchface' ? 'watchface' : 'quick_app')
const formatLegacyRestype = (value: Restype): string => (value === 'watchface' ? 'watchface' : 'quickapp')

const formatResourceTypeForTitle = (value: Restype): string => (value === 'watchface' ? '表盘' : '快应用')
const formatPaidTypeLabel = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return '免费'
  if (normalized === 'paid') return '应用内付费（paid）'
  if (normalized === 'force_paid') return '强制付费（force_paid）'
  return normalized
}

const basenameFromPath = (path: string): string => {
  const normalized = path.split('/').filter(Boolean)
  return normalized[normalized.length - 1] || path
}

const cloneManifestObject = (value: Record<string, unknown> | null): Record<string, unknown> => {
  if (!value) return {}
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return {}
  }
}

const parseManifestDraft = (manifestText: string): ManifestDraft => {
  const fallback: ManifestDraft = {
    rawObject: null,
    id: '',
    name: '',
    description: '',
    restype: '',
    icon: '',
    cover: '',
    previewPaths: []
  }

  if (!manifestText.trim()) return fallback

  try {
    const root = asRecord(JSON.parse(manifestText))
    const item = asRecord(root.item)
    const previewSource = item.preview
    const previewPaths = Array.isArray(previewSource)
      ? previewSource.map((entry) => toString(entry)).filter(Boolean)
      : typeof previewSource === 'string'
        ? [toString(previewSource)].filter(Boolean)
        : []

    return {
      rawObject: root,
      id: toString(item.id),
      name: toString(item.name),
      description: toString(item.description) || toString(root.description),
      restype: toString(item.restype),
      icon: toString(item.icon),
      cover: toString(item.cover),
      previewPaths
    }
  } catch {
    return fallback
  }
}

const revokeLocalItems = (items: PublishPreviewItem[]) => {
  items.forEach((item) => {
    if (item.objectUrl) {
      URL.revokeObjectURL(item.objectUrl)
    }
  })
}

export function CcPublishWorkbench(props: {
  mode: 'publish' | 'resource_edit'
  token: string
  currentUser: string
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  editContext?: ResourceEditContext
}) {
  const {
    mode,
    token,
    currentUser,
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    editContext
  } = props
  const defaultSubmitMode: SubmitMode = mode === 'publish' ? 'both' : 'v2'

  const [step, setStep] = useState<StepKey>(mode === 'publish' ? '0' : '1')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDisplayPath, setWorkspaceDisplayPath] = useState('')
  const [workspaceFolderNameInput, setWorkspaceFolderNameInput] = useState('')
  const [workspaceHandle, setWorkspaceHandle] = useState<WorkspaceDirectoryHandle | null>(null)
  const [workspaceTree, setWorkspaceTree] = useState<RepoTreeItem[]>([])
  const [remoteWorkspacePath, setRemoteWorkspacePath] = useState('')
  const [remoteWorkspaceTree, setRemoteWorkspaceTree] = useState<RepoTreeItem[]>([])
  const [collapsedWorkspaceFolders, setCollapsedWorkspaceFolders] = useState<string[]>([])
  const [collapsedRemoteFolders, setCollapsedRemoteFolders] = useState<string[]>([])
  const [fileTreeTab, setFileTreeTab] = useState<'workspace' | 'remote'>('workspace')
  const [resourceId, setResourceId] = useState('')
  const [name, setName] = useState('')
  const [restype, setRestype] = useState<Restype>('quickapp')
  const [description, setDescription] = useState('')
  const [repoNameInput, setRepoNameInput] = useState('')
  const [repoDescription, setRepoDescription] = useState('')
  const [ownedRepoOptions, setOwnedRepoOptions] = useState<GitHubOwnedRepositorySummary[]>([])
  const [ownedRepoLoading, setOwnedRepoLoading] = useState(false)
  const [ownedRepoLoaded, setOwnedRepoLoaded] = useState(false)
  const [ownedRepoError, setOwnedRepoError] = useState('')
  const [repoAutocompleteOpen, setRepoAutocompleteOpen] = useState(false)
  const [repoSearchDialogOpen, setRepoSearchDialogOpen] = useState(false)
  const [repoSearchDialogQuery, setRepoSearchDialogQuery] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [coverPath, setCoverPath] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [deviceVendorsText, setDeviceVendorsText] = useState('')
  const [devicesText, setDevicesText] = useState('')
  const [paidType, setPaidType] = useState('')
  const [previewItems, setPreviewItems] = useState<PublishPreviewItem[]>([])
  const [extraFiles, setExtraFiles] = useState<ExtraUploadFile[]>([])
  const [authors, setAuthors] = useState<ManifestAuthorDraft[]>([{ name: '', authorUrl: '', bindABAccount: true }])
  const [links, setLinks] = useState<ManifestLinkDraft[]>([])
  const [downloads, setDownloads] = useState<ManifestDownloadDraft[]>([])
  const [deletedStack, setDeletedStack] = useState<DeletedPreviewEntry[]>([])
  const [submitMode, setSubmitMode] = useState<SubmitMode>(defaultSubmitMode)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapError, setBootstrapError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitLogs, setSubmitLogs] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingPr, setCreatingPr] = useState(false)
  const [hasUploadedInFlow, setHasUploadedInFlow] = useState(false)
  const [latestPrUrl, setLatestPrUrl] = useState('')
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [boundRepoOwner, setBoundRepoOwner] = useState('')
  const [boundRepoName, setBoundRepoName] = useState('')
  const [boundRepoBranch, setBoundRepoBranch] = useState('')
  const [boundRepoUrl, setBoundRepoUrl] = useState('')
  const [existingCommitSha, setExistingCommitSha] = useState('')
  const [baselineCatalogId, setBaselineCatalogId] = useState('')
  const [existingManifestObject, setExistingManifestObject] = useState<Record<string, unknown> | null>(null)
  const [updateChangeBaseline, setUpdateChangeBaseline] = useState<UpdateChangeBaseline | null>(null)
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [showResourceIdGuide, setShowResourceIdGuide] = useState(false)
  const [showOutOfWorkspaceFileDialog, setShowOutOfWorkspaceFileDialog] = useState(false)
  const [showImageValidationDialog, setShowImageValidationDialog] = useState(false)
  const [imageValidationMessage, setImageValidationMessage] = useState('')
  const [showFolderNameValidationDialog, setShowFolderNameValidationDialog] = useState(false)
  const [folderNameValidationMessage, setFolderNameValidationMessage] = useState('')
  const [showFileNameConflictDialog, setShowFileNameConflictDialog] = useState(false)
  const [fileNameConflictMessage, setFileNameConflictMessage] = useState('')
  const [showResourceInfoValidationDialog, setShowResourceInfoValidationDialog] = useState(false)
  const [resourceInfoValidationIssues, setResourceInfoValidationIssues] = useState<string[]>([])
  const [showSubmitVersionDialog, setShowSubmitVersionDialog] = useState(false)
  const [showUploadCompleteDialog, setShowUploadCompleteDialog] = useState(false)
  const [showRemoteFilePickerDialog, setShowRemoteFilePickerDialog] = useState(false)
  const [showLinkIconPicker, setShowLinkIconPicker] = useState(false)
  const [linkIconPickerIndex, setLinkIconPickerIndex] = useState<number | null>(null)
  const [linkPickerInitialQuery, setLinkPickerInitialQuery] = useState('')
  const [remotePickerMode, setRemotePickerMode] = useState<RemotePickerMode>('preview')
  const [remotePickerDeviceId, setRemotePickerDeviceId] = useState('')
  const [remotePickerSelectedPaths, setRemotePickerSelectedPaths] = useState<string[]>([])
  const [remotePickerTargetFolder, setRemotePickerTargetFolder] = useState('')
  const [remotePickerUploadFileName, setRemotePickerUploadFileName] = useState('')
  const [remotePickerStep, setRemotePickerStep] = useState<1 | 2>(1)
  const [remotePickerDraftFolders, setRemotePickerDraftFolders] = useState<string[]>([])
  const [remotePickerRenamingPath, setRemotePickerRenamingPath] = useState('')
  const [remotePickerRenamingName, setRemotePickerRenamingName] = useState('')
  const [opfsLocalPathSet, setOpfsLocalPathSet] = useState<Record<string, true>>({})
  const [opfsLocalPreviewUrlMap, setOpfsLocalPreviewUrlMap] = useState<Record<string, string>>({})
  const [desktopPrBodyMinHeight, setDesktopPrBodyMinHeight] = useState(DESKTOP_PR_BODY_MIN_HEIGHT)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  const leftRailRef = useRef<HTMLDivElement | null>(null)
  const mainWorkbenchCardRef = useRef<HTMLDivElement | null>(null)
  const prBodyTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const repoAutocompleteCloseTimerRef = useRef<number | null>(null)
  const remotePickerLocalInputRef = useRef<HTMLInputElement | null>(null)
  const remotePickerRenameInputRef = useRef<HTMLInputElement | null>(null)
  const previewItemsRef = useRef<PublishPreviewItem[]>([])
  const opfsLocalPreviewUrlMapRef = useRef<Record<string, string>>({})
  const deletedStackRef = useRef<DeletedPreviewEntry[]>([])
  const previousModeRef = useRef(mode)

  useEffect(() => {
    previewItemsRef.current = previewItems
  }, [previewItems])

  useEffect(() => {
    deletedStackRef.current = deletedStack
  }, [deletedStack])

  useEffect(() => {
    opfsLocalPreviewUrlMapRef.current = opfsLocalPreviewUrlMap
  }, [opfsLocalPreviewUrlMap])

  useEffect(() => {
    return () => {
      if (repoAutocompleteCloseTimerRef.current) {
        window.clearTimeout(repoAutocompleteCloseTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setOwnedRepoOptions([])
    setOwnedRepoLoading(false)
    setOwnedRepoLoaded(false)
    setOwnedRepoError('')
    setRepoAutocompleteOpen(false)
    setRepoSearchDialogOpen(false)
    setRepoSearchDialogQuery('')
  }, [currentUser, token])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 767px)')
    const handleChange = (event: MediaQueryListEvent): void => {
      setIsMobileViewport(event.matches)
    }
    setIsMobileViewport(media.matches)
    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    if (step !== '3') {
      setDesktopPrBodyMinHeight(DESKTOP_PR_BODY_MIN_HEIGHT)
      return
    }
    if (typeof window === 'undefined') return

    let rafId = 0
    const syncDesktopPrBodyHeight = (): void => {
      if (window.innerWidth < 1280) {
        setDesktopPrBodyMinHeight((prev) => (prev === DESKTOP_PR_BODY_MIN_HEIGHT ? prev : DESKTOP_PR_BODY_MIN_HEIGHT))
        return
      }

      const leftRail = leftRailRef.current
      const workbenchCard = mainWorkbenchCardRef.current
      const prBodyTextarea = prBodyTextareaRef.current
      if (!leftRail || !workbenchCard || !prBodyTextarea) return

      const leftBottom = leftRail.getBoundingClientRect().bottom
      const rightBottom = workbenchCard.getBoundingClientRect().bottom
      const currentHeight = prBodyTextarea.getBoundingClientRect().height
      const targetHeight = Math.max(DESKTOP_PR_BODY_MIN_HEIGHT, Math.round(currentHeight + (leftBottom - rightBottom)))
      setDesktopPrBodyMinHeight((prev) => (Math.abs(prev - targetHeight) <= 1 ? prev : targetHeight))
    }

    const queueSync = (): void => {
      if (rafId) window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        syncDesktopPrBodyHeight()
      })
    }

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(queueSync) : null
    if (observer) {
      if (leftRailRef.current) observer.observe(leftRailRef.current)
      if (mainWorkbenchCardRef.current) observer.observe(mainWorkbenchCardRef.current)
    }
    window.addEventListener('resize', queueSync)
    queueSync()

    return () => {
      window.removeEventListener('resize', queueSync)
      if (observer) observer.disconnect()
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [step])

  useEffect(() => {
    return () => {
      revokeLocalItems(previewItemsRef.current)
      revokeLocalItems(deletedStackRef.current.map((entry) => entry.item))
      Object.values(opfsLocalPreviewUrlMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  useEffect(() => {
    if (previousModeRef.current === mode) return
    previousModeRef.current = mode
    if (mode !== 'publish') return

    setStep(mode === 'publish' ? '0' : '1')
    setWorkspaceBusy(false)
    setWorkspaceName('')
    setWorkspaceDisplayPath('')
    setWorkspaceFolderNameInput('')
    setWorkspaceHandle(null)
    setWorkspaceTree([])
    setRemoteWorkspacePath('')
    setRemoteWorkspaceTree([])
    setCollapsedWorkspaceFolders([])
    setCollapsedRemoteFolders([])
    setFileTreeTab('workspace')
    setResourceId('')
    setName('')
    setRestype('quickapp')
    setDescription('')
    setRepoNameInput('')
    setRepoDescription('')
    setOwnedRepoOptions([])
    setOwnedRepoLoading(false)
    setOwnedRepoLoaded(false)
    setOwnedRepoError('')
    setRepoAutocompleteOpen(false)
    setRepoSearchDialogOpen(false)
    setRepoSearchDialogQuery('')
    setIconPath('')
    setCoverPath('')
    setTags([])
    setTagInput('')
    setDeviceVendorsText('')
    setDevicesText('')
    setPaidType('')
    setPreviewItems((prev) => {
      revokeLocalItems(prev)
      return []
    })
    setDeletedStack((prev) => {
      revokeLocalItems(prev.map((entry) => entry.item))
      return []
    })
    setExtraFiles([])
    setAuthors([{ name: currentUser.trim(), authorUrl: getDefaultV1AuthorUrl(), bindABAccount: true }])
    setLinks([])
    setDownloads([])
    setSubmitMode('both')
    setBootstrapError('')
    setSubmitError('')
    setSubmitLogs([])
    setLatestPrUrl('')
    setPrTitle('')
    setPrBody('')
    setHasUploadedInFlow(false)
    setBoundRepoOwner('')
    setBoundRepoName('')
    setBoundRepoBranch('')
    setBoundRepoUrl('')
    setExistingCommitSha('')
    setBaselineCatalogId('')
    setExistingManifestObject(null)
    setUpdateChangeBaseline(null)
    setShowDeviceSelector(false)
    setShowResourceIdGuide(false)
    setShowOutOfWorkspaceFileDialog(false)
    setShowImageValidationDialog(false)
    setImageValidationMessage('')
    setShowFolderNameValidationDialog(false)
    setFolderNameValidationMessage('')
    setShowFileNameConflictDialog(false)
    setFileNameConflictMessage('')
    setShowResourceInfoValidationDialog(false)
    setResourceInfoValidationIssues([])
    setShowSubmitVersionDialog(false)
    setShowUploadCompleteDialog(false)
    setShowRemoteFilePickerDialog(false)
    setShowLinkIconPicker(false)
    setLinkIconPickerIndex(null)
    setLinkPickerInitialQuery('')
    setRemotePickerMode('preview')
    setRemotePickerDeviceId('')
    setRemotePickerSelectedPaths([])
    setRemotePickerTargetFolder('')
    setRemotePickerUploadFileName('')
    setRemotePickerStep(1)
    setRemotePickerDraftFolders([])
    setRemotePickerRenamingPath('')
    setRemotePickerRenamingName('')
    setOpfsLocalPathSet({})
    Object.values(opfsLocalPreviewUrlMapRef.current).forEach((url) => {
      URL.revokeObjectURL(url)
    })
    opfsLocalPreviewUrlMapRef.current = {}
    setOpfsLocalPreviewUrlMap({})
  }, [currentUser, mode])

  useEffect(() => {
    if (mode !== 'publish') return
    if (authors.length !== 1) return
    if (authors[0].name.trim()) return
    if (!currentUser.trim()) return
    setAuthors([{ name: currentUser.trim(), authorUrl: getDefaultV1AuthorUrl(), bindABAccount: true }])
  }, [authors, currentUser, mode])

  useEffect(() => {
    if (mode !== 'resource_edit') {
      setBootstrapLoading(false)
      setBootstrapError('')
      setExistingManifestObject(null)
      setBaselineCatalogId('')
      setUpdateChangeBaseline(null)
      setBoundRepoOwner('')
      setBoundRepoName('')
      setBoundRepoBranch('')
      setBoundRepoUrl('')
      setExistingCommitSha('')
      setRepoAutocompleteOpen(false)
      setRepoSearchDialogOpen(false)
      setRepoSearchDialogQuery('')
      setRemoteWorkspacePath('')
      setRemoteWorkspaceTree([])
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const resolvedToken = token.trim()
        const fallbackUser = normalizeLower(currentUser)
        const targetUser = normalizeLower(editContext?.user || '') || fallbackUser
        const targetRepo = normalizeLower(editContext?.targetRepo || '')
        const targetResourceId = (editContext?.resourceId || '').trim()

        if (!resolvedToken) {
          throw new Error('更新资源需要先登录 Token')
        }
        if (!targetUser) {
          throw new Error('更新资源需要明确资源作者')
        }

        setBootstrapLoading(true)
        setBootstrapError('')

        const entries = await loadOwnedResources({
          token: resolvedToken,
          username: targetUser,
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: 'main',
          catalogPath: defaultCatalogPath.trim()
        })

        const matchedByRepo = targetRepo
          ? entries.filter((item) => {
              const full = `${normalizeLower(item.repo_owner)}/${normalizeLower(item.repo_name)}`
              const repoName = normalizeLower(item.repo_name)
              return full === targetRepo || repoName === targetRepo
            })
          : entries

        const target =
          matchedByRepo.find((item) => item.catalogId === targetResourceId) ||
          matchedByRepo.find((item) => item.name === targetResourceId) ||
          matchedByRepo[0]

        if (!target) {
          throw new Error('未找到要更新的资源，请检查 edit 参数')
        }

        const v1Ref = target.source === 'v1' ? target.repo_commit_hash : undefined
        const v2Ref = target.source === 'v2' ? target.repo_commit_hash : undefined

        const detail = await loadOwnedResourceDetail({
          token: resolvedToken,
          owner: target.repo_owner,
          repo: target.repo_name,
          ...(v1Ref ? { v1Ref } : {}),
          ...(v2Ref ? { v2Ref } : {})
        })

        const hasV2 = Boolean(detail.v2ManifestText)
        const defaultRepoBranch = detail.defaultBranch?.trim() || MAIN_BRANCH
        const activeRef = hasV2 ? (detail.v2Ref || defaultRepoBranch) : (detail.v1Ref || defaultRepoBranch)
        const activeManifestText = hasV2 ? detail.v2ManifestText : detail.v1ManifestText
        const parsed = parseManifestDraft(activeManifestText)
        const manifestRoot = asRecord(parsed.rawObject)
        const manifestItem = asRecord(manifestRoot.item)
        const parsedAuthors = (Array.isArray(manifestItem.author) ? manifestItem.author : [])
          .map((entry) => {
            const row = asRecord(entry)
            return {
              name: toString(row.name),
              authorUrl: toString(row.author_url),
              bindABAccount: row.bindABAccount === false ? false : true
            }
          })
          .filter((entry) => Boolean(entry.name))
        const parsedLinks = (Array.isArray(manifestRoot.links) ? manifestRoot.links : [])
          .map((entry) => {
            const row = asRecord(entry)
            return {
              icon: toString(row.icon),
              title: toString(row.title),
              url: toString(row.url)
            }
          })
          .filter((entry) => Boolean(entry.icon || entry.title || entry.url))
        const parsedDownloads = Object.entries(asRecord(manifestRoot.downloads))
          .map(([device, entry]) => {
            const row = asRecord(entry)
            return {
              device: device.trim(),
              version: toString(row.version),
              file_name: normalizeRepoPath(toString(row.file_name))
            }
          })
          .filter((entry) => Boolean(entry.device))

        if (cancelled) return

        const nextRestype = normalizeRestype(parsed.restype || target.restype)
        const nextTags = parseTagText(target.tags || '')
        const nextAuthors = parsedAuthors.length > 0
          ? parsedAuthors
          : [{ name: target.repo_owner || '', authorUrl: '', bindABAccount: true }]
        const nextLinks = parsedLinks
        const nextDownloads = parsedDownloads

        setResourceId(parsed.id || target.catalogId || targetResourceId)
        setName(parsed.name || target.name)
        setDescription(parsed.description || target.description || '')
        setRestype(nextRestype)
        setIconPath(parsed.icon || target.icon || '')
        setCoverPath(parsed.cover || target.cover || '')
        setTags(nextTags)
        setTagInput('')
        setDeviceVendorsText(target.device_vendors || '')
        setDevicesText(target.devices || '')
        setPaidType(target.paid_type || '')
        setRepoNameInput(target.repo_name || '')
        setRepoDescription(`AstroBooox resource ${target.catalogId || target.name}`)
        setBoundRepoOwner(target.repo_owner || '')
        setBoundRepoName(target.repo_name || '')
        setBoundRepoBranch(defaultRepoBranch)
        setBoundRepoUrl(`https://github.com/${target.repo_owner}/${target.repo_name}`)
        setExistingCommitSha(detail.latestCommitSha || target.repo_commit_hash || '')
        setBaselineCatalogId(target.catalogId || targetResourceId)
        setExistingManifestObject(parsed.rawObject)
        setUpdateChangeBaseline({
          name: (parsed.name || target.name).trim(),
          description: (parsed.description || target.description || '').trim(),
          restype: nextRestype.trim(),
          paidType: (target.paid_type || '').trim(),
          icon: (parsed.icon || target.icon || '').trim(),
          cover: (parsed.cover || target.cover || '').trim(),
          previews: parsed.previewPaths.map((path) => path.trim()).filter(Boolean),
          tags: nextTags.map((tag) => tag.trim()).filter(Boolean),
          links: nextLinks.map((link) => ({
            icon: link.icon.trim(),
            title: link.title.trim(),
            url: link.url.trim()
          })),
          authors: nextAuthors.map((author) => ({
            name: author.name.trim(),
            authorUrl: author.authorUrl.trim(),
            bindABAccount: Boolean(author.bindABAccount)
          })),
          downloads: nextDownloads.map((entry) => ({
            device: entry.device.trim(),
            version: entry.version.trim(),
            file_name: normalizeRepoPath(entry.file_name)
          }))
        })
        setHasUploadedInFlow(false)
        setSubmitMode('v2')
        setFileTreeTab('remote')
        setAuthors(nextAuthors)
        setLinks(nextLinks)
        setDownloads(nextDownloads)
        setExtraFiles([])
        setSubmitError('')
        setLatestPrUrl('')
        setPrTitle('')
        setPrBody('')
        setSubmitLogs([])
        setRemotePickerDraftFolders([])
        setRemotePickerRenamingPath('')
        setRemotePickerRenamingName('')
        setRemotePickerTargetFolder('')
        setRemotePickerUploadFileName('')
        setRemotePickerStep(1)

        const remotePreviews: PublishPreviewItem[] = parsed.previewPaths.map((path) => ({
          id: nextId(),
          path,
          file: basenameFromPath(path),
          url: /^https?:\/\//i.test(path)
            ? path
            : buildRawGithubUrl(detail.owner, detail.repo, activeRef || MAIN_BRANCH, normalizeRepoPath(path))
        }))

        setPreviewItems((prev) => {
          revokeLocalItems(prev)
          return remotePreviews
        })
        setDeletedStack((prev) => {
          revokeLocalItems(prev.map((entry) => entry.item))
          return []
        })

        void syncRemoteWorkspace(target.repo_owner, target.repo_name, defaultRepoBranch, true)
      } catch (cause: unknown) {
        if (cancelled) return
        setBootstrapError(cause instanceof Error ? cause.message : '加载更新资源信息失败')
      } finally {
        if (!cancelled) {
          setBootstrapLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [
    currentUser,
    defaultCatalogPath,
    defaultTargetOwner,
    defaultTargetRepo,
    editContext?.resourceId,
    editContext?.targetRepo,
    editContext?.user,
    mode,
    token
  ])

  const title = mode === 'resource_edit' ? '更新资源工作台' : '资源发布工作台'
  const isSubmitting = uploading || creatingPr

  const previewCarouselItems = useMemo<PreviewImageItem[]>(() => previewItems.map((item) => ({ file: item.file, url: item.url })), [previewItems])
  const normalizedPreviewPaths = useMemo(() => previewItems.map((item) => normalizeRepoPath(item.path)).filter(Boolean), [previewItems])

  const selectedUploadPaths = useMemo(() => {
    const paths = new Set<string>()
    if (submitMode === 'v2' || submitMode === 'both') {
      paths.add(MANIFEST_FILE)
    }
    if (submitMode === 'v1' || submitMode === 'both') {
      paths.add(LEGACY_MANIFEST_FILE)
    }
    if (iconPath.trim()) paths.add(normalizeRepoPath(iconPath))
    if (coverPath.trim()) paths.add(normalizeRepoPath(coverPath))
    previewItems.forEach((item) => {
      const path = normalizeRepoPath(item.path)
      if (path) {
        paths.add(path)
      }
    })
    downloads.forEach((item) => {
      const path = normalizeRepoPath(item.file_name)
      if (path) paths.add(path)
    })
    extraFiles.forEach((item) => {
      const path = normalizeRepoPath(item.path)
      if (path) {
        paths.add(path)
      }
    })
    return [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [coverPath, downloads, extraFiles, iconPath, previewItems, submitMode])

  const visibleWorkspaceItems = useMemo(
    () => getVisibleTreeItems(workspaceTree, collapsedWorkspaceFolders),
    [collapsedWorkspaceFolders, workspaceTree]
  )

  const visibleRemoteItems = useMemo(
    () => getVisibleTreeItems(remoteWorkspaceTree, collapsedRemoteFolders),
    [collapsedRemoteFolders, remoteWorkspaceTree]
  )

  const remotePickerDialogTitle = useMemo(
    () => (remotePickerStep === 1 ? '步骤 1/2：选择或新建文件夹' : '步骤 2/2：本地导入并选择文件'),
    [remotePickerStep]
  )

  const remotePickerDialogDescription = useMemo(
    () => (remotePickerStep === 1
      ? '先选择目标文件夹，再进入下一步选择文件'
      : remotePickerMode === 'preview'
        ? '支持多选，已上传到 OPFS 的文件也可直接选择'
        : '请选择一个文件路径'),
    [remotePickerMode, remotePickerStep]
  )

  const remotePickerFolderItems = useMemo(() => {
    const fromRemote = remoteWorkspaceTree.filter((item) => item.type === 'folder')
    const fromDraft: RepoTreeItem[] = remotePickerDraftFolders.map((path) => {
      const segments = path.split('/').filter(Boolean)
      return {
        type: 'folder',
        path,
        label: segments[segments.length - 1] || path,
        depth: Math.max(0, segments.length - 1)
      }
    })
    const dedup = new Map<string, RepoTreeItem>()
    ;[...fromRemote, ...fromDraft].forEach((item) => {
      if (!dedup.has(item.path)) {
        dedup.set(item.path, item)
      }
    })
    const folderTree = [...dedup.values()].sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
    return getVisibleTreeItems(folderTree, collapsedRemoteFolders)
  }, [collapsedRemoteFolders, remotePickerDraftFolders, remoteWorkspaceTree])

  const remotePickerTreeItems = useMemo(
    () => visibleRemoteItems.filter((item) => {
      if (item.type === 'folder') return true
      if (remotePickerMode === 'icon' || remotePickerMode === 'cover' || remotePickerMode === 'preview') {
        return isImagePath(item.path) || Boolean(opfsLocalPreviewUrlMap[item.path])
      }
      return true
    }),
    [opfsLocalPreviewUrlMap, remotePickerMode, visibleRemoteItems]
  )

  const remotePickerPreviewPath = useMemo(() => remotePickerSelectedPaths[0] || '', [remotePickerSelectedPaths])

  const remotePickerLocalItems = useMemo(
    () => Object.keys(opfsLocalPathSet)
      .filter((path) => {
        if (remotePickerMode === 'icon' || remotePickerMode === 'cover' || remotePickerMode === 'preview') {
          return isImagePath(path) || Boolean(opfsLocalPreviewUrlMap[path])
        }
        return true
      })
      .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [opfsLocalPathSet, opfsLocalPreviewUrlMap, remotePickerMode]
  )

  const resolvedRepoName = useMemo(() => {
    const normalizePrefix = (raw: string): string =>
      stripReleaseFolderSuffix(raw)
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

    const manualPrefix = normalizePrefix(repoNameInput)
    if (manualPrefix) return `${manualPrefix}${RELEASE_FOLDER_SUFFIX}`

    const fallbackPrefix = normalizePrefix((resourceId || name).trim().toLowerCase())
      .slice(0, MAX_RELEASE_REPO_PREFIX_LENGTH)
    if (!fallbackPrefix) return ''
    return `${fallbackPrefix}${RELEASE_FOLDER_SUFFIX}`
  }, [name, repoNameInput, resourceId])

  const ensureOwnedReposLoaded = async (): Promise<void> => {
    if (mode === 'resource_edit') return
    if (ownedRepoLoading || ownedRepoLoaded) return

    const resolvedToken = token.trim()
    const username = currentUser.trim()
    if (!resolvedToken || !username) return

    try {
      setOwnedRepoLoading(true)
      setOwnedRepoError('')
      const repositories = await listAuthenticatedRepositories({
        token: resolvedToken
      })
      const ownerLower = normalizeLower(username)
      setOwnedRepoOptions(
        repositories.filter((repo) => normalizeLower(repo.owner) === ownerLower)
      )
      setOwnedRepoLoaded(true)
    } catch (cause: unknown) {
      setOwnedRepoError(cause instanceof Error ? cause.message : '加载仓库列表失败')
    } finally {
      setOwnedRepoLoading(false)
    }
  }

  const ownedRepoAutocompleteItems = useMemo(
    () => filterOwnedRepositories(ownedRepoOptions, repoNameInput).slice(0, REPO_AUTOCOMPLETE_LIMIT),
    [ownedRepoOptions, repoNameInput]
  )

  const ownedRepoDialogItems = useMemo(
    () => filterOwnedRepositories(ownedRepoOptions, repoSearchDialogQuery).slice(0, REPO_DIALOG_RESULT_LIMIT),
    [ownedRepoOptions, repoSearchDialogQuery]
  )

  const exactMatchedOwnedRepo = useMemo(() => {
    const normalizedInput = normalizeLower(repoNameInput)
    if (!normalizedInput) return null
    return ownedRepoOptions.find((repo) => normalizeLower(repo.name) === normalizedInput) || null
  }, [ownedRepoOptions, repoNameInput])

  useEffect(() => {
    if (!exactMatchedOwnedRepo) return
    setRepoDescription(exactMatchedOwnedRepo.description.trim())
  }, [exactMatchedOwnedRepo])

  const selectOwnedRepo = (repo: GitHubOwnedRepositorySummary): void => {
    if (repoAutocompleteCloseTimerRef.current) {
      window.clearTimeout(repoAutocompleteCloseTimerRef.current)
      repoAutocompleteCloseTimerRef.current = null
    }
    setRepoNameInput(repo.name)
    setRepoDescription(repo.description.trim())
    setSubmitError('')
    setRepoAutocompleteOpen(false)
    setRepoSearchDialogOpen(false)
    setRepoSearchDialogQuery('')
  }

  const handleRepoNameInputChange = (value: string): void => {
    setRepoNameInput(value)
    setSubmitError('')
    const nextOpen = Boolean(value.trim())
    setRepoAutocompleteOpen(nextOpen)
    if (nextOpen) {
      void ensureOwnedReposLoaded()
    }
  }

  const handleRepoNameInputFocus = (): void => {
    if (repoAutocompleteCloseTimerRef.current) {
      window.clearTimeout(repoAutocompleteCloseTimerRef.current)
      repoAutocompleteCloseTimerRef.current = null
    }
    void ensureOwnedReposLoaded()
    if (!repoNameInput.trim()) return
    setRepoAutocompleteOpen(true)
  }

  const handleRepoNameInputBlur = (): void => {
    if (repoAutocompleteCloseTimerRef.current) {
      window.clearTimeout(repoAutocompleteCloseTimerRef.current)
    }
    repoAutocompleteCloseTimerRef.current = window.setTimeout(() => {
      setRepoAutocompleteOpen(false)
      repoAutocompleteCloseTimerRef.current = null
    }, 120)
  }

  const handleOpenRepoSearchDialog = (): void => {
    setRepoAutocompleteOpen(false)
    setRepoSearchDialogQuery(repoNameInput.trim())
    setRepoSearchDialogOpen(true)
    void ensureOwnedReposLoaded()
  }

  const handleRepoSearchDialogOpenChange = (open: boolean): void => {
    setRepoSearchDialogOpen(open)
    if (!open) {
      setRepoSearchDialogQuery('')
      return
    }
    if (!repoSearchDialogQuery.trim()) {
      setRepoSearchDialogQuery(repoNameInput.trim())
    }
    void ensureOwnedReposLoaded()
  }

  const linksValidationMessage = useMemo(() => {
    const validate = (raw: string): string | null => {
      const value = raw.trim()
      if (!value) return 'URL 不能为空'
      if (!/^https:\/\//i.test(value)) return 'URL 必须以 https:// 开头'
      try {
        const parsed = new URL(value)
        if (parsed.protocol !== 'https:') return 'URL 必须使用 https 协议'
      } catch {
        return 'URL 格式不合法'
      }
      return null
    }

    for (let i = 0; i < links.length; i++) {
      const row = links[i]
      const hasValue = Boolean(row.icon.trim() || row.title.trim() || row.url.trim())
      if (!hasValue) continue
      const error = validate(row.url)
      if (error) return `第 ${i + 1} 个相关链接：${error}`
    }
    return ''
  }, [links])

  const resourceIdValidationMessage = useMemo(() => {
    const value = resourceId.trim()
    if (!value) return '请填写资源 ID'
    if (restype === 'watchface' && !/^\d{12}$/.test(value)) {
      return '表盘资源 ID 必须是 12 位纯数字'
    }
    return ''
  }, [resourceId, restype])

  const v1AuthorValidationMessage = useMemo(() => {
    if (!(submitMode === 'v1' || submitMode === 'both')) return ''

    const rows = authors
      .map((author, index) => ({
        index,
        name: author.name.trim(),
        authorUrl: author.authorUrl.trim()
      }))
      .filter((row) => row.name || row.authorUrl)

    if (rows.length === 0) return '提交 v1 时，至少要填写 1 条作者信息（name + author_url）'

    for (const row of rows) {
      if (!row.name) return `第 ${row.index + 1} 个作者缺少名称`
      if (!row.authorUrl) return `第 ${row.index + 1} 个作者缺少 author_url`
      try {
        const parsed = new URL(row.authorUrl)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return `第 ${row.index + 1} 个作者的 author_url 仅支持 http/https`
        }
      } catch {
        return `第 ${row.index + 1} 个作者的 author_url 格式不合法`
      }
    }
    return ''
  }, [authors, submitMode])

  const canUpload = useMemo(() => {
    const needV2Catalog = submitMode === 'v2' || submitMode === 'both'
    const baseReady = Boolean(
      token.trim() &&
      currentUser.trim() &&
      !resourceIdValidationMessage &&
      name.trim() &&
      iconPath.trim() &&
      coverPath.trim() &&
      defaultTargetOwner.trim() &&
      defaultTargetRepo.trim() &&
      (!needV2Catalog || defaultCatalogPath.trim())
    )
    if (!baseReady || bootstrapLoading || isSubmitting || Boolean(linksValidationMessage) || Boolean(v1AuthorValidationMessage)) return false

    if (mode === 'resource_edit') {
      return Boolean(boundRepoOwner.trim() && boundRepoName.trim())
    }
    return Boolean(resolvedRepoName && workspaceHandle)
  }, [
    bootstrapLoading,
    boundRepoName,
    boundRepoOwner,
    coverPath,
    currentUser,
    defaultCatalogPath,
    defaultTargetOwner,
    defaultTargetRepo,
    iconPath,
    isSubmitting,
    mode,
    name,
    workspaceHandle,
    resolvedRepoName,
    resourceIdValidationMessage,
    submitMode,
    token,
    linksValidationMessage,
    v1AuthorValidationMessage
  ])

  const canCreatePr = useMemo(
    () => Boolean(
      canUpload &&
      hasUploadedInFlow &&
      boundRepoOwner.trim() &&
      boundRepoName.trim() &&
      existingCommitSha.trim() &&
      defaultTargetOwner.trim() &&
      defaultTargetRepo.trim() &&
      (submitMode === 'v1' || defaultCatalogPath.trim()) &&
      prTitle.trim()
    ),
    [
      boundRepoName,
      boundRepoOwner,
      canUpload,
      defaultCatalogPath,
      defaultTargetOwner,
      defaultTargetRepo,
      existingCommitSha,
      hasUploadedInFlow,
      prTitle,
      submitMode
    ]
  )

  const submitModeLabel = useMemo(() => {
    if (submitMode === 'both') return 'v1 + v2'
    if (submitMode === 'v1') return '仅 v1'
    return '仅 v2'
  }, [submitMode])

  const submitModeOptions = useMemo<Array<{ value: SubmitMode; label: string; variant: 'default' | 'outline' }>>(
    () => [
      { value: 'both', label: mode === 'resource_edit' ? '同时更新 v1 + v2（推荐）' : '同时提交 v1 + v2（推荐）', variant: 'default' },
      { value: 'v2', label: mode === 'resource_edit' ? '仅更新 v2' : '仅提交 v2', variant: 'outline' },
      { value: 'v1', label: mode === 'resource_edit' ? '仅更新 v1' : '仅提交 v1', variant: 'outline' }
    ],
    [mode]
  )

  const isWorkspaceStepDone = mode === 'resource_edit'
    ? true
    : Boolean(workspaceHandle || workspaceDisplayPath.trim())

  const selectedDeviceIds = useMemo(
    () => [...new Set(downloads.map((item) => item.device.trim()).filter(Boolean))],
    [downloads]
  )

  const normalizedTagsText = useMemo(
    () => tags.map((tag) => tag.trim()).filter(Boolean).join(';'),
    [tags]
  )

  const areDownloadsComplete = useMemo(
    () => (
      selectedDeviceIds.length > 0 &&
      selectedDeviceIds.every((deviceId) => {
        const matched = downloads.find((item) => item.device.trim() === deviceId)
        return Boolean(matched && matched.version.trim() && matched.file_name.trim())
      })
    ),
    [downloads, selectedDeviceIds]
  )

  const isResourceInfoStepDone = Boolean(
    !resourceIdValidationMessage &&
    name.trim() &&
    iconPath.trim() &&
    coverPath.trim() &&
    normalizedTagsText &&
    areDownloadsComplete &&
    !linksValidationMessage
  )
  const isUploadStepDone = Boolean(hasUploadedInFlow && existingCommitSha.trim() && boundRepoOwner.trim() && boundRepoName.trim())
  const isSubmitStepDone = Boolean(latestPrUrl)

  const stepItems = useMemo(() => {
    const items: Array<{ value: StepKey; label: string; done: boolean }> = []
    if (mode === 'publish') {
      items.push({ value: '0', label: '创建文件夹', done: isWorkspaceStepDone })
    }
    items.push(
      { value: '1', label: '资源信息', done: isResourceInfoStepDone },
      { value: '2', label: '上传资源仓库', done: isUploadStepDone },
      { value: '3', label: '提交 Pull Request', done: isSubmitStepDone }
    )
    return items
  }, [isResourceInfoStepDone, isSubmitStepDone, isUploadStepDone, isWorkspaceStepDone, mode])

  const appendLog = (message: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setSubmitLogs((prev) => [...prev, `[${time}] ${message}`].slice(-220))
  }

  const canGoNextStep = useMemo(() => {
    if (step === '0') return isWorkspaceStepDone
    if (step === '1') return isResourceInfoStepDone
    if (step === '2') return isUploadStepDone
    return false
  }, [isResourceInfoStepDone, isUploadStepDone, isWorkspaceStepDone, step])

  const canAccessStep = (nextStep: StepKey): boolean => {
    if (mode === 'resource_edit') {
      if (nextStep === '1') return true
      if (nextStep === '2') return isResourceInfoStepDone
      if (nextStep === '3') return isUploadStepDone
      return false
    }
    if (nextStep === '0') return true
    if (nextStep === '1') return isWorkspaceStepDone
    if (nextStep === '2') return isResourceInfoStepDone
    if (nextStep === '3') return isUploadStepDone
    return false
  }

  const goToStep = (nextStep: StepKey) => {
    if (!canAccessStep(nextStep)) {
      appendLog('请先完成前一步后再继续')
      return
    }
    setStep(nextStep)
  }

  const goPrevStep = () => {
    const index = stepItems.findIndex((item) => item.value === step)
    if (index <= 0) return
    goToStep(stepItems[index - 1].value)
  }

  const goNextStep = () => {
    if (step === '1') {
      openSubmitVersionDialog()
      return
    }
    const index = stepItems.findIndex((item) => item.value === step)
    if (index < 0 || index >= stepItems.length - 1) return
    goToStep(stepItems[index + 1].value)
  }

  const openSubmitVersionDialog = () => {
    const issues: string[] = []
    if (resourceIdValidationMessage) issues.push(resourceIdValidationMessage)
    if (!name.trim()) issues.push('请填写资源名称')
    if (!iconPath.trim()) issues.push('请选择图标文件')
    if (!coverPath.trim()) issues.push('请选择封面文件')
    if (!normalizedTagsText) issues.push('请至少添加一个标签')
    if (selectedDeviceIds.length === 0) {
      issues.push('请至少选择一个支持设备')
    } else {
      for (const deviceId of selectedDeviceIds) {
        const entry = downloads.find((item) => item.device.trim() === deviceId)
        if (!entry) {
          issues.push(`设备 ${deviceId} 缺少下载信息`)
          continue
        }
        const missingParts: string[] = []
        if (!entry.version.trim()) missingParts.push('版本号')
        if (!entry.file_name.trim()) missingParts.push('文件路径')
        if (missingParts.length > 0) {
          issues.push(`设备 ${deviceId} 缺少${missingParts.join('、')}`)
        }
      }
    }
    if (linksValidationMessage) {
      issues.push(linksValidationMessage)
    }

    if (issues.length > 0) {
      setResourceInfoValidationIssues(issues)
      setShowResourceInfoValidationDialog(true)
      appendLog(`请先完成资源信息：${issues[0]}`)
      return
    }
    setShowSubmitVersionDialog(true)
  }

  const confirmSubmitMode = (modeValue: SubmitMode) => {
    setSubmitMode(modeValue)
    setShowSubmitVersionDialog(false)
    goToStep('2')
  }

  const toggleWorkspaceFolder = (path: string) => {
    setCollapsedWorkspaceFolders((prev) => (
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]
    ))
  }

  const toggleRemoteFolder = (path: string) => {
    setCollapsedRemoteFolders((prev) => (
      prev.includes(path) ? prev.filter((item) => item !== path) : [...prev, path]
    ))
  }

  const readFileTextByPath = async (root: WorkspaceDirectoryHandle, relativePath: string): Promise<string | null> => {
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length === 0) return null

    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        current = await current.getDirectoryHandle(parts[i])
      } catch {
        return null
      }
    }

    try {
      const handle = await current.getFileHandle(parts[parts.length - 1])
      const file = await handle.getFile()
      return file.text()
    } catch {
      return null
    }
  }

  const readFileByPath = async (root: WorkspaceDirectoryHandle, relativePath: string): Promise<File | null> => {
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length === 0) return null

    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        current = await current.getDirectoryHandle(parts[i])
      } catch {
        return null
      }
    }
    try {
      const handle = await current.getFileHandle(parts[parts.length - 1])
      return await handle.getFile()
    } catch {
      return null
    }
  }

  const collectWorkspaceTree = async (
    dir: WorkspaceDirectoryHandle,
    depth = 0,
    prefix = ''
  ): Promise<RepoTreeItem[]> => {
    const folders: Array<{ name: string; handle: WorkspaceDirectoryHandle }> = []
    const files: string[] = []

    for await (const [name, handle] of dir) {
      if (name.startsWith('.')) continue
      if (handle.kind === 'directory') {
        folders.push({ name, handle: handle as WorkspaceDirectoryHandle })
      } else {
        files.push(name)
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    files.sort((a, b) => a.localeCompare(b, 'zh-CN'))

    const items: RepoTreeItem[] = []
    for (const folder of folders) {
      const folderPath = prefix ? `${prefix}/${folder.name}` : folder.name
      items.push({
        type: 'folder',
        label: folder.name,
        path: folderPath,
        depth
      })
      const children = await collectWorkspaceTree(folder.handle, depth + 1, folderPath)
      items.push(...children)
    }

    for (const fileName of files) {
      const filePath = prefix ? `${prefix}/${fileName}` : fileName
      items.push({
        type: 'file',
        label: fileName,
        path: filePath,
        depth
      })
    }

    return items
  }

  const syncRemoteWorkspace = async (owner: string, repo: string, branch = MAIN_BRANCH, shouldLog = true) => {
    const accessToken = token.trim()
    const normalizedOwner = owner.trim()
    const normalizedRepo = repo.trim()
    const normalizedBranch = branch.trim() || MAIN_BRANCH
    if (!accessToken || !normalizedOwner || !normalizedRepo) return
    try {
      const tree = await loadRepositoryTree({
        token: accessToken,
        owner: normalizedOwner,
        repo: normalizedRepo,
        branch: normalizedBranch
      })
      setRemoteWorkspacePath(`${normalizedOwner}/${normalizedRepo}@${normalizedBranch}`)
      setRemoteWorkspaceTree(tree)
      if (shouldLog) appendLog('已同步远程仓库文件树')
    } catch (cause: unknown) {
      if (shouldLog) {
        appendLog(`远程文件树同步失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
      }
    }
  }

  const scanWorkspace = async (handle: WorkspaceDirectoryHandle, forceSync = false) => {
    try {
      const manifest = await readFileTextByPath(handle, MANIFEST_FILE)
      const tree = await collectWorkspaceTree(handle)
      setWorkspaceTree(tree)

      if (manifest) {
        const parsed = parseManifestDraft(manifest)
        const root = asRecord(parsed.rawObject)
        const item = asRecord(root.item)
        const parsedAuthors = (Array.isArray(item.author) ? item.author : [])
          .map((entry) => {
            const row = asRecord(entry)
            return {
              name: toString(row.name),
              authorUrl: toString(row.author_url),
              bindABAccount: row.bindABAccount === false ? false : true
            }
          })
          .filter((entry) => Boolean(entry.name))
        const parsedLinks = (Array.isArray(root.links) ? root.links : [])
          .map((entry) => {
            const row = asRecord(entry)
            return {
              icon: toString(row.icon),
              title: toString(row.title),
              url: toString(row.url)
            }
          })
          .filter((entry) => Boolean(entry.icon || entry.title || entry.url))
        const parsedDownloads = Object.entries(asRecord(root.downloads))
          .map(([rawDeviceId, entry]) => {
            const row = asRecord(entry)
            const normalizedId = normalizeDeviceToken(rawDeviceId)
            return {
              device: normalizedId,
              version: toString(row.version) || '1.0.0',
              file_name: normalizeRepoPath(toString(row.file_name))
            }
          })
          .filter((entry) => Boolean(entry.device))

        if (forceSync || !resourceId.trim()) setResourceId(parsed.id)
        if (forceSync || !name.trim()) setName(parsed.name)
        if (forceSync || !description.trim()) setDescription(parsed.description)
        if (forceSync || !iconPath.trim()) setIconPath(parsed.icon)
        if (forceSync || !coverPath.trim()) setCoverPath(parsed.cover)
        if (forceSync || !restype.trim()) setRestype(normalizeRestype(parsed.restype || 'quickapp'))
        if (forceSync || authors.length === 0 || !authors.some((entry) => entry.name.trim())) {
          setAuthors(parsedAuthors.length > 0 ? parsedAuthors : [{ name: currentUser.trim(), authorUrl: '', bindABAccount: true }])
        }
        if (forceSync || links.length === 0) setLinks(parsedLinks)
        if (forceSync || downloads.length === 0) setDownloads(parsedDownloads)
        if (forceSync || previewItems.length === 0) {
          setPreviewItems(parsed.previewPaths.map((path) => ({
            id: nextId(),
            path,
            file: basenameFromPath(path),
            url: path
          })))
          setDeletedStack([])
        }
      }

      setHasUploadedInFlow(false)
      setLatestPrUrl('')
      appendLog('目录扫描完成')
    } catch (cause: unknown) {
      appendLog(`扫描目录失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
    }
  }

  const ensureWorkspaceHandle = async (): Promise<WorkspaceDirectoryHandle | null> => {
    if (workspaceHandle) return workspaceHandle
    if (typeof window.showDirectoryPicker !== 'function') {
      appendLog('当前浏览器不支持 FSA API')
      return null
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: 'resource-workspace',
        mode: 'readwrite'
      }) as unknown as WorkspaceDirectoryHandle
      setWorkspaceHandle(handle)
      setWorkspaceName(handle.name)
      setWorkspaceDisplayPath(handle.name)
      setFileTreeTab('workspace')
      if (!workspaceFolderNameInput.trim()) {
        setWorkspaceFolderNameInput(stripReleaseFolderSuffix(handle.name))
      }
      await scanWorkspace(handle, true)
      appendLog(`已重新授权工作区: ${handle.name}`)
      return handle
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.name === 'AbortError') return null
      appendLog(`重新授权工作区失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
      return null
    }
  }

  const selectWorkspace = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      appendLog('当前浏览器不支持 FSA API')
      return
    }
    try {
      setWorkspaceBusy(true)
      const handle = await window.showDirectoryPicker({
        id: 'resource-workspace',
        mode: 'readwrite'
      }) as unknown as WorkspaceDirectoryHandle
      setWorkspaceHandle(handle)
      setWorkspaceName(handle.name)
      setWorkspaceDisplayPath(handle.name)
      setFileTreeTab('workspace')
      setWorkspaceFolderNameInput(stripReleaseFolderSuffix(handle.name))
      appendLog(`已选择工作区: ${handle.name}`)
      await scanWorkspace(handle, true)
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      appendLog(`选择工作区失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
    } finally {
      setWorkspaceBusy(false)
    }
  }

  const createWorkspaceFolder = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      appendLog('当前浏览器不支持 FSA API')
      return
    }
    try {
      setWorkspaceBusy(true)
      const parent = await window.showDirectoryPicker({
        id: 'resource-workspace-parent',
        mode: 'readwrite'
      }) as unknown as WorkspaceDirectoryHandle
      const folderName = toReleaseFolderName(workspaceFolderNameInput)
      const validationError = validateGitHubRepoName(folderName)
      if (validationError) {
        setFolderNameValidationMessage(`文件夹名不符合 GitHub 仓库命名要求：${validationError}`)
        setShowFolderNameValidationDialog(true)
        return
      }
      const handle = await parent.getDirectoryHandle(folderName, { create: true })
      setWorkspaceHandle(handle)
      setWorkspaceName(handle.name)
      setWorkspaceDisplayPath(`${parent.name}/${folderName}`)
      setFileTreeTab('workspace')
      setWorkspaceFolderNameInput(stripReleaseFolderSuffix(folderName))
      appendLog(`已创建并切换目录: ${folderName}`)
      await scanWorkspace(handle, true)
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.name === 'AbortError') return
      appendLog(`创建文件夹失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
    } finally {
      setWorkspaceBusy(false)
    }
  }

  const refreshWorkspaceFileTree = async () => {
    if (!workspaceHandle) {
      setWorkspaceTree([])
      setWorkspaceDisplayPath('')
      setWorkspaceName('')
      setWorkspaceFolderNameInput('')
      appendLog('目录访问权限已失效，请重新授权。')
      return
    }
    await scanWorkspace(workspaceHandle, false)
  }

  const pickFilesFromWorkspace = async (options: {
    multiple?: boolean
    accept?: Record<string, string[]>
  }): Promise<PickedWorkspaceFile[]> => {
    const workspace = await ensureWorkspaceHandle()
    if (!workspace) return []

    const picker = (window as unknown as {
      showOpenFilePicker?: (options: Record<string, unknown>) => Promise<WorkspaceFileHandle[]>
    }).showOpenFilePicker

    if (typeof picker !== 'function') {
      appendLog('当前浏览器不支持文件选择器 API')
      return []
    }

    try {
      const handles = await picker({
        multiple: Boolean(options.multiple),
        startIn: workspace as unknown as FileSystemDirectoryHandle,
        ...(options.accept
          ? {
              types: [
                {
                  description: 'files',
                  accept: options.accept
                }
              ]
            }
          : {})
      })

      if (!handles || handles.length === 0) return []

      const picked: PickedWorkspaceFile[] = []
      for (const handle of handles) {
        let path = handle.name
        if (typeof workspace.resolve === 'function') {
          const relative = await workspace.resolve(handle)
          if (!relative || relative.length === 0) {
            setShowOutOfWorkspaceFileDialog(true)
            return []
          }
          path = relative.join('/')
        }
        picked.push({
          path,
          file: await handle.getFile()
        })
      }
      return picked
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.name === 'AbortError') return []
      appendLog(`选择文件失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
      return []
    }
  }

  const upsertExtraFiles = (picked: PickedWorkspaceFile[]) => {
    if (picked.length === 0) return
    setExtraFiles((prev) => {
      const map = new Map(prev.map((item) => [item.path, item]))
      picked.forEach((item) => {
        const path = normalizeRepoPath(item.path)
        map.set(path, {
          id: map.get(path)?.id || nextId(),
          path,
          fileName: item.file.name,
          fileObject: item.file
        })
      })
      return [...map.values()]
    })
  }

  const getImageSize = async (file: File): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  }

  const showInvalidImageDialog = (message: string) => {
    setImageValidationMessage(message)
    setShowImageValidationDialog(true)
  }

  const validateIconImage = async (file: File): Promise<boolean> => {
    try {
      const { width, height } = await getImageSize(file)
      if (width !== height) {
        showInvalidImageDialog(`icon 必须为 1:1 比例。当前为 ${width}×${height}。`)
        return false
      }
      if (width > 500 || height > 500) {
        showInvalidImageDialog(`icon 尺寸必须小于等于 500×500。当前为 ${width}×${height}。`)
        return false
      }
      return true
    } catch {
      showInvalidImageDialog('icon 文件无法解析为图片，请重新选择。')
      return false
    }
  }

  const validateCoverImage = async (file: File): Promise<boolean> => {
    try {
      const { width, height } = await getImageSize(file)
      const ratio = width / height
      if (Math.abs(ratio - 1.5) > 0.02) {
        showInvalidImageDialog(`cover 宽高比必须为 1.5。当前为 ${width}×${height}（${ratio.toFixed(3)}）。`)
        return false
      }
      return true
    } catch {
      showInvalidImageDialog('cover 文件无法解析为图片，请重新选择。')
      return false
    }
  }

  const selectIconFile = async () => {
    const picked = await pickFilesFromWorkspace({
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']
      }
    })
    const first = picked[0]
    if (!first) return
    if (!(await validateIconImage(first.file))) return
    const path = normalizeRepoPath(first.path)
    upsertExtraFiles([{ path, file: first.file }])
    setIconPath(path)
  }

  const selectCoverFile = async () => {
    const picked = await pickFilesFromWorkspace({
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']
      }
    })
    const first = picked[0]
    if (!first) return
    if (!(await validateCoverImage(first.file))) return
    const path = normalizeRepoPath(first.path)
    upsertExtraFiles([{ path, file: first.file }])
    setCoverPath(path)
  }

  const selectMultiplePreviewFiles = async () => {
    const picked = await pickFilesFromWorkspace({
      multiple: true,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']
      }
    })
    if (picked.length === 0) return
    const normalized = picked.map((entry) => {
      const objectUrl = URL.createObjectURL(entry.file)
      return {
        id: nextId(),
        path: normalizeRepoPath(entry.path),
        file: entry.file.name,
        url: objectUrl,
        objectUrl,
        fileObject: entry.file
      }
    })
    setPreviewItems((prev) => {
      const exists = new Set(prev.map((item) => item.path))
      const next = [...prev]
      normalized.forEach((item) => {
        if (exists.has(item.path)) {
          if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
          return
        }
        next.push(item)
      })
      return next
    })
    upsertExtraFiles(picked)
  }

  const selectDownloadFile = async (deviceId: string) => {
    const picked = await pickFilesFromWorkspace({})
    const first = picked[0]
    if (!first) return
    const path = normalizeRepoPath(first.path)
    upsertExtraFiles([{ path, file: first.file }])
    updateDownloadByDevice(deviceId, { file_name: path })
  }

  const openFileNameConflictDialog = (repoPath: string) => {
    setFileNameConflictMessage(`路径 "${repoPath}" 已存在同名文件，请修改文件名或目标文件夹后重试。`)
    setShowFileNameConflictDialog(true)
  }

  const buildUploadedFileName = (originalName: string, index: number): string => {
    const customRaw = remotePickerUploadFileName.trim()
    const custom = sanitizeRepoFileName(customRaw)
    if (!customRaw) return sanitizeRepoFileName(originalName, `upload_${index + 1}`)
    if (!custom) return sanitizeRepoFileName(originalName, `upload_${index + 1}`)
    const base = custom.replace(/\.[^.]+$/, '')
    const originDot = originalName.lastIndexOf('.')
    const originExt = originDot > 0 && originDot < originalName.length - 1 ? originalName.slice(originDot) : ''
    return `${base}${originExt}`
  }

  const buildOpfsRepoPath = (modeValue: RemotePickerMode, fileName: string, folderPath: string, index = 0): string => {
    const safeName = sanitizeRepoFileName(fileName, modeValue === 'preview' ? `preview_${index + 1}` : `upload_${index + 1}`)
    const safeFolder = sanitizeRepoFolderPath(folderPath)
    return safeFolder ? `${safeFolder}/${safeName}` : safeName
  }

  const writeFileToOpfs = async (repoPath: string, file: File): Promise<void> => {
    if (!navigator.storage?.getDirectory) {
      throw new Error('当前浏览器不支持 OPFS')
    }
    const root = await navigator.storage.getDirectory()
    const parts = [REMOTE_PICKER_LOCAL_OPFS_ROOT, ...repoPath.split('/').filter(Boolean)]
    let dir = root
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true })
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()
  }

  const readFileFromOpfs = async (repoPath: string): Promise<File | null> => {
    try {
      if (!navigator.storage?.getDirectory) return null
      const root = await navigator.storage.getDirectory()
      const parts = [REMOTE_PICKER_LOCAL_OPFS_ROOT, ...repoPath.split('/').filter(Boolean)]
      let dir = root
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i])
      }
      const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
      return await fileHandle.getFile()
    } catch {
      return null
    }
  }

  const removeFileFromOpfs = async (repoPath: string): Promise<void> => {
    try {
      if (!navigator.storage?.getDirectory) return
      const root = await navigator.storage.getDirectory()
      const parts = [REMOTE_PICKER_LOCAL_OPFS_ROOT, ...repoPath.split('/').filter(Boolean)]
      let dir = root
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i])
      }
      await dir.removeEntry(parts[parts.length - 1])
    } catch {
      // ignore remove errors
    }
  }

  const isDraftFolder = (path: string): boolean => remotePickerDraftFolders.includes(path)

  const startRenameDraftFolder = (path: string) => {
    if (!isDraftFolder(path)) return
    const segments = path.split('/').filter(Boolean)
    const namePart = segments[segments.length - 1] || path
    setRemotePickerRenamingPath(path)
    setRemotePickerRenamingName(namePart)
    requestAnimationFrame(() => {
      remotePickerRenameInputRef.current?.focus()
      remotePickerRenameInputRef.current?.select()
    })
  }

  const cancelRenameDraftFolder = () => {
    setRemotePickerRenamingPath('')
    setRemotePickerRenamingName('')
  }

  const commitRenameDraftFolder = () => {
    const oldPath = remotePickerRenamingPath
    if (!oldPath || !isDraftFolder(oldPath)) {
      cancelRenameDraftFolder()
      return
    }
    const newName = sanitizeRepoFileName(remotePickerRenamingName)
    if (!newName || !isValidEnglishFolderSegment(newName)) {
      appendLog('文件夹名称不合法：仅允许英文、数字、点号(.)、下划线(_)和连字符(-)，且不能包含空格')
      return
    }
    const parts = oldPath.split('/').filter(Boolean)
    const parent = parts.slice(0, -1).join('/')
    const newPath = parent ? `${parent}/${newName}` : newName
    if (newPath === oldPath) {
      cancelRenameDraftFolder()
      return
    }
    const existsInRemote = remoteWorkspaceTree.some((item) => item.type === 'folder' && item.path === newPath)
    const existsInDraft = remotePickerDraftFolders.some((path) => path === newPath && path !== oldPath)
    if (existsInRemote || existsInDraft) {
      appendLog('该文件夹名称已存在')
      return
    }
    const prefix = `${oldPath}/`
    setRemotePickerDraftFolders((prev) => prev.map((path) => {
      if (path === oldPath) return newPath
      if (path.startsWith(prefix)) return `${newPath}/${path.slice(prefix.length)}`
      return path
    }))
    setRemotePickerTargetFolder((prev) => {
      if (prev === oldPath || prev.startsWith(prefix)) {
        return `${newPath}${prev.slice(oldPath.length)}`
      }
      return prev
    })
    cancelRenameDraftFolder()
  }

  const deleteDraftFolder = (path: string) => {
    if (!isDraftFolder(path)) return
    const prefix = `${path}/`
    setRemotePickerDraftFolders((prev) => prev.filter((item) => item !== path && !item.startsWith(prefix)))
    setRemotePickerTargetFolder((prev) => (prev === path || prev.startsWith(prefix) ? '' : prev))
    if (remotePickerRenamingPath === path || remotePickerRenamingPath.startsWith(prefix)) {
      cancelRenameDraftFolder()
    }
  }

  const createRemotePickerFolder = (parentPath?: string) => {
    const folderNameBase = 'new-folder'
    const parent = sanitizeRepoFolderPath(parentPath ?? remotePickerTargetFolder)
    const taken = new Set([
      ...remoteWorkspaceTree.filter((item) => item.type === 'folder').map((item) => item.path),
      ...remotePickerDraftFolders
    ])
    let suffix = 0
    let candidate = folderNameBase
    while (taken.has(parent ? `${parent}/${candidate}` : candidate)) {
      suffix += 1
      candidate = `${folderNameBase}-${suffix + 1}`
    }
    const fullPath = parent ? `${parent}/${candidate}` : candidate
    setRemotePickerDraftFolders((prev) => [...prev, fullPath])
    setCollapsedRemoteFolders((prev) => {
      const set = new Set(prev)
      if (parent) set.delete(parent)
      set.delete(fullPath)
      return [...set]
    })
    setRemotePickerTargetFolder(fullPath)
    startRenameDraftFolder(fullPath)
  }

  const selectRemotePickerFolder = (path: string) => {
    setRemotePickerTargetFolder((prev) => (prev === path ? '' : path))
  }

  const openRemotePickerLocalUpload = () => {
    if (!remotePickerLocalInputRef.current) return
    remotePickerLocalInputRef.current.value = ''
    remotePickerLocalInputRef.current.click()
  }

  const handleRemotePickerLocalUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    if (!navigator.storage?.getDirectory) {
      appendLog('当前浏览器不支持 OPFS，无法使用本地上传')
      return
    }

    const fileList = Array.from(files)
    if (remotePickerUploadFileName.trim() && fileList.length > 1) {
      appendLog('已填写本地导入文件名时，一次只能选择一个文件')
      return
    }

    const targetFolder = sanitizeRepoFolderPath(remotePickerTargetFolder)
    setRemotePickerTargetFolder(targetFolder)
    const nextSelected: string[] = []
    const pendingUploads: Array<{ file: File; repoPath: string }> = []
    const existingPaths = new Set<string>([
      ...remoteWorkspaceTree.filter((item) => item.type === 'file').map((item) => item.path),
      ...Object.keys(opfsLocalPathSet)
    ])

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const targetName = buildUploadedFileName(file.name, i)
      const repoPath = buildOpfsRepoPath(remotePickerMode, targetName, targetFolder, i)
      if (existingPaths.has(repoPath)) {
        openFileNameConflictDialog(repoPath)
        return
      }
      existingPaths.add(repoPath)
      pendingUploads.push({ file, repoPath })
    }

    const nextPathSet = { ...opfsLocalPathSet }
    const nextPreviewMap = { ...opfsLocalPreviewUrlMap }
    for (const pending of pendingUploads) {
      await writeFileToOpfs(pending.repoPath, pending.file)
      nextPathSet[pending.repoPath] = true
      if (isImagePath(pending.repoPath)) {
        const oldUrl = nextPreviewMap[pending.repoPath]
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        nextPreviewMap[pending.repoPath] = URL.createObjectURL(pending.file)
      }
      nextSelected.push(pending.repoPath)
    }

    setOpfsLocalPathSet(nextPathSet)
    setOpfsLocalPreviewUrlMap(nextPreviewMap)

    if (remotePickerMode === 'preview') {
      setRemotePickerSelectedPaths((prev) => [...new Set([...prev, ...nextSelected])])
    } else {
      setRemotePickerSelectedPaths([nextSelected[nextSelected.length - 1]])
    }
  }

  const openRemoteFilePicker = (modeValue: RemotePickerMode, deviceId = '') => {
    if (remoteWorkspaceTree.length === 0) {
      appendLog('远程仓库文件树为空，请先同步远程仓库')
      return
    }
    setRemotePickerMode(modeValue)
    setRemotePickerDeviceId(deviceId)
    setRemotePickerSelectedPaths([])
    setRemotePickerUploadFileName('')
    setRemotePickerStep(1)
    setRemotePickerDraftFolders([])
    setRemotePickerTargetFolder('')
    setRemotePickerRenamingPath('')
    setRemotePickerRenamingName('')
    setCollapsedRemoteFolders([])
    setShowRemoteFilePickerDialog(true)
  }

  const toggleRemotePickerPath = (path: string) => {
    const normalizedPath = normalizeRepoPath(path)
    if (!normalizedPath) return
    if (remotePickerMode === 'preview') {
      setRemotePickerSelectedPaths((prev) => (
        prev.includes(normalizedPath)
          ? prev.filter((item) => item !== normalizedPath)
          : [...prev, normalizedPath]
      ))
      return
    }
    setRemotePickerSelectedPaths([normalizedPath])
  }

  const getPickerPreviewUrl = (path: string): string => {
    const local = opfsLocalPreviewUrlMap[path]
    if (local) return local
    return buildRawGithubUrl(
      boundRepoOwner || defaultTargetOwner || normalizeLower(currentUser),
      boundRepoName || resolvedRepoName || defaultTargetRepo,
      boundRepoBranch || MAIN_BRANCH,
      normalizeRepoPath(path)
    )
  }

  const applyRemotePickerSelection = () => {
    if (remotePickerSelectedPaths.length === 0) {
      appendLog('请先选择文件')
      return
    }
    if (remotePickerMode === 'icon') {
      setIconPath(remotePickerSelectedPaths[0])
    } else if (remotePickerMode === 'cover') {
      setCoverPath(remotePickerSelectedPaths[0])
    } else if (remotePickerMode === 'download') {
      const deviceId = remotePickerDeviceId.trim()
      if (!deviceId) {
        appendLog('下载文件选择失败：缺少设备标识')
        return
      }
      updateDownloadByDevice(deviceId, { file_name: remotePickerSelectedPaths[0] })
    } else {
      setPreviewItems((prev) => {
        const exists = new Set(prev.map((item) => item.path))
        const next = [...prev]
        remotePickerSelectedPaths.forEach((path) => {
          if (exists.has(path)) return
          next.push({
            id: nextId(),
            path,
            file: basenameFromPath(path),
            url: getPickerPreviewUrl(path)
          })
        })
        return next
      })
    }
    setShowRemoteFilePickerDialog(false)
  }

  const finalizeRemovedPreviewItems = (items: PublishPreviewItem[]) => {
    if (items.length === 0) return
    const localPaths = items.map((item) => item.path).filter((path) => opfsLocalPathSet[path])
    if (localPaths.length === 0) return
    localPaths.forEach((path) => {
      void removeFileFromOpfs(path)
    })
    setOpfsLocalPathSet((prev) => {
      const next = { ...prev }
      localPaths.forEach((path) => {
        delete next[path]
      })
      return next
    })
    setOpfsLocalPreviewUrlMap((prev) => {
      const next = { ...prev }
      localPaths.forEach((path) => {
        const url = next[path]
        if (url) URL.revokeObjectURL(url)
        delete next[path]
      })
      return next
    })
  }

  const undoDelete = (targetId?: string) => {
    const stack = deletedStackRef.current
    if (stack.length === 0) return

    const index = targetId ? stack.findIndex((item) => item.id === targetId) : 0
    if (index < 0) return

    const target = stack[index]
    const nextStack = [...stack.slice(0, index), ...stack.slice(index + 1)]
    const currentPreviewItems = previewItemsRef.current
    if (currentPreviewItems.some((item) => item.id === target.item.id)) {
      deletedStackRef.current = nextStack
      setDeletedStack(nextStack)
      return
    }

    let insertIndex = Math.min(Math.max(target.originalIndex, 0), currentPreviewItems.length)
    const nextAnchorIndex = target.nextId
      ? currentPreviewItems.findIndex((item) => item.id === target.nextId)
      : -1
    const prevAnchorIndex = target.prevId
      ? currentPreviewItems.findIndex((item) => item.id === target.prevId)
      : -1

    if (nextAnchorIndex >= 0) {
      if (prevAnchorIndex >= 0 && prevAnchorIndex < nextAnchorIndex) {
        insertIndex = prevAnchorIndex + 1
      } else {
        insertIndex = nextAnchorIndex
      }
    } else if (prevAnchorIndex >= 0) {
      insertIndex = prevAnchorIndex + 1
    }

    const nextPreviewItems = [...currentPreviewItems]
    nextPreviewItems.splice(insertIndex, 0, target.item)

    deletedStackRef.current = nextStack
    previewItemsRef.current = nextPreviewItems
    setDeletedStack(nextStack)
    setPreviewItems(nextPreviewItems)
  }

  const deletePreviewAt = (index: number) => {
    const currentPreviewItems = previewItemsRef.current
    const target = currentPreviewItems[index]
    if (!target) return

    const prevId = index > 0 ? currentPreviewItems[index - 1]?.id ?? null : null
    const nextId = index < currentPreviewItems.length - 1 ? currentPreviewItems[index + 1]?.id ?? null : null
    const deletedEntry: DeletedPreviewEntry = {
      id: target.id,
      item: target,
      originalIndex: index,
      prevId,
      nextId
    }
    const nextPreviewItems = currentPreviewItems.filter((_, i) => i !== index)
    const mergedStack = [deletedEntry, ...deletedStackRef.current]
    const keptStack = mergedStack.slice(0, PREVIEW_UNDO_LIMIT)
    const droppedStack = mergedStack.slice(PREVIEW_UNDO_LIMIT)

    previewItemsRef.current = nextPreviewItems
    deletedStackRef.current = keptStack

    setPreviewItems(nextPreviewItems)
    setDeletedStack(keptStack)
    const droppedItems = droppedStack.map((entry) => entry.item)
    revokeLocalItems(droppedItems)
    finalizeRemovedPreviewItems(droppedItems)
    setIconPath((current) => (current.trim() === target.path ? '' : current))
    setCoverPath((current) => (current.trim() === target.path ? '' : current))

    toast('已删除预览图', {
      description: target.file,
      action: {
        label: '撤销',
        onClick: () => undoDelete(target.id)
      }
    })
  }

  const addAuthor = () => {
    setAuthors((prev) => [...prev, { name: '', authorUrl: '', bindABAccount: true }])
  }

  const updateAuthor = (index: number, patch: Partial<ManifestAuthorDraft>) => {
    setAuthors((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeAuthor = (index: number) => {
    setAuthors((prev) => {
      if (prev.length <= 1) {
        return [{ name: '', authorUrl: '', bindABAccount: true }]
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const addLink = () => {
    setLinks((prev) => [...prev, { icon: '', title: '', url: '' }])
  }

  const updateLink = (index: number, patch: Partial<ManifestLinkDraft>) => {
    setLinks((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
    if (linkIconPickerIndex === index) {
      setShowLinkIconPicker(false)
    }
    setLinkIconPickerIndex((prev) => {
      if (prev === null) return prev
      if (prev === index) return null
      if (prev > index) return prev - 1
      return prev
    })
  }

  const openLinkIconPicker = (index: number) => {
    setLinkIconPickerIndex(index)
    setLinkPickerInitialQuery(links[index]?.icon || '')
    setShowLinkIconPicker(true)
  }

  const selectLinkIcon = (iconName: string) => {
    if (linkIconPickerIndex === null || !links[linkIconPickerIndex]) return
    updateLink(linkIconPickerIndex, { icon: iconName })
    setShowLinkIconPicker(false)
    setLinkIconPickerIndex(null)
  }

  const handleLinkIconPickerOpenChange = (nextOpen: boolean) => {
    setShowLinkIconPicker(nextOpen)
    if (!nextOpen) {
      setLinkIconPickerIndex(null)
    }
  }

  const addTag = () => {
    const value = tagInput.trim()
    if (!value) return
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setTagInput('')
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const ensureDownload = (deviceId: string) => {
    const normalized = deviceId.trim()
    if (!normalized) return
    setDownloads((prev) => {
      if (prev.some((item) => item.device === normalized)) return prev
      return [...prev, { device: normalized, version: '1.0.0', file_name: '' }]
    })
  }

  const updateDownloadByDevice = (deviceId: string, patch: Partial<ManifestDownloadDraft>) => {
    const normalized = deviceId.trim()
    if (!normalized) return
    setDownloads((prev) => {
      const exists = prev.some((item) => item.device === normalized)
      if (!exists) {
        return [...prev, { device: normalized, version: '1.0.0', file_name: '', ...patch }]
      }
      return prev.map((item) => (item.device === normalized ? { ...item, ...patch, device: normalized } : item))
    })
  }

  const removeDevice = (deviceId: string) => {
    setDownloads((prev) => prev.filter((item) => item.device !== deviceId))
  }

  const getDeviceById = (deviceId: string) => deviceOptions.find((item) => item.id === deviceId)

  const getDeviceLabel = (deviceId: string): string => {
    const device = getDeviceById(deviceId)
    if (!device) return deviceId
    return `${device.name} (${device.id})`
  }

  const getLegacyDeviceCode = (deviceId: string): string => {
    const device = getDeviceById(deviceId)
    if (!device) return deviceId
    const preferred = device.aliases.find((alias) => /^[a-z]\d+([a-z]+)?$/i.test(alias))
    return preferred || device.id
  }

  const getDownloadEntry = (deviceId: string): ManifestDownloadDraft =>
    downloads.find((item) => item.device === deviceId) || { device: deviceId, version: '1.0.0', file_name: '' }

  const normalizedDevicesText = useMemo(
    () => selectedDeviceIds.join(';'),
    [selectedDeviceIds]
  )

  const normalizedDeviceVendorsText = useMemo(() => {
    const vendors = selectedDeviceIds
      .map((deviceId) => getDeviceById(deviceId)?.vendor || '')
      .filter(Boolean)
    return [...new Set(vendors)].join(';')
  }, [selectedDeviceIds])

  const normalizedLegacyDevicesText = useMemo(
    () => selectedDeviceIds.map(getLegacyDeviceCode).filter(Boolean).join(';'),
    [selectedDeviceIds]
  )

  const isDeviceSelected = (deviceId: string): boolean =>
    selectedDeviceIds.includes(deviceId)

  const toggleDeviceSelection = (deviceId: string): void => {
    if (isDeviceSelected(deviceId)) {
      removeDevice(deviceId)
      return
    }
    ensureDownload(deviceId)
  }

  const buildManifestV2Text = (): string => {
    const base = cloneManifestObject(existingManifestObject)
    const item = asRecord(base.item)

    const normalizedAuthors = authors
      .map((entry) => ({
        name: entry.name.trim(),
        bindABAccount: Boolean(entry.bindABAccount),
        ...(entry.authorUrl.trim() ? { author_url: entry.authorUrl.trim() } : {})
      }))
      .filter((entry) => Boolean(entry.name))

    const normalizedLinks = links
      .map((entry) => ({
        icon: entry.icon.trim(),
        title: entry.title.trim(),
        url: entry.url.trim()
      }))
      .filter((entry) => Boolean(entry.icon || entry.title || entry.url))

    const normalizedDownloads = downloads.reduce<Record<string, { version: string; file_name: string }>>((acc, entry) => {
      const device = entry.device.trim()
      if (!device) return acc
      acc[device] = {
        version: entry.version.trim(),
        file_name: normalizeRepoPath(entry.file_name)
      }
      return acc
    }, {})

    const manifestObject: Record<string, unknown> = {
      ...base,
      item: {
        ...item,
        id: resourceId.trim(),
        restype: formatCatalogRestype(restype),
        name: name.trim(),
        description: description.trim(),
        preview: normalizedPreviewPaths,
        icon: normalizeRepoPath(iconPath),
        cover: normalizeRepoPath(coverPath),
        author: normalizedAuthors.length > 0
          ? normalizedAuthors
          : [{ name: currentUser.trim(), bindABAccount: true }]
      },
      links: normalizedLinks,
      downloads: normalizedDownloads,
      ext: asRecord(base.ext)
    }

    return JSON.stringify(manifestObject, null, 2)
  }

  const resolveRepoNameForSubmit = (): string => {
    const value = resolvedRepoName.trim()
    if (!value) {
      throw new Error('无法生成仓库名，请填写资源 ID 或手动输入仓库名')
    }
    return value
  }

  const getRawUrl = (path: string): string => {
    const owner = boundRepoOwner.trim() || normalizeLower(currentUser)
    const repo = boundRepoName.trim() || resolveRepoNameForSubmit()
    const encodedPath = normalizeRepoPath(path)
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/${encodedPath}`
  }

  const buildManifestV1Text = (repoUrl: string): string => {
    const defaultAuthorUrl = getDefaultV1AuthorUrl()
    const normalizedAuthors = authors
      .map((author) => {
        const authorName = author.name.trim()
        const authorUrl = author.authorUrl.trim() || defaultAuthorUrl
        return {
          name: authorName,
          author_url: authorUrl
        }
      })
      .filter((author) => author.name)

    const normalizedDownloads = selectedDeviceIds.reduce<Record<string, { version: string; file_name: string }>>((acc, deviceId) => {
      const row = downloads.find((item) => item.device.trim() === deviceId)
      if (!row) return acc
      const legacyCode = getLegacyDeviceCode(deviceId)
      acc[legacyCode] = {
        version: row.version.trim(),
        file_name: normalizeRepoPath(row.file_name)
      }
      return acc
    }, {})

    const manifestObject = {
      item: {
        name: name.trim(),
        description: description.trim(),
        preview: normalizedPreviewPaths,
        icon: normalizeRepoPath(iconPath),
        cover: normalizeRepoPath(coverPath),
        source_url: repoUrl,
        author: normalizedAuthors.length > 0
          ? normalizedAuthors
          : [{ name: currentUser.trim(), author_url: defaultAuthorUrl }]
      },
      downloads: normalizedDownloads
    }
    return JSON.stringify(manifestObject, null, 2)
  }

  const buildLegacyResourceJsonFileName = (): string => {
    const rawBase = resourceId.trim() || name.trim()
    const base = rawBase
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${base || 'resource'}.json`
  }

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 1
          continue
        }
        inQuotes = !inQuotes
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
    return result.map((item) => item.trim())
  }

  const resolveLegacyAuthorFolder = async (accessToken: string): Promise<string> => {
    const fallback = boundRepoOwner.trim() || normalizeLower(currentUser)
    const usernameCandidates = [boundRepoOwner.trim(), currentUser.trim()]
      .map((item) => item.toLowerCase())
      .filter(Boolean)

    if (usernameCandidates.length === 0) return fallback

    try {
      const legacyCsvFile = await fetchRepoFileOrNull(
        accessToken,
        defaultTargetOwner.trim(),
        defaultTargetRepo.trim(),
        LEGACY_CATALOG_PATH,
        MAIN_BRANCH
      )
      if (!legacyCsvFile?.content) return fallback

      const csvText = base64ToText(legacyCsvFile.content || '')
      const rows = csvText
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean)

      for (let i = rows.length - 1; i >= 1; i--) {
        const cols = splitCsvLine(rows[i])
        if (cols.length < 7) continue
        const icon = (cols[1] || '').toLowerCase()
        const cover = (cols[2] || '').toLowerCase()
        const matched = usernameCandidates.some((username) => icon.includes(username) || cover.includes(username))
        if (!matched) continue
        const resourcePath = (cols[6] || '').replace(/^"+|"+$/g, '').trim()
        const segments = resourcePath.split('/').filter(Boolean)
        if (segments.length < 2) continue
        const folder = segments[segments.length - 2]
        if (folder) {
          appendLog(`已按 index.csv 历史记录复用 v1 作者目录: ${folder}`)
          return folder
        }
      }
    } catch (cause: unknown) {
      appendLog(`读取 index.csv 复用目录失败: ${cause instanceof Error ? cause.message : '未知错误'}`)
    }

    return fallback
  }

  const normalizeTextValue = (value: string): string => value.trim()

  const normalizeStringArray = (values: string[]): string[] =>
    values.map((item) => item.trim()).filter(Boolean)

  const formatTagListForPr = (values: string[]): string =>
    values.length > 0 ? values.map((tag) => `\`${tag}\``).join('、') : '--'

  const getNormalizedLinksForPr = (values: ManifestLinkDraft[]): Array<{ icon: string; title: string; url: string }> =>
    values
      .map((link) => ({
        icon: link.icon.trim(),
        title: link.title.trim(),
        url: link.url.trim()
      }))
      .filter((link) => link.icon || link.title || link.url)
      .sort((a, b) => `${a.title}|${a.url}|${a.icon}`.localeCompare(`${b.title}|${b.url}|${b.icon}`, 'zh-CN'))

  const serializeLinksForPr = (values: ManifestLinkDraft[]): string =>
    JSON.stringify(getNormalizedLinksForPr(values))

  const getNormalizedAuthorsForPr = (values: ManifestAuthorDraft[]): Array<{ name: string; authorUrl: string; bindABAccount: boolean }> =>
    values
      .map((author) => ({
        name: author.name.trim(),
        authorUrl: author.authorUrl.trim(),
        bindABAccount: Boolean(author.bindABAccount)
      }))
      .filter((author) => author.name || author.authorUrl)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  const serializeAuthorsForPr = (values: ManifestAuthorDraft[]): string =>
    JSON.stringify(getNormalizedAuthorsForPr(values))

  const getNormalizedDownloadsForPr = (values: ManifestDownloadDraft[]): Array<{ device: string; version: string; file_name: string }> =>
    values
      .map((entry) => ({
        device: entry.device.trim(),
        version: entry.version.trim(),
        file_name: normalizeRepoPath(entry.file_name)
      }))
      .filter((entry) => entry.device || entry.version || entry.file_name)
      .sort((a, b) => a.device.localeCompare(b.device, 'zh-CN'))

  const serializeDownloadsForPr = (values: ManifestDownloadDraft[]): string =>
    JSON.stringify(getNormalizedDownloadsForPr(values))

  const formatLinkEntryForPr = (entry: { icon: string; title: string; url: string }): string =>
    `${entry.title || '--'}（${entry.icon || '--'}）：${entry.url || '--'}`

  const formatAuthorEntryForPr = (entry: { name: string; authorUrl: string; bindABAccount: boolean }): string =>
    `${entry.name || '--'} / author_url=${entry.authorUrl || '--'} / bindABAccount=${entry.bindABAccount ? 'true' : 'false'}`

  const formatDeviceForPr = (deviceId: string): string => {
    const normalized = deviceId.trim()
    if (!normalized) return '--'
    const device = getDeviceById(normalized)
    if (!device) return normalized
    return `${device.name}（device_id: ${device.id}）`
  }

  const formatDownloadEntryForPr = (entry: { device: string; version: string; file_name: string }): string =>
    `device=\`${formatDeviceForPr(entry.device)}\` / version=\`${entry.version || '--'}\` / file=\`${entry.file_name || '--'}\``

  const collectUpdateChangeLines = (): string[] => {
    const baseline = updateChangeBaseline
    if (!baseline) return []

    const lines: string[] = []
    const pushIfChanged = (label: string, before: string, after: string): void => {
      if (before === after) return
      lines.push(`- ${label}：\`${before || '--'}\` -> \`${after || '--'}\``)
    }

    pushIfChanged('资源名称', normalizeTextValue(baseline.name), normalizeTextValue(name))
    pushIfChanged('资源描述', normalizeTextValue(baseline.description), normalizeTextValue(description))
    pushIfChanged('资源类型', normalizeTextValue(baseline.restype), normalizeTextValue(restype))
    pushIfChanged('付费类型', normalizeTextValue(baseline.paidType), normalizeTextValue(paidType))
    pushIfChanged('图标', normalizeTextValue(baseline.icon), normalizeTextValue(iconPath))
    pushIfChanged('封面', normalizeTextValue(baseline.cover), normalizeTextValue(coverPath))

    const beforePreviewList = normalizeStringArray(baseline.previews)
    const afterPreviewList = normalizeStringArray(previewItems.map((item) => item.path))
    const beforePreview = beforePreviewList.join('|')
    const afterPreview = afterPreviewList.join('|')
    if (beforePreview !== afterPreview) {
      const beforeSet = new Set(beforePreviewList)
      const afterSet = new Set(afterPreviewList)
      const added = afterPreviewList.filter((path) => !beforeSet.has(path))
      const removed = beforePreviewList.filter((path) => !afterSet.has(path))
      if (added.length > 0) {
        lines.push(`- 预览图：新增 ${added.length} 张`)
        for (const path of added) {
          lines.push(`  - \`${path}\``)
          lines.push(`    ${getRawUrl(path)}`)
        }
      }
      if (removed.length > 0) {
        lines.push(`- 预览图：移除 ${removed.length} 张`)
        for (const path of removed) {
          lines.push(`  - \`${path}\``)
        }
      }
      if (added.length === 0 && removed.length === 0) {
        lines.push(`- 预览图：顺序已调整（${beforePreviewList.length} 张）`)
      }
    }

    const beforeTagList = normalizeStringArray(baseline.tags)
    const afterTagList = normalizeStringArray(tags)
    const beforeTags = beforeTagList.join('|')
    const afterTags = afterTagList.join('|')
    if (beforeTags !== afterTags) {
      lines.push(`- 标签：${formatTagListForPr(beforeTagList)} -> ${formatTagListForPr(afterTagList)}`)
    }

    const beforeLinks = serializeLinksForPr(baseline.links)
    const afterLinks = serializeLinksForPr(links)
    if (beforeLinks !== afterLinks) {
      const beforeLinkList = getNormalizedLinksForPr(baseline.links)
      const afterLinkList = getNormalizedLinksForPr(links)
      const makeLinkKey = (entry: { icon: string; title: string; url: string }): string => `${entry.title}|${entry.icon}|${entry.url}`
      const beforeSet = new Set(beforeLinkList.map(makeLinkKey))
      const afterSet = new Set(afterLinkList.map(makeLinkKey))
      const addedLinks = afterLinkList.filter((entry) => !beforeSet.has(makeLinkKey(entry)))
      const removedLinks = beforeLinkList.filter((entry) => !afterSet.has(makeLinkKey(entry)))
      if (addedLinks.length > 0) {
        lines.push(`- 相关链接：新增 ${addedLinks.length} 条`)
        addedLinks.forEach((entry) => lines.push(`  - ${formatLinkEntryForPr(entry)}`))
      }
      if (removedLinks.length > 0) {
        lines.push(`- 相关链接：移除 ${removedLinks.length} 条`)
        removedLinks.forEach((entry) => lines.push(`  - ${formatLinkEntryForPr(entry)}`))
      }
      if (addedLinks.length === 0 && removedLinks.length === 0) {
        lines.push(`- 相关链接：顺序已调整（${afterLinkList.length} 条）`)
      }
    }

    const beforeAuthors = serializeAuthorsForPr(baseline.authors)
    const afterAuthors = serializeAuthorsForPr(authors)
    if (beforeAuthors !== afterAuthors) {
      const beforeAuthorList = getNormalizedAuthorsForPr(baseline.authors)
      const afterAuthorList = getNormalizedAuthorsForPr(authors)
      const makeAuthorKey = (entry: { name: string; authorUrl: string; bindABAccount: boolean }): string => `${entry.name}|${entry.authorUrl}|${entry.bindABAccount ? '1' : '0'}`
      const beforeSet = new Set(beforeAuthorList.map(makeAuthorKey))
      const afterSet = new Set(afterAuthorList.map(makeAuthorKey))
      const addedAuthors = afterAuthorList.filter((entry) => !beforeSet.has(makeAuthorKey(entry)))
      const removedAuthors = beforeAuthorList.filter((entry) => !afterSet.has(makeAuthorKey(entry)))
      if (addedAuthors.length > 0) {
        lines.push(`- 作者信息：新增 ${addedAuthors.length} 条`)
        addedAuthors.forEach((entry) => lines.push(`  - ${formatAuthorEntryForPr(entry)}`))
      }
      if (removedAuthors.length > 0) {
        lines.push(`- 作者信息：移除 ${removedAuthors.length} 条`)
        removedAuthors.forEach((entry) => lines.push(`  - ${formatAuthorEntryForPr(entry)}`))
      }
      if (addedAuthors.length === 0 && removedAuthors.length === 0) {
        lines.push(`- 作者信息：顺序已调整（${afterAuthorList.length} 条）`)
      }
    }

    const beforeDownloads = serializeDownloadsForPr(baseline.downloads)
    const afterDownloads = serializeDownloadsForPr(downloads)
    if (beforeDownloads !== afterDownloads) {
      const beforeDownloadList = getNormalizedDownloadsForPr(baseline.downloads)
      const afterDownloadList = getNormalizedDownloadsForPr(downloads)
      const beforeDownloadMap = new Map(beforeDownloadList.map((entry) => [entry.device, entry]))
      const afterDownloadMap = new Map(afterDownloadList.map((entry) => [entry.device, entry]))

      const addedDownloads = afterDownloadList.filter((entry) => !beforeDownloadMap.has(entry.device))
      const removedDownloads = beforeDownloadList.filter((entry) => !afterDownloadMap.has(entry.device))
      const updatedDownloads = afterDownloadList.filter((entry) => {
        const beforeEntry = beforeDownloadMap.get(entry.device)
        if (!beforeEntry) return false
        return beforeEntry.version !== entry.version || beforeEntry.file_name !== entry.file_name
      })

      if (addedDownloads.length > 0) {
        lines.push(`- 下载资源（downloads）：新增 ${addedDownloads.length} 条`)
        addedDownloads.forEach((entry) => {
          lines.push(`  - ${formatDownloadEntryForPr(entry)}`)
          if (entry.file_name) {
            lines.push(`    ${getRawUrl(entry.file_name)}`)
          }
        })
      }
      if (removedDownloads.length > 0) {
        lines.push(`- 下载资源（downloads）：移除 ${removedDownloads.length} 条`)
        removedDownloads.forEach((entry) => lines.push(`  - ${formatDownloadEntryForPr(entry)}`))
      }
      if (updatedDownloads.length > 0) {
        lines.push(`- 下载资源（downloads）：更新 ${updatedDownloads.length} 条`)
        updatedDownloads.forEach((entry) => {
          const beforeEntry = beforeDownloadMap.get(entry.device)
          if (!beforeEntry) return
          lines.push(`  - 设备：${formatDeviceForPr(entry.device)}`)
          if (beforeEntry.version !== entry.version) {
            lines.push(`    - version：\`${beforeEntry.version || '--'}\` -> \`${entry.version || '--'}\``)
          }
          if (beforeEntry.file_name !== entry.file_name) {
            lines.push(`    - file：\`${beforeEntry.file_name || '--'}\` -> \`${entry.file_name || '--'}\``)
            if (entry.file_name) {
              lines.push(`      ${getRawUrl(entry.file_name)}`)
            }
          }
        })
      }
      if (addedDownloads.length === 0 && removedDownloads.length === 0 && updatedDownloads.length === 0) {
        lines.push(`- 下载资源（downloads）：顺序已调整（${afterDownloadList.length} 条）`)
      }
    }

    return lines
  }

  const buildAutoPrTitle = (): string => {
    const resourceName = name.trim() || '未命名资源'
    const resourceType = formatResourceTypeForTitle(restype)
    if (mode === 'publish') {
      return `[ABoooxCC] 发布 ${resourceName} ${resourceType}`
    }
    return `[ABoooxCC] 更新 ${resourceName} ${resourceType}`
  }

  const buildAutoPrBody = (repoUrl: string, commitSha: string): string => {
    const shortHash = commitSha.trim() ? commitSha.trim().slice(0, 7) : '--'
    if (mode === 'publish') {
      const resourceTypeText = restype === 'watchface' ? '表盘（watch_face）' : '快应用（quick_app）'
      const submitVersionText = submitMode === 'both' ? 'v1 + v2' : submitMode === 'v1' ? 'v1' : 'v2'
      const tagsText = tags.map((tag) => tag.trim()).filter(Boolean).join(' / ') || '--'
      const paidTypeText = paidType.trim() || '免费'

      const deviceLines = selectedDeviceIds.length > 0
        ? selectedDeviceIds.map((deviceId) => `- ${formatDeviceForPr(deviceId)}`)
        : ['- --']

      const normalizedIconPath = normalizeRepoPath(iconPath)
      const normalizedCoverPath = normalizeRepoPath(coverPath)

      const imageLines: string[] = []
      if (normalizedIconPath) {
        imageLines.push(`- Icon：\`${normalizedIconPath}\`  `)
        imageLines.push(getRawUrl(normalizedIconPath))
      } else {
        imageLines.push('- Icon：--')
      }
      if (normalizedCoverPath) {
        imageLines.push(`- Cover：\`${normalizedCoverPath}\`  `)
        imageLines.push(getRawUrl(normalizedCoverPath))
      } else {
        imageLines.push('- Cover：--')
      }
      if (normalizedPreviewPaths.length > 0) {
        imageLines.push('- Preview：')
        normalizedPreviewPaths.forEach((path) => {
          imageLines.push(`- \`${path}\``)
          imageLines.push(`  ${getRawUrl(path)}`)
        })
      } else {
        imageLines.push('- Preview：--')
      }

      const downloadLines = selectedDeviceIds.length > 0
        ? selectedDeviceIds.flatMap((deviceId) => {
            const entry = getDownloadEntry(deviceId)
            const version = entry.version.trim() || '--'
            const file = normalizeRepoPath(entry.file_name)
            const raw = file ? getRawUrl(file) : '--'
            return [
              `- ${formatDeviceForPr(deviceId)}`,
              `  - version: \`${version}\``,
              `  - file: \`${file || '--'}\``,
              `  - raw: ${raw}`
            ]
          })
        : ['- --']

      const normalizedLinks = links
        .map((link) => ({
          title: link.title.trim(),
          icon: link.icon.trim(),
          url: link.url.trim()
        }))
        .filter((link) => link.title || link.icon || link.url)

      const linkLines = normalizedLinks.length > 0
        ? normalizedLinks.map((link) => `- ${link.title || '--'}（${link.icon || '--'}）：${link.url || '--'}`)
        : ['- --']

      return [
        '## 资源信息',
        '',
        `- 资源名称：${name.trim()}`,
        `- 资源 ID：${resourceId.trim()}`,
        `- 资源类型：${resourceTypeText}`,
        `- 提交版本：${submitVersionText}`,
        `- 付费类型：${paidTypeText}`,
        `- 标签：${tagsText}`,
        '',
        '## 支持设备',
        '',
        ...deviceLines,
        '',
        '## 仓库信息',
        '',
        `- 资源仓库：${repoUrl}`,
        `- 提交短哈希：\`${shortHash}\``,
        '',
        '## 图片资源（Raw）',
        '',
        ...imageLines,
        '',
        '## 下载资源（downloads）',
        '',
        ...downloadLines,
        '',
        '## 链接（manifest_v2.links）',
        '',
        ...linkLines,
        '',
        '---',
        '此 PR 由 [AstroBooox Creator Console](https://astrobooox-ng.waijade.cn/) 生成，如有问题前往 [AstroBooox 仓库](https://github.com/CheongSzesuen/AstroBooox) 提交 [Issue](https://github.com/CheongSzesuen/AstroBooox/issues)。'
      ].join('\n')
    }

    const changeLines = collectUpdateChangeLines()
    const resourceTypeText = restype === 'watchface' ? '表盘（watch_face）' : '快应用（quick_app）'
    const tagsText = tags.map((tag) => tag.trim()).filter(Boolean).join(' / ') || '--'
    const paidTypeText = formatPaidTypeLabel(paidType)
    return [
      '## 资源信息',
      '',
      `- 资源名称：${name.trim() || '--'}`,
      `- 资源 ID：${resourceId.trim() || '--'}`,
      `- 资源类型：${resourceTypeText}`,
      `- 付费类型：${paidTypeText}`,
      `- 标签：${tagsText}`,
      '',
      '## 本次变更',
      '',
      ...(changeLines.length > 0 ? changeLines : ['- 未检测到字段变化（仅同步仓库文件）']),
      '',
      '## 仓库信息',
      '',
      `- 资源仓库：${repoUrl}`,
      `- 提交短哈希：\`${shortHash}\``,
      '',
      '---',
      '此 PR 由 [AstroBooox Creator Console](https://astrobooox-ng.waijade.cn/) 生成，如有问题前往 [AstroBooox 仓库](https://github.com/CheongSzesuen/AstroBooox) 提交 [Issue](https://github.com/CheongSzesuen/AstroBooox/issues)。'
    ].join('\n')
  }

  const handleUploadResources = async () => {
    if (!canUpload) return

    const accessToken = token.trim()
    const username = normalizeLower(currentUser)
    const catalogId = resourceId.trim()
    if (!accessToken || !username) return

    setSubmitError('')
    setLatestPrUrl('')
    setPrTitle('')
    setPrBody('')
    setHasUploadedInFlow(false)
    setSubmitLogs([])

    try {
      if (linksValidationMessage) {
        throw new Error(linksValidationMessage)
      }
      if (v1AuthorValidationMessage) {
        throw new Error(v1AuthorValidationMessage)
      }
      if (mode === 'publish') {
        for (const path of selectedUploadPaths) {
          const invalid = findInvalidFolderSegmentFromPath(path)
          if (!invalid) continue
          throw new Error(`资源目录名不合法：${invalid.folderPath}（目录段“${invalid.segment}”仅允许英文、数字、点号(.)、下划线(_)和连字符(-)，且不能包含空格）`)
        }
      }

      appendLog('开始执行仓库上传')
      setUploading(true)
      setShowUploadCompleteDialog(false)

      let repoOwner = ''
      let repoName = ''
      let repoBranch = MAIN_BRANCH
      let repoUrl = ''

      if (mode === 'resource_edit') {
        repoOwner = boundRepoOwner.trim()
        repoName = boundRepoName.trim()
        repoBranch = boundRepoBranch.trim() || MAIN_BRANCH
        repoUrl = boundRepoUrl.trim() || `https://github.com/${repoOwner}/${repoName}`
        if (!repoOwner || !repoName) {
          throw new Error('更新模式缺少目标仓库信息')
        }
        appendLog(`更新模式：复用仓库 ${repoOwner}/${repoName}@${repoBranch}`)
      } else {
        const ensuredRepo = await ensureUserRepository({
          token: accessToken,
          owner: username,
          repoName: resolvedRepoName,
          description: repoDescription.trim() || `AstroBooox resource ${catalogId}`
        })
        repoOwner = ensuredRepo.owner
        repoName = ensuredRepo.name
        repoBranch = ensuredRepo.defaultBranch?.trim() || MAIN_BRANCH
        repoUrl = ensuredRepo.htmlUrl
        appendLog(`资源仓库就绪：${repoOwner}/${repoName}@${repoBranch}`)
      }

      const uploadQueue: Array<{ path: string; file?: File; text?: string }> = []
      if (submitMode === 'v2' || submitMode === 'both') {
        uploadQueue.push({ path: MANIFEST_FILE, text: buildManifestV2Text() })
      }
      if (submitMode === 'v1' || submitMode === 'both') {
        uploadQueue.push({ path: LEGACY_MANIFEST_FILE, text: buildManifestV1Text(repoUrl) })
      }

      const localFileMap = new Map<string, File>()
      previewItems.forEach((item) => {
        const path = normalizeRepoPath(item.path)
        if (!item.fileObject || !path) return
        localFileMap.set(path, item.fileObject)
      })
      extraFiles.forEach((item) => {
        const path = normalizeRepoPath(item.path)
        if (!path) return
        localFileMap.set(path, item.fileObject)
      })
      for (const path of selectedUploadPaths) {
        if (path === MANIFEST_FILE || path === LEGACY_MANIFEST_FILE) continue
        if (opfsLocalPathSet[path]) {
          const opfsFile = await readFileFromOpfs(path)
          if (!opfsFile) {
            throw new Error(`OPFS 文件读取失败: ${path}`)
          }
          uploadQueue.push({ path, file: opfsFile })
          continue
        }

        const local = localFileMap.get(path)
        if (local) {
          uploadQueue.push({ path, file: local })
          continue
        }

        if (workspaceHandle) {
          const workspaceFile = await readFileByPath(workspaceHandle, path)
          if (workspaceFile) {
            uploadQueue.push({ path, file: workspaceFile })
            continue
          }
        }

        if (mode === 'resource_edit') {
          appendLog(`复用远程已存在文件: ${path}`)
          continue
        }

        throw new Error(`工作区中未找到文件: ${path}`)
      }

      if (uploadQueue.length === 0) {
        throw new Error('没有可上传文件，请先选择资源文件')
      }

      let latestCommitSha = existingCommitSha.trim()

      for (const item of uploadQueue) {
        const contentBase64 = item.file
          ? arrayBufferToBase64(await item.file.arrayBuffer())
          : textToBase64(item.text || '')

        let result: { commit: { sha: string; html_url: string } }
        try {
          result = await putRepoFile({
            token: accessToken,
            owner: repoOwner,
            repo: repoName,
            path: item.path,
            branch: repoBranch,
            message: `sync: ${item.path}`,
            contentBase64
          })
        } catch (cause: unknown) {
          const error = cause as { status?: number; message?: string }
          const message = error.message || ''
          const canRetry =
            error.status === 422 &&
            (message.includes('sha') || message.includes('already exists') || message.includes('does not match'))
          if (!canRetry) throw cause

          const oldFile = await fetchRepoFileOrNull(accessToken, repoOwner, repoName, item.path, repoBranch)
          if (!oldFile?.sha) throw cause

          result = await putRepoFile({
            token: accessToken,
            owner: repoOwner,
            repo: repoName,
            path: item.path,
            branch: repoBranch,
            message: `sync: ${item.path}`,
            contentBase64,
            sha: oldFile.sha
          })
        }

        latestCommitSha = result.commit.sha
        appendLog(`上传完成: ${item.path}`)
      }

      if (!latestCommitSha) {
        throw new Error('上传完成但未获得 commit sha')
      }

      setExistingCommitSha(latestCommitSha)
      setBoundRepoOwner(repoOwner)
      setBoundRepoName(repoName)
      setBoundRepoBranch(repoBranch)
      setBoundRepoUrl(repoUrl)
      setHasUploadedInFlow(true)
      void syncRemoteWorkspace(repoOwner, repoName, repoBranch, false)

      const autoTitle = buildAutoPrTitle()
      const autoBody = buildAutoPrBody(repoUrl, latestCommitSha)
      setPrTitle(autoTitle)
      setPrBody(autoBody)

      appendLog(`仓库上传完成，commit=${latestCommitSha.slice(0, 7)}`)
      toast('上传成功', {
        description: `${repoOwner}/${repoName}@${latestCommitSha.slice(0, 7)}`
      })
      setShowUploadCompleteDialog(true)
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : '上传失败'
      setSubmitError(message)
      appendLog(`失败: ${message}`)
      toast('上传失败', {
        description: message
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCreateCatalogPr = async () => {
    if (!canCreatePr) return

    const accessToken = token.trim()
    const username = normalizeLower(currentUser)
    const catalogId = resourceId.trim()
    const repoOwner = boundRepoOwner.trim()
    const repoName = boundRepoName.trim()
    const repoUrl = boundRepoUrl.trim() || `https://github.com/${repoOwner}/${repoName}`
    const latestCommitSha = existingCommitSha.trim()

    if (!accessToken || !username || !repoOwner || !repoName || !latestCommitSha) return

    try {
      setSubmitError('')
      setCreatingPr(true)
      appendLog('开始更新 catalog 并创建 PR')

      const branchName = `astrobooox-submit-${Date.now()}`
      let forkResult: { forkOwner: string; forkRepo: string; branch: string } | null = null
      const normalizedTags = normalizedTagsText
      const normalizedDevices = devicesText.trim() || normalizedDevicesText
      const normalizedVendors = deviceVendorsText.trim() || normalizedDeviceVendorsText

      if (submitMode === 'v2' || submitMode === 'both') {
        const matchId = mode === 'resource_edit' ? (baselineCatalogId || catalogId).trim() : catalogId
        const v2Result = await updateCatalogInForkBranch({
          token: accessToken,
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: MAIN_BRANCH,
          catalogPath: defaultCatalogPath.trim(),
          currentUser: username,
          branchName,
          matchId,
          requireExisting: mode === 'resource_edit',
          entry: {
            id: catalogId,
            name: name.trim(),
            restype: formatCatalogRestype(restype),
            repo_owner: repoOwner,
            repo_name: repoName,
            repo_commit_hash: latestCommitSha.slice(0, 7),
            icon: normalizeRepoPath(iconPath),
            cover: normalizeRepoPath(coverPath),
            tags: normalizedTags,
            device_vendors: normalizedVendors,
            devices: normalizedDevices,
            paid_type: paidType.trim()
          }
        })
        forkResult = v2Result
        appendLog(`v2 Catalog 更新完成: ${v2Result.forkOwner}/${v2Result.forkRepo}@${v2Result.branch}`)
      }

      if (submitMode === 'v1' || submitMode === 'both') {
        const legacyFileName = buildLegacyResourceJsonFileName()
        const legacyAuthorFolder = await resolveLegacyAuthorFolder(accessToken)
        const legacyEntry: LegacyCatalogEntry = {
          name: name.trim(),
          icon: getRawUrl(normalizeRepoPath(iconPath)),
          cover: getRawUrl(normalizeRepoPath(coverPath)),
          restype: formatLegacyRestype(restype),
          tags: normalizedTags,
          devices: normalizedLegacyDevicesText || normalizedDevices,
          path: `${legacyAuthorFolder}/${legacyFileName}`,
          paid_type: paidType.trim()
        }
        const legacyManifestRef = JSON.stringify(
          {
            manifest_ver: 1,
            repo_url: repoUrl
          },
          null,
          2
        )
        const legacyRelativePath = `${legacyAuthorFolder}/${legacyFileName}`
        const v1Result = await updateLegacyCatalogAndResourceJsonInForkBranch({
          token: accessToken,
          upstreamOwner: defaultTargetOwner.trim(),
          upstreamRepo: defaultTargetRepo.trim(),
          upstreamBranch: MAIN_BRANCH,
          currentUser: username,
          branchName,
          catalogPath: LEGACY_CATALOG_PATH,
          resourceJsonPath: `${LEGACY_RESOURCES_DIR}/${legacyRelativePath}`,
          legacyEntry,
          resourceManifestJson: legacyManifestRef,
          matchPath: legacyRelativePath,
          requireExisting: mode === 'resource_edit'
        })
        forkResult = v1Result
        appendLog(`v1 Catalog 更新完成: ${v1Result.forkOwner}/${v1Result.forkRepo}@${v1Result.branch}`)
      }

      if (!forkResult) {
        throw new Error('未选择提交流程（v1/v2）')
      }

      const pr = await createPullRequestWithHead({
        token: accessToken,
        baseOwner: defaultTargetOwner.trim(),
        baseRepo: defaultTargetRepo.trim(),
        baseBranch: MAIN_BRANCH,
        headOwner: forkResult.forkOwner,
        headBranch: forkResult.branch,
        title: prTitle.trim(),
        body: prBody.trim() || buildAutoPrBody(repoUrl, latestCommitSha)
      })

      setLatestPrUrl(pr.htmlUrl)
      appendLog(`PR 创建成功: #${pr.number}`)
      toast('提交成功', {
        description: `PR #${pr.number}`
      })
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : '创建 PR 失败'
      setSubmitError(message)
      appendLog(`失败: ${message}`)
      toast('提交失败', {
        description: message
      })
    } finally {
      setCreatingPr(false)
    }
  }

  useEffect(() => {
    if (step !== '3') return
    if (!boundRepoOwner.trim() || !boundRepoName.trim() || !existingCommitSha.trim()) return
    const repoUrl = boundRepoUrl.trim() || `https://github.com/${boundRepoOwner}/${boundRepoName}`
    if (!prTitle.trim()) {
      setPrTitle(buildAutoPrTitle())
    }
    if (!prBody.trim()) {
      setPrBody(buildAutoPrBody(repoUrl, existingCommitSha))
    }
  }, [boundRepoName, boundRepoOwner, boundRepoUrl, existingCommitSha, prBody, prTitle, step])

  useEffect(() => {
    if (mode !== 'publish' && step === '0') {
      setStep('1')
    }
  }, [mode, step])

  useEffect(() => {
    const valid = new Set(workspaceTree.filter((item) => item.type === 'folder').map((item) => item.path))
    setCollapsedWorkspaceFolders((prev) => prev.filter((path) => valid.has(path)))
  }, [workspaceTree])

  useEffect(() => {
    const valid = new Set(remoteWorkspaceTree.filter((item) => item.type === 'folder').map((item) => item.path))
    setCollapsedRemoteFolders((prev) => prev.filter((path) => valid.has(path)))
  }, [remoteWorkspaceTree])

  useEffect(() => {
    if (!workspaceFolderNameInput.trim() && workspaceDisplayPath.trim()) {
      const segments = workspaceDisplayPath.split('/').filter(Boolean)
      const last = segments[segments.length - 1] || ''
      if (last) {
        setWorkspaceFolderNameInput(stripReleaseFolderSuffix(last))
      }
    }
  }, [workspaceDisplayPath, workspaceFolderNameInput])

  useEffect(() => {
    if (fileTreeTab === 'workspace' && workspaceTree.length === 0 && remoteWorkspaceTree.length > 0) {
      setFileTreeTab('remote')
      return
    }
    if (fileTreeTab === 'remote' && remoteWorkspaceTree.length === 0 && workspaceTree.length > 0) {
      setFileTreeTab('workspace')
    }
  }, [fileTreeTab, remoteWorkspaceTree.length, workspaceTree.length])

  const remotePickerDialogBody = (
    <>
      <div className={isMobileViewport ? 'grid gap-3 overflow-hidden' : 'grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-[minmax(0,1fr)_360px]'}>
        <div className={isMobileViewport ? 'flex flex-col gap-3' : 'flex min-h-0 flex-col gap-3'}>
          {remotePickerStep === 1 ? (
            <div className="flex gap-2 max-sm:flex-col">
              <Button variant="outline" onClick={() => createRemotePickerFolder()}>
                <FolderPlus size={14} weight="duotone" />
                新建文件夹
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 max-sm:flex-col">
                <Button variant="outline" onClick={openRemotePickerLocalUpload}>本地上传</Button>
                <input
                  ref={remotePickerLocalInputRef}
                  type="file"
                  className="hidden"
                  multiple={remotePickerMode === 'preview'}
                  onChange={(event) => void handleRemotePickerLocalUpload(event)}
                />
              </div>
              <Input
                value={remotePickerUploadFileName}
                onChange={(event) => setRemotePickerUploadFileName(event.target.value)}
                placeholder="本地导入文件名（可选，含扩展名）"
              />
            </div>
          )}

          <div className={isMobileViewport ? 'max-h-[min(56vh,460px)] overflow-y-auto rounded-lg border border-border' : 'min-h-0 flex-1 overflow-y-auto rounded-lg border border-border'}>
            {remotePickerStep === 1 && remotePickerFolderItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                暂无可选文件夹
              </div>
            ) : null}
            {remotePickerStep === 2 && remotePickerTreeItems.length === 0 && remotePickerLocalItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                暂无可选文件
              </div>
            ) : null}
            <div className="space-y-0.5 py-1">
              {(remotePickerStep === 1 ? remotePickerFolderItems : remotePickerTreeItems).map((item) => (
                <div key={`picker-${item.path}`}>
                  {item.type === 'folder' ? (
                    remotePickerStep === 1 ? (
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <div
                            className="flex w-full items-center gap-1 pr-1"
                            style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                          >
                            <button
                              type="button"
                              className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/30 ${
                                remotePickerTargetFolder === item.path ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                              }`}
                              onClick={() => selectRemotePickerFolder(item.path)}
                              onDoubleClick={() => toggleRemoteFolder(item.path)}
                            >
                              {item.collapsed ? (
                                <CaretRight size={12} weight="bold" className="shrink-0" />
                              ) : (
                                <CaretDown size={12} weight="bold" className="shrink-0" />
                              )}
                              <FolderNotchOpenIcon size={14} weight="fill" className="shrink-0" />
                              {remotePickerRenamingPath === item.path ? (
                                <Input
                                  ref={remotePickerRenameInputRef}
                                  value={remotePickerRenamingName}
                                  onChange={(event) => setRemotePickerRenamingName(event.target.value)}
                                  className="h-6 min-w-0 flex-1 px-1 text-xs"
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault()
                                      commitRenameDraftFolder()
                                    } else if (event.key === 'Escape') {
                                      event.preventDefault()
                                      cancelRenameDraftFolder()
                                    }
                                  }}
                                  onBlur={commitRenameDraftFolder}
                                />
                              ) : (
                                <span className="truncate">{item.label}</span>
                              )}
                              {remotePickerTargetFolder === item.path ? (
                                <span className="ml-auto rounded border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary">
                                  目标文件夹
                                </span>
                              ) : null}
                            </button>
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 w-6 px-0 sm:hidden"
                                  aria-label="详情菜单"
                                >
                                  <DotsThreeVertical size={12} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="min-w-[150px]">
                                <DropdownMenuItem className="gap-2" onSelect={() => createRemotePickerFolder(item.path)}>
                                  <FolderPlus size={14} weight="duotone" />
                                  新建子文件夹
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" disabled={!isDraftFolder(item.path)} onSelect={() => startRenameDraftFolder(item.path)}>
                                  <NotePencil size={14} weight="duotone" />
                                  重命名
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive" disabled={!isDraftFolder(item.path)} onSelect={() => deleteDraftFolder(item.path)}>
                                  <Trash size={14} weight="duotone" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="min-w-[150px]">
                          <ContextMenuItem className="gap-2" onSelect={() => createRemotePickerFolder(item.path)}>
                            <FolderPlus size={14} weight="duotone" />
                            新建子文件夹
                          </ContextMenuItem>
                          <ContextMenuItem className="gap-2" disabled={!isDraftFolder(item.path)} onSelect={() => startRenameDraftFolder(item.path)}>
                            <NotePencil size={14} weight="duotone" />
                            重命名
                          </ContextMenuItem>
                          <ContextMenuItem className="gap-2 text-destructive" disabled={!isDraftFolder(item.path)} onSelect={() => deleteDraftFolder(item.path)}>
                            <Trash size={14} weight="duotone" />
                            删除
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ) : (
                      <div
                        className="flex w-full items-center gap-1 pr-1"
                        style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                      >
                        <button
                          type="button"
                          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/30 ${
                            remotePickerTargetFolder === item.path ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                          }`}
                          onClick={() => selectRemotePickerFolder(item.path)}
                          onDoubleClick={() => toggleRemoteFolder(item.path)}
                        >
                          {item.collapsed ? (
                            <CaretRight size={12} weight="bold" className="shrink-0" />
                          ) : (
                            <CaretDown size={12} weight="bold" className="shrink-0" />
                          )}
                          <FolderNotchOpenIcon size={14} weight="fill" className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {remotePickerTargetFolder === item.path ? (
                            <span className="ml-auto rounded border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary">
                              目标文件夹
                            </span>
                          ) : null}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 px-0"
                          onClick={() => toggleRemoteFolder(item.path)}
                        >
                          <DotsThreeVertical size={12} />
                        </Button>
                      </div>
                    )
                  ) : (
                    <button
                      type="button"
                      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 pr-3 text-left text-xs hover:bg-muted/30 ${
                        remotePickerSelectedPaths.includes(item.path) ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                      }`}
                      style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                      onClick={() => toggleRemotePickerPath(item.path)}
                    >
                      <span className="w-3 shrink-0" />
                      <File size={14} weight="duotone" className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {remotePickerStep === 2 && remotePickerLocalItems.length > 0 ? (
              <div className="space-y-1 border-t border-border bg-muted/20 p-2">
                <p className="px-1 text-[11px] text-muted-foreground">本地上传（OPFS）</p>
                {remotePickerLocalItems.map((path) => (
                  <button
                    key={`local-picker-${path}`}
                    type="button"
                    className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/30 ${
                      remotePickerSelectedPaths.includes(path) ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => toggleRemotePickerPath(path)}
                  >
                    <File size={14} weight="duotone" className="shrink-0" />
                    <span className="truncate">{path}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`shrink-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3 ${
            remotePickerStep === 1 ? 'hidden sm:block' : ''
          }`}
        >
          <div className="text-xs text-muted-foreground">图片预览</div>
          {remotePickerPreviewPath && (isImagePath(remotePickerPreviewPath) || Boolean(opfsLocalPreviewUrlMap[remotePickerPreviewPath])) ? (
            <a
              href={getPickerPreviewUrl(remotePickerPreviewPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-border bg-background"
            >
              <img
                src={getPickerPreviewUrl(remotePickerPreviewPath)}
                alt={remotePickerPreviewPath}
                className="h-64 w-full object-contain"
              />
            </a>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground">
              选中文件后可预览图片
            </div>
          )}
          <p className="break-all text-[11px] text-muted-foreground">{remotePickerPreviewPath || '未选择文件'}</p>
        </div>
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        <Button variant="outline" onClick={() => setShowRemoteFilePickerDialog(false)}>取消</Button>
        {remotePickerStep === 1 ? (
          <Button onClick={() => setRemotePickerStep(2)}>下一步</Button>
        ) : (
          <Button variant="outline" onClick={() => setRemotePickerStep(1)}>上一步</Button>
        )}
        {remotePickerStep === 2 ? (
          <Button onClick={applyRemotePickerSelection}>确认选择</Button>
        ) : null}
      </div>
    </>
  )

  return (
    <div className="min-w-0 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div ref={leftRailRef} className="min-w-0 space-y-4 xl:sticky xl:top-[72px] xl:self-start">
        <Card>
          <CardHeader className="pb-3 sm:p-3 sm:pb-3">
            <CardTitle className="text-base">步骤导航</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 sm:p-3 sm:pt-0">
            <ol className="space-y-2">
              {stepItems.map((item, index) => (
                <li key={item.value} className="relative pl-10">
                  {index < stepItems.length - 1 ? <div className="absolute left-4 top-8 h-[calc(100%-4px)] w-px bg-border" /> : null}
                  <span
                    className={`absolute left-0 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                      item.done
                        ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-600'
                        : step === item.value
                          ? 'border-primary/60 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      step === item.value
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                    } ${item.done ? '!text-foreground' : ''}`}
                    onClick={() => goToStep(item.value)}
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.done ? '已完成' : step === item.value ? '进行中' : '待完成'}</p>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {(mode === 'resource_edit' || workspaceDisplayPath.trim() || workspaceTree.length > 0 || remoteWorkspacePath.trim() || remoteWorkspaceTree.length > 0) ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 sm:p-3 sm:pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">文件树</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:p-3 sm:pt-0">
              {mode === 'resource_edit' ? (
                <div className="space-y-2">
                  <p className="truncate px-1 text-[11px] text-muted-foreground">{remoteWorkspacePath || '未同步远程仓库'}</p>
                  <nav className="max-h-56 overflow-y-auto" aria-label="Remote File Tree">
                    {remoteWorkspaceTree.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                        当前 GitHub 仓库暂无可识别文件
                      </div>
                    ) : (
                      <ul className="space-y-1" role="tree" aria-label="Remote Tree">
                        {visibleRemoteItems.map((item) => (
                          <li key={`remote-${item.path}`} role="treeitem" aria-level={item.depth + 1}>
                            {item.type === 'folder' ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                                style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                title={item.path}
                                onClick={() => toggleRemoteFolder(item.path)}
                              >
                                {item.collapsed ? <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground" /> : <CaretDown size={12} weight="bold" className="shrink-0 text-muted-foreground" />}
                                <FolderNotchOpenIcon size={14} weight="fill" className="shrink-0 text-muted-foreground" />
                                <span className="truncate">{item.label}</span>
                              </button>
                            ) : (
                              <div
                                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                                style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                title={item.path}
                              >
                                <span className="w-3 shrink-0" />
                                <File size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                                <span className="truncate">{item.label}</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </nav>
                </div>
              ) : (
                <Tabs value={fileTreeTab} onValueChange={(value) => setFileTreeTab(value as 'workspace' | 'remote')} className="space-y-2">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="workspace">本地文件</TabsTrigger>
                    <TabsTrigger value="remote">GitHub仓库文件</TabsTrigger>
                  </TabsList>

                  {fileTreeTab === 'workspace' ? (
                    <div className="mt-0">
                      <p className="truncate px-1 text-[11px] text-muted-foreground">{workspaceDisplayPath || '未选择文件夹'}</p>
                      <nav className="mt-2 max-h-56 overflow-y-auto" aria-label="Workspace File Tree">
                        {workspaceTree.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                            当前文件夹暂无可识别文件
                          </div>
                        ) : (
                          <ul className="space-y-1" role="tree" aria-label="Workspace Tree">
                            {visibleWorkspaceItems.map((item) => (
                              <li key={`workspace-${item.path}`} role="treeitem" aria-level={item.depth + 1}>
                                {item.type === 'folder' ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                                    style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                    title={item.path}
                                    onClick={() => toggleWorkspaceFolder(item.path)}
                                  >
                                    {item.collapsed ? <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground" /> : <CaretDown size={12} weight="bold" className="shrink-0 text-muted-foreground" />}
                                    <FolderNotchOpenIcon size={14} weight="fill" className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                ) : (
                                  <div
                                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                                    style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                    title={item.path}
                                  >
                                    <span className="w-3 shrink-0" />
                                    <File size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </nav>
                    </div>
                  ) : null}

                  {fileTreeTab === 'remote' ? (
                    <div className="mt-0">
                      <p className="truncate px-1 text-[11px] text-muted-foreground">{remoteWorkspacePath || '未同步远程仓库'}</p>
                      <nav className="mt-2 max-h-56 overflow-y-auto" aria-label="Remote File Tree">
                        {remoteWorkspaceTree.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                            当前 GitHub 仓库暂无可识别文件
                          </div>
                        ) : (
                          <ul className="space-y-1" role="tree" aria-label="Remote Tree">
                            {visibleRemoteItems.map((item) => (
                              <li key={`remote-${item.path}`} role="treeitem" aria-level={item.depth + 1}>
                                {item.type === 'folder' ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                                    style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                    title={item.path}
                                    onClick={() => toggleRemoteFolder(item.path)}
                                  >
                                    {item.collapsed ? <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground" /> : <CaretDown size={12} weight="bold" className="shrink-0 text-muted-foreground" />}
                                    <FolderNotchOpenIcon size={14} weight="fill" className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                ) : (
                                  <div
                                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                                    style={{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }}
                                    title={item.path}
                                  >
                                    <span className="w-3 shrink-0" />
                                    <File size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </nav>
                    </div>
                  ) : null}
                </Tabs>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card className="hidden border-border bg-card xl:block">
          <CardHeader className="pb-2 sm:p-3 sm:pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSubmitLogs([])}>清空</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 sm:p-3 sm:pt-0">
            <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
              <pre className="m-0 whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground">{submitLogs.join('\n') || '暂无日志'}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card ref={mainWorkbenchCardRef}>
          <CardHeader className="pb-3 sm:p-3 sm:pb-3">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 sm:p-3 sm:pt-0">
            {bootstrapLoading ? (
              <div className="space-y-2 rounded-md border border-border bg-card/80 px-3 py-2">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-60 max-w-full" />
              </div>
            ) : null}
            {bootstrapError ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{bootstrapError}</div> : null}

            <section className="space-y-3 rounded-xl border border-border bg-card p-3">
              {step === '0' && mode === 'publish' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="workspace-folder-name">新文件夹名称</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="workspace-folder-name"
                        value={workspaceFolderNameInput}
                        onChange={(event) => setWorkspaceFolderNameInput(event.target.value)}
                        placeholder="例如：MyApp"
                      />
                      <span className="text-xs text-muted-foreground">_AstroBox_Release</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={workspaceBusy || isSubmitting} onClick={() => void createWorkspaceFolder()}>
                      创建文件夹
                    </Button>
                    <Button variant="outline" disabled={workspaceBusy || isSubmitting} onClick={() => void selectWorkspace()}>
                      <FolderNotchOpenIcon size={16} weight="duotone" />
                      选择已有文件夹
                    </Button>
                    <Button variant="outline" disabled={workspaceBusy || isSubmitting || !workspaceHandle} onClick={() => void refreshWorkspaceFileTree()}>
                      刷新文件树
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                    {workspaceDisplayPath || workspaceName || '未选择文件夹'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    浏览器环境受安全限制，显示的是可用路径标识，不是系统绝对路径。
                  </p>
                </div>
              ) : null}

              {step === '1' ? (
                <div className="space-y-4">
                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-3 sm:p-3 sm:pb-3">
                      <CardTitle className="text-base">应用信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0 sm:p-3 sm:pt-0">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="item-id">资源 ID</Label>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowResourceIdGuide(true)}>这是什么？</Button>
                          </div>
                          <Input
                            id="item-id"
                            value={resourceId}
                            onChange={(event) => setResourceId(event.target.value)}
                            placeholder={restype === 'watchface' ? '输入 12 位纯数字表盘 ID' : '例如：com.example.app'}
                          />
                          {resourceId.trim() && resourceIdValidationMessage ? <p className="text-xs text-destructive">{resourceIdValidationMessage}</p> : null}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="item-name">资源名称</Label>
                          <Input id="item-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My Resource" />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="restype">资源类型</Label>
                          <Select value={restype} onValueChange={(value: Restype) => setRestype(value)}>
                            <SelectTrigger id="restype">
                              <SelectValue placeholder="请选择资源类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quickapp">快应用 (quickapp)</SelectItem>
                              <SelectItem value="watchface">表盘 (watchface)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="paid-type">付费类型</Label>
                          <Select value={paidType || 'free'} onValueChange={(value) => setPaidType(value === 'free' ? '' : value)}>
                            <SelectTrigger id="paid-type">
                              <SelectValue placeholder="免费（留空）" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">免费(感谢你作出的贡献)</SelectItem>
                              <SelectItem value="paid">应用内付费(paid，体验版请选择此项)</SelectItem>
                              <SelectItem value="force_paid">强制付费(force_paid)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {mode === 'publish' && restype === 'watchface' ? (
                        <WatchfaceIdEditor resourceId={resourceId} onApplyResourceId={setResourceId} />
                      ) : null}

                      <div className="space-y-1.5">
                        <Label htmlFor="item-description">资源描述</Label>
                        <Textarea
                          id="item-description"
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          className="min-h-[90px] resize-y overflow-auto"
                          placeholder="填写资源描述（manifest_v2.item.description）"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-3 sm:p-3 sm:pb-3">
                      <CardTitle className="text-base">资源属性</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0 sm:p-3 sm:pt-0">
                      <div className="space-y-2">
                        <Label>标签</Label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <Badge key={`${tag}-${index}`} variant="outline" className="gap-1">
                              {tag}
                              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => removeTag(index)}>×</button>
                            </Badge>
                          ))}
                          {tags.length === 0 ? <span className="text-xs text-muted-foreground">暂无标签</span> : null}
                        </div>
                        <div className="flex gap-2 max-sm:flex-col">
                          <Input
                            value={tagInput}
                            onChange={(event) => setTagInput(event.target.value)}
                            placeholder="输入标签后回车或点击添加"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                addTag()
                              }
                            }}
                          />
                          <Button variant="default" className="font-semibold" onClick={addTag}>添加标签</Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="icon-path">图标</Label>
                          <div className="flex gap-2 max-sm:flex-col">
                            <Input id="icon-path" value={iconPath} readOnly placeholder="点击右侧按钮从工作区选择文件" />
                            <Button variant="outline" onClick={() => (mode === 'resource_edit' ? openRemoteFilePicker('icon') : void selectIconFile())}>选择文件</Button>
                          </div>
                          <p className="text-xs text-muted-foreground">宽高比 1:1，大小不超过 200px × 200px</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cover-path">封面</Label>
                          <div className="flex gap-2 max-sm:flex-col">
                            <Input id="cover-path" value={coverPath} readOnly placeholder="点击右侧按钮从工作区选择文件" />
                            <Button variant="outline" onClick={() => (mode === 'resource_edit' ? openRemoteFilePicker('cover') : void selectCoverFile())}>选择文件</Button>
                          </div>
                          <p className="text-xs text-muted-foreground">宽高比 1.5，宽度不宜超过 2000px</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>预览图（支持多选）</Label>
                        <PreviewImageCarousel items={previewCarouselItems} emptyText="暂无预览图" removable onRemove={deletePreviewAt} />
                        {deletedStack.length > 0 ? (
                          <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 text-xs sm:px-3">
                            <div className="font-medium text-foreground">最近删除（可撤销）</div>
                            {deletedStack.slice(0, 3).map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0 break-all text-muted-foreground">{entry.item.path}</div>
                                <Button variant="outline" size="sm" className="h-6 shrink-0 px-2 text-xs" onClick={() => undoDelete(entry.id)}>撤销</Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <Button variant="default" className="font-semibold" onClick={() => (mode === 'resource_edit' ? openRemoteFilePicker('preview') : void selectMultiplePreviewFiles())}>
                          + 添加预览图
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-3 sm:p-3 sm:pb-3">
                      <CardTitle className="text-base">作者信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 sm:p-3 sm:pt-0">
                      {authors.map((author, index) => (
                        <div key={`author-${index}`} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                            <div className="space-y-1.5">
                              <Label htmlFor={`author-name-${index}`}>作者名称</Label>
                              <Input id={`author-name-${index}`} value={author.name} onChange={(event) => updateAuthor(index, { name: event.target.value })} placeholder="作者名" />
                            </div>
                            <Button variant="outline" onClick={() => removeAuthor(index)}>删除作者</Button>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`author-url-${index}`}>作者链接（仅 v1）</Label>
                            <Input id={`author-url-${index}`} value={author.authorUrl} onChange={(event) => updateAuthor(index, { authorUrl: event.target.value })} placeholder="https://github.com/yourname" />
                            <p className="text-xs text-muted-foreground">该字段仅用于生成 v1 的 `manifest.json`（author_url）。</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant={author.bindABAccount ? 'default' : 'outline'} size="sm" onClick={() => updateAuthor(index, { bindABAccount: true })}>绑定 AB 账号</Button>
                            <Button variant={!author.bindABAccount ? 'default' : 'outline'} size="sm" onClick={() => updateAuthor(index, { bindABAccount: false })}>不绑定</Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="default" className="font-semibold" onClick={addAuthor}>+ 添加作者</Button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-3 sm:p-3 sm:pb-3">
                      <CardTitle className="text-base">相关链接（links）</CardTitle>
                      <CardDescription>icon 请填写 phosphor 图标名，可点击搜索按钮选择。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 sm:p-3 sm:pt-0">
                      {links.map((link, index) => (
                        <div key={`link-${index}`} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                            <div className="space-y-1.5">
                              <Label htmlFor={`link-icon-${index}`}>图标名（icon）</Label>
                              <div className="flex gap-2">
                                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border">
                                  <PhosphorIconByName
                                    iconName={link.icon}
                                    size={18}
                                    className="text-foreground"
                                    fallbackSize={16}
                                    fallbackClassName="text-muted-foreground"
                                  />
                                </div>
                                <Input id={`link-icon-${index}`} value={link.icon} onChange={(event) => updateLink(index, { icon: event.target.value })} placeholder="github-logo / house / globe" />
                                <Button variant="outline" onClick={() => openLinkIconPicker(index)}>搜索图标</Button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`link-title-${index}`}>标题（title）</Label>
                              <Input id={`link-title-${index}`} value={link.title} onChange={(event) => updateLink(index, { title: event.target.value })} placeholder="开源地址" />
                            </div>
                            <Button variant="outline" onClick={() => removeLink(index)}>删除链接</Button>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`link-url-${index}`}>URL</Label>
                            <Input id={`link-url-${index}`} value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} placeholder="https://github.com/xxx/yyy" />
                          </div>
                        </div>
                      ))}
                      <Button variant="default" className="font-semibold" onClick={addLink}>+ 添加链接</Button>
                      {linksValidationMessage ? <p className="text-xs text-destructive">{linksValidationMessage}</p> : null}
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-none">
                    <CardHeader className="pb-3 sm:p-3 sm:pb-3">
                      <CardTitle className="text-base">下载资源</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 sm:p-3 sm:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="default" className="font-semibold" onClick={() => setShowDeviceSelector(true)}>+ 选择支持设备</Button>
                        {selectedDeviceIds.length === 0 ? <span className="text-xs text-muted-foreground">尚未选择设备</span> : null}
                      </div>
                      {selectedDeviceIds.map((deviceId) => {
                        const entry = getDownloadEntry(deviceId)
                        return (
                          <div key={`download-${deviceId}`} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground">{getDeviceLabel(deviceId)}</div>
                              <Button variant="outline" size="sm" onClick={() => removeDevice(deviceId)}>移除设备</Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label htmlFor={`download-version-${deviceId}`}>版本号</Label>
                                <Input id={`download-version-${deviceId}`} value={entry.version} onChange={(event) => updateDownloadByDevice(deviceId, { version: event.target.value })} placeholder="1.0.0" />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor={`download-file-${deviceId}`}>文件路径</Label>
                                <div className="flex gap-2 max-sm:flex-col">
                                  <Input id={`download-file-${deviceId}`} value={entry.file_name} readOnly placeholder="点击右侧按钮从工作区选择文件" />
                                  <Button variant="outline" onClick={() => (mode === 'resource_edit' ? openRemoteFilePicker('download', deviceId) : void selectDownloadFile(deviceId))}>
                                    选择文件
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>

                </div>
              ) : null}

              {step === '2' ? (
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                    提交流程：<span className="font-semibold text-foreground">{submitModeLabel}</span>
                  </div>
                  {mode !== 'resource_edit' ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="repo-name">资源仓库名（可选）</Label>
                        <Popover open={repoAutocompleteOpen && Boolean(repoNameInput.trim())} onOpenChange={setRepoAutocompleteOpen}>
                          <PopoverAnchor asChild>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <Input
                                id="repo-name"
                                value={repoNameInput}
                                onChange={(event) => handleRepoNameInputChange(event.target.value)}
                                onFocus={handleRepoNameInputFocus}
                                onBlur={handleRepoNameInputBlur}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    setRepoAutocompleteOpen(false)
                                    return
                                  }
                                  if (event.key === 'Enter' && repoAutocompleteOpen && ownedRepoAutocompleteItems.length > 0) {
                                    event.preventDefault()
                                    selectOwnedRepo(ownedRepoAutocompleteItems[0])
                                  }
                                }}
                                placeholder="留空时默认使用当前文件夹名"
                              />
                              <Button variant="outline" type="button" className="justify-center" onClick={handleOpenRepoSearchDialog}>
                                <MagnifyingGlass size={16} weight="duotone" />
                                搜索仓库
                              </Button>
                            </div>
                          </PopoverAnchor>
                          <PopoverContent
                            align="start"
                            className="w-[min(560px,calc(100vw-2rem))] p-0"
                            onOpenAutoFocus={(event) => event.preventDefault()}
                          >
                            <Command shouldFilter={false}>
                              <CommandList>
                                {ownedRepoLoading ? (
                                  <div className="px-3 py-4 text-xs text-muted-foreground">正在加载已有仓库...</div>
                                ) : null}
                                {!ownedRepoLoading && ownedRepoError ? (
                                  <div className="px-3 py-4 text-xs text-destructive">{ownedRepoError}</div>
                                ) : null}
                                {!ownedRepoLoading && !ownedRepoError && ownedRepoAutocompleteItems.length === 0 ? (
                                  <CommandEmpty>没有匹配仓库，继续输入会按当前名称创建或复用。</CommandEmpty>
                                ) : null}
                                {!ownedRepoLoading && !ownedRepoError && ownedRepoAutocompleteItems.length > 0 ? (
                                  <CommandGroup heading="匹配仓库">
                                    {ownedRepoAutocompleteItems.map((repo) => {
                                      const selected = normalizeLower(resolvedRepoName) === normalizeLower(repo.name)
                                      return (
                                        <CommandItem
                                          key={`repo-autocomplete-${repo.fullName}`}
                                          value={repo.fullName}
                                          onMouseDown={(event) => event.preventDefault()}
                                          onSelect={() => selectOwnedRepo(repo)}
                                        >
                                          <FolderNotchOpenIcon size={16} weight="duotone" className="shrink-0 text-muted-foreground" />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="truncate font-medium text-foreground">{highlightMatchedText(repo.name, repoNameInput)}</span>
                                              <Badge variant="secondary" className="gap-1">
                                                <GitBranch size={12} weight="duotone" />
                                                {repo.defaultBranch}
                                              </Badge>
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">{highlightMatchedText(repo.fullName, repoNameInput)}</div>
                                            {repo.description ? (
                                              <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{highlightMatchedText(repo.description, repoNameInput)}</div>
                                            ) : null}
                                          </div>
                                          <CheckCircle
                                            size={16}
                                            weight={selected ? 'fill' : 'regular'}
                                            className={cn('shrink-0', selected ? 'text-primary' : 'text-muted-foreground/40')}
                                          />
                                        </CommandItem>
                                      )
                                    })}
                                  </CommandGroup>
                                ) : null}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="repo-desc">仓库描述（可选）</Label>
                        <Input
                          id="repo-desc"
                          value={repoDescription}
                          onChange={(event) => setRepoDescription(event.target.value)}
                          placeholder="resource repository"
                        />
                      </div>
                    </div>
                  ) : null}

                  {submitError ? (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">{submitError}</div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={!canUpload || isSubmitting} onClick={() => void handleUploadResources()}>
                      <UploadSimple size={16} weight="duotone" />
                      {uploading ? '上传中...' : mode === 'resource_edit' ? '更新仓库' : '上传仓库'}
                    </Button>
                  </div>

                  {boundRepoUrl ? (
                    <div className="rounded-lg border border-border bg-muted/25 p-3 text-sm">
                      <p className="mb-1 font-medium text-foreground">仓库已就绪</p>
                      <a
                        href={boundRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {boundRepoUrl}
                      </a>
                    </div>
                  ) : null}

                  <div className="flex justify-between gap-2">
                    <Button variant="outline" disabled={isSubmitting} onClick={() => goToStep('1')}>上一步</Button>
                    <Button disabled={isSubmitting || !isUploadStepDone} onClick={() => goToStep('3')}>下一步</Button>
                  </div>
                </div>
              ) : null}

              {step === '3' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">提交流程：{submitModeLabel}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">目标仓库：{defaultTargetOwner}/{defaultTargetRepo}</div>
                  {(submitMode === 'v2' || submitMode === 'both') ? (
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">Catalog(v2)：{defaultCatalogPath}</div>
                  ) : null}
                  {(submitMode === 'v1' || submitMode === 'both') ? (
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">Catalog(v1)：{LEGACY_CATALOG_PATH}</div>
                  ) : null}
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源仓库：{boundRepoOwner || '-'}/{boundRepoName || '-'}</div>
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-pr-title">PR 标题</Label>
                    <Input id="publish-pr-title" value={prTitle} onChange={(event) => setPrTitle(event.target.value)} placeholder="[ABoooxCC] 更新 ..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-pr-body">PR 描述</Label>
                    <Textarea
                      ref={prBodyTextareaRef}
                      id="publish-pr-body"
                      value={prBody}
                      onChange={(event) => setPrBody(event.target.value)}
                      className="min-h-[120px]"
                      style={!isMobileViewport ? { minHeight: `${desktopPrBodyMinHeight}px` } : undefined}
                    />
                  </div>
                  {latestPrUrl ? (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                      PR 已创建：
                      <a href={latestPrUrl} target="_blank" rel="noopener noreferrer" className="ml-1 break-all underline underline-offset-2">
                        {latestPrUrl}
                      </a>
                    </div>
                  ) : null}
                  {submitError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">{submitError}</div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" disabled={isSubmitting} onClick={() => goToStep('2')}>
                      返回上传步骤
                    </Button>
                    <Button disabled={!canCreatePr || isSubmitting} onClick={() => void handleCreateCatalogPr()}>
                      <CheckCircle size={16} weight="duotone" />
                      {creatingPr ? '创建中...' : '提交 Pull Request'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            {(step === '0' || step === '1') ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                <Button variant="outline" disabled={step === stepItems[0]?.value || isSubmitting} onClick={goPrevStep}>
                  上一步
                </Button>
                <Button
                  disabled={isSubmitting || (step !== '1' && !canGoNextStep)}
                  onClick={goNextStep}
                >
                  <UploadSimple size={16} weight="duotone" />
                  下一步
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:hidden">
          <CardHeader className="pb-2 sm:p-3 sm:pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSubmitLogs([])}>清空</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 sm:p-3 sm:pt-0">
            <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
              <pre className="m-0 whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground">{submitLogs.join('\n') || '暂无日志'}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={repoSearchDialogOpen} onOpenChange={handleRepoSearchDialogOpenChange}>
        <DialogContent className="w-[95vw] !max-w-[760px]">
          <DialogHeader>
            <DialogTitle>搜索已有仓库</DialogTitle>
            <DialogDescription>从当前 GitHub 账号下的仓库中选择，选中后会自动回填资源仓库名。</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="rounded-lg border border-border">
            <CommandInput
              value={repoSearchDialogQuery}
              onValueChange={setRepoSearchDialogQuery}
              placeholder="搜索仓库名、完整路径、描述或默认分支"
            />
            <CommandList>
              {ownedRepoLoading ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">正在加载仓库列表...</div>
              ) : null}
              {!ownedRepoLoading && ownedRepoError ? (
                <div className="px-3 py-6 text-sm text-destructive">{ownedRepoError}</div>
              ) : null}
              {!ownedRepoLoading && !ownedRepoError && ownedRepoDialogItems.length === 0 ? (
                <CommandEmpty>没有匹配仓库</CommandEmpty>
              ) : null}
              {!ownedRepoLoading && !ownedRepoError && ownedRepoDialogItems.length > 0 ? (
                <CommandGroup heading={`仓库候选（当前展示 ${ownedRepoDialogItems.length} 项）`}>
                  {ownedRepoDialogItems.map((repo) => {
                    const selected = normalizeLower(resolvedRepoName) === normalizeLower(repo.name)
                    return (
                      <CommandItem
                        key={`repo-dialog-${repo.fullName}`}
                        value={repo.fullName}
                        className="items-start gap-3 py-3"
                        onSelect={() => selectOwnedRepo(repo)}
                      >
                        <FolderNotchOpenIcon size={18} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{highlightMatchedText(repo.name, repoSearchDialogQuery)}</span>
                            <Badge variant="secondary" className="gap-1">
                              <GitBranch size={12} weight="duotone" />
                              {repo.defaultBranch}
                            </Badge>
                            {selected ? <Badge>当前选中</Badge> : null}
                          </div>
                          <div className="break-all text-xs text-muted-foreground">{highlightMatchedText(repo.fullName, repoSearchDialogQuery)}</div>
                          <div className="text-xs text-muted-foreground">最近更新：{formatRepoUpdatedAt(repo.updatedAt)}</div>
                          {repo.description ? (
                            <div className="text-sm text-muted-foreground">{highlightMatchedText(repo.description, repoSearchDialogQuery)}</div>
                          ) : null}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepoSearchDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
        <DialogContent className="w-[95vw] !max-w-[1120px]">
          <DialogHeader>
            <DialogTitle>选择支持设备</DialogTitle>
            <DialogDescription>设备会自动映射为 v2 设备 ID，并同步到 downloads。</DialogDescription>
          </DialogHeader>
          <div className="my-2 max-h-[68vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 max-[420px]:grid-cols-1">
              {deviceSelectorEntries.map((entry) => {
                const active = isDeviceSelected(entry.id)
                return (
                  <button
                    key={`device-option-${entry.key}`}
                    type="button"
                    className={`h-full min-h-[92px] cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-background hover:bg-accent'
                    }`}
                    onClick={() => toggleDeviceSelection(entry.id)}
                  >
                    <div className="text-sm font-semibold text-foreground">{entry.name}</div>
                    <div className="text-xs text-muted-foreground">{entry.model} · {entry.id} / {entry.codename}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeviceSelector(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResourceIdGuide} onOpenChange={setShowResourceIdGuide}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>资源 ID 说明</DialogTitle>
            <DialogDescription>用于 index_v2.csv 的唯一标识，快应用和表盘规则不同。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-foreground">
            <p>1. 快应用：填写应用包名，如 `com.searchstars.hyperbilibili`。</p>
            <p>2. 表盘：填写 12 位纯数字表盘 ID；若需改 `.bin` / `.face` 内置 ID，可直接使用下方工具并自动同步。</p>
            <p>3. 资源名、资源类型必须与 manifest_v2.json 中保持一致。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResourceIdGuide(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOutOfWorkspaceFileDialog} onOpenChange={setShowOutOfWorkspaceFileDialog}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>文件不在当前工作区</DialogTitle>
            <DialogDescription>请先将需要的文件放入当前工作区，再重新选择。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutOfWorkspaceFileDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFolderNameValidationDialog} onOpenChange={setShowFolderNameValidationDialog}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>文件夹名称不符合规范</DialogTitle>
            <DialogDescription>{folderNameValidationMessage || '请调整文件夹命名后重试。'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderNameValidationDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageValidationDialog} onOpenChange={setShowImageValidationDialog}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>图片尺寸不符合要求</DialogTitle>
            <DialogDescription>{imageValidationMessage || '请调整图片后重试。'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageValidationDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFileNameConflictDialog} onOpenChange={setShowFileNameConflictDialog}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>文件名冲突</DialogTitle>
            <DialogDescription>{fileNameConflictMessage || '请修改文件名后重试。'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFileNameConflictDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResourceInfoValidationDialog} onOpenChange={setShowResourceInfoValidationDialog}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>资源信息未填写完整</DialogTitle>
            <DialogDescription>请先补齐以下字段后再继续下一步。</DialogDescription>
          </DialogHeader>
          <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
            {resourceInfoValidationIssues.length === 0 ? (
              <p className="text-muted-foreground">未检测到具体问题，请检查必填项。</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5">
                {resourceInfoValidationIssues.map((issue, index) => (
                  <li key={`resource-info-issue-${index}`}>{issue}</li>
                ))}
              </ol>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResourceInfoValidationDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadCompleteDialog} onOpenChange={setShowUploadCompleteDialog}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{mode === 'resource_edit' ? '更新已完成' : '上传已完成'}</DialogTitle>
            <DialogDescription>
              {mode === 'resource_edit' ? '资源仓库已更新完成，你可以继续下一步创建 PR。' : '资源仓库已创建并上传完成，你可以继续下一步创建 PR。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowUploadCompleteDialog(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitVersionDialog} onOpenChange={setShowSubmitVersionDialog}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>选择提交流程</DialogTitle>
            <DialogDescription>
              {mode === 'resource_edit' ? '请选择本次要更新到 v1、v2，或同时更新。' : '请选择本次要提交到 v1、v2，或同时提交。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            {submitModeOptions.map((option) => (
              <Button
                key={`submit-mode-option-${option.value}`}
                variant={option.variant}
                className="justify-start"
                onClick={() => confirmSubmitMode(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitVersionDialog(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobileViewport ? (
        <Sheet open={showRemoteFilePickerDialog} onOpenChange={setShowRemoteFilePickerDialog}>
          <SheetContent side="bottom" className="flex h-auto max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl p-4 sm:hidden">
            <SheetHeader className="shrink-0 gap-1 text-left">
              <SheetTitle className="text-base">{remotePickerDialogTitle}</SheetTitle>
              <SheetDescription>{remotePickerDialogDescription}</SheetDescription>
            </SheetHeader>
            {remotePickerDialogBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showRemoteFilePickerDialog} onOpenChange={setShowRemoteFilePickerDialog}>
          <DialogContent className="flex h-[78vh] w-[95vw] !max-w-[1120px] flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>{remotePickerDialogTitle}</DialogTitle>
              <DialogDescription>{remotePickerDialogDescription}</DialogDescription>
            </DialogHeader>
            {remotePickerDialogBody}
          </DialogContent>
        </Dialog>
      )}

      <LinkIconPickerDialog
        open={showLinkIconPicker}
        initialQuery={linkPickerInitialQuery}
        onOpenChange={handleLinkIconPickerOpenChange}
        onSelect={selectLinkIcon}
      />
    </div>
  )
}
