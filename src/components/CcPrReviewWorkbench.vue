<template>
  <div class="w-full py-1 md:py-2">
    <div class="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
      <aside :class="sidebarClass">
        <div
          class="mb-2 hidden items-center border-b border-border pb-2 lg:flex"
          :class="isSidebarCollapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2'"
        >
          <div v-if="!isSidebarCollapsed" class="min-w-0">
            <p class="truncate text-xs font-semibold text-foreground">Pull Requests</p>
          </div>
          <div class="flex items-center gap-1.5" :class="isSidebarCollapsed ? 'flex-col gap-2' : ''">
            <Button
              v-if="!isSidebarCollapsed"
              :disabled="loading || !canLoad"
              size="sm"
              variant="outline"
              @click="loadPullRequests"
            >
              <ArrowsClockwise :size="14" weight="duotone" />
              <span>{{ loading ? '加载中' : '刷新' }}</span>
            </Button>
            <button
              type="button"
              :title="isSidebarCollapsed ? '展开边栏' : '收起边栏'"
              class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              :class="isSidebarCollapsed ? 'w-8' : 'w-[72px] gap-1.5 px-2'"
              aria-label="折叠或展开边栏"
              @click="isSidebarCollapsed = !isSidebarCollapsed"
            >
              <span v-if="!isSidebarCollapsed" class="shrink-0 whitespace-nowrap text-xs">收起</span>
              <CaretDoubleRight
                :size="16"
                weight="bold"
                :class="['transition-transform duration-200', isSidebarCollapsed ? 'rotate-180' : 'rotate-0']"
              />
            </button>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="pullRequests.length === 0 && !loading && !errorMessage"
          class="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
        >
          暂无可审核 PR
        </div>

        <div v-else class="flex-1 space-y-2 overflow-y-auto pr-1 max-[1023px]:max-h-[20rem]">
          <button
            v-for="item in pullRequests"
            :key="item.number"
            type="button"
            class="group flex items-center rounded-lg border text-left transition-colors"
            :class="
              selectedPr?.number === item.number
                ? isSidebarCollapsed
                  ? 'mx-auto h-12 w-12 justify-center p-1.5 border-border bg-muted shadow-sm'
                  : 'w-full gap-2.5 px-2.5 py-2 border-border bg-muted shadow-sm'
                : isSidebarCollapsed
                  ? 'mx-auto h-12 w-12 justify-center p-1.5 border-transparent hover:bg-accent'
                  : 'w-full gap-2.5 px-2.5 py-2 border-transparent hover:bg-accent'
            "
            @click="selectPr(item)"
          >
            <img
              :src="getOptimizedAvatarUrl(item.author, item.authorAvatar)"
              :class="isSidebarCollapsed ? 'h-10 w-10 rounded-md' : 'h-8 w-8 rounded-md'"
              class="shrink-0 object-cover"
              loading="lazy"
              @load="cacheAvatar(item.author, item.authorAvatar)"
            />

            <div v-if="!isSidebarCollapsed" class="min-w-0 flex-1">
              <div class="line-clamp-2 text-sm font-semibold text-foreground">#{{ item.number }} {{ item.title }}</div>
              <div class="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{{ item.author }}</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <div class="min-w-0 flex-1 space-y-4">
        <Card v-if="!selectedPr">
          <CardContent class="pt-6 text-center text-sm text-muted-foreground">
            请先从左侧选择一个 PR
          </CardContent>
        </Card>

        <template v-else>
          <header class="rounded-xl border border-border bg-card p-5 md:p-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 space-y-3">
                <div class="flex flex-wrap items-end gap-x-2 gap-y-1">
                  <h1 class="min-w-0 break-words text-xl font-semibold leading-tight text-foreground md:text-2xl">
                    {{ selectedPr.title }}
                  </h1>
                  <span class="text-sm font-medium text-muted-foreground md:text-base">#{{ selectedPr.number }}</span>
                </div>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Badge variant="secondary" class="h-6 gap-1.5 rounded-full px-2.5 text-xs">
                    <GitPullRequest :size="14" weight="duotone" class="shrink-0" />
                    Open
                  </Badge>
                  <span class="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <img
                      :src="getOptimizedAvatarUrl(selectedPr.author, selectedPr.authorAvatar)"
                      class="h-6 w-6 shrink-0 rounded-full object-cover"
                      loading="lazy"
                      @load="cacheAvatar(selectedPr.author, selectedPr.authorAvatar)"
                    />
                    <span class="truncate font-medium text-foreground">{{ selectedPr.author }}</span>
                    <span class="shrink-0">opened {{ formatDate(selectedPr.createdAt) }}</span>
                  </span>
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-2 md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-9 gap-1.5 px-3"
                  :disabled="detailsLoading"
                  @click="refreshSelectedPrDetails"
                >
                  <ArrowsClockwise :size="16" weight="bold" />
                  刷新
                </Button>
                <Button
                  as="a"
                  :href="selectedPr.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="sm"
                  class="h-9 gap-1.5 px-3"
                >
                  <GithubLogo :size="16" weight="duotone" />
                  GitHub
                </Button>
              </div>
            </div>
          </header>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">审核评论</CardTitle>
              <CardDescription>支持预设格式：ABCC_NEEDFIX / ABCC_FIXED</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 pt-0">
              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  :variant="commentType === 'NEEDFIX' ? 'default' : 'outline'"
                  @click="commentType = 'NEEDFIX'"
                >
                  ABCC_NEEDFIX
                </Button>
                <Button
                  size="sm"
                  :variant="commentType === 'FIXED' ? 'default' : 'outline'"
                  @click="commentType = 'FIXED'"
                >
                  ABCC_FIXED
                </Button>
              </div>

              <div class="grid gap-2 md:grid-cols-2">
                <Input v-model="commentId" placeholder="评论 ID，例如 icon_png_check" />
                <Input v-model="commentMessage" placeholder="评论说明，例如图片比例不合规" />
              </div>

              <Textarea
                :model-value="commentBodyPreview"
                readonly
                class="min-h-[88px] font-mono text-xs"
              />

              <div class="flex items-center gap-2">
                <Button
                  size="sm"
                  :disabled="commentSubmitting || !commentBodyPreview"
                  @click="submitPresetComment"
                >
                  {{ commentSubmitting ? '发送中...' : '发送评论' }}
                </Button>
              </div>

              <div v-if="detailsError" class="text-xs text-destructive">{{ detailsError }}</div>

              <div class="space-y-2">
                <div class="text-xs font-medium text-muted-foreground">最近评论</div>
                <div
                  v-if="prComments.length === 0"
                  class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
                >
                  当前 PR 暂无评论
                </div>
                <div
                  v-for="comment in prComments"
                  :key="comment.id"
                  class="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div class="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{{ comment.user?.login || 'unknown' }} · {{ formatDate(comment.created_at) }}</span>
                    <a :href="comment.html_url" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                      打开评论
                    </a>
                  </div>
                  <div class="whitespace-pre-wrap break-words text-foreground">{{ comment.body }}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">变更文件</CardTitle>
              <CardDescription>快速打开 GitHub / Raw 链接检查图片和资源文件</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 pt-0 text-sm">
              <div v-if="detailsLoading" class="text-xs text-muted-foreground">正在加载文件变更...</div>
              <div
                v-else-if="prFiles.length === 0"
                class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
              >
                当前 PR 没有可展示的文件变更
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="file in prFiles"
                  :key="file.sha"
                  class="rounded-md border border-border px-3 py-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="truncate font-medium text-foreground">{{ file.filename }}</div>
                      <div class="text-xs text-muted-foreground">
                        {{ file.status }} · +{{ file.additions }} / -{{ file.deletions }} · {{ file.changes }} changes
                      </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" @click="applyFileNeedFixTemplate(file.filename)">
                        设为 NEEDFIX
                      </Button>
                      <a
                        v-if="file.blob_url"
                        :href="file.blob_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-primary hover:underline"
                      >
                        GitHub
                      </a>
                      <a
                        v-if="file.raw_url && isImageFile(file.filename)"
                        :href="file.raw_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-primary hover:underline"
                      >
                        预览图
                      </a>
                      <a
                        v-if="file.raw_url && !isImageFile(file.filename)"
                        :href="file.raw_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-primary hover:underline"
                      >
                        Raw
                      </a>
                    </div>
                  </div>
                  <pre
                    v-if="file.patch"
                    class="mt-2 max-h-44 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground"
                  >{{ file.patch }}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretDoubleRight as CaretDoubleRight,
  PhGithubLogo as GithubLogo,
  PhGitPullRequest as GitPullRequest
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

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
  author: string
  authorAvatar: string
  createdAt: string
  url: string
  headOwner: string
  headRepo: string
  headRef: string
  status: ReviewState
  review: ReviewStatusResult
}

interface IssueCommentItem {
  id: number
  body: string
  user?: { login?: string; avatar_url?: string; html_url?: string }
  created_at: string
  html_url: string
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

const props = withDefaults(defineProps<{
  owner: string
  repo: string
  token: string
}>(), {
  owner: 'AstralSightStudios',
  repo: 'AstroBox-Repo',
  token: ''
})

const loading = ref(false)
const errorMessage = ref('')
const pullRequests = ref<PullListItem[]>([])
const selectedPr = ref<PullListItem | null>(null)
const isSidebarCollapsed = ref(false)
const detailsLoading = ref(false)
const detailsError = ref('')
const prComments = ref<IssueCommentItem[]>([])
const prFiles = ref<PullFileItem[]>([])
const commentType = ref<'NEEDFIX' | 'FIXED'>('NEEDFIX')
const commentId = ref('')
const commentMessage = ref('')
const commentSubmitting = ref(false)

const canLoad = computed(() => Boolean(props.owner.trim() && props.repo.trim() && props.token.trim()))
const sidebarClass = computed(() => [
  'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
  isSidebarCollapsed.value
    ? 'w-full p-2.5 lg:w-[5.2rem] lg:p-2.5'
    : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
])
const avatarCache = new Map<string, string>()

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const getOptimizedAvatarUrl = (login: string, avatarUrl: string): string => {
  if (avatarCache.has(login)) {
    return avatarCache.get(login)!
  }
  const cachedUrl = localStorage.getItem(`avatar_${login}`)
  if (cachedUrl) {
    avatarCache.set(login, cachedUrl)
    return cachedUrl
  }
  let url = avatarUrl
  if (url.includes('githubusercontent.com')) {
    url += (url.includes('?') ? '&' : '?') + 's=64&q=70'
  }
  avatarCache.set(login, url)
  return url
}

const cacheAvatar = (login: string, avatarUrl: string): void => {
  const url = getOptimizedAvatarUrl(login, avatarUrl)
  localStorage.setItem(`avatar_${login}`, url)
}

const isImageFile = (filename: string): boolean => /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i.test(filename)
const normalizeCommentId = (value: string): string => value.trim().replace(/\s+/g, '_').replace(/\]/g, '')
const commentBodyPreview = computed(() => {
  const id = normalizeCommentId(commentId.value)
  const msg = commentMessage.value.trim()
  if (!id) return ''
  return `[ABCC_${commentType.value}_${id}] ${msg}`.trim()
})

async function githubGet<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${props.token.trim()}`
    }
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `GitHub API ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function githubPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${props.token.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `GitHub API ${response.status}`)
  }
  return response.json() as Promise<T>
}

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

  const hasUnresolved = items.some(item => !item.fixed)
  return {
    state: hasUnresolved ? 'changes_requested' : 'fixed_waiting',
    items
  }
}

const loadPullRequests = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''
  try {
    if (!canLoad.value) throw new Error('请先登录并配置目标仓库')

    const pulls = await githubGet<Array<{
      number: number
      title: string
      html_url: string
      created_at: string
      user?: { login?: string; avatar_url?: string }
      head?: { ref?: string; repo?: { name?: string; owner?: { login?: string } } }
    }>>(`/repos/${props.owner}/${props.repo}/pulls?state=open&per_page=50`)

    const list: PullListItem[] = []
    for (const pr of pulls) {
      const comments = await githubGet<Array<{ body?: string }>>(
        `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
      )
      const review = deriveReviewStatus(comments)
      const headOwner = pr.head?.repo?.owner?.login || ''
      const headRepo = pr.head?.repo?.name || ''
      const headRef = pr.head?.ref || 'main'
      list.push({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login || 'unknown',
        authorAvatar: pr.user?.avatar_url || '',
        createdAt: pr.created_at,
        url: pr.html_url,
        headOwner,
        headRepo,
        headRef,
        status: review.state,
        review
      })
    }
    pullRequests.value = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (pullRequests.value.length > 0) {
      await selectPr(pullRequests.value[0])
    } else {
      selectedPr.value = null
      prComments.value = []
      prFiles.value = []
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '加载 PR 失败'
    pullRequests.value = []
    selectedPr.value = null
  } finally {
    loading.value = false
  }
}

const loadPrDetails = async (pr: PullListItem): Promise<void> => {
  detailsLoading.value = true
  detailsError.value = ''
  try {
    const [comments, files] = await Promise.all([
      githubGet<IssueCommentItem[]>(
        `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
      ),
      githubGet<PullFileItem[]>(
        `/repos/${props.owner}/${props.repo}/pulls/${pr.number}/files?per_page=100`
      )
    ])
    prComments.value = comments
    prFiles.value = files
  } catch (error: unknown) {
    detailsError.value = error instanceof Error ? error.message : '加载 PR 详情失败'
    prComments.value = []
    prFiles.value = []
  } finally {
    detailsLoading.value = false
  }
}

const selectPr = async (pr: PullListItem): Promise<void> => {
  selectedPr.value = pr
  await loadPrDetails(pr)
}

const refreshSelectedPrDetails = async (): Promise<void> => {
  if (!selectedPr.value) return
  await loadPrDetails(selectedPr.value)
}

const applyFileNeedFixTemplate = (filename: string): void => {
  commentType.value = 'NEEDFIX'
  commentId.value = normalizeCommentId(filename)
  commentMessage.value = `请检查文件 ${filename} 的改动`
}

const submitPresetComment = async (): Promise<void> => {
  if (!selectedPr.value) return
  const body = commentBodyPreview.value
  if (!body) {
    detailsError.value = '评论 ID 不能为空'
    return
  }
  commentSubmitting.value = true
  detailsError.value = ''
  try {
    await githubPost(
      `/repos/${props.owner}/${props.repo}/issues/${selectedPr.value.number}/comments`,
      { body }
    )
    commentMessage.value = ''
    await loadPrDetails(selectedPr.value)
    await loadPullRequests()
  } catch (error: unknown) {
    detailsError.value = error instanceof Error ? error.message : '评论发送失败'
  } finally {
    commentSubmitting.value = false
  }
}

watch(
  () => [props.owner, props.repo, props.token] as const,
  () => {
    void loadPullRequests()
  },
  { immediate: true }
)
</script>
