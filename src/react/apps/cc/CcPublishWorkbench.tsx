import {
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
  CheckCircle,
  DotsThreeVertical,
  File,
  FileImage,
  FolderNotchOpenIcon,
  FolderPlus,
  NotePencil,
  Trash,
  UploadSimple
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
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
import { deviceSelectorEntries, deviceOptions, normalizeDeviceToken } from '@/components/resourcePublishWorkbenchDeviceCatalog'
import { buildRawGithubUrl } from '@/react/components/cc/resource-manifest'
import { PreviewImageCarousel, type PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'
import { LinkIconPickerDialog, PhosphorIconByName } from '@/react/components/cc/LinkIconPickerDialog'
import { Button } from '@/react/components/ui/button'
import { Badge } from '@/react/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { Textarea } from '@/react/components/ui/textarea'

type PublishPreviewItem = PreviewImageItem & {
  id: string
  path: string
  objectUrl?: string
  fileObject?: File
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

type Restype = 'quickapp' | 'watchface'
type StepKey = '0' | '1' | '2' | '3' | '4'

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

const validateGitHubRepoName = (name: string): string | null => {
  if (!name) return '名称不能为空'
  if (name.length > 100) return '长度不能超过 100 个字符'
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
  const [deletedStack, setDeletedStack] = useState<PublishPreviewItem[]>([])
  const [submitMode, setSubmitMode] = useState<SubmitMode>('v2')
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
  const [boundRepoUrl, setBoundRepoUrl] = useState('')
  const [existingCommitSha, setExistingCommitSha] = useState('')
  const [baselineCatalogId, setBaselineCatalogId] = useState('')
  const [existingManifestObject, setExistingManifestObject] = useState<Record<string, unknown> | null>(null)
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [showResourceIdGuide, setShowResourceIdGuide] = useState(false)
  const [showOutOfWorkspaceFileDialog, setShowOutOfWorkspaceFileDialog] = useState(false)
  const [showImageValidationDialog, setShowImageValidationDialog] = useState(false)
  const [imageValidationMessage, setImageValidationMessage] = useState('')
  const [showFolderNameValidationDialog, setShowFolderNameValidationDialog] = useState(false)
  const [folderNameValidationMessage, setFolderNameValidationMessage] = useState('')
  const [showFileNameConflictDialog, setShowFileNameConflictDialog] = useState(false)
  const [fileNameConflictMessage, setFileNameConflictMessage] = useState('')
  const [showSubmitVersionDialog, setShowSubmitVersionDialog] = useState(false)
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const extraFileInputRef = useRef<HTMLInputElement | null>(null)
  const remotePickerLocalInputRef = useRef<HTMLInputElement | null>(null)
  const remotePickerRenameInputRef = useRef<HTMLInputElement | null>(null)
  const previewItemsRef = useRef<PublishPreviewItem[]>([])
  const opfsLocalPreviewUrlMapRef = useRef<Record<string, string>>({})
  const deletedStackRef = useRef<PublishPreviewItem[]>([])
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
      revokeLocalItems(previewItemsRef.current)
      revokeLocalItems(deletedStackRef.current)
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
      revokeLocalItems(prev)
      return []
    })
    setExtraFiles([])
    setAuthors([{ name: currentUser.trim(), authorUrl: '', bindABAccount: true }])
    setLinks([])
    setDownloads([])
    setSubmitMode('v2')
    setBootstrapError('')
    setSubmitError('')
    setSubmitLogs([])
    setLatestPrUrl('')
    setPrTitle('')
    setPrBody('')
    setHasUploadedInFlow(false)
    setBoundRepoOwner('')
    setBoundRepoName('')
    setBoundRepoUrl('')
    setExistingCommitSha('')
    setBaselineCatalogId('')
    setExistingManifestObject(null)
    setShowDeviceSelector(false)
    setShowResourceIdGuide(false)
    setShowOutOfWorkspaceFileDialog(false)
    setShowImageValidationDialog(false)
    setImageValidationMessage('')
    setShowFolderNameValidationDialog(false)
    setFolderNameValidationMessage('')
    setShowFileNameConflictDialog(false)
    setFileNameConflictMessage('')
    setShowSubmitVersionDialog(false)
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
    setAuthors([{ name: currentUser.trim(), authorUrl: '', bindABAccount: true }])
  }, [authors, currentUser, mode])

  useEffect(() => {
    if (mode !== 'resource_edit') {
      setBootstrapLoading(false)
      setBootstrapError('')
      setExistingManifestObject(null)
      setBaselineCatalogId('')
      setBoundRepoOwner('')
      setBoundRepoName('')
      setBoundRepoUrl('')
      setExistingCommitSha('')
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
        const activeRef = hasV2 ? (detail.v2Ref || detail.defaultBranch) : (detail.v1Ref || detail.defaultBranch)
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

        setResourceId(parsed.id || target.catalogId || targetResourceId)
        setName(parsed.name || target.name)
        setDescription(parsed.description || target.description || '')
        setRestype(normalizeRestype(parsed.restype || target.restype))
        setIconPath(parsed.icon || target.icon || '')
        setCoverPath(parsed.cover || target.cover || '')
        setTags(parseTagText(target.tags || ''))
        setTagInput('')
        setDeviceVendorsText(target.device_vendors || '')
        setDevicesText(target.devices || '')
        setPaidType(target.paid_type || '')
        setRepoNameInput(target.repo_name || '')
        setRepoDescription(`AstroBooox resource ${target.catalogId || target.name}`)
        setBoundRepoOwner(target.repo_owner || '')
        setBoundRepoName(target.repo_name || '')
        setBoundRepoUrl(`https://github.com/${target.repo_owner}/${target.repo_name}`)
        setExistingCommitSha(detail.latestCommitSha || target.repo_commit_hash || '')
        setBaselineCatalogId(target.catalogId || targetResourceId)
        setExistingManifestObject(parsed.rawObject)
        setHasUploadedInFlow(false)
        setSubmitMode('v2')
        setFileTreeTab('remote')
        setAuthors(parsedAuthors.length > 0 ? parsedAuthors : [{ name: target.repo_owner || '', authorUrl: '', bindABAccount: true }])
        setLinks(parsedLinks)
        setDownloads(parsedDownloads)
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
          revokeLocalItems(prev)
          return []
        })

        void syncRemoteWorkspace(target.repo_owner, target.repo_name, true)
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
  const hidePreviewInCurrentStepOnMobile = mode === 'resource_edit' && step === '1'
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
    const manual = repoNameInput
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (manual) return manual

    const fallback = (resourceId || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96)
    return fallback
  }, [name, repoNameInput, resourceId])

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

  const canUpload = useMemo(() => {
    const needV2Catalog = submitMode === 'v2' || submitMode === 'both'
    const baseReady = Boolean(
      token.trim() &&
      currentUser.trim() &&
      resourceId.trim() &&
      name.trim() &&
      iconPath.trim() &&
      coverPath.trim() &&
      defaultTargetOwner.trim() &&
      defaultTargetRepo.trim() &&
      (!needV2Catalog || defaultCatalogPath.trim())
    )
    if (!baseReady || bootstrapLoading || isSubmitting || Boolean(linksValidationMessage)) return false

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
    resourceId,
    submitMode,
    token,
    linksValidationMessage
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
    resourceId.trim() &&
    name.trim() &&
    iconPath.trim() &&
    coverPath.trim() &&
    normalizedTagsText &&
    areDownloadsComplete &&
    !linksValidationMessage
  )
  const isFileStepDone = Boolean(previewItems.length > 0 || extraFiles.length > 0 || mode === 'resource_edit')
  const isUploadStepDone = Boolean(hasUploadedInFlow && existingCommitSha.trim() && boundRepoOwner.trim() && boundRepoName.trim())
  const isSubmitStepDone = Boolean(latestPrUrl)

  const stepItems = useMemo(() => {
    const items: Array<{ value: StepKey; label: string; done: boolean }> = []
    if (mode === 'publish') {
      items.push({ value: '0', label: '创建文件夹', done: isWorkspaceStepDone })
    }
    items.push(
      { value: '1', label: '资源信息', done: isResourceInfoStepDone },
      { value: '2', label: '资源文件', done: isFileStepDone },
      { value: '3', label: '上传资源仓库', done: isUploadStepDone },
      { value: '4', label: '提交 Pull Request', done: isSubmitStepDone }
    )
    return items
  }, [isFileStepDone, isResourceInfoStepDone, isSubmitStepDone, isUploadStepDone, isWorkspaceStepDone, mode])

  const canGoNextStep = useMemo(() => {
    if (step === '0') return isWorkspaceStepDone
    if (step === '1') return isResourceInfoStepDone
    if (step === '2') return true
    if (step === '3') return isUploadStepDone
    return false
  }, [isResourceInfoStepDone, isUploadStepDone, isWorkspaceStepDone, step])

  const goPrevStep = () => {
    const index = stepItems.findIndex((item) => item.value === step)
    if (index <= 0) return
    setStep(stepItems[index - 1].value)
  }

  const goNextStep = () => {
    const index = stepItems.findIndex((item) => item.value === step)
    if (index < 0 || index >= stepItems.length - 1) return
    setStep(stepItems[index + 1].value)
  }

  const openSubmitVersionDialog = () => {
    if (!isResourceInfoStepDone) {
      appendLog('请先完成资源信息后再继续')
      return
    }
    setShowSubmitVersionDialog(true)
  }

  const confirmSubmitMode = (modeValue: SubmitMode) => {
    setSubmitMode(modeValue)
    setShowSubmitVersionDialog(false)
    setStep('3')
  }

  const appendLog = (message: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setSubmitLogs((prev) => [...prev, `[${time}] ${message}`].slice(-220))
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

  const syncRemoteWorkspace = async (owner: string, repo: string, shouldLog = true) => {
    const accessToken = token.trim()
    const normalizedOwner = owner.trim()
    const normalizedRepo = repo.trim()
    if (!accessToken || !normalizedOwner || !normalizedRepo) return
    try {
      const tree = await loadRepositoryTree({
        token: accessToken,
        owner: normalizedOwner,
        repo: normalizedRepo,
        branch: MAIN_BRANCH
      })
      setRemoteWorkspacePath(`${normalizedOwner}/${normalizedRepo}@${MAIN_BRANCH}`)
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

  const appendPreviewFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: PublishPreviewItem[] = []
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const objectUrl = URL.createObjectURL(file)
      const path = normalizeRepoPath(file.name)
      next.push({
        id: nextId(),
        path,
        file: file.name,
        url: objectUrl,
        objectUrl,
        fileObject: file
      })
    })
    if (next.length === 0) return
    setPreviewItems((prev) => [...prev, ...next])
    setIconPath((prev) => (prev.trim() ? prev : next[0].path))
    setCoverPath((prev) => (prev.trim() ? prev : next[0].path))
    setSubmitError('')
  }

  const appendExtraFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: ExtraUploadFile[] = Array.from(files).map((file) => ({
      id: nextId(),
      path: normalizeRepoPath(file.name),
      fileName: file.name,
      fileObject: file
    }))
    if (next.length === 0) return
    setExtraFiles((prev) => [...prev, ...next])
    setSubmitError('')
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
    if (!newName) {
      appendLog('文件夹名称不合法')
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
    const folderNameBase = '新建文件夹'
    const parent = sanitizeRepoFolderPath(parentPath ?? remotePickerTargetFolder)
    const taken = new Set([
      ...remoteWorkspaceTree.filter((item) => item.type === 'folder').map((item) => item.path),
      ...remotePickerDraftFolders
    ])
    let suffix = 0
    let candidate = folderNameBase
    while (taken.has(parent ? `${parent}/${candidate}` : candidate)) {
      suffix += 1
      candidate = `${folderNameBase} ${suffix + 1}`
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
      MAIN_BRANCH,
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

  const updatePreviewPath = (id: string, value: string) => {
    const path = normalizeRepoPath(value)
    setPreviewItems((prev) => prev.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        path,
        file: basenameFromPath(path),
        url: item.objectUrl || item.fileObject ? (item.objectUrl || item.url) : getPickerPreviewUrl(path)
      }
    }))
  }

  const updateExtraFilePath = (id: string, value: string) => {
    const path = normalizeRepoPath(value)
    setExtraFiles((prev) => prev.map((item) => (item.id === id ? { ...item, path } : item)))
  }

  const removeExtraFile = (id: string) => {
    setExtraFiles((prev) => prev.filter((item) => item.id !== id))
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
    setDeletedStack((prev) => {
      if (prev.length === 0) return prev
      const index = targetId ? prev.findIndex((item) => item.id === targetId) : 0
      if (index < 0) return prev
      const target = prev[index]
      setPreviewItems((old) => [...old, target])
      return [...prev.slice(0, index), ...prev.slice(index + 1)]
    })
  }

  const deletePreviewAt = (index: number) => {
    setPreviewItems((prev) => {
      const target = prev[index]
      if (!target) return prev
      const next = prev.filter((_, i) => i !== index)
      setDeletedStack((stack) => {
        const merged = [target, ...stack]
        const kept = merged.slice(0, PREVIEW_UNDO_LIMIT)
        const dropped = merged.slice(PREVIEW_UNDO_LIMIT)
        revokeLocalItems(dropped)
        finalizeRemovedPreviewItems(dropped)
        return kept
      })
      setIconPath((current) => (current.trim() === target.path ? '' : current))
      setCoverPath((current) => (current.trim() === target.path ? '' : current))

      toast('已删除预览图', {
        description: target.file,
        action: {
          label: '撤销',
          onClick: () => undoDelete(target.id)
        }
      })

      return next
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

  const encodeUrlPath = (path: string): string =>
    path
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/')

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
    return `https://raw.githubusercontent.com/${owner}/${repo}/${MAIN_BRANCH}/${encodeUrlPath(path)}`
  }

  const buildManifestV1Text = (repoUrl: string): string => {
    const normalizedAuthors = authors
      .map((author) => {
        const authorName = author.name.trim()
        const authorUrl = author.authorUrl.trim()
        return {
          name: authorName,
          ...(authorUrl ? { author_url: authorUrl } : {})
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
        author: normalizedAuthors
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

  const buildAutoPrTitle = (): string =>
    `[ABoooxCC] ${mode === 'resource_edit' ? '更新' : '发布'} ${name.trim() || '未命名资源'} ${formatResourceTypeForTitle(restype)}`

  const buildAutoPrBody = (repoUrl: string, commitSha: string): string => {
    const shortHash = commitSha.trim() ? commitSha.trim().slice(0, 7) : '--'
    return [
      '## 变更摘要',
      '',
      `- 模式：${mode === 'resource_edit' ? '更新已有资源' : '发布新资源'}`,
      `- 提交流程：${submitModeLabel}`,
      `- 资源 ID：${resourceId.trim()}`,
      `- 资源名称：${name.trim()}`,
      `- 资源类型：${formatResourceTypeForTitle(restype)}`,
      `- 预览图数量：${normalizedPreviewPaths.length}`,
      `- 作者数量：${authors.filter((item) => item.name.trim()).length}`,
      `- Links 数量：${links.filter((item) => item.icon.trim() || item.title.trim() || item.url.trim()).length}`,
      `- Downloads 数量：${downloads.filter((item) => item.device.trim()).length}`,
      `- Tags：${normalizedTagsText || '--'}`,
      '',
      '## 仓库信息',
      '',
      `- 资源仓库：${repoUrl}`,
      `- 提交短哈希：\`${shortHash}\``,
      '',
      '---',
      '此 PR 由 AstroBooox Creator Console (React) 自动创建。'
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

      appendLog('开始执行仓库上传')
      setUploading(true)

      let repoOwner = ''
      let repoName = ''
      let repoUrl = ''

      if (mode === 'resource_edit') {
        repoOwner = boundRepoOwner.trim()
        repoName = boundRepoName.trim()
        repoUrl = boundRepoUrl.trim() || `https://github.com/${repoOwner}/${repoName}`
        if (!repoOwner || !repoName) {
          throw new Error('更新模式缺少目标仓库信息')
        }
        appendLog(`更新模式：复用仓库 ${repoOwner}/${repoName}`)
      } else {
        const ensuredRepo = await ensureUserRepository({
          token: accessToken,
          owner: username,
          repoName: resolvedRepoName,
          description: repoDescription.trim() || `AstroBooox resource ${catalogId}`
        })
        repoOwner = ensuredRepo.owner
        repoName = ensuredRepo.name
        repoUrl = ensuredRepo.htmlUrl
        appendLog(`资源仓库就绪：${repoOwner}/${repoName}`)
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
            branch: MAIN_BRANCH,
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

          const oldFile = await fetchRepoFileOrNull(accessToken, repoOwner, repoName, item.path, MAIN_BRANCH)
          if (!oldFile?.sha) throw cause

          result = await putRepoFile({
            token: accessToken,
            owner: repoOwner,
            repo: repoName,
            path: item.path,
            branch: MAIN_BRANCH,
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
      setBoundRepoUrl(repoUrl)
      setHasUploadedInFlow(true)
      void syncRemoteWorkspace(repoOwner, repoName, false)

      const autoTitle = buildAutoPrTitle()
      const autoBody = buildAutoPrBody(repoUrl, latestCommitSha)
      setPrTitle(autoTitle)
      setPrBody(autoBody)

      appendLog(`仓库上传完成，commit=${latestCommitSha.slice(0, 7)}`)
      toast('上传成功', {
        description: `${repoOwner}/${repoName}@${latestCommitSha.slice(0, 7)}`
      })
      setStep('4')
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
    if (step !== '4') return
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

  return (
    <div className="min-w-0 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4 xl:sticky xl:top-[72px] xl:self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">步骤导航</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
                    onClick={() => setStep(item.value)}
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
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">文件树</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSubmitLogs([])}>清空</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
              <pre className="m-0 whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground">{submitLogs.join('\n') || '暂无日志'}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {bootstrapLoading ? <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">正在加载待更新资源信息...</div> : null}
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">应用信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="item-id">资源 ID</Label>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowResourceIdGuide(true)}>这是什么？</Button>
                          </div>
                          <Input id="item-id" value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="com.example.app / 9798xxxxxx" />
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">资源属性</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
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
                                <div className="min-w-0 break-all text-muted-foreground">{entry.path}</div>
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">作者信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">相关链接（links）</CardTitle>
                      <CardDescription>icon 请填写 phosphor 图标名，可点击搜索按钮选择。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">下载资源</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
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

                  <div className={hidePreviewInCurrentStepOnMobile ? 'hidden md:block' : ''}>
                    <div className="text-xs text-muted-foreground">当前预览图（桌面预览）</div>
                    <div className="mt-2">
                      <PreviewImageCarousel items={previewCarouselItems} emptyText="暂无预览图" />
                    </div>
                  </div>
                </div>
              ) : null}

              {step === '2' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()}>
                      <FileImage size={16} weight="duotone" />
                      选择预览图
                    </Button>
                    <Button type="button" variant="outline" onClick={() => extraFileInputRef.current?.click()}>
                      <UploadSimple size={16} weight="duotone" />
                      选择其他文件
                    </Button>
                    <Button type="button" variant="outline" disabled={deletedStack.length === 0} onClick={() => undoDelete()}>
                      <ArrowCounterClockwise size={16} weight="duotone" />
                      撤销删除
                    </Button>
                    <span className="text-xs text-muted-foreground">删除历史：{deletedStack.length}</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      appendPreviewFiles(event.target.files)
                      event.currentTarget.value = ''
                    }}
                  />
                  <input
                    ref={extraFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      appendExtraFiles(event.target.files)
                      event.currentTarget.value = ''
                    }}
                  />

                  <PreviewImageCarousel items={previewCarouselItems} removable onRemove={deletePreviewAt} emptyText="请先添加预览图" />
                  {previewItems.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">预览图路径（用于 manifest）</div>
                      {previewItems.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="w-6 text-xs text-muted-foreground">{index + 1}.</span>
                          <Input value={item.path} onChange={(event) => updatePreviewPath(item.id, event.target.value)} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">额外上传文件（用于 downloads/icon/cover 等）</div>
                    {extraFiles.length === 0 ? <div className="text-xs text-muted-foreground">暂无额外文件。</div> : null}
                    {extraFiles.map((item) => (
                      <div key={item.id} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                        <Input value={item.path} onChange={(event) => updateExtraFilePath(item.id, event.target.value)} />
                        <Button type="button" variant="outline" size="sm" onClick={() => removeExtraFile(item.id)}>移除</Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === '3' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    提交流程：<span className="font-semibold text-foreground">{submitModeLabel}</span>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源 ID：{resourceId.trim() || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源名称：{name.trim() || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源类型：{formatResourceTypeForTitle(restype)}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">预览图数量：{normalizedPreviewPaths.length}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">作者数量：{authors.filter((item) => item.name.trim()).length}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">Links 数量：{links.filter((item) => item.icon.trim() || item.title.trim() || item.url.trim()).length}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">Downloads 数量：{downloads.filter((item) => item.device.trim()).length}</div>
                  {submitError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive">{submitError}</div>
                  ) : null}
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">目标仓库：{boundRepoOwner || '-'}/{boundRepoName || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">最新提交：{existingCommitSha ? existingCommitSha.slice(0, 7) : '-'}</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" disabled={isSubmitting} onClick={openSubmitVersionDialog}>
                      选择提交流程
                    </Button>
                    <Button disabled={!canUpload || isSubmitting} onClick={() => void handleUploadResources()}>
                      <UploadSimple size={16} weight="duotone" />
                      {uploading ? '上传中...' : mode === 'resource_edit' ? '更新仓库' : '上传仓库'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!isUploadStepDone || isSubmitting}
                      onClick={() => setStep('4')}
                    >
                      下一步：提交 PR
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === '4' ? (
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
                    <Textarea id="publish-pr-body" value={prBody} onChange={(event) => setPrBody(event.target.value)} className="min-h-[120px]" />
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
                    <Button variant="outline" disabled={isSubmitting} onClick={() => setStep('3')}>
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

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" disabled={step === stepItems[0]?.value || isSubmitting} onClick={goPrevStep}>
                上一步
              </Button>
              <Button disabled={step === '4' || isSubmitting || !canGoNextStep} onClick={goNextStep}>
                <UploadSimple size={16} weight="duotone" />
                下一步
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card xl:hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSubmitLogs([])}>清空</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
              <pre className="m-0 whitespace-pre-wrap break-words text-[11px] leading-5 text-foreground">{submitLogs.join('\n') || '暂无日志'}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <p>2. 表盘：使用 `9798` 开头的占位 ID（12 位），例如 `979808741600`。</p>
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

      <Dialog open={showSubmitVersionDialog} onOpenChange={setShowSubmitVersionDialog}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>选择提交流程</DialogTitle>
            <DialogDescription>请选择本次要提交到 v1、v2，或同时提交。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            <Button className="justify-start" onClick={() => confirmSubmitMode('both')}>同时提交 v1 + v2（推荐）</Button>
            <Button variant="outline" className="justify-start" onClick={() => confirmSubmitMode('v2')}>仅提交 v2</Button>
            <Button variant="outline" className="justify-start" onClick={() => confirmSubmitMode('v1')}>仅提交 v1</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitVersionDialog(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoteFilePickerDialog} onOpenChange={setShowRemoteFilePickerDialog}>
        <DialogContent className="flex h-[78vh] w-[95vw] !max-w-[1120px] flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{remotePickerDialogTitle}</DialogTitle>
            <DialogDescription>
              {remotePickerStep === 1
                ? '先选择目标文件夹，再进入下一步选择文件'
                : remotePickerMode === 'preview'
                  ? '支持多选，已上传到 OPFS 的文件也可直接选择'
                  : '请选择一个文件路径'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-h-0 flex-col gap-3">
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

              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
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
                            {remotePickerStep === 1 && remotePickerRenamingPath === item.path ? (
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
                          {remotePickerStep === 1 ? (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => createRemotePickerFolder(item.path)}
                              >
                                <FolderPlus size={12} weight="duotone" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2"
                                disabled={!isDraftFolder(item.path)}
                                onClick={() => startRenameDraftFolder(item.path)}
                              >
                                <NotePencil size={12} weight="duotone" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-destructive"
                                disabled={!isDraftFolder(item.path)}
                                onClick={() => deleteDraftFolder(item.path)}
                              >
                                <Trash size={12} weight="duotone" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 px-0"
                              onClick={() => toggleRemoteFolder(item.path)}
                            >
                              <DotsThreeVertical size={12} />
                            </Button>
                          )}
                        </div>
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
                remotePickerMode === 'preview' && remotePickerStep === 1 ? 'hidden sm:block' : ''
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
          <DialogFooter className="mt-3 shrink-0 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setShowRemoteFilePickerDialog(false)}>取消</Button>
            {remotePickerStep === 1 ? (
              <Button onClick={() => setRemotePickerStep(2)}>下一步</Button>
            ) : (
              <Button variant="outline" onClick={() => setRemotePickerStep(1)}>上一步</Button>
            )}
            {remotePickerStep === 2 ? (
              <Button onClick={applyRemotePickerSelection}>确认选择</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkIconPickerDialog
        open={showLinkIconPicker}
        initialQuery={linkPickerInitialQuery}
        onOpenChange={handleLinkIconPickerOpenChange}
        onSelect={selectLinkIcon}
      />
    </div>
  )
}
