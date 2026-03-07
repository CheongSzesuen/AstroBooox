import { ArrowCounterClockwise, CheckCircle, FileImage, FolderNotchOpenIcon, UploadSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  arrayBufferToBase64,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadOwnedResourceDetail,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch
} from '@/utils/resourcePublishApi'
import { buildRawGithubUrl } from '@/react/components/cc/resource-manifest'
import { PreviewImageCarousel, type PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
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
const PREVIEW_UNDO_LIMIT = 12

type Restype = 'quickapp' | 'watchface'

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

const formatCatalogRestype = (value: Restype): string => (value === 'watchface' ? 'watchface' : 'quick_app')

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

  const [step, setStep] = useState<'1' | '2' | '3'>('1')
  const [resourceId, setResourceId] = useState('')
  const [name, setName] = useState('')
  const [restype, setRestype] = useState<Restype>('quickapp')
  const [description, setDescription] = useState('')
  const [repoNameInput, setRepoNameInput] = useState('')
  const [repoDescription, setRepoDescription] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [coverPath, setCoverPath] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [deviceVendorsText, setDeviceVendorsText] = useState('')
  const [devicesText, setDevicesText] = useState('')
  const [paidType, setPaidType] = useState('')
  const [previewItems, setPreviewItems] = useState<PublishPreviewItem[]>([])
  const [deletedStack, setDeletedStack] = useState<PublishPreviewItem[]>([])
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapError, setBootstrapError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitLogs, setSubmitLogs] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [creatingPr, setCreatingPr] = useState(false)
  const [latestPrUrl, setLatestPrUrl] = useState('')
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [boundRepoOwner, setBoundRepoOwner] = useState('')
  const [boundRepoName, setBoundRepoName] = useState('')
  const [boundRepoUrl, setBoundRepoUrl] = useState('')
  const [existingCommitSha, setExistingCommitSha] = useState('')
  const [baselineCatalogId, setBaselineCatalogId] = useState('')
  const [existingManifestObject, setExistingManifestObject] = useState<Record<string, unknown> | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewItemsRef = useRef<PublishPreviewItem[]>([])
  const deletedStackRef = useRef<PublishPreviewItem[]>([])

  useEffect(() => {
    previewItemsRef.current = previewItems
  }, [previewItems])

  useEffect(() => {
    deletedStackRef.current = deletedStack
  }, [deletedStack])

  useEffect(() => {
    return () => {
      revokeLocalItems(previewItemsRef.current)
      revokeLocalItems(deletedStackRef.current)
    }
  }, [])

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

        if (cancelled) return

        setResourceId(parsed.id || target.catalogId || targetResourceId)
        setName(parsed.name || target.name)
        setDescription(parsed.description || target.description || '')
        setRestype(normalizeRestype(parsed.restype || target.restype))
        setIconPath(parsed.icon || target.icon || '')
        setCoverPath(parsed.cover || target.cover || '')
        setTagsText(target.tags || '')
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
        setSubmitError('')
        setLatestPrUrl('')
        setPrTitle('')
        setPrBody('')
        setSubmitLogs([])

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
    const paths = new Set<string>([MANIFEST_FILE])
    previewItems.forEach((item) => {
      const path = normalizeRepoPath(item.path)
      if (item.fileObject && path) {
        paths.add(path)
      }
    })
    return [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [previewItems])

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

  const canSubmitFlow = useMemo(() => {
    const baseReady = Boolean(
      token.trim() &&
      currentUser.trim() &&
      resourceId.trim() &&
      name.trim() &&
      iconPath.trim() &&
      coverPath.trim() &&
      defaultTargetOwner.trim() &&
      defaultTargetRepo.trim() &&
      defaultCatalogPath.trim()
    )
    if (!baseReady || bootstrapLoading || isSubmitting) return false

    if (mode === 'resource_edit') {
      return Boolean(boundRepoOwner.trim() && boundRepoName.trim())
    }
    return Boolean(resolvedRepoName)
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
    resolvedRepoName,
    resourceId,
    token
  ])

  const appendLog = (message: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setSubmitLogs((prev) => [...prev, `[${time}] ${message}`].slice(-220))
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

  const updatePreviewPath = (id: string, value: string) => {
    const path = normalizeRepoPath(value)
    setPreviewItems((prev) => prev.map((item) => (item.id === id ? { ...item, path } : item)))
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

  const buildManifestV2Text = (): string => {
    const base = cloneManifestObject(existingManifestObject)
    const item = asRecord(base.item)

    const existingAuthors = Array.isArray(item.author) ? item.author : []
    const authors = existingAuthors.length > 0
      ? existingAuthors
      : [{ name: currentUser.trim(), bindABAccount: true }]

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
        author: authors
      },
      links: Array.isArray(base.links) ? base.links : [],
      downloads: asRecord(base.downloads),
      ext: asRecord(base.ext)
    }

    return JSON.stringify(manifestObject, null, 2)
  }

  const buildAutoPrTitle = (): string =>
    `[ABoooxCC] ${mode === 'resource_edit' ? '更新' : '发布'} ${name.trim() || '未命名资源'} ${formatResourceTypeForTitle(restype)}`

  const buildAutoPrBody = (repoUrl: string, commitSha: string): string => {
    const shortHash = commitSha.trim() ? commitSha.trim().slice(0, 7) : '--'
    return [
      '## 变更摘要',
      '',
      `- 模式：${mode === 'resource_edit' ? '更新已有资源' : '发布新资源'}`,
      `- 资源 ID：${resourceId.trim()}`,
      `- 资源名称：${name.trim()}`,
      `- 资源类型：${formatResourceTypeForTitle(restype)}`,
      `- 预览图数量：${normalizedPreviewPaths.length}`,
      `- Tags：${tagsText.trim() || '--'}`,
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

  const handleSubmitFlow = async () => {
    if (!canSubmitFlow) return

    const accessToken = token.trim()
    const username = normalizeLower(currentUser)
    const catalogId = resourceId.trim()

    if (!accessToken || !username) return

    setSubmitError('')
    setLatestPrUrl('')
    setPrTitle('')
    setPrBody('')
    setSubmitLogs([])

    try {
      appendLog('开始执行提交流程')
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

      const manifestText = buildManifestV2Text()
      const uploadQueue: Array<{ path: string; file?: File; text?: string }> = [
        { path: MANIFEST_FILE, text: manifestText }
      ]
      const localFileMap = new Map<string, File>()
      previewItems.forEach((item) => {
        const path = normalizeRepoPath(item.path)
        if (!item.fileObject || !path) return
        localFileMap.set(path, item.fileObject)
      })
      localFileMap.forEach((file, path) => uploadQueue.push({ path, file }))

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

      appendLog(`仓库上传完成，commit=${latestCommitSha.slice(0, 7)}`)
      setUploading(false)
      setCreatingPr(true)

      const branchName = `astrobooox-submit-${Date.now()}`
      const matchId = mode === 'resource_edit' ? (baselineCatalogId || catalogId).trim() : catalogId
      const fork = await updateCatalogInForkBranch({
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
          tags: tagsText.trim(),
          device_vendors: deviceVendorsText.trim(),
          devices: devicesText.trim(),
          paid_type: paidType.trim()
        }
      })
      appendLog(`Catalog 更新完成: ${fork.forkOwner}/${fork.forkRepo}@${fork.branch}`)

      const autoTitle = buildAutoPrTitle()
      const autoBody = buildAutoPrBody(repoUrl, latestCommitSha)
      setPrTitle(autoTitle)
      setPrBody(autoBody)

      const pr = await createPullRequestWithHead({
        token: accessToken,
        baseOwner: defaultTargetOwner.trim(),
        baseRepo: defaultTargetRepo.trim(),
        baseBranch: MAIN_BRANCH,
        headOwner: fork.forkOwner,
        headBranch: fork.branch,
        title: autoTitle,
        body: autoBody
      })

      setLatestPrUrl(pr.htmlUrl)
      appendLog(`PR 创建成功: #${pr.number}`)
      toast('提交成功', {
        description: `PR #${pr.number}`
      })
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : '提交流程失败'
      setSubmitError(message)
      appendLog(`失败: ${message}`)
      toast('提交失败', {
        description: message
      })
    } finally {
      setUploading(false)
      setCreatingPr(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Tabs value={step} onValueChange={(value) => setStep(value as '1' | '2' | '3')}>
            <TabsList className="grid w-full grid-cols-3 sm:w-[360px]">
              <TabsTrigger value="1">1. 资源信息</TabsTrigger>
              <TabsTrigger value="2">2. 预览图</TabsTrigger>
              <TabsTrigger value="3">3. 提交</TabsTrigger>
            </TabsList>
          </Tabs>

          {bootstrapLoading ? <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">正在加载待更新资源信息...</div> : null}
          {bootstrapError ? <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{bootstrapError}</div> : null}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
            <section className="flex min-h-[360px] flex-col rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderNotchOpenIcon size={14} weight="duotone" />
                  文件树（首版）
                </div>
                <Badge variant="outline">持续扩展</Badge>
              </div>
              <div className="flex-1 overflow-auto rounded-md border border-border bg-muted/20 p-2 text-xs text-muted-foreground">
                {selectedUploadPaths.length === 0 ? (
                  <div className="px-2 py-3">暂无待上传文件。</div>
                ) : (
                  <ul className="space-y-1">
                    {selectedUploadPaths.map((path) => (
                      <li key={path} className="rounded border border-border bg-background px-2 py-1">{path}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">窄屏下该区域会尽量向底部延展到操作区上方。</div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-3">
              {step === '1' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-id">资源 ID</Label>
                      <Input id="publish-id" value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="com.example.app" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-name">资源名称</Label>
                      <Input id="publish-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="输入资源名称" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-restype">资源类型</Label>
                      <Select value={restype} onValueChange={(value: Restype) => setRestype(value)}>
                        <SelectTrigger id="publish-restype">
                          <SelectValue placeholder="选择资源类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quickapp">快应用</SelectItem>
                          <SelectItem value="watchface">表盘</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {mode === 'publish' ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="publish-repo">仓库名（可选）</Label>
                        <Input id="publish-repo" value={repoNameInput} onChange={(event) => setRepoNameInput(event.target.value)} placeholder="默认自动生成" />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="publish-repo-readonly">目标仓库</Label>
                        <Input id="publish-repo-readonly" value={`${boundRepoOwner || '-'} / ${boundRepoName || '-'}`} readOnly />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-desc">资源描述</Label>
                    <Textarea id="publish-desc" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="输入资源描述" className="min-h-[120px]" />
                  </div>
                  {mode === 'publish' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-repo-desc">仓库描述（可选）</Label>
                      <Input id="publish-repo-desc" value={repoDescription} onChange={(event) => setRepoDescription(event.target.value)} placeholder="资源仓库描述" />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-icon">Icon 路径</Label>
                      <Input id="publish-icon" value={iconPath} onChange={(event) => setIconPath(normalizeRepoPath(event.target.value))} placeholder="images/icon.png" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-cover">Cover 路径</Label>
                      <Input id="publish-cover" value={coverPath} onChange={(event) => setCoverPath(normalizeRepoPath(event.target.value))} placeholder="images/cover.png" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-tags">Tags（分号分隔）</Label>
                      <Input id="publish-tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="tool;productivity" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-paid">付费类型</Label>
                      <Input id="publish-paid" value={paidType} onChange={(event) => setPaidType(event.target.value)} placeholder="free / paid / force_paid" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-vendors">device_vendors</Label>
                      <Input id="publish-vendors" value={deviceVendorsText} onChange={(event) => setDeviceVendorsText(event.target.value)} placeholder="huawei;xiaomi" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="publish-devices">devices</Label>
                      <Input id="publish-devices" value={devicesText} onChange={(event) => setDevicesText(event.target.value)} placeholder="watch4;watch5" />
                    </div>
                  </div>

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
                </div>
              ) : null}

              {step === '3' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源 ID：{resourceId.trim() || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源名称：{name.trim() || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源类型：{formatResourceTypeForTitle(restype)}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">预览图数量：{normalizedPreviewPaths.length}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">目标仓库：{defaultTargetOwner}/{defaultTargetRepo}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">Catalog：{defaultCatalogPath}</div>
                  {prTitle ? <div className="rounded-md border border-border bg-muted/20 px-3 py-2">PR 标题：{prTitle}</div> : null}
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
                  <div className="rounded-md border border-border bg-background/60 p-2">
                    <div className="mb-1 text-xs text-muted-foreground">流程日志</div>
                    <div className="max-h-[180px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                      {submitLogs.length > 0 ? submitLogs.join('\n') : '尚未执行提交。'}
                    </div>
                  </div>
                  {prBody ? (
                    <div className="rounded-md border border-border bg-background/60 p-2">
                      <div className="mb-1 text-xs text-muted-foreground">PR Body（自动生成）</div>
                      <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{prBody}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" disabled={step === '1' || isSubmitting} onClick={() => setStep((prev) => (prev === '3' ? '2' : '1'))}>
              上一步
            </Button>
            <Button disabled={step === '3' || isSubmitting} onClick={() => setStep((prev) => (prev === '1' ? '2' : '3'))}>
              <UploadSimple size={16} weight="duotone" />
              下一步
            </Button>
            <Button variant="default" disabled={step !== '3' || !canSubmitFlow} onClick={() => void handleSubmitFlow()}>
              <CheckCircle size={16} weight="duotone" />
              {isSubmitting ? '提交中...' : mode === 'resource_edit' ? '提交更新' : '创建 PR'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
