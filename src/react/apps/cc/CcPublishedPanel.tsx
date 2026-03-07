import {
  ArrowsClockwise,
  CheckCircle,
  File as FileIcon,
  GithubLogo,
  GlobeHemisphereWest,
  ImageSquare,
  NotePencil,
  WarningCircle
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadOwnedResourceDetail, loadOwnedResources, type OwnedResourceDetail, type OwnedResourceEntry } from '@/utils/resourcePublishApi'
import { PreviewImageCarousel } from '@/react/components/cc/PreviewImageCarousel'
import { ReviewDetailHeader } from '@/react/components/review/ReviewDetailHeader'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'

interface OwnedMergedItem {
  key: string
  catalogId: string
  name: string
  restype: string
  icon: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  description: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
  commitDate: string
  sources: Array<'v1' | 'v2'>
  v1RepoCommitHash: string
  v2RepoCommitHash: string
  v2NeedsFollowUp: boolean
}

type OwnedManifestLink = { title: string; url: string; type: string }
type OwnedManifestImageAsset = { file: string; url: string }
type OwnedSubmissionOverview = {
  resourceInfo: Array<{ key: string; value: string }>
  links: OwnedManifestLink[]
  supportedDevices: string[]
  downloads: Array<{ device: string; version: string; file: string; raw: string }>
  images: {
    icon: OwnedManifestImageAsset | null
    cover: OwnedManifestImageAsset | null
    previews: OwnedManifestImageAsset[]
  }
}

const normalizeOwnedRestype = (value: string): 'quickapp' | 'watchface' | 'other' => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'watchface' || normalized === 'watch_face') return 'watchface'
  if (normalized === 'quickapp' || normalized === 'quick_app') return 'quickapp'
  return 'other'
}

const formatOwnedRestype = (value: string): string => {
  const normalized = normalizeOwnedRestype(value)
  if (normalized === 'watchface') return '表盘'
  if (normalized === 'quickapp') return '快应用'
  return value
}

const formatDate = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const buildOwnedDetailRouteKey = (item: Pick<OwnedMergedItem, 'repo_name'>): string =>
  item.repo_name.trim().toLowerCase()

const getOwnedItemRepoUrl = (item: { repo_owner: string; repo_name: string }): string =>
  `https://github.com/${item.repo_owner}/${item.repo_name}`

const getOwnedItemIconUrl = (item: {
  icon: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
}): string => {
  const value = item.icon?.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (item.repo_owner && item.repo_name && item.repo_commit_hash) {
    const normalized = value.replace(/^\/+/, '')
    return `https://raw.githubusercontent.com/${item.repo_owner}/${item.repo_name}/${item.repo_commit_hash}/${normalized}`
  }
  return value
}

export function CcPublishedPanel(props: {
  token: string
  currentUser: string
  defaultTargetOwner: string
  defaultTargetRepo: string
  defaultCatalogPath: string
  ownedDisplayPriority: 'v2' | 'v1'
  showV2FollowUpTag: boolean
  resourceDetailKey: string
  onResourceDetailKeyChange: (key: string) => void
  onStartEditResource: (payload: { resourceId: string; targetRepo: string; user: string }) => void
}) {
  const {
    token,
    currentUser,
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    ownedDisplayPriority,
    showV2FollowUpTag,
    resourceDetailKey,
    onResourceDetailKeyChange,
    onStartEditResource
  } = props

  const [ownedLoading, setOwnedLoading] = useState(false)
  const [ownedItems, setOwnedItems] = useState<OwnedResourceEntry[]>([])
  const [ownedTypeFilter, setOwnedTypeFilter] = useState<'all' | 'quickapp' | 'watchface'>('all')
  const [ownedSupportFilter, setOwnedSupportFilter] = useState<'all' | 'v1_only' | 'v2_only' | 'both'>('all')

  const [selectedOwnedItem, setSelectedOwnedItem] = useState<OwnedMergedItem | null>(null)
  const [ownedDetailLoading, setOwnedDetailLoading] = useState(false)
  const [ownedDetailError, setOwnedDetailError] = useState('')
  const [ownedDetail, setOwnedDetail] = useState<OwnedResourceDetail | null>(null)

  const canLoadList = Boolean(token.trim() && currentUser.trim())

  const ownedMergedItems = useMemo<OwnedMergedItem[]>(() => {
    const grouped = new Map<string, OwnedMergedItem>()
    const preferredSource = ownedDisplayPriority === 'v1' ? 'v1' : 'v2'
    const isNewerDate = (current: string, previous: string): boolean => {
      if (!current) return false
      if (!previous) return true
      return current > previous
    }

    for (const item of ownedItems) {
      const key = [
        item.repo_owner.trim().toLowerCase(),
        item.repo_name.trim().toLowerCase()
      ].join('|')
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          key,
          catalogId: item.catalogId,
          name: item.name,
          restype: item.restype,
          icon: item.icon,
          repo_owner: item.repo_owner,
          repo_name: item.repo_name,
          repo_commit_hash: item.repo_commit_hash,
          description: item.description,
          tags: item.tags,
          device_vendors: item.device_vendors,
          devices: item.devices,
          paid_type: item.paid_type,
          commitDate: item.commitDate,
          sources: [item.source],
          v1RepoCommitHash: item.source === 'v1' ? item.repo_commit_hash : '',
          v2RepoCommitHash: item.source === 'v2' ? item.repo_commit_hash : '',
          v2NeedsFollowUp: item.v2NeedsFollowUp
        })
        continue
      }

      if (!existing.sources.includes(item.source)) {
        existing.sources.push(item.source)
      }
      if (item.source === 'v1' && item.repo_commit_hash) {
        existing.v1RepoCommitHash = item.repo_commit_hash
      }
      if (item.source === 'v2' && item.repo_commit_hash) {
        existing.v2RepoCommitHash = item.repo_commit_hash
      }

      const shouldUseCurrent = item.source === preferredSource
      if (shouldUseCurrent) {
        const shouldReplacePreferred =
          !existing.repo_commit_hash || isNewerDate(item.commitDate || '', existing.commitDate || '')
        if (shouldReplacePreferred) {
          existing.name = item.name || existing.name
          existing.restype = item.restype || existing.restype
          existing.icon = item.icon || existing.icon
          existing.repo_owner = item.repo_owner || existing.repo_owner
          existing.repo_name = item.repo_name || existing.repo_name
          existing.repo_commit_hash = item.repo_commit_hash || existing.repo_commit_hash
          existing.description = item.description || existing.description
          existing.tags = item.tags || existing.tags
          existing.device_vendors = item.device_vendors || existing.device_vendors
          existing.devices = item.devices || existing.devices
          existing.paid_type = item.paid_type || existing.paid_type
          existing.catalogId = item.catalogId || existing.catalogId
          existing.commitDate = item.commitDate || existing.commitDate
        }
      } else {
        if (!existing.icon && item.icon) existing.icon = item.icon
        if (!existing.commitDate && item.commitDate) existing.commitDate = item.commitDate
        if (!existing.tags && item.tags) existing.tags = item.tags
        if (!existing.device_vendors && item.device_vendors) existing.device_vendors = item.device_vendors
        if (!existing.devices && item.devices) existing.devices = item.devices
        if (!existing.paid_type && item.paid_type) existing.paid_type = item.paid_type
        if (!existing.catalogId && item.catalogId) existing.catalogId = item.catalogId
      }
      if (item.source === 'v2' && item.v2NeedsFollowUp) {
        existing.v2NeedsFollowUp = true
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const at = a.commitDate || ''
      const bt = b.commitDate || ''
      return bt.localeCompare(at)
    })
  }, [ownedDisplayPriority, ownedItems])

  const filteredOwnedItems = useMemo<OwnedMergedItem[]>(() =>
    ownedMergedItems.filter((item) => {
      const restypeKey = normalizeOwnedRestype(item.restype)
      const typeOk =
        ownedTypeFilter === 'all' ||
        (ownedTypeFilter === 'quickapp' && restypeKey === 'quickapp') ||
        (ownedTypeFilter === 'watchface' && restypeKey === 'watchface')

      let supportOk = true
      if (ownedSupportFilter === 'v1_only') {
        supportOk = item.sources.length === 1 && item.sources.includes('v1')
      } else if (ownedSupportFilter === 'v2_only') {
        supportOk = item.sources.length === 1 && item.sources.includes('v2')
      } else if (ownedSupportFilter === 'both') {
        supportOk = item.sources.includes('v1') && item.sources.includes('v2')
      }

      return typeOk && supportOk
    }),
  [ownedMergedItems, ownedSupportFilter, ownedTypeFilter])

  const requireToken = useCallback((): string => {
    const value = token.trim()
    if (!value) {
      throw new Error('请先登录 Token')
    }
    return value
  }, [token])

  const loadOwnedList = useCallback(async (): Promise<void> => {
    if (!canLoadList) return
    try {
      setOwnedLoading(true)
      const next = await loadOwnedResources({
        token: requireToken(),
        username: currentUser.trim(),
        upstreamOwner: defaultTargetOwner.trim(),
        upstreamRepo: defaultTargetRepo.trim(),
        upstreamBranch: 'main',
        catalogPath: defaultCatalogPath.trim()
      })
      setOwnedItems(next)
    } finally {
      setOwnedLoading(false)
    }
  }, [canLoadList, currentUser, defaultCatalogPath, defaultTargetOwner, defaultTargetRepo, requireToken])

  const loadOwnedItemDetail = useCallback(async (item?: OwnedMergedItem): Promise<void> => {
    const target = item || selectedOwnedItem
    if (!target) return
    try {
      setOwnedDetailLoading(true)
      setOwnedDetailError('')
      const detail = await loadOwnedResourceDetail({
        token: requireToken(),
        owner: target.repo_owner,
        repo: target.repo_name,
        v1Ref: target.sources.includes('v1') ? '' : undefined,
        v2Ref: target.v2RepoCommitHash
      })
      setOwnedDetail(detail)
    } catch (error: unknown) {
      setOwnedDetailError(`加载详情失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setOwnedDetailLoading(false)
    }
  }, [requireToken, selectedOwnedItem])

  const openOwnedItemDetail = useCallback((item: OwnedMergedItem, options?: { syncRoute?: boolean }) => {
    const syncRoute = options?.syncRoute ?? true
    setSelectedOwnedItem(item)
    if (syncRoute) {
      onResourceDetailKeyChange(buildOwnedDetailRouteKey(item))
    }
    void loadOwnedItemDetail(item)
  }, [loadOwnedItemDetail, onResourceDetailKeyChange])

  const closeOwnedDetail = useCallback((options?: { syncRoute?: boolean }) => {
    const syncRoute = options?.syncRoute ?? true
    setSelectedOwnedItem(null)
    setOwnedDetail(null)
    setOwnedDetailError('')
    if (syncRoute) {
      onResourceDetailKeyChange('')
    }
  }, [onResourceDetailKeyChange])

  useEffect(() => {
    if (!canLoadList) return
    void loadOwnedList()
  }, [canLoadList, loadOwnedList])

  useEffect(() => {
    if (ownedLoading) return
    if (ownedMergedItems.length === 0) return

    const normalizedKey = resourceDetailKey.trim().toLowerCase()
    if (!normalizedKey) {
      if (selectedOwnedItem) {
        closeOwnedDetail({ syncRoute: false })
      }
      return
    }

    const matched = ownedMergedItems.find((item) => {
      const repoNameKey = buildOwnedDetailRouteKey(item)
      const legacyKey = item.key.trim().toLowerCase()
      const catalogId = item.catalogId.trim().toLowerCase()
      return repoNameKey === normalizedKey || legacyKey === normalizedKey || catalogId === normalizedKey
    })

    if (!matched) {
      if (selectedOwnedItem) {
        closeOwnedDetail({ syncRoute: false })
      }
      return
    }
    if (selectedOwnedItem?.key === matched.key) return
    openOwnedItemDetail(matched, { syncRoute: false })
  }, [closeOwnedDetail, openOwnedItemDetail, ownedLoading, ownedMergedItems, resourceDetailKey, selectedOwnedItem])

  const ownedManifestObject = useMemo<Record<string, any>>(() => {
    if (!ownedDetail) return {}
    const sourceText = ownedDetail.v2ManifestText.trim() || ownedDetail.v1ManifestText.trim()
    if (!sourceText) return {}
    try {
      return JSON.parse(sourceText) as Record<string, any>
    } catch {
      return {}
    }
  }, [ownedDetail])

  const buildOwnedAssetRawUrl = useCallback((relativePath: string): string => {
    if (!selectedOwnedItem) return ''
    const raw = relativePath.trim()
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    const ref = selectedOwnedItem.v2RepoCommitHash || selectedOwnedItem.v1RepoCommitHash || selectedOwnedItem.repo_commit_hash
    const normalizedPath = raw.replace(/^\/+/, '')
    return `https://raw.githubusercontent.com/${selectedOwnedItem.repo_owner}/${selectedOwnedItem.repo_name}/${ref}/${normalizedPath}`
  }, [selectedOwnedItem])

  const ownedSubmissionOverview = useMemo<OwnedSubmissionOverview>(() => {
    const manifest = ownedManifestObject
    const item = (manifest.item && typeof manifest.item === 'object') ? manifest.item as Record<string, any> : {}
    const downloads = (manifest.downloads && typeof manifest.downloads === 'object') ? manifest.downloads as Record<string, any> : {}
    const linksInput = Array.isArray(manifest.links) ? manifest.links as Array<Record<string, any>> : []

    const links = linksInput
      .map((link) => ({
        title: typeof link.title === 'string' ? link.title.trim() : '',
        url: typeof link.url === 'string' ? link.url.trim() : '',
        type: typeof link.icon === 'string' ? link.icon.trim() : ''
      }))
      .filter((link) => Boolean(link.url))

    const resourceInfo = [
      { key: '资源名称', value: String(item.name || selectedOwnedItem?.name || '').trim() },
      { key: '资源类型', value: formatOwnedRestype(String(item.restype || selectedOwnedItem?.restype || '').trim()) },
      { key: '资源描述', value: String(item.description || selectedOwnedItem?.description || '').trim() },
      { key: 'V2 Hash', value: ownedDetail?.v2Ref || '-' }
    ]

    const downloadList = Object.entries(downloads).map(([device, meta]) => {
      const mapped = meta && typeof meta === 'object' ? meta as Record<string, any> : {}
      const file = String(mapped.file_name || '').trim()
      return {
        device,
        version: String(mapped.version || '').trim(),
        file,
        raw: file ? buildOwnedAssetRawUrl(file) : ''
      }
    })

    const iconPath = String(item.icon || '').trim()
    const coverPath = String(item.cover || '').trim()
    const previewList = Array.isArray(item.preview) ? item.preview : []

    return {
      resourceInfo,
      links,
      supportedDevices: Object.keys(downloads),
      downloads: downloadList,
      images: {
        icon: iconPath ? { file: iconPath, url: buildOwnedAssetRawUrl(iconPath) } : null,
        cover: coverPath ? { file: coverPath, url: buildOwnedAssetRawUrl(coverPath) } : null,
        previews: previewList
          .map((value) => String(value || '').trim())
          .filter(Boolean)
          .map((file) => ({ file, url: buildOwnedAssetRawUrl(file) }))
      }
    }
  }, [buildOwnedAssetRawUrl, ownedDetail?.v2Ref, ownedManifestObject, selectedOwnedItem?.description, selectedOwnedItem?.name, selectedOwnedItem?.restype])

  const ownedGroupedDownloads = useMemo(() =>
    ownedSubmissionOverview.downloads.map((item) => ({
      devices: [item.device],
      version: item.version,
      file: item.file,
      raw: item.raw
    })),
  [ownedSubmissionOverview.downloads])

  const hasOwnedSubmissionOverview = useMemo(() =>
    ownedSubmissionOverview.resourceInfo.some((item) => Boolean(item.value && item.value !== '-')) ||
    ownedSubmissionOverview.supportedDevices.length > 0 ||
    ownedSubmissionOverview.downloads.length > 0 ||
    ownedSubmissionOverview.links.length > 0 ||
    Boolean(ownedSubmissionOverview.images.icon) ||
    Boolean(ownedSubmissionOverview.images.cover) ||
    ownedSubmissionOverview.images.previews.length > 0,
  [ownedSubmissionOverview])

  const ownedRuleChecks = useMemo<Array<{ title: string; status: 'pass' | 'warn' | 'fail'; detail: string }>>(() => {
    const checks: Array<{ title: string; status: 'pass' | 'warn' | 'fail'; detail: string }> = []
    const hasManifest = Object.keys(ownedManifestObject).length > 0
    checks.push({
      title: 'manifest 文件存在且 JSON 可解析',
      status: hasManifest ? 'pass' : 'fail',
      detail: hasManifest ? 'manifest 解析成功' : 'manifest 文件不存在或解析失败'
    })

    if (!ownedDetail?.v2Ref) {
      checks.push({
        title: 'index_v2 hash 最新性',
        status: 'warn',
        detail: '未检测到 v2 hash'
      })
    } else if (ownedDetail.isV2HashLatest) {
      checks.push({
        title: 'index_v2 hash 最新性',
        status: 'pass',
        detail: `当前 hash（${ownedDetail.v2Ref}）已是默认分支最新提交`
      })
    } else {
      checks.push({
        title: 'index_v2 hash 最新性',
        status: 'fail',
        detail: `当前 hash（${ownedDetail.v2Ref}）落后于最新提交（${ownedDetail.latestCommitSha || '-'})`
      })
    }

    const hasDownloads = ownedSubmissionOverview.downloads.length > 0
    checks.push({
      title: 'manifest downloads 完整性',
      status: hasDownloads ? 'pass' : 'warn',
      detail: hasDownloads ? `已识别 ${ownedSubmissionOverview.downloads.length} 条下载配置` : '未识别到 downloads'
    })
    return checks
  }, [ownedDetail, ownedManifestObject, ownedSubmissionOverview.downloads.length])

  const startEditOwnedResource = () => {
    if (!selectedOwnedItem) return
    onStartEditResource({
      resourceId: selectedOwnedItem.catalogId.trim(),
      targetRepo: `${selectedOwnedItem.repo_owner}/${selectedOwnedItem.repo_name}`.toLowerCase(),
      user: currentUser.trim().toLowerCase()
    })
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1320px] space-y-4">
      {!selectedOwnedItem ? (
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">资源管理</CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Select value={ownedTypeFilter} onValueChange={(value) => setOwnedTypeFilter(value as 'all' | 'quickapp' | 'watchface')}>
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue placeholder="资源类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="quickapp">快应用</SelectItem>
                      <SelectItem value="watchface">表盘</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ownedSupportFilter} onValueChange={(value) => setOwnedSupportFilter(value as 'all' | 'v1_only' | 'v2_only' | 'both')}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="支持版本" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部版本</SelectItem>
                      <SelectItem value="v1_only">仅 V1</SelectItem>
                      <SelectItem value="v2_only">仅 V2</SelectItem>
                      <SelectItem value="both">V1 + V2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button disabled={ownedLoading || !canLoadList} onClick={() => void loadOwnedList()}>
                    <ArrowsClockwise size={16} weight="duotone" />
                    {ownedLoading ? '加载中...' : '刷新'}
                  </Button>
                </div>
              </div>
              <CardDescription>查看当前账号已发布到目录的资源并统一管理。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {filteredOwnedItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无数据
                </div>
              ) : null}
              {filteredOwnedItems.map((item) => (
                <div
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  className="rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-accent/30"
                  onClick={() => openOwnedItemDetail(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openOwnedItemDetail(item)
                    }
                  }}
                >
                  <div className="space-y-1.5 sm:hidden">
                    <div className="flex items-center gap-3">
                      <img
                        src={getOwnedItemIconUrl(item)}
                        alt={`${item.name} icon`}
                        className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted/50 object-cover"
                      />
                      <div className="flex min-w-0 flex-1 items-center">
                        <div className="line-clamp-2 text-sm font-semibold leading-5 text-foreground break-words">
                          {item.name}
                        </div>
                      </div>
                      <a
                        href={getOwnedItemRepoUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="打开仓库"
                        title="打开仓库"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <GithubLogo size={16} weight="duotone" />
                      </a>
                    </div>
                    <div className="space-y-1">
                      <div className="flex max-w-full justify-end">
                        <Badge variant="secondary">{formatOwnedRestype(item.restype)}</Badge>
                      </div>
                      {(item.sources.includes('v1') || item.sources.includes('v2')) ? (
                        <div className="flex max-w-full flex-wrap justify-end gap-1">
                          {item.sources.includes('v1') ? <Badge variant="outline">V1</Badge> : null}
                          {item.sources.includes('v2') ? <Badge variant="outline">V2</Badge> : null}
                        </div>
                      ) : null}
                      {showV2FollowUpTag && item.v2NeedsFollowUp ? (
                        <div className="flex max-w-full justify-end">
                          <Badge variant="destructive">v2需要跟进</Badge>
                        </div>
                      ) : null}
                    </div>
                    <div className="w-full break-all text-xs text-muted-foreground">
                      {item.description || '暂无描述'}
                    </div>
                    {item.commitDate ? (
                      <div className="w-full text-xs text-muted-foreground">
                        上次更新时间: {formatDate(item.commitDate)}
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden items-start gap-3 sm:flex">
                    <img
                      src={getOwnedItemIconUrl(item)}
                      alt={`${item.name} icon`}
                      className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-border bg-muted/50 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="min-w-0 flex-wrap items-center gap-1.5 sm:flex">
                            <div className="min-w-0 text-sm font-semibold text-foreground">{item.name}</div>
                            <Badge variant="secondary">{formatOwnedRestype(item.restype)}</Badge>
                            {item.sources.includes('v1') ? <Badge variant="outline">V1</Badge> : null}
                            {item.sources.includes('v2') ? <Badge variant="outline">V2</Badge> : null}
                            {showV2FollowUpTag && item.v2NeedsFollowUp ? <Badge variant="destructive">v2需要跟进</Badge> : null}
                          </div>
                        </div>
                        <a
                          href={getOwnedItemRepoUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="打开仓库"
                          title="打开仓库"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <GithubLogo size={16} weight="duotone" />
                        </a>
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description || '暂无描述'}
                      </div>
                      {item.commitDate ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          上次更新时间: {formatDate(item.commitDate)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <ReviewDetailHeader
            title={selectedOwnedItem.name}
            leadingImageUrl={getOwnedItemIconUrl(selectedOwnedItem)}
            leadingImageAlt={`${selectedOwnedItem.name} icon`}
            showBack
            onBack={() => closeOwnedDetail()}
            meta={(
              <>
                <Badge variant="secondary">{formatOwnedRestype(selectedOwnedItem.restype)}</Badge>
                {selectedOwnedItem.sources.includes('v1') ? <Badge variant="outline">V1</Badge> : null}
                {selectedOwnedItem.sources.includes('v2') ? <Badge variant="outline">V2</Badge> : null}
                {showV2FollowUpTag && selectedOwnedItem.v2NeedsFollowUp ? <Badge variant="destructive">v2需要跟进</Badge> : null}
              </>
            )}
            actions={(
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 px-3"
                  disabled={ownedDetailLoading}
                  onClick={startEditOwnedResource}
                >
                  <NotePencil size={14} weight="duotone" />
                  更新
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={ownedDetailLoading}
                  title="刷新详情"
                  aria-label="刷新详情"
                  onClick={() => void loadOwnedItemDetail()}
                >
                  <ArrowsClockwise size={14} weight="duotone" />
                </Button>
                <Button asChild variant="outline" size="icon" className="h-9 w-9" title="打开仓库" aria-label="打开仓库">
                  <a href={getOwnedItemRepoUrl(selectedOwnedItem)} target="_blank" rel="noopener noreferrer">
                    <GithubLogo size={14} weight="duotone" />
                  </a>
                </Button>
              </>
            )}
          />

          {ownedSubmissionOverview.images.cover ? (
            <Card>
              <CardContent className="flex flex-wrap items-start gap-2.5 px-3 pb-3 pt-3 sm:gap-4 sm:p-6 sm:pt-4">
                <a
                  href={ownedSubmissionOverview.images.cover.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group min-w-0 w-full"
                >
                  <div className="text-xs text-muted-foreground">Cover</div>
                  <img
                    src={ownedSubmissionOverview.images.cover.url}
                    alt="Cover 预览"
                    className="mt-1 h-auto max-h-[30vh] w-full rounded-md border border-border object-contain transition-opacity group-hover:opacity-90"
                    loading="lazy"
                  />
                </a>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="gap-y-1 px-3 pb-1.5 pt-3 sm:gap-y-1.5 sm:px-6 sm:pb-3 sm:pt-6">
              <CardTitle className="text-base">资源提交信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3 pt-0 text-sm sm:space-y-3 sm:p-6 sm:pt-0">
              {ownedDetailError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive sm:px-3">
                  {ownedDetailError}
                </div>
              ) : ownedDetailLoading ? (
                <div className="text-xs text-muted-foreground">
                  正在加载文件变更...
                </div>
              ) : !hasOwnedSubmissionOverview ? (
                <div className="rounded-md border border-dashed border-border px-2.5 py-2.5 text-sm text-muted-foreground sm:px-3 sm:py-3">
                  未识别到结构化资源信息
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="grid gap-2 sm:gap-3 xl:grid-cols-2">
                    <div className="rounded-md border border-border p-2.5 sm:p-3">
                      <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:mb-2">
                        <NotePencil size={14} weight="duotone" />
                        资源信息
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {ownedSubmissionOverview.resourceInfo.map((item) => (
                          <div
                            key={item.key}
                            className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:px-3 sm:py-2 md:flex-row md:items-center md:justify-between"
                          >
                            <span className="text-xs text-muted-foreground">{item.key}</span>
                            <span className="min-w-0 break-all text-sm font-medium text-foreground">{item.value || '-'}</span>
                          </div>
                        ))}
                        <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:px-3 sm:py-2 md:flex-row md:items-center md:justify-between">
                          <span className="text-xs text-muted-foreground">仓库信息</span>
                          <a
                            href={getOwnedItemRepoUrl(selectedOwnedItem)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-sm font-medium text-primary hover:underline"
                          >
                            {getOwnedItemRepoUrl(selectedOwnedItem)}
                          </a>
                        </div>
                        <div className="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:px-3 sm:py-2">
                          <span className="text-xs text-muted-foreground">链接（manifest_v2.links）</span>
                          {ownedSubmissionOverview.links.length > 0 ? (
                            <div className="space-y-1 text-sm font-medium text-foreground">
                              {ownedSubmissionOverview.links.map((link) => (
                                <a
                                  key={`owned-links-${link.title}-${link.url}`}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-primary hover:underline"
                                >
                                  <span className="flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <FileIcon size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 break-all text-foreground">{link.title || '-'}</span>
                                    {link.type ? <span className="min-w-0 break-all text-muted-foreground">{link.type}</span> : null}
                                  </span>
                                  <span className="min-w-0 break-all">{link.url}</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-foreground">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-border p-2.5 sm:p-3">
                      <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:mb-2">
                        <GlobeHemisphereWest size={14} weight="duotone" />
                        支持设备
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {ownedGroupedDownloads.map((group) => (
                          <div
                            key={`${group.file}-${group.version}-${group.devices.join('/')}`}
                            className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:px-3 sm:py-2"
                          >
                            <div className="text-xs text-muted-foreground">支持设备：{group.devices.join(' / ') || '-'}</div>
                            <div className="mt-1 text-xs text-muted-foreground">版本：{group.version || '-'}</div>
                            <div className="mt-1 break-all text-xs text-muted-foreground">文件：{group.file || '-'}</div>
                            {group.raw ? (
                              <a
                                href={group.raw}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 block break-all text-xs text-primary hover:underline"
                              >
                                {group.raw}
                              </a>
                            ) : null}
                          </div>
                        ))}
                        {ownedGroupedDownloads.length === 0 ? (
                          <div className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-sm text-foreground sm:px-3 sm:py-2">
                            {ownedSubmissionOverview.supportedDevices.join(' / ') || '-'}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-2.5 sm:p-3">
                    <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:mb-2">
                      <ImageSquare size={14} weight="duotone" />
                      图片资源（Raw）
                    </div>
                    <PreviewImageCarousel items={ownedSubmissionOverview.images.previews} />
                  </div>

                  <div className="rounded-md border border-border p-2.5 sm:p-3">
                    <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:mb-2">
                      <CheckCircle size={14} weight="duotone" />
                      规范自动检查
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {ownedRuleChecks.map((item) => (
                        <div
                          key={item.title}
                          className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:px-3 sm:py-2"
                        >
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            {item.status === 'pass' ? (
                              <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
                            ) : (
                              <WarningCircle
                                size={14}
                                weight="fill"
                                className={`mt-0.5 shrink-0 ${item.status === 'fail' ? 'text-red-600' : 'text-amber-500'}`}
                              />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground">{item.title}</div>
                              <div className="break-words text-xs text-muted-foreground">{item.detail}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
