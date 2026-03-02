import { computed, defineAsyncComponent, ref, watch, type Component } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretDown as CaretDown,
  PhCaretRight as CaretRight,
  PhDotsSixVertical as DragDots,
  PhFile as FileIcon,
  PhFolderOpen as FolderOpen,
  PhFolder as FolderIcon,
  PhGitPullRequest as GitPullRequest,
  PhMinus as MinusIcon,
  PhUploadSimple as UploadSimple
} from '@phosphor-icons/vue'
import { icons as phosphorCoreIcons } from '@phosphor-icons/core'
import draggable from 'vuedraggable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useCcPublishLogs } from '@/composables/useCcPublishLogs'
import { useCcSession } from '@/composables/useCcSession'
import { type WorkspaceTreeItem, useCcWorkspace } from '@/composables/useCcWorkspace'
import {
  type CatalogEntry,
  type LegacyCatalogEntry,
  type PublishingResource,
  arrayBufferToBase64,
  base64ToText,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadRepositoryTree,
  loadInProgressResources,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch,
  updateLegacyCatalogAndResourceJsonInForkBranch
} from '@/utils/resourcePublishApi'

interface WorkspaceFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
}

interface WorkspaceDirectoryHandle {
  kind: 'directory'
  name: string
  getFileHandle(name: string): Promise<WorkspaceFileHandle>
  getDirectoryHandle(
    name: string,
    options?: {
      create?: boolean
    }
  ): Promise<WorkspaceDirectoryHandle>
  resolve?(possibleDescendant: WorkspaceFileHandle): Promise<string[] | null>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, WorkspaceFileHandle | WorkspaceDirectoryHandle]>
}

interface PickedWorkspaceFile {
  path: string
  file: File
}

const MAIN_BRANCH = 'main'
const MANIFEST_FILE = 'manifest_v2.json'
const LEGACY_MANIFEST_FILE = 'manifest.json'
const LEGACY_CATALOG_PATH = 'index.csv'
const LEGACY_RESOURCES_DIR = 'resources'

type SubmitMode = 'v2' | 'v1' | 'both'

interface DeviceOption {
  id: string
  name: string
  vendor: string
  aliases: string[]
}

interface DeviceSelectorEntry {
  key: string
  model: string
  codename: string
  id: string
  name: string
}

interface LinkIconOption {
  key: string
  name: string
  pascalName: string
  keywords: string
}

const LINK_ICON_MAX_RENDER = 720
const phosphorIconModules = import.meta.glob('/node_modules/@phosphor-icons/vue/dist/icons/*.vue.mjs')
const linkIconComponentCache = new Map<string, Component | null>()

const deviceOptions: DeviceOption[] = [
  { id: 'xmb9', name: 'Xiaomi Smart Band 9', vendor: 'xiaomi', aliases: ['n66', 'M2345B1', 'M2346B1'] },
  { id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro', vendor: 'xiaomi', aliases: ['n67', 'M2401B1', 'M2402B1'] },
  { id: 'xmb10', name: 'Xiaomi Smart Band 10', vendor: 'xiaomi', aliases: ['o66', 'M2457B1'] },
  { id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC', vendor: 'xiaomi', aliases: ['o66nfc', 'M2456B1'] },
  { id: 'xmws3', name: 'Xiaomi Watch S3 系列', vendor: 'xiaomi', aliases: ['n62', 'M2313W1', 'M2311W1', 'M2323W1'] },
  { id: 'xmws4', name: 'Xiaomi Watch S4 系列', vendor: 'xiaomi', aliases: ['o62', 'M2425W1', 'M2424W1', 'M2312W1', 'M2502W1'] },
  { id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版', vendor: 'xiaomi', aliases: ['o62m', 'M2426W1'] },
  { id: 'xmrw5', name: 'REDMI Watch 5', vendor: 'xiaomi', aliases: ['o65', 'M2427W1'] },
  { id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM', vendor: 'xiaomi', aliases: ['o65m', 'M2428W1'] },
  { id: 'xmrw6', name: 'REDMI Watch 6', vendor: 'xiaomi', aliases: ['p65', 'M2523W1'] },
  { id: 'vivowgt2', name: 'vivo WATCH GT 2', vendor: 'vivo', aliases: ['WA2536B'] }
]

const deviceSelectorEntries: DeviceSelectorEntry[] = [
  { key: 'M2345B1', model: 'M2345B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2346B1', model: 'M2346B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2401B1', model: 'M2401B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro' },
  { key: 'M2402B1', model: 'M2402B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro 国际版' },
  { key: 'M2457B1', model: 'M2457B1', codename: 'o66', id: 'xmb10', name: 'Xiaomi Smart Band 10' },
  { key: 'M2456B1', model: 'M2456B1', codename: 'o66nfc', id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC' },
  { key: 'M2313W1', model: 'M2313W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列' },
  { key: 'M2311W1', model: 'M2311W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 eSIM' },
  { key: 'M2323W1', model: 'M2323W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 国际版' },
  { key: 'M2425W1', model: 'M2425W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列' },
  { key: 'M2424W1', model: 'M2424W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列 eSIM' },
  { key: 'M2426W1', model: 'M2426W1', codename: 'o62m', id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版' },
  { key: 'M2312W1', model: 'M2312W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 Sport' },
  { key: 'M2502W1', model: 'M2502W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 41mm' },
  { key: 'M2427W1', model: 'M2427W1', codename: 'o65', id: 'xmrw5', name: 'REDMI Watch 5' },
  { key: 'M2428W1', model: 'M2428W1', codename: 'o65m', id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM' },
  { key: 'M2523W1', model: 'M2523W1', codename: 'p65', id: 'xmrw6', name: 'REDMI Watch 6' },
  { key: 'WA2536B', model: 'WA2536B', codename: 'vivowgt2', id: 'vivowgt2', name: 'vivo WATCH GT 2' }
]

const deviceTokenToId = deviceOptions.reduce<Record<string, string>>((acc, device) => {
  acc[device.id.toLowerCase()] = device.id
  for (const alias of device.aliases) {
    acc[alias.toLowerCase()] = device.id
  }
  return acc
}, {})

const normalizeDeviceToken = (token: string): string => {
  const key = token.trim().toLowerCase()
  return deviceTokenToId[key] || token.trim()
}

type WorkbenchMode = 'publish' | 'review' | 'published'
const props = withDefaults(defineProps<{ mode?: WorkbenchMode }>(), {
  mode: 'publish'
})
const mode = computed<WorkbenchMode>(() => props.mode)

const { token, currentUser } = useCcSession()
const {
  workspacePath,
  workspaceTree,
  workspaceHandle: persistedWorkspaceHandle,
  remoteWorkspacePath,
  remoteWorkspaceTree,
  setRemoteWorkspace,
  setWorkspace,
  setWorkspaceHandle,
  clearWorkspace,
  clearRemoteWorkspace
} = useCcWorkspace()
const { appendPublishLog: appendLog, publishLogsText, clearPublishLogs } = useCcPublishLogs()
const workspaceBusy = ref(false)
const newWorkspaceName = ref('')
const RELEASE_FOLDER_SUFFIX = '_AstroBox_Release'
const workspaceDisplayPath = ref('')
const activeStep = ref(0)
const fileTreeTab = ref<'workspace' | 'remote'>('workspace')
const collapsedWorkspaceFolders = ref<string[]>([])
const collapsedRemoteFolders = ref<string[]>([])
const submitMode = ref<SubmitMode>('v2')
const showSubmitVersionDialog = ref(false)

const workspaceHandle = computed<WorkspaceDirectoryHandle | null>(
  () => (persistedWorkspaceHandle.value as WorkspaceDirectoryHandle | null) ?? null
)
const workspaceName = ref('')
const manifestText = ref('')

const repoName = ref('')
const repoDescription = ref('')
const itemId = ref('')
const itemName = ref('')
const restype = ref('quickapp')
const paidType = ref('')
const itemDescription = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const selectedDeviceIds = ref<string[]>([])
const downloads = ref<Record<string, { version: string; file_name: string }>>({})
const authors = ref<Array<{ name: string; authorUrl: string; bindABAccount: boolean }>>([
  { name: '', authorUrl: '', bindABAccount: true }
])
const links = ref<Array<{ icon: string; title: string; url: string }>>([])
const showDeviceSelector = ref(false)
const showResourceIdGuide = ref(false)
const showOutOfWorkspaceFileDialog = ref(false)
const showImageValidationDialog = ref(false)
const imageValidationMessage = ref('')
const showFolderNameValidationDialog = ref(false)
const folderNameValidationMessage = ref('')
const showUploadCompleteDialog = ref(false)
const showLinkIconPicker = ref(false)
const linkIconPickerIndex = ref<number | null>(null)
const linkIconQuery = ref('')
const iconPath = ref('')
const coverPath = ref('')
const previewItems = ref<Array<{ id: string; path: string }>>([])

const upstreamOwner = ref('AstralSightStudios')
const upstreamRepo = ref('AstroBox-Repo')
const catalogPath = ref('index_v2.csv')

const prTitle = ref('')
const prBody = ref('')
const latestPrUrl = ref('')

const uploading = ref(false)
const creatingPr = ref(false)

const uploadedRepoOwner = ref('')
const uploadedRepoName = ref('')
const uploadedRepoUrl = ref('')
const uploadedCommitSha = ref('')

const reviewLoading = ref(false)
const reviewItems = ref<PublishingResource[]>([])

const ownedLoading = ref(false)
const ownedItems = ref<CatalogEntry[]>([])

const isBusy = computed(() => workspaceBusy.value || uploading.value || creatingPr.value)
const canLoadList = computed(() => Boolean(token.value.trim() && currentUser.value))
const paidTypeSelectValue = computed({
  get: () => paidType.value || 'free',
  set: value => {
    paidType.value = value === 'free' ? '' : value
  }
})

const stripReleaseFolderSuffix = (raw: string): string =>
  raw
    .trim()
    .replace(/_AstroBox_Release$/i, '')
    .replace(/_+$/g, '')

const workspaceFolderPrefixInput = computed({
  get: () => stripReleaseFolderSuffix(newWorkspaceName.value),
  set: (value: string) => {
    const prefix = stripReleaseFolderSuffix(value)
    newWorkspaceName.value = prefix ? `${prefix}${RELEASE_FOLDER_SUFFIX}` : ''
  }
})

type VisibleTreeItem = WorkspaceTreeItem & { collapsed: boolean }

const getVisibleTreeItems = (
  tree: WorkspaceTreeItem[],
  collapsedPaths: string[]
): VisibleTreeItem[] => {
  const collapsedSet = new Set(collapsedPaths)
  const stack: string[] = []
  const visible: VisibleTreeItem[] = []

  for (const item of tree) {
    while (stack.length > item.depth) {
      stack.pop()
    }

    const hidden = stack.some(path => collapsedSet.has(path))
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

const visibleWorkspaceItems = computed(() =>
  getVisibleTreeItems(workspaceTree.value, collapsedWorkspaceFolders.value)
)

const visibleRemoteItems = computed(() =>
  getVisibleTreeItems(remoteWorkspaceTree.value, collapsedRemoteFolders.value)
)

const toggleWorkspaceFolder = (path: string): void => {
  if (collapsedWorkspaceFolders.value.includes(path)) {
    collapsedWorkspaceFolders.value = collapsedWorkspaceFolders.value.filter(item => item !== path)
    return
  }
  collapsedWorkspaceFolders.value = [...collapsedWorkspaceFolders.value, path]
}

const toggleRemoteFolder = (path: string): void => {
  if (collapsedRemoteFolders.value.includes(path)) {
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(item => item !== path)
    return
  }
  collapsedRemoteFolders.value = [...collapsedRemoteFolders.value, path]
}

const resolvedRepoName = computed(() => {
  const manual = repoName.value.trim()
  if (manual) return manual

  const folderCandidate =
    newWorkspaceName.value.trim() ||
    workspaceName.value.trim() ||
    getWorkspaceFolderNameFromPath(workspacePath.value || '')

  const sanitizedFolderName = folderCandidate
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)

  if (sanitizedFolderName) return sanitizedFolderName

  const slug = itemId.value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug ? `ab-resource-${slug}` : ''
})

const selectedUploadPaths = computed(() => {
  const paths = new Set<string>()
  const push = (value: string): void => {
    const normalized = value.trim()
    if (normalized) paths.add(normalized)
  }

  push(iconPath.value)
  push(coverPath.value)

  for (const item of previewItems.value) {
    push(item.path)
  }

  for (const deviceId of selectedDeviceIds.value) {
    push(downloads.value[deviceId]?.file_name || '')
  }

  return [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const normalizedTagsText = computed(() =>
  tags.value
    .map(tag => tag.trim())
    .filter(Boolean)
    .join(';')
)

const normalizedDevicesText = computed(() => selectedDeviceIds.value.join(';'))

const normalizedDeviceVendorsText = computed(() => {
  const vendors = selectedDeviceIds.value
    .map(id => deviceOptions.find(device => device.id === id)?.vendor || '')
    .filter(Boolean)
  return [...new Set(vendors)].join(';')
})

const areDownloadsComplete = computed(
  () =>
    selectedDeviceIds.value.length > 0 &&
    selectedDeviceIds.value.every(deviceId => {
      const entry = downloads.value[deviceId]
      return Boolean(entry && entry.version.trim() && entry.file_name.trim())
    })
)

const validateLinkUrl = (raw: string): string | null => {
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

const linksValidationMessage = computed(() => {
  for (let i = 0; i < links.value.length; i++) {
    const link = links.value[i]
    const hasValue = Boolean(link.icon.trim() || link.title.trim() || link.url.trim())
    if (!hasValue) continue
    const error = validateLinkUrl(link.url)
    if (error) return `第 ${i + 1} 个相关链接：${error}`
  }
  return ''
})

const isResourceInfoValid = computed(
  () =>
    Boolean(
      itemId.value.trim() &&
        itemName.value.trim() &&
        restype.value.trim() &&
        iconPath.value.trim() &&
        coverPath.value.trim() &&
        normalizedTagsText.value &&
        areDownloadsComplete.value &&
        !linksValidationMessage.value
    )
)

const canUpload = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        workspaceHandle.value &&
        isResourceInfoValid.value &&
        resolvedRepoName.value
    )
)

const canSubmitPr = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        uploadedCommitSha.value &&
        uploadedRepoOwner.value &&
        uploadedRepoName.value &&
        upstreamOwner.value.trim() &&
        upstreamRepo.value.trim() &&
        (submitMode.value === 'v1' || catalogPath.value.trim()) &&
        prTitle.value.trim()
    )
)

const submitModeLabel = computed(() => {
  if (submitMode.value === 'both') return 'v1 + v2'
  if (submitMode.value === 'v1') return '仅 v1'
  return '仅 v2'
})

const formatResourceTypeForCatalog = (value: string): string =>
  value.trim() === 'quickapp' ? 'quick_app' : 'watchface'

const formatResourceTypeForLegacy = (value: string): string =>
  value.trim() === 'quickapp' ? 'quickapp' : 'watchface'

const formatResourceTypeForTitle = (value: string): string =>
  value.trim() === 'quickapp' ? '快应用' : '表盘'

const formatPaidTypeLabel = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return '免费'
  if (normalized === 'paid') return '应用内付费（paid）'
  if (normalized === 'force_paid') return '强制付费（force_paid）'
  return normalized
}

const encodeUrlPath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')

const getRawUrl = (path: string): string => {
  const owner = uploadedRepoOwner.value || currentUser.value || ''
  const repo = uploadedRepoName.value || resolveRepoNameForSubmit()
  const encodedPath = encodeUrlPath(path)
  return `https://raw.githubusercontent.com/${owner}/${repo}/${MAIN_BRANCH}/${encodedPath}`
}

const getLegacyDeviceCode = (deviceId: string): string => {
  const device = getDeviceById(deviceId)
  if (!device) return deviceId
  const preferred = device.aliases.find(alias => /^[a-z]\d+([a-z]+)?$/i.test(alias))
  return preferred || device.id
}

const normalizedLegacyDevicesText = computed(() =>
  selectedDeviceIds.value
    .map(getLegacyDeviceCode)
    .filter(Boolean)
    .join(';')
)

const buildAutoPrTitle = (): string => {
  const name = itemName.value.trim() || '未命名资源'
  return `[ABoooxCC]添加 ${name} ${formatResourceTypeForTitle(restype.value)}`
}

const buildAutoPrBody = (): string => {
  const normalizedTagText = tags.value
    .map(tag => tag.trim())
    .filter(Boolean)
    .join(' / ') || '无'

  const supportDevices = selectedDeviceIds.value
    .map(id => `- ${id}（${getDeviceLabel(id)}）`)
    .join('\n') || '- 无'

  const repoUrl = uploadedRepoUrl.value || `https://github.com/${uploadedRepoOwner.value || currentUser.value || '--'}/${uploadedRepoName.value || resolvedRepoName.value || '--'}`
  const shortHash = uploadedCommitSha.value ? uploadedCommitSha.value.slice(0, 7) : '--'
  const iconFile = iconPath.value.trim()
  const coverFile = coverPath.value.trim()

  const previewSection = previewItems.value.length
    ? previewItems.value
        .map(item => `- \`${item.path}\`\n  ${getRawUrl(item.path)}`)
        .join('\n')
    : '- 无'

  const downloadsSection = selectedDeviceIds.value.length
    ? selectedDeviceIds.value
        .map(deviceId => {
          const entry = downloads.value[deviceId]
          if (!entry) return `- \`${deviceId}\`\n  - version: \`--\`\n  - file: \`--\`\n  - raw: --`
          const filePath = entry.file_name.trim()
          return [
            `- \`${deviceId}\``,
            `  - version: \`${entry.version.trim() || '--'}\``,
            `  - file: \`${filePath || '--'}\``,
            `  - raw: ${filePath ? getRawUrl(filePath) : '--'}`
          ].join('\n')
        })
        .join('\n')
    : '- 无'

  const linksSection = links.value.length
    ? links.value
        .filter(link => link.icon.trim() || link.title.trim() || link.url.trim())
        .map(link => `- ${link.title.trim() || '未命名链接'}（${link.icon.trim() || '无图标'}）：${link.url.trim() || '--'}`)
        .join('\n') || '- 无'
    : '- 无'

  return [
    '## 资源信息',
    '',
    `- 资源名称：${itemName.value.trim() || '--'}`,
    `- 资源 ID：${itemId.value.trim() || '--'}`,
    `- 资源类型：${formatResourceTypeForTitle(restype.value)}（${formatResourceTypeForCatalog(restype.value)}）`,
    `- 提交版本：${submitModeLabel.value}`,
    `- 付费类型：${formatPaidTypeLabel(paidType.value)}`,
    `- 标签：${normalizedTagText}`,
    '',
    '## 支持设备',
    '',
    supportDevices,
    '',
    '## 仓库信息',
    '',
    `- 资源仓库：${repoUrl}`,
    `- 提交短哈希：\`${shortHash}\``,
    '',
    '## 图片资源（Raw）',
    '',
    `- Icon：\`${iconFile || '--'}\`  `,
    iconFile ? getRawUrl(iconFile) : '--',
    `- Cover：\`${coverFile || '--'}\`  `,
    coverFile ? getRawUrl(coverFile) : '--',
    '- Preview：',
    previewSection,
    '',
    '## 下载资源（downloads）',
    '',
    downloadsSection,
    '',
    '## 链接（manifest_v2.links）',
    '',
    linksSection,
    '',
    '---',
    '此 PR 由 AstroBooox Cretor Console（https://astrobooox-ng.waijade.cn/cc/）生成，如有问题前往 https://github.com/CheongSzesuen/AstroBooox/issues 提交 issue。'
  ].join('\n')
}

const phosphorIconOptions = computed<LinkIconOption[]>(() =>
  phosphorCoreIcons.map(icon => ({
    key: icon.name,
    name: icon.name,
    pascalName: icon.pascal_name,
    keywords: `${icon.name} ${icon.pascal_name} ${icon.tags.join(' ')} ${icon.categories.join(' ')}`.toLowerCase()
  }))
)

const filteredPhosphorIconOptions = computed(() => {
  const raw = linkIconQuery.value.trim().toLowerCase()
  if (!raw) return phosphorIconOptions.value
  const tokens = raw.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return phosphorIconOptions.value
  return phosphorIconOptions.value.filter(option => tokens.every(token => option.keywords.includes(token)))
})

const displayedPhosphorIconOptions = computed(() =>
  filteredPhosphorIconOptions.value.slice(0, LINK_ICON_MAX_RENDER)
)

const getLinkIconComponent = (pascalName: string): Component | null => {
  if (linkIconComponentCache.has(pascalName)) {
    return linkIconComponentCache.get(pascalName) || null
  }
  const modulePath = `/node_modules/@phosphor-icons/vue/dist/icons/Ph${pascalName}.vue.mjs`
  const loader = phosphorIconModules[modulePath] as (() => Promise<unknown>) | undefined
  if (!loader) {
    linkIconComponentCache.set(pascalName, null)
    return null
  }
  const iconComponent = defineAsyncComponent(async () => {
    const module = (await loader()) as { default?: Component } | Component
    return (module as { default?: Component }).default || (module as Component)
  })
  linkIconComponentCache.set(pascalName, iconComponent)
  return iconComponent
}

const stepList = computed(() => [
  {
    label: '创建文件夹',
    done: Boolean(workspaceHandle.value || workspacePath.value)
  },
  {
    label: '资源信息',
    done: isResourceInfoValid.value
  },
  {
    label: '上传仓库',
    done: Boolean(uploadedCommitSha.value)
  },
  {
    label: '提交 Pull Request',
    done: Boolean(latestPrUrl.value)
  }
])

const canAccessStep = (index: number): boolean => {
  if (index <= 0) return true
  if (index === 1) return stepList.value[0].done
  if (index === 2) return stepList.value[1].done
  if (index === 3) return stepList.value[2].done
  return false
}

const openSubmitVersionDialog = (): void => {
  if (!stepList.value[1].done) {
    appendLog('请先完成资源信息后再继续')
    return
  }
  showSubmitVersionDialog.value = true
}

const confirmSubmitMode = (mode: SubmitMode): void => {
  submitMode.value = mode
  showSubmitVersionDialog.value = false
  goToStep(2)
}

const goToStep = (index: number): void => {
  if (canAccessStep(index)) {
    if (index === 3) {
      prTitle.value = buildAutoPrTitle()
      prBody.value = buildAutoPrBody()
    }
    activeStep.value = index
    return
  }
  appendLog('请先完成前一步后再继续')
}

const getDeviceById = (id: string): DeviceOption | undefined =>
  deviceOptions.find(device => device.id === id)

const getDeviceLabel = (id: string): string => {
  const device = getDeviceById(id)
  if (!device) return id
  return `${device.name} (${device.id})`
}

const ensureDownload = (deviceId: string): void => {
  if (!downloads.value[deviceId]) {
    downloads.value[deviceId] = {
      version: '1.0.0',
      file_name: ''
    }
  }
}

const isDeviceSelected = (deviceId: string): boolean => selectedDeviceIds.value.includes(deviceId)

const toggleDeviceSelection = (deviceId: string): void => {
  if (isDeviceSelected(deviceId)) {
    selectedDeviceIds.value = selectedDeviceIds.value.filter(id => id !== deviceId)
    delete downloads.value[deviceId]
    return
  }
  selectedDeviceIds.value = [...selectedDeviceIds.value, deviceId]
  ensureDownload(deviceId)
}

const removeDevice = (deviceId: string): void => {
  selectedDeviceIds.value = selectedDeviceIds.value.filter(id => id !== deviceId)
  delete downloads.value[deviceId]
}

const addAuthor = (): void => {
  authors.value.push({ name: '', authorUrl: '', bindABAccount: true })
}

const removeAuthor = (index: number): void => {
  authors.value.splice(index, 1)
}

const addLink = (): void => {
  links.value.push({
    icon: '',
    title: '',
    url: ''
  })
}

const removeLink = (index: number): void => {
  links.value.splice(index, 1)
}

const openLinkIconPicker = (index: number): void => {
  linkIconPickerIndex.value = index
  linkIconQuery.value = links.value[index]?.icon || ''
  showLinkIconPicker.value = true
}

const selectLinkIcon = (iconName: string): void => {
  const index = linkIconPickerIndex.value
  if (index === null || !links.value[index]) return
  links.value[index].icon = iconName
  showLinkIconPicker.value = false
}

const addTag = (): void => {
  const value = tagInput.value.trim()
  if (!value) return
  if (!tags.value.includes(value)) {
    tags.value.push(value)
  }
  tagInput.value = ''
}

const removeTag = (index: number): void => {
  tags.value.splice(index, 1)
}

const pickFileFromWorkspace = async (): Promise<PickedWorkspaceFile | null> => {
  const handle = await ensureWorkspaceHandle()
  if (!handle) {
    return null
  }

  const picker = (window as unknown as { showOpenFilePicker?: Function }).showOpenFilePicker
  if (typeof picker !== 'function') {
    appendLog('当前浏览器不支持文件选择器 API')
    return null
  }

  try {
    const handles = (await picker({
      multiple: false,
      startIn: handle
    })) as WorkspaceFileHandle[]

    const fileHandle = handles?.[0]
    if (!fileHandle) return null

    if (typeof handle.resolve === 'function') {
      const relativeParts = await handle.resolve(fileHandle)
      if (relativeParts && relativeParts.length > 0) {
        const file = await fileHandle.getFile()
        return {
          path: relativeParts.join('/'),
          file
        }
      }

      showOutOfWorkspaceFileDialog.value = true
      return null
    }

    const file = await fileHandle.getFile()
    return {
      path: fileHandle.name || file.name,
      file
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null
    appendLog(`选择文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  }
}

const getImageSize = async (file: File): Promise<{ width: number; height: number }> => {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

const showInvalidImageDialog = (message: string): void => {
  imageValidationMessage.value = message
  showImageValidationDialog.value = true
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

const selectIconFile = async (): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (!picked) return
  if (!(await validateIconImage(picked.file))) return
  iconPath.value = picked.path
}

const selectCoverFile = async (): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (!picked) return
  if (!(await validateCoverImage(picked.file))) return
  coverPath.value = picked.path
}

const selectMultiplePreviewFiles = async (): Promise<void> => {
  const workspace = await ensureWorkspaceHandle()
  if (!workspace) {
    return
  }

  const picker = (window as unknown as { showOpenFilePicker?: Function }).showOpenFilePicker
  if (typeof picker !== 'function') {
    appendLog('当前浏览器不支持文件选择器 API')
    return
  }

  try {
    const handles = (await picker({
      multiple: true,
      startIn: workspace
    })) as WorkspaceFileHandle[]

    if (!handles?.length) return

    const pickedPaths: string[] = []

    for (const handle of handles) {
      if (typeof workspace.resolve === 'function') {
        const relativeParts = await workspace.resolve(handle)
        if (!relativeParts || relativeParts.length === 0) {
          showOutOfWorkspaceFileDialog.value = true
          return
        }
        pickedPaths.push(relativeParts.join('/'))
      } else {
        pickedPaths.push(handle.name)
      }
    }

    const existing = new Set(previewItems.value.map(item => item.path))
    const uniqueNewPaths = pickedPaths.filter(path => !existing.has(path))
    previewItems.value = [
      ...previewItems.value,
      ...uniqueNewPaths.map(path => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        path
      }))
    ]
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择预览图失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const removePreview = (index: number): void => {
  previewItems.value.splice(index, 1)
}

const getWorkspaceFolderNameFromPath = (path: string): string => {
  const normalized = path.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  if (!normalized) return ''
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

const selectDownloadFile = async (deviceId: string): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (picked) {
    ensureDownload(deviceId)
    downloads.value[deviceId].file_name = picked.path
  }
}

watch(
  () => selectedDeviceIds.value,
  ids => {
    for (const id of ids) {
      ensureDownload(id)
    }
  },
  { immediate: true, deep: true }
)

watch(
  workspacePath,
  path => {
    if (newWorkspaceName.value.trim()) return
    const fallbackName = getWorkspaceFolderNameFromPath(path || '')
    if (fallbackName) {
      newWorkspaceName.value = fallbackName
    }
  },
  { immediate: true }
)

watch(
  () => [workspaceTree.value.length, remoteWorkspaceTree.value.length] as const,
  ([workspaceCount, remoteCount]) => {
    if (fileTreeTab.value === 'workspace' && workspaceCount === 0 && remoteCount > 0) {
      fileTreeTab.value = 'remote'
      return
    }
    if (fileTreeTab.value === 'remote' && remoteCount === 0 && workspaceCount > 0) {
      fileTreeTab.value = 'workspace'
    }
  },
  { immediate: true }
)

watch(
  () => workspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedWorkspaceFolders.value = collapsedWorkspaceFolders.value.filter(path =>
      validFolderPaths.has(path)
    )
  },
  { deep: true }
)

watch(
  () => remoteWorkspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(path =>
      validFolderPaths.has(path)
    )
  },
  { deep: true }
)

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

const requireToken = (): string => {
  const value = token.value.trim()
  if (!value) throw new Error('请先输入 GitHub Token')
  return value
}

const ensureWorkspaceHandle = async (): Promise<WorkspaceDirectoryHandle | null> => {
  if (workspaceHandle.value) return workspaceHandle.value

  if (!window.showDirectoryPicker) {
    appendLog('当前浏览器不支持 FSA API')
    return null
  }

  try {
    const handle = (await window.showDirectoryPicker({
      id: 'resource-workspace',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle

    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    if (!newWorkspaceName.value.trim()) {
      newWorkspaceName.value = handle.name
    }

    appendLog(`已重新授权工作区: ${handle.name}`)
    await scanWorkspace({ forceSync: true })
    return handle
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null
    appendLog(`重新授权工作区失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  }
}

const selectWorkspace = async (): Promise<void> => {
  try {
    workspaceBusy.value = true
    if (!window.showDirectoryPicker) {
      throw new Error('当前浏览器不支持 FSA API')
    }
    const handle = (await window.showDirectoryPicker({
      id: 'resource-workspace',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle
    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    newWorkspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    appendLog(`已选择工作区: ${handle.name}`)
    await scanWorkspace({ forceSync: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择工作区失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    workspaceBusy.value = false
  }
}

const createWorkspaceFolder = async (): Promise<void> => {
  try {
    workspaceBusy.value = true
    if (!window.showDirectoryPicker) {
      throw new Error('当前浏览器不支持 FSA API')
    }

    const parent = (await window.showDirectoryPicker({
      id: 'resource-workspace-parent',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle

    const folderName = toReleaseFolderName(newWorkspaceName.value)
    const validationError = validateGitHubRepoName(folderName)
    if (validationError) {
      folderNameValidationMessage.value = `文件夹名不符合 GitHub 仓库命名要求：${validationError}`
      showFolderNameValidationDialog.value = true
      return
    }
    const handle = await parent.getDirectoryHandle(folderName, { create: true })
    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    workspaceDisplayPath.value = `${parent.name}/${folderName}`
    newWorkspaceName.value = folderName
    appendLog(`已创建并切换目录: ${folderName}`)
    await scanWorkspace({ forceSync: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`创建文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    workspaceBusy.value = false
  }
}

const readFileTextByPath = async (
  root: WorkspaceDirectoryHandle,
  relativePath: string
): Promise<string | null> => {
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
    const fileHandle = await current.getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

const readFileByPath = async (
  root: WorkspaceDirectoryHandle,
  relativePath: string
): Promise<File | null> => {
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
    const fileHandle = await current.getFileHandle(parts[parts.length - 1])
    return await fileHandle.getFile()
  } catch {
    return null
  }
}

const collectWorkspaceTree = async (
  dir: WorkspaceDirectoryHandle,
  depth = 0,
  prefix = ''
): Promise<WorkspaceTreeItem[]> => {
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

  const items: WorkspaceTreeItem[] = []

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

const loadRemoteRepoTree = async (
  tokenValue: string,
  owner: string,
  repo: string
): Promise<WorkspaceTreeItem[]> =>
  loadRepositoryTree({
    token: tokenValue,
    owner,
    repo,
    branch: MAIN_BRANCH
  })

const resetResourceInfoFields = (): void => {
  itemId.value = ''
  itemName.value = ''
  restype.value = 'quickapp'
  paidType.value = ''
  itemDescription.value = ''
  tags.value = []
  tagInput.value = ''
  iconPath.value = ''
  coverPath.value = ''
  previewItems.value = []
  selectedDeviceIds.value = []
  downloads.value = {}
  authors.value = [{ name: '', authorUrl: '', bindABAccount: true }]
  links.value = []
}

const scanWorkspace = async (options: { forceSync?: boolean } = {}): Promise<void> => {
  if (!workspaceHandle.value) return
  const { forceSync = false } = options

  try {
    const manifest = await readFileTextByPath(workspaceHandle.value, MANIFEST_FILE)
    manifestText.value = manifest || ''

    const tree = await collectWorkspaceTree(workspaceHandle.value)
    setWorkspace(workspaceDisplayPath.value || workspaceName.value, tree, workspaceHandle.value)

    if (manifest) {
      try {
        const parsed = JSON.parse(manifest) as {
          item?: {
            id?: string
            name?: string
            restype?: string
            description?: string
            preview?: string[]
            icon?: string
            cover?: string
            author?: Array<{ name?: string; author_url?: string; bindABAccount?: boolean }>
          }
          links?: Array<{ icon?: string; title?: string; url?: string }>
          downloads?: Record<string, { version?: string; file_name?: string }>
        }
        if (forceSync) {
          resetResourceInfoFields()
        }

        itemId.value = forceSync ? parsed.item?.id || '' : itemId.value || parsed.item?.id || ''
        itemName.value = forceSync ? parsed.item?.name || '' : itemName.value || parsed.item?.name || ''
        const parsedRestype = parsed.item?.restype === 'quick_app' ? 'quickapp' : parsed.item?.restype
        restype.value = forceSync ? parsedRestype || 'quickapp' : restype.value || parsedRestype || 'quickapp'
        itemDescription.value = forceSync
          ? parsed.item?.description || ''
          : itemDescription.value || parsed.item?.description || ''
        iconPath.value = forceSync ? parsed.item?.icon || '' : iconPath.value || parsed.item?.icon || ''
        coverPath.value = forceSync ? parsed.item?.cover || '' : coverPath.value || parsed.item?.cover || ''
        if ((forceSync || previewItems.value.length === 0) && Array.isArray(parsed.item?.preview)) {
          previewItems.value = parsed.item.preview
            .filter(Boolean)
            .map(path => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              path
            }))
        }

        if ((forceSync || !authors.value.some(author => author.name.trim())) && parsed.item?.author?.length) {
          authors.value = parsed.item.author.map(author => ({
            name: author.name || '',
            authorUrl: author.author_url || '',
            bindABAccount: Boolean(author.bindABAccount)
          }))
        }

        if (forceSync || links.value.length === 0) {
          links.value = (parsed.links || []).map(link => ({
            icon: link.icon || '',
            title: link.title || '',
            url: link.url || ''
          }))
        }

        if (parsed.downloads && (forceSync || selectedDeviceIds.value.length === 0)) {
          const nextDownloads: Record<string, { version: string; file_name: string }> = {}
          const nextDeviceIds: string[] = []

          for (const [rawId, download] of Object.entries(parsed.downloads)) {
            const normalizedId = normalizeDeviceToken(rawId)
            if (!deviceOptions.some(device => device.id === normalizedId)) continue

            nextDeviceIds.push(normalizedId)
            nextDownloads[normalizedId] = {
              version: download?.version || '1.0.0',
              file_name: download?.file_name || ''
            }
          }

          selectedDeviceIds.value = [...new Set(nextDeviceIds)]
          downloads.value = nextDownloads
        } else if (forceSync && !parsed.downloads) {
          selectedDeviceIds.value = []
          downloads.value = {}
        }
      } catch {
        appendLog('manifest_v2.json 不是合法 JSON，将按原文上传')
      }
    } else if (forceSync) {
      resetResourceInfoFields()
    }

    uploadedRepoOwner.value = ''
    uploadedRepoName.value = ''
    uploadedRepoUrl.value = ''
    uploadedCommitSha.value = ''
    latestPrUrl.value = ''

    appendLog('目录扫描完成')
  } catch (error: unknown) {
    clearWorkspace()
    appendLog(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const reloadResourceInfoFromWorkspace = async (): Promise<void> => {
  if (!workspaceHandle.value) {
    appendLog('当前会话没有目录访问权限，请先重新授权工作区。')
    return
  }
  await scanWorkspace({ forceSync: true })
  appendLog('已从当前工作区重新加载资源信息')
}

const refreshWorkspaceFileTree = async (): Promise<void> => {
  if (!workspaceHandle.value) {
    clearWorkspace()
    workspaceName.value = ''
    workspaceDisplayPath.value = ''
    newWorkspaceName.value = ''
    appendLog('目录访问权限已失效，已清空当前路径。请点击“选择已有文件夹”重新授权。')
    return
  }
  await scanWorkspace()
}

const buildManifestV2Text = (): string => {
  const normalizedAuthors = authors.value
    .map(author => ({
      name: author.name.trim(),
      bindABAccount: Boolean(author.bindABAccount)
    }))
    .filter(author => author.name)

  const normalizedDownloads = selectedDeviceIds.value.reduce<Record<string, { version: string; file_name: string }>>(
    (acc, deviceId) => {
      const entry = downloads.value[deviceId]
      if (!entry) return acc

      acc[deviceId] = {
        version: entry.version.trim(),
        file_name: entry.file_name.trim()
      }
      return acc
    },
    {}
  )

  const preview = previewItems.value
    .map(item => item.path.trim())
    .filter(Boolean)

  const normalizedLinks = links.value
    .map(link => ({
      icon: link.icon.trim(),
      title: link.title.trim(),
      url: link.url.trim()
    }))
    .filter(link => link.title || link.url || link.icon)

  const manifestObject = {
    item: {
      id: itemId.value.trim(),
      restype: formatResourceTypeForCatalog(restype.value),
      name: itemName.value.trim(),
      description: itemDescription.value.trim(),
      preview,
      icon: iconPath.value.trim(),
      cover: coverPath.value.trim(),
      author: normalizedAuthors
    },
    links: normalizedLinks,
    downloads: normalizedDownloads,
    ext: {}
  }

  return JSON.stringify(manifestObject, null, 2)
}

const buildManifestV1Text = (repoUrl: string): string => {
  const normalizedAuthors = authors.value
    .map(author => {
      const name = author.name.trim()
      const authorUrl = author.authorUrl.trim()
      return {
        name,
        ...(authorUrl ? { author_url: authorUrl } : {})
      }
    })
    .filter(author => author.name)

  const normalizedDownloads = selectedDeviceIds.value.reduce<Record<string, { version: string; file_name: string }>>(
    (acc, deviceId) => {
      const entry = downloads.value[deviceId]
      if (!entry) return acc
      const legacyCode = getLegacyDeviceCode(deviceId)
      acc[legacyCode] = {
        version: entry.version.trim(),
        file_name: entry.file_name.trim()
      }
      return acc
    },
    {}
  )

  const manifestObject = {
    item: {
      name: itemName.value.trim(),
      description: itemDescription.value.trim(),
      preview: previewItems.value.map(item => item.path.trim()).filter(Boolean),
      icon: iconPath.value.trim(),
      cover: coverPath.value.trim(),
      source_url: repoUrl,
      author: normalizedAuthors
    },
    downloads: normalizedDownloads
  }

  return JSON.stringify(manifestObject, null, 2)
}

const buildLegacyResourceJsonFileName = (): string => {
  const rawBase = itemId.value.trim() || itemName.value.trim()
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
        i++
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
  return result.map(item => item.trim())
}

const resolveLegacyAuthorFolder = async (accessToken: string): Promise<string> => {
  const fallback = uploadedRepoOwner.value
  const usernameCandidates = [uploadedRepoOwner.value.trim(), currentUser.value.trim()]
    .map(item => item.toLowerCase())
    .filter(Boolean)

  if (!usernameCandidates.length) return fallback

  try {
    const legacyCsvFile = await fetchRepoFileOrNull(
      accessToken,
      upstreamOwner.value.trim(),
      upstreamRepo.value.trim(),
      LEGACY_CATALOG_PATH,
      MAIN_BRANCH
    )
    if (!legacyCsvFile?.content) return fallback

    const csvText = base64ToText(legacyCsvFile.content || '')
    const rows = csvText
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean)

    for (let i = rows.length - 1; i >= 1; i--) {
      const cols = splitCsvLine(rows[i])
      if (cols.length < 7) continue

      const icon = (cols[1] || '').toLowerCase()
      const cover = (cols[2] || '').toLowerCase()
      const matched = usernameCandidates.some(username => icon.includes(username) || cover.includes(username))
      if (!matched) continue

      const resourcePath = (cols[6] || '').replace(/^"+|"+$/g, '').trim()
      const pathSegments = resourcePath.split('/').filter(Boolean)
      if (pathSegments.length < 2) continue

      const folder = pathSegments[pathSegments.length - 2]
      if (folder) {
        appendLog(`已按 index.csv 历史记录复用 v1 作者目录: ${folder}`)
        return folder
      }
    }
  } catch (error: unknown) {
    appendLog(`读取 index.csv 复用目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }

  return fallback
}

const resolveRepoNameForSubmit = (): string => {
  const name = resolvedRepoName.value.trim()
  if (!name) {
    throw new Error('无法生成仓库名，请填写资源 ID 或手动输入仓库名')
  }
  return name
}

const handleUploadResources = async (): Promise<void> => {
  try {
    uploading.value = true
    latestPrUrl.value = ''
    showUploadCompleteDialog.value = false

    if (linksValidationMessage.value) {
      throw new Error(linksValidationMessage.value)
    }

    const workspace = await ensureWorkspaceHandle()
    if (!workspace) {
      throw new Error('请先选择并授权工作区文件夹')
    }

    const accessToken = requireToken()
    const username = currentUser.value
    if (!username) {
      throw new Error('请先校验 Token')
    }

    const repo = await ensureUserRepository({
      token: accessToken,
      owner: username,
      repoName: resolveRepoNameForSubmit(),
      description: repoDescription.value.trim()
    })

    appendLog(`资源仓库就绪: ${repo.owner}/${repo.name}`)

    const uploadQueue: Array<{ path: string; file?: File; text?: string }> = []
    const repoUrl = repo.htmlUrl
    if (submitMode.value === 'v2' || submitMode.value === 'both') {
      const generatedManifestV2Text = buildManifestV2Text()
      manifestText.value = generatedManifestV2Text
      uploadQueue.push({
        path: MANIFEST_FILE,
        text: generatedManifestV2Text
      })
    }
    if (submitMode.value === 'v1' || submitMode.value === 'both') {
      const generatedManifestV1Text = buildManifestV1Text(repoUrl)
      uploadQueue.push({
        path: LEGACY_MANIFEST_FILE,
        text: generatedManifestV1Text
      })
    }

    for (const path of selectedUploadPaths.value) {
      const file = await readFileByPath(workspace, path)
      if (!file) {
        throw new Error(`工作区中未找到文件: ${path}`)
      }
      uploadQueue.push({ path, file })
    }

    if (uploadQueue.length === 0) {
      throw new Error('没有可上传文件，请先选择资源文件')
    }

    let latestCommitSha = ''

    for (const item of uploadQueue) {
      const contentBase64 = item.file
        ? arrayBufferToBase64(await item.file.arrayBuffer())
        : textToBase64(item.text || '')

      let result: { commit: { sha: string; html_url: string } }
      try {
        result = await putRepoFile({
          token: accessToken,
          owner: repo.owner,
          repo: repo.name,
          path: item.path,
          branch: MAIN_BRANCH,
          message: `sync: ${item.path}`,
          contentBase64
        })
      } catch (error: unknown) {
        const githubError = error as { status?: number; message?: string }
        const message = githubError.message || ''
        const shouldRetryWithSha =
          githubError.status === 422 &&
          (message.includes('sha') || message.includes('does not match') || message.includes('already exists'))
        if (!shouldRetryWithSha) {
          throw error
        }
        const oldFile = await fetchRepoFileOrNull(
          accessToken,
          repo.owner,
          repo.name,
          item.path,
          MAIN_BRANCH
        )
        if (!oldFile?.sha) {
          throw error
        }
        result = await putRepoFile({
          token: accessToken,
          owner: repo.owner,
          repo: repo.name,
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
      throw new Error('未获取到 commit sha')
    }

    uploadedRepoOwner.value = repo.owner
    uploadedRepoName.value = repo.name
    uploadedRepoUrl.value = repo.htmlUrl
    uploadedCommitSha.value = latestCommitSha
    appendLog('上传步骤完成')
    showUploadCompleteDialog.value = true

    try {
      const remoteTree = await loadRemoteRepoTree(accessToken, repo.owner, repo.name)
      setRemoteWorkspace(`${repo.owner}/${repo.name}@${MAIN_BRANCH}`, remoteTree)
      appendLog('已同步远程仓库文件树')
    } catch (remoteError: unknown) {
      appendLog(`远程文件树同步失败: ${remoteError instanceof Error ? remoteError.message : '未知错误'}`)
    }
  } catch (error: unknown) {
    clearRemoteWorkspace()
    appendLog(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    uploading.value = false
  }
}

const handleCreateCatalogPr = async (): Promise<void> => {
  try {
    creatingPr.value = true

    const accessToken = requireToken()
    const username = currentUser.value
    if (!username) {
      throw new Error('请先校验 Token')
    }

    if (!uploadedCommitSha.value || !uploadedRepoOwner.value || !uploadedRepoName.value) {
      throw new Error('请先完成资源仓库上传')
    }

    prTitle.value = buildAutoPrTitle()
    prBody.value = buildAutoPrBody()

    const branchName = `astrobooox-submit-${Date.now()}`
    let forkResult: { forkOwner: string; forkRepo: string; branch: string } | null = null

    if (submitMode.value === 'v2' || submitMode.value === 'both') {
      forkResult = await updateCatalogInForkBranch({
        token: accessToken,
        upstreamOwner: upstreamOwner.value.trim(),
        upstreamRepo: upstreamRepo.value.trim(),
        upstreamBranch: MAIN_BRANCH,
        catalogPath: catalogPath.value.trim(),
        currentUser: username,
        branchName,
        entry: {
          id: itemId.value.trim(),
          name: itemName.value.trim(),
          restype: formatResourceTypeForCatalog(restype.value),
          repo_owner: uploadedRepoOwner.value,
          repo_name: uploadedRepoName.value,
          repo_commit_hash: uploadedCommitSha.value.slice(0, 7),
          icon: iconPath.value.trim(),
          cover: coverPath.value.trim(),
          tags: normalizedTagsText.value,
          device_vendors: normalizedDeviceVendorsText.value,
          devices: normalizedDevicesText.value,
          paid_type: paidType.value.trim()
        }
      })
      appendLog(`v2 Catalog 更新完成: ${forkResult.forkOwner}/${forkResult.forkRepo}@${forkResult.branch}`)
    }

    if (submitMode.value === 'v1' || submitMode.value === 'both') {
      const legacyFileName = buildLegacyResourceJsonFileName()
      const legacyAuthorFolder = await resolveLegacyAuthorFolder(accessToken)
      const legacyEntry: LegacyCatalogEntry = {
        name: itemName.value.trim(),
        icon: getRawUrl(iconPath.value.trim()),
        cover: getRawUrl(coverPath.value.trim()),
        restype: formatResourceTypeForLegacy(restype.value),
        tags: normalizedTagsText.value,
        devices: normalizedLegacyDevicesText.value,
        path: `${legacyAuthorFolder}/${legacyFileName}`,
        paid_type: paidType.value.trim()
      }
      const legacyManifestRef = JSON.stringify(
        {
          manifest_ver: 1,
          repo_url: uploadedRepoUrl.value
        },
        null,
        2
      )
      const v1Result = await updateLegacyCatalogAndResourceJsonInForkBranch({
        token: accessToken,
        upstreamOwner: upstreamOwner.value.trim(),
        upstreamRepo: upstreamRepo.value.trim(),
        upstreamBranch: MAIN_BRANCH,
        currentUser: username,
        branchName,
        catalogPath: LEGACY_CATALOG_PATH,
        resourceJsonPath: `${LEGACY_RESOURCES_DIR}/${legacyAuthorFolder}/${legacyFileName}`,
        legacyEntry,
        resourceManifestJson: legacyManifestRef
      })
      forkResult = v1Result
      appendLog(`v1 Catalog 更新完成: ${v1Result.forkOwner}/${v1Result.forkRepo}@${v1Result.branch}`)
    }

    if (!forkResult) {
      throw new Error('未选择提交流程（v1/v2）')
    }

    const pr = await createPullRequestWithHead({
      token: accessToken,
      baseOwner: upstreamOwner.value.trim(),
      baseRepo: upstreamRepo.value.trim(),
      baseBranch: MAIN_BRANCH,
      headOwner: forkResult.forkOwner,
      headBranch: forkResult.branch,
      title: prTitle.value.trim(),
      body: prBody.value.trim() || undefined
    })

    latestPrUrl.value = pr.htmlUrl
    appendLog(`PR 创建成功: #${pr.number}`)
  } catch (error: unknown) {
    appendLog(`创建 PR 失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    creatingPr.value = false
  }
}

const loadReviewList = async (): Promise<void> => {
  try {
    reviewLoading.value = true
    reviewItems.value = await loadInProgressResources({
      token: requireToken(),
      username: currentUser.value,
      targetOwner: upstreamOwner.value.trim(),
      targetRepo: upstreamRepo.value.trim(),
      catalogPath: catalogPath.value.trim()
    })
  } catch (error: unknown) {
    appendLog(`加载审核列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    reviewLoading.value = false
  }
}

const loadOwnedList = async (): Promise<void> => {
  try {
    ownedLoading.value = true
    ownedItems.value = await loadOwnedResources({
      token: requireToken(),
      username: currentUser.value,
      upstreamOwner: upstreamOwner.value.trim(),
      upstreamRepo: upstreamRepo.value.trim(),
      upstreamBranch: MAIN_BRANCH,
      catalogPath: catalogPath.value.trim()
    })
  } catch (error: unknown) {
    appendLog(`加载已发布列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    ownedLoading.value = false
  }
}

watch(
  () => [mode.value, canLoadList.value] as const,
  ([currentMode, canLoad]) => {
    if (!canLoad) return
    if (currentMode === 'review') {
      void loadReviewList()
      return
    }
    if (currentMode === 'published') {
      void loadOwnedList()
    }
  },
  { immediate: true }
)

const reviewStateText = (state: PublishingResource['status']): string => {
  if (state === 'changes_requested') return '需要修改'
  if (state === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}
