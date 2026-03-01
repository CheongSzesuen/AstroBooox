<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="inline-flex items-center gap-2 text-base md:text-lg">
          <RocketLaunch :size="18" weight="duotone" />
          资源发布工作台
        </CardTitle>
        <CardDescription class="text-sm leading-6">
          精简版 Creator Console：仅保留资源发布、审核列表、已发布资源，不包含账号体系与数据分析页。
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3 pt-0">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div class="space-y-1.5">
            <Label for="publish-token">GitHub Token</Label>
            <Input
              id="publish-token"
              v-model="token"
              :type="showToken ? 'text' : 'password'"
              placeholder="请输入专用细粒度 Token"
              autocomplete="off"
            />
          </div>
          <div class="flex items-end gap-2">
            <Button variant="outline" class="h-9" @click="showToken = !showToken">
              <Eye :size="16" weight="duotone" />
              {{ showToken ? '隐藏' : '显示' }}
            </Button>
            <Button class="h-9" :disabled="verifying || !token.trim()" @click="handleVerifyToken">
              <CheckCircle :size="16" weight="duotone" />
              {{ verifying ? '校验中...' : '校验 Token' }}
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-sm">
          <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
            <img
              v-if="userAvatar"
              :src="userAvatar"
              alt="User Avatar"
              class="h-full w-full object-cover"
            />
            <UserCircle v-else :size="16" weight="duotone" class="text-muted-foreground" />
          </div>
          <Badge variant="outline">当前用户: {{ currentUser || '未校验' }}</Badge>
          <Badge variant="outline">发布分支: main</Badge>
        </div>
      </CardContent>
    </Card>

    <Tabs v-model:model-value="activeTab" class="space-y-2">
      <TabsList class="w-full justify-start gap-1 border border-border bg-muted/40 p-1">
        <TabsTrigger value="publish" class="h-9 px-3 text-sm">发布资源</TabsTrigger>
        <TabsTrigger value="review" class="h-9 px-3 text-sm">审核列表</TabsTrigger>
        <TabsTrigger value="owned" class="h-9 px-3 text-sm">已发布资源</TabsTrigger>
      </TabsList>

      <TabsContent value="publish" class="space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">FSA 工作区</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-0">
            <div class="flex flex-wrap items-center gap-2">
              <Button :disabled="publishing" @click="selectWorkspace">
                <FolderOpen :size="16" weight="duotone" />
                选择资源目录
              </Button>
              <Button variant="outline" :disabled="publishing || !workspaceHandle" @click="scanWorkspace">
                <ArrowsClockwise :size="16" weight="duotone" />
                扫描目录
              </Button>
              <span class="text-sm text-muted-foreground">
                当前目录: {{ workspaceName || '未选择' }}
              </span>
            </div>

            <div class="grid gap-2 md:grid-cols-3">
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                manifest_v2.json: {{ manifestFound ? '已找到' : '未找到' }}
              </div>
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                media 文件: {{ mediaFiles.length }}
              </div>
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                downloads 文件: {{ downloadFiles.length }}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">发布参数</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="repo-name">资源仓库名</Label>
                <Input id="repo-name" v-model="repoName" placeholder="astrobox-resource-xxx" />
              </div>
              <div class="space-y-1.5">
                <Label for="repo-desc">仓库描述（可选）</Label>
                <Input id="repo-desc" v-model="repoDescription" placeholder="resource repository" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="item-id">资源 ID</Label>
                <Input id="item-id" v-model="itemId" placeholder="your-resource-id" />
              </div>
              <div class="space-y-1.5">
                <Label for="item-name">资源名称</Label>
                <Input id="item-name" v-model="itemName" placeholder="My Resource" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="restype">资源类型</Label>
                <Input id="restype" v-model="restype" placeholder="quick_app / watchface" />
              </div>
              <div class="space-y-1.5">
                <Label for="paid-type">付费类型</Label>
                <Input id="paid-type" v-model="paidType" placeholder="paid / force_paid / 空" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="tags">标签（;分隔）</Label>
                <Input id="tags" v-model="tagsText" placeholder="tool;watchface" />
              </div>
              <div class="space-y-1.5">
                <Label for="devices">设备 ID（;分隔）</Label>
                <Input id="devices" v-model="devicesText" placeholder="o66;o66nfc" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="icon-path">icon 路径</Label>
                <Input id="icon-path" v-model="iconPath" placeholder="media/icon.png" />
              </div>
              <div class="space-y-1.5">
                <Label for="cover-path">cover 路径</Label>
                <Input id="cover-path" v-model="coverPath" placeholder="media/cover.png" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="upstream-owner">目录仓库 Owner</Label>
                <Input id="upstream-owner" v-model="upstreamOwner" />
              </div>
              <div class="space-y-1.5">
                <Label for="upstream-repo">目录仓库名</Label>
                <Input id="upstream-repo" v-model="upstreamRepo" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="target-owner">PR 目标 Owner</Label>
                <Input id="target-owner" v-model="targetOwner" />
              </div>
              <div class="space-y-1.5">
                <Label for="target-repo">PR 目标仓库</Label>
                <Input id="target-repo" v-model="targetRepo" />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="catalog-path">Catalog 文件路径</Label>
                <Input id="catalog-path" v-model="catalogPath" placeholder="index_v2.csv" />
              </div>
              <div class="space-y-1.5">
                <Label for="pr-title">PR 标题</Label>
                <Input id="pr-title" v-model="prTitle" placeholder="[ABCC] Add new resource" />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="pr-body">PR 描述（可选）</Label>
              <Textarea id="pr-body" v-model="prBody" class="min-h-[110px]" />
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <Button :disabled="publishing || !canPublish" @click="handlePublish">
                <UploadSimple :size="16" weight="duotone" />
                {{ publishing ? '发布中...' : '上传并创建 PR' }}
              </Button>
              <a
                v-if="latestPrUrl"
                :href="latestPrUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-primary hover:underline"
              >
                查看最新 PR
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-base">发布日志</CardTitle>
              <Button variant="ghost" size="sm" @click="publishLogs = []">清空</Button>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="scrollbar-none max-h-[320px] overflow-y-auto rounded-lg border border-border bg-muted/25 p-3">
              <pre class="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">{{ publishLogsText }}</pre>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="review" class="space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">进行中审核</CardTitle>
              <Button :disabled="reviewLoading || !canLoadList" @click="loadReviewList">
                <ArrowsClockwise :size="16" weight="duotone" />
                {{ reviewLoading ? '加载中...' : '刷新' }}
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-2 pt-0">
            <div v-if="reviewItems.length === 0" class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              暂无数据
            </div>
            <div
              v-for="item in reviewItems"
              :key="`${item.prNumber}-${item.id}`"
              class="rounded-lg border border-border bg-card px-3 py-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-sm font-semibold text-foreground">{{ item.id }} · {{ item.name }}</div>
                <Badge variant="outline">{{ reviewStateText(item.status) }}</Badge>
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ item.restype }} · PR #{{ item.prNumber }} · {{ formatDate(item.createdAt) }}
              </div>
              <a
                :href="item.prUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-flex text-xs text-primary hover:underline"
              >
                查看 PR
              </a>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="owned" class="space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">已发布资源</CardTitle>
              <Button :disabled="ownedLoading || !canLoadList" @click="loadOwnedList">
                <ArrowsClockwise :size="16" weight="duotone" />
                {{ ownedLoading ? '加载中...' : '刷新' }}
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-2 pt-0">
            <div v-if="ownedItems.length === 0" class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              暂无数据
            </div>
            <div
              v-for="item in ownedItems"
              :key="item.id"
              class="rounded-lg border border-border bg-card px-3 py-3"
            >
              <div class="text-sm font-semibold text-foreground">{{ item.id }} · {{ item.name }}</div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ item.restype }} · {{ item.repo_owner }}/{{ item.repo_name }}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCheckCircle as CheckCircle,
  PhEye as Eye,
  PhFolderOpen as FolderOpen,
  PhRocketLaunch as RocketLaunch,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { verifyToken } from '@/utils/githubGitApi'
import {
  type CatalogEntry,
  type PublishingResource,
  arrayBufferToBase64,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadInProgressResources,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch
} from '@/utils/resourcePublishApi'

interface WorkspaceFileHandle {
  kind: 'file'
  getFile(): Promise<File>
}

interface WorkspaceDirectoryHandle {
  kind: 'directory'
  name: string
  getFileHandle(name: string): Promise<WorkspaceFileHandle>
  getDirectoryHandle(name: string): Promise<WorkspaceDirectoryHandle>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, WorkspaceFileHandle | WorkspaceDirectoryHandle]>
}

const MAIN_BRANCH = 'main'
const MANIFEST_FILE = 'manifest_v2.json'

const token = ref('')
const showToken = ref(false)
const verifying = ref(false)
const currentUser = ref('')
const userAvatar = ref('')

const activeTab = ref('publish')

const workspaceHandle = ref<WorkspaceDirectoryHandle | null>(null)
const workspaceName = ref('')
const manifestFound = ref(false)
const manifestText = ref('')
const mediaFiles = ref<Array<{ path: string; file: File }>>([])
const downloadFiles = ref<Array<{ path: string; file: File }>>([])

const repoName = ref('')
const repoDescription = ref('')
const itemId = ref('')
const itemName = ref('')
const restype = ref('quick_app')
const paidType = ref('')
const tagsText = ref('')
const devicesText = ref('')
const iconPath = ref('')
const coverPath = ref('')

const upstreamOwner = ref('AstralSightStudios')
const upstreamRepo = ref('ABRepo-TestEnv')
const targetOwner = ref('AstralSightStudios')
const targetRepo = ref('ABRepo-TestEnv')
const catalogPath = ref('index_v2.csv')

const prTitle = ref('[ABCC] Add new resource')
const prBody = ref('')
const latestPrUrl = ref('')

const publishing = ref(false)
const publishLogs = ref<string[]>([])

const reviewLoading = ref(false)
const reviewItems = ref<PublishingResource[]>([])

const ownedLoading = ref(false)
const ownedItems = ref<CatalogEntry[]>([])

const canLoadList = computed(() => Boolean(token.value.trim() && currentUser.value))
const canPublish = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        workspaceHandle.value &&
        repoName.value.trim() &&
        itemId.value.trim() &&
        itemName.value.trim() &&
        catalogPath.value.trim()
    )
)

const publishLogsText = computed(() => (publishLogs.value.length ? publishLogs.value.join('\n') : '暂无日志'))

const appendLog = (message: string): void => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  publishLogs.value = [`[${time}] ${message}`, ...publishLogs.value].slice(0, 200)
}

const requireToken = (): string => {
  const value = token.value.trim()
  if (!value) throw new Error('请先输入 GitHub Token')
  return value
}

const handleVerifyToken = async (): Promise<void> => {
  try {
    verifying.value = true
    const user = await verifyToken(requireToken())
    currentUser.value = user.login
    userAvatar.value = user.avatar_url
    appendLog(`Token 校验成功: ${user.login}`)
  } catch (error: unknown) {
    appendLog(`Token 校验失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    verifying.value = false
  }
}

const selectWorkspace = async (): Promise<void> => {
  try {
    if (!window.showDirectoryPicker) {
      throw new Error('当前浏览器不支持 FSA API')
    }
    const handle = (await window.showDirectoryPicker({
      id: 'resource-workspace',
      mode: 'read'
    })) as unknown as WorkspaceDirectoryHandle
    workspaceHandle.value = handle
    workspaceName.value = handle.name
    appendLog(`已选择工作区: ${handle.name}`)
    await scanWorkspace()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择工作区失败: ${error instanceof Error ? error.message : '未知错误'}`)
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

const getDirectoryByPath = async (
  root: WorkspaceDirectoryHandle,
  relativePath: string
): Promise<WorkspaceDirectoryHandle | null> => {
  const parts = relativePath.split('/').filter(Boolean)
  let current = root
  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part)
    } catch {
      return null
    }
  }
  return current
}

const collectFilesRecursively = async (
  dir: WorkspaceDirectoryHandle,
  prefix = ''
): Promise<Array<{ path: string; file: File }>> => {
  const result: Array<{ path: string; file: File }> = []

  for await (const [name, handle] of dir) {
    if (handle.kind === 'file') {
      const file = await (handle as WorkspaceFileHandle).getFile()
      result.push({
        path: `${prefix}${name}`,
        file
      })
    } else {
      const nested = await collectFilesRecursively(
        handle as WorkspaceDirectoryHandle,
        `${prefix}${name}/`
      )
      result.push(...nested)
    }
  }

  return result
}

const scanWorkspace = async (): Promise<void> => {
  if (!workspaceHandle.value) return

  try {
    const manifest = await readFileTextByPath(workspaceHandle.value, MANIFEST_FILE)
    manifestFound.value = Boolean(manifest)
    manifestText.value = manifest || ''

    const mediaDir = await getDirectoryByPath(workspaceHandle.value, 'media')
    mediaFiles.value = mediaDir ? await collectFilesRecursively(mediaDir, 'media/') : []

    const downloadsDir = await getDirectoryByPath(workspaceHandle.value, 'downloads')
    downloadFiles.value = downloadsDir ? await collectFilesRecursively(downloadsDir, 'downloads/') : []

    if (manifest) {
      try {
        const parsed = JSON.parse(manifest) as {
          item?: { id?: string; name?: string; restype?: string; icon?: string; cover?: string }
          downloads?: Record<string, unknown>
        }
        itemId.value = itemId.value || parsed.item?.id || ''
        itemName.value = itemName.value || parsed.item?.name || ''
        restype.value = restype.value || parsed.item?.restype || 'quick_app'
        iconPath.value = iconPath.value || parsed.item?.icon || ''
        coverPath.value = coverPath.value || parsed.item?.cover || ''

        if (!devicesText.value && parsed.downloads) {
          devicesText.value = Object.keys(parsed.downloads).join(';')
        }
      } catch {
        appendLog('manifest_v2.json 不是合法 JSON，将按原文上传')
      }
    }

    appendLog(`目录扫描完成：media ${mediaFiles.value.length} 个，downloads ${downloadFiles.value.length} 个`)
  } catch (error: unknown) {
    appendLog(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const handlePublish = async (): Promise<void> => {
  if (!workspaceHandle.value) return

  try {
    publishing.value = true
    latestPrUrl.value = ''

    const accessToken = requireToken()
    const username = currentUser.value
    if (!username) {
      throw new Error('请先校验 Token')
    }

    const repo = await ensureUserRepository({
      token: accessToken,
      owner: username,
      repoName: repoName.value.trim(),
      description: repoDescription.value.trim()
    })
    appendLog(`资源仓库就绪: ${repo.owner}/${repo.name}`)

    const uploadQueue: Array<{ path: string; file?: File; text?: string }> = []
    if (manifestText.value) {
      uploadQueue.push({
        path: MANIFEST_FILE,
        text: manifestText.value
      })
    }
    uploadQueue.push(...mediaFiles.value.map(item => ({ path: item.path, file: item.file })))
    uploadQueue.push(...downloadFiles.value.map(item => ({ path: item.path, file: item.file })))

    if (uploadQueue.length === 0) {
      throw new Error('没有可上传文件，请先选择并扫描工作区')
    }

    let latestCommitSha = ''

    for (const item of uploadQueue) {
      const oldFile = await fetchRepoFileOrNull(
        accessToken,
        repo.owner,
        repo.name,
        item.path,
        MAIN_BRANCH
      )

      const contentBase64 = item.file
        ? arrayBufferToBase64(await item.file.arrayBuffer())
        : textToBase64(item.text || '')

      const result = await putRepoFile({
        token: accessToken,
        owner: repo.owner,
        repo: repo.name,
        path: item.path,
        branch: MAIN_BRANCH,
        message: `sync: ${item.path}`,
        contentBase64,
        sha: oldFile?.sha
      })

      latestCommitSha = result.commit.sha
      appendLog(`上传完成: ${item.path}`)
    }

    if (!latestCommitSha) {
      throw new Error('未获取到 commit sha')
    }

    const branchName = `astrobooox-submit-${Date.now()}`
    const forkResult = await updateCatalogInForkBranch({
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
        restype: restype.value.trim(),
        repo_owner: repo.owner,
        repo_name: repo.name,
        repo_commit_hash: latestCommitSha,
        icon: iconPath.value.trim(),
        cover: coverPath.value.trim(),
        tags: tagsText.value.trim(),
        device_vendors: '',
        devices: devicesText.value.trim(),
        paid_type: paidType.value.trim()
      }
    })
    appendLog(`Catalog 更新完成: ${forkResult.forkOwner}/${forkResult.forkRepo}@${forkResult.branch}`)

    const pr = await createPullRequestWithHead({
      token: accessToken,
      baseOwner: targetOwner.value.trim(),
      baseRepo: targetRepo.value.trim(),
      baseBranch: MAIN_BRANCH,
      headOwner: forkResult.forkOwner,
      headBranch: forkResult.branch,
      title: prTitle.value.trim(),
      body: prBody.value.trim() || undefined
    })

    latestPrUrl.value = pr.htmlUrl
    appendLog(`PR 创建成功: #${pr.number}`)
  } catch (error: unknown) {
    appendLog(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    publishing.value = false
  }
}

const loadReviewList = async (): Promise<void> => {
  try {
    reviewLoading.value = true
    reviewItems.value = await loadInProgressResources({
      token: requireToken(),
      username: currentUser.value,
      targetOwner: targetOwner.value.trim(),
      targetRepo: targetRepo.value.trim(),
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
</script>
