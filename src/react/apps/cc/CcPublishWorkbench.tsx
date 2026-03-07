import { ArrowCounterClockwise, CheckCircle, FileImage, FolderNotchOpenIcon, UploadSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { loadOwnedResourceDetail, loadOwnedResources } from '@/utils/resourcePublishApi'
import { parseManifestView } from '@/react/components/cc/resource-manifest'
import { PreviewImageCarousel, type PreviewImageItem } from '@/react/components/cc/PreviewImageCarousel'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { Textarea } from '@/react/components/ui/textarea'

type PublishPreviewItem = PreviewImageItem & {
  id: string
  objectUrl?: string
}

type ResourceEditContext = {
  resourceId: string
  targetRepo: string
  user: string
}

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const normalizeLower = (value: string): string => value.trim().toLowerCase()

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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [previewItems, setPreviewItems] = useState<PublishPreviewItem[]>([])
  const [deletedStack, setDeletedStack] = useState<PublishPreviewItem[]>([])
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapError, setBootstrapError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      revokeLocalItems(previewItems)
      revokeLocalItems(deletedStack)
    }
  }, [deletedStack, previewItems])

  useEffect(() => {
    if (mode !== 'resource_edit') {
      setBootstrapLoading(false)
      setBootstrapError('')
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
        const parsed = parseManifestView(activeManifestText, detail.owner, detail.repo, activeRef || 'main')

        if (cancelled) return

        setName(parsed.name || target.name)
        setDescription(parsed.description || target.description || '')

        const remotePreviews: PublishPreviewItem[] = parsed.previews.map((item) => ({
          id: nextId(),
          file: item.file,
          url: item.url
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

  const title = mode === 'resource_edit' ? '更新资源工作台（首版）' : '资源发布工作台（首版）'
  const hidePreviewInCurrentStepOnMobile = mode === 'resource_edit' && step === '1'

  const previewCarouselItems = useMemo<PreviewImageItem[]>(() => previewItems.map((item) => ({ file: item.file, url: item.url })), [previewItems])

  const appendPreviewFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: PublishPreviewItem[] = []
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const objectUrl = URL.createObjectURL(file)
      next.push({
        id: nextId(),
        file: file.name,
        url: objectUrl,
        objectUrl
      })
    })
    if (next.length === 0) return
    setPreviewItems((prev) => [...prev, ...next])
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
      setDeletedStack((stack) => [target, ...stack].slice(0, 12))

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
                {previewItems.length === 0 ? (
                  <div className="px-2 py-3">暂无文件，先在右侧上传预览图。</div>
                ) : (
                  <ul className="space-y-1">
                    {previewItems.map((item) => (
                      <li key={item.id} className="rounded border border-border bg-background px-2 py-1">{item.file}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">窄屏下该区域会尽量向底部延展到操作区上方。</div>
            </section>

            <section className="space-y-3 rounded-xl border border-border bg-card p-3">
              {step === '1' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-name">资源名称</Label>
                    <Input id="publish-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="输入资源名称" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-desc">资源描述</Label>
                    <Textarea id="publish-desc" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="输入资源描述" className="min-h-[120px]" />
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
                </div>
              ) : null}

              {step === '3' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">资源名称：{name || '-'}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">描述长度：{description.trim().length}</div>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">预览图数量：{previewItems.length}</div>
                  <div className="rounded-md border border-dashed border-border px-3 py-2">提交流程、远程仓库写入、PR 创建将在下一批接入。</div>
                </div>
              ) : null}
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" disabled={step === '1'} onClick={() => setStep((prev) => (prev === '3' ? '2' : '1'))}>
              上一步
            </Button>
            <Button disabled={step === '3'} onClick={() => setStep((prev) => (prev === '1' ? '2' : '3'))}>
              <UploadSimple size={16} weight="duotone" />
              下一步
            </Button>
            <Button variant="default" disabled={step !== '3'}>
              <CheckCircle size={16} weight="duotone" />
              提交（下一批）
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
