<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <CardTitle class="inline-flex items-center gap-2 text-base md:text-lg">
          <RocketLaunch :size="18" weight="duotone" />
          资源发布向导
        </CardTitle>
        <CardDescription class="text-sm leading-6">
          仿照 secret 的流程式发布：准备环境 → 填写信息 → 上传资源仓库 → 更新 Catalog 并创建 PR。
        </CardDescription>
      </CardHeader>
      <CardContent class="pt-0">
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <div
            class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
          >
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
          <Badge variant="outline">当前步骤: {{ flowSteps[activeStep].title }}</Badge>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card class="xl:sticky xl:top-[84px] xl:self-start">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">发布流程</CardTitle>
          <CardDescription>按步骤执行，减少漏填和失败重试。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 pt-0">
          <button
            v-for="(step, index) in flowSteps"
            :key="step.title"
            type="button"
            class="w-full rounded-lg border px-3 py-2 text-left transition"
            :class="stepButtonClass(index)"
            @click="enterStep(index)"
          >
            <div class="flex items-start gap-2">
              <span class="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <CheckCircle v-if="stepStatus(index) === 'done'" :size="15" weight="fill" />
                <ClockCountdown v-else-if="stepStatus(index) === 'current'" :size="15" weight="duotone" />
                <Circle v-else :size="15" weight="duotone" />
              </span>
              <span>
                <span class="block text-sm font-medium">{{ step.title }}</span>
                <span class="block text-xs text-muted-foreground">{{ step.description }}</span>
              </span>
            </div>
          </button>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <Card v-if="activeStep === 0">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">步骤 1 · 准备环境</CardTitle>
            <CardDescription>校验 GitHub Token 并选择 FSA 资源目录。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
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

            <div class="space-y-3 rounded-lg border border-border bg-muted/25 p-3">
              <div class="flex flex-wrap items-center gap-2">
                <Button :disabled="isBusy" @click="selectWorkspace">
                  <FolderOpen :size="16" weight="duotone" />
                  选择资源目录
                </Button>
                <Button variant="outline" :disabled="isBusy || !workspaceHandle" @click="scanWorkspace">
                  <ArrowsClockwise :size="16" weight="duotone" />
                  扫描目录
                </Button>
                <span class="text-sm text-muted-foreground">当前目录: {{ workspaceName || '未选择' }}</span>
              </div>

              <div class="grid gap-2 md:grid-cols-3">
                <div class="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  manifest_v2.json: {{ manifestFound ? '已找到' : '未找到' }}
                </div>
                <div class="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  media 文件: {{ mediaFiles.length }}
                </div>
                <div class="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  downloads 文件: {{ downloadFiles.length }}
                </div>
              </div>
            </div>
          </CardContent>
          <CardContent class="flex justify-end border-t border-border pt-4">
            <Button :disabled="!isStep1Ready" @click="goNext">
              下一步
              <CaretRight :size="14" weight="bold" />
            </Button>
          </CardContent>
        </Card>

        <Card v-else-if="activeStep === 1">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">步骤 2 · 填写资源信息</CardTitle>
            <CardDescription>填写 manifest 对应信息与资源仓库参数。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
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
                <Label for="repo-name">资源仓库名（可选）</Label>
                <Input id="repo-name" v-model="repoName" placeholder="留空时按 ID 自动生成" />
              </div>
              <div class="space-y-1.5">
                <Label for="repo-desc">仓库描述（可选）</Label>
                <Input id="repo-desc" v-model="repoDescription" placeholder="resource repository" />
              </div>
            </div>

            <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
              上传目标仓库: {{ currentUser || '--' }}/{{ resolvedRepoName || '--' }}
            </div>
          </CardContent>
          <CardContent class="flex justify-between border-t border-border pt-4">
            <Button variant="outline" @click="goPrev">
              <CaretLeft :size="14" weight="bold" />
              上一步
            </Button>
            <Button :disabled="!isStep2Ready" @click="goNext">
              下一步
              <CaretRight :size="14" weight="bold" />
            </Button>
          </CardContent>
        </Card>

        <Card v-else-if="activeStep === 2">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">步骤 3 · 上传资源仓库</CardTitle>
            <CardDescription>创建或复用仓库，并上传 manifest、media、downloads。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div class="grid gap-2 md:grid-cols-3">
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                仓库: {{ currentUser || '--' }}/{{ resolvedRepoName || '--' }}
              </div>
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                待上传文件: {{ uploadQueueCount }}
              </div>
              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                分支: {{ MAIN_BRANCH }}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <Button :disabled="uploading || !isStep2Ready" @click="handleUploadResources">
                <UploadSimple :size="16" weight="duotone" />
                {{ uploading ? '上传中...' : '创建仓库并上传' }}
              </Button>
              <span v-if="uploadedCommitSha" class="text-sm text-muted-foreground">
                最新 Commit: {{ uploadedCommitSha.slice(0, 10) }}
              </span>
            </div>

            <div v-if="uploadedRepoUrl" class="rounded-lg border border-border bg-muted/25 p-3 text-sm">
              <p class="font-medium text-foreground">仓库已就绪</p>
              <a
                :href="uploadedRepoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="break-all text-primary hover:underline"
              >
                {{ uploadedRepoUrl }}
              </a>
            </div>
          </CardContent>
          <CardContent class="flex justify-between border-t border-border pt-4">
            <Button variant="outline" @click="goPrev">
              <CaretLeft :size="14" weight="bold" />
              上一步
            </Button>
            <Button :disabled="!isStep3Ready" @click="goNext">
              下一步
              <CaretRight :size="14" weight="bold" />
            </Button>
          </CardContent>
        </Card>

        <Card v-else>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">步骤 4 · 更新 Catalog 并创建 PR</CardTitle>
            <CardDescription>向目录仓库提交 catalog 变更并创建 PR。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
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
              <Button :disabled="creatingPr || !isStep3Ready || !canSubmitPr" @click="handleCreateCatalogPr">
                <GitPullRequest :size="16" weight="duotone" />
                {{ creatingPr ? '创建中...' : '更新 Catalog 并创建 PR' }}
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
          <CardContent class="flex justify-between border-t border-border pt-4">
            <Button variant="outline" @click="goPrev">
              <CaretLeft :size="14" weight="bold" />
              上一步
            </Button>
            <Button variant="secondary" :disabled="!latestPrUrl" @click="refreshAllLists">
              <ArrowsClockwise :size="15" weight="duotone" />
              刷新状态列表
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
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
          <div
            v-if="reviewItems.length === 0"
            class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
          >
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
          <div
            v-if="ownedItems.length === 0"
            class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
          >
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
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretLeft as CaretLeft,
  PhCaretRight as CaretRight,
  PhCheckCircle as CheckCircle,
  PhCircle as Circle,
  PhClockCountdown as ClockCountdown,
  PhEye as Eye,
  PhFolderOpen as FolderOpen,
  PhGitPullRequest as GitPullRequest,
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

const flowSteps = [
  { title: '步骤 1 · 准备环境', description: '校验 Token 与扫描目录' },
  { title: '步骤 2 · 填写资源信息', description: '确认资源信息与仓库参数' },
  { title: '步骤 3 · 上传资源仓库', description: '上传 manifest/media/downloads' },
  { title: '步骤 4 · Catalog 与 PR', description: '更新目录并创建 PR' }
] as const

const activeStep = ref(0)

const token = ref('')
const showToken = ref(false)
const verifying = ref(false)
const currentUser = ref('')
const userAvatar = ref('')

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

const uploading = ref(false)
const creatingPr = ref(false)
const publishLogs = ref<string[]>([])

const uploadedRepoOwner = ref('')
const uploadedRepoName = ref('')
const uploadedRepoUrl = ref('')
const uploadedCommitSha = ref('')

const reviewLoading = ref(false)
const reviewItems = ref<PublishingResource[]>([])

const ownedLoading = ref(false)
const ownedItems = ref<CatalogEntry[]>([])

const isBusy = computed(() => verifying.value || uploading.value || creatingPr.value)
const canLoadList = computed(() => Boolean(token.value.trim() && currentUser.value))

const isStep1Ready = computed(
  () => Boolean(token.value.trim() && currentUser.value && workspaceHandle.value && manifestFound.value)
)

const resolvedRepoName = computed(() => {
  const manual = repoName.value.trim()
  if (manual) return manual

  const slug = itemId.value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug ? `ab-resource-${slug}` : ''
})

const isStep2Ready = computed(
  () => Boolean(isStep1Ready.value && itemId.value.trim() && itemName.value.trim() && resolvedRepoName.value)
)

const uploadQueueCount = computed(
  () => (manifestText.value ? 1 : 0) + mediaFiles.value.length + downloadFiles.value.length
)

const isStep3Ready = computed(
  () => Boolean(uploadedRepoOwner.value && uploadedRepoName.value && uploadedCommitSha.value)
)

const canSubmitPr = computed(
  () =>
    Boolean(
      upstreamOwner.value.trim() &&
        upstreamRepo.value.trim() &&
        targetOwner.value.trim() &&
        targetRepo.value.trim() &&
        catalogPath.value.trim() &&
        prTitle.value.trim()
    )
)

const publishLogsText = computed(() =>
  publishLogs.value.length ? publishLogs.value.join('\n') : '暂无日志'
)

const appendLog = (message: string): void => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  publishLogs.value = [`[${time}] ${message}`, ...publishLogs.value].slice(0, 200)
}

const requireToken = (): string => {
  const value = token.value.trim()
  if (!value) throw new Error('请先输入 GitHub Token')
  return value
}

const stepStatus = (index: number): 'done' | 'current' | 'pending' | 'locked' => {
  if (index < activeStep.value) return 'done'
  if (index === activeStep.value) return 'current'
  if (canEnterStep(index)) return 'pending'
  return 'locked'
}

const stepButtonClass = (index: number): string => {
  const status = stepStatus(index)
  if (status === 'done') return 'border-border bg-muted/30 text-foreground'
  if (status === 'current') return 'border-primary/35 bg-primary/5 text-foreground'
  if (status === 'pending') return 'border-border bg-background hover:bg-muted/30 text-foreground'
  return 'border-border bg-muted/20 text-muted-foreground'
}

const canEnterStep = (index: number): boolean => {
  if (index === 0) return true
  if (index === 1) return isStep1Ready.value
  if (index === 2) return isStep2Ready.value
  if (index === 3) return isStep3Ready.value
  return false
}

const enterStep = (index: number): void => {
  if (index <= activeStep.value || canEnterStep(index)) {
    activeStep.value = index
    return
  }

  appendLog('请先完成前置步骤')
}

const goPrev = (): void => {
  activeStep.value = Math.max(0, activeStep.value - 1)
}

const goNext = (): void => {
  const next = activeStep.value + 1
  if (next > flowSteps.length - 1) return

  if (!canEnterStep(next)) {
    if (activeStep.value === 0) {
      appendLog('步骤 1 未完成：请先校验 Token 并扫描到 manifest_v2.json')
    } else if (activeStep.value === 1) {
      appendLog('步骤 2 未完成：请补全资源 ID、资源名称和仓库名')
    } else {
      appendLog('步骤 3 未完成：请先执行资源上传')
    }
    return
  }

  activeStep.value = next
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
    downloadFiles.value = downloadsDir
      ? await collectFilesRecursively(downloadsDir, 'downloads/')
      : []

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

    uploadedRepoOwner.value = ''
    uploadedRepoName.value = ''
    uploadedRepoUrl.value = ''
    uploadedCommitSha.value = ''
    latestPrUrl.value = ''

    appendLog(`目录扫描完成：media ${mediaFiles.value.length} 个，downloads ${downloadFiles.value.length} 个`)
  } catch (error: unknown) {
    appendLog(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const resolveRepoNameForSubmit = (): string => {
  const name = resolvedRepoName.value.trim()
  if (!name) {
    throw new Error('无法生成仓库名，请填写资源 ID 或手动输入仓库名')
  }
  return name
}

const handleUploadResources = async (): Promise<void> => {
  if (!workspaceHandle.value) return

  try {
    uploading.value = true
    latestPrUrl.value = ''

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

    uploadedRepoOwner.value = repo.owner
    uploadedRepoName.value = repo.name
    uploadedRepoUrl.value = repo.htmlUrl
    uploadedCommitSha.value = latestCommitSha
    appendLog(`上传步骤完成，commit: ${latestCommitSha.slice(0, 10)}`)
  } catch (error: unknown) {
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
      throw new Error('请先完成步骤 3 上传资源')
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
        repo_owner: uploadedRepoOwner.value,
        repo_name: uploadedRepoName.value,
        repo_commit_hash: uploadedCommitSha.value,
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

const refreshAllLists = async (): Promise<void> => {
  await Promise.all([loadReviewList(), loadOwnedList()])
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
