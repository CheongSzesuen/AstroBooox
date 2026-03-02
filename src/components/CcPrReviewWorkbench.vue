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
              <CardTitle class="text-base">审核标记</CardTitle>
              <CardDescription>解析评论中的 ABCC_NEEDFIX / ABCC_FIXED</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2 pt-0">
              <div
                v-if="selectedPr.review.items.length === 0"
                class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
              >
                暂无 NEEDFIX 标记
              </div>
              <div
                v-for="item in selectedPr.review.items"
                :key="item.id"
                class="rounded-md border border-border px-3 py-2 text-sm"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="font-medium text-foreground">{{ item.id }}</div>
                  <Badge :variant="item.fixed ? 'default' : 'outline'">{{ item.fixed ? '已修复' : '未修复' }}</Badge>
                </div>
                <div class="mt-1 text-muted-foreground">{{ item.message || '无说明' }}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">资源整合视图（v1 + v2）</CardTitle>
              <CardDescription>基于 PR head 分支中的 manifest.json 与 manifest_v2.json</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 pt-0 text-sm">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 font-semibold text-foreground">v2（manifest_v2.json）</div>
                  <div class="space-y-1 text-muted-foreground">
                    <div>id：{{ merged.v2.id || '--' }}</div>
                    <div>name：{{ merged.v2.name || '--' }}</div>
                    <div>restype：{{ merged.v2.restype || '--' }}</div>
                    <div>author 数量：{{ merged.v2.authorCount }}</div>
                    <div>downloads 数量：{{ merged.v2.downloadCount }}</div>
                  </div>
                </div>
                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 font-semibold text-foreground">v1（manifest.json）</div>
                  <div class="space-y-1 text-muted-foreground">
                    <div>name：{{ merged.v1.name || '--' }}</div>
                    <div>source_url：{{ merged.v1.sourceUrl || '--' }}</div>
                    <div>author 数量：{{ merged.v1.authorCount }}</div>
                    <div>downloads 数量：{{ merged.v1.downloadCount }}</div>
                  </div>
                </div>
              </div>

              <div class="rounded-md border border-border p-3">
                <div class="mb-2 font-semibold text-foreground">一致性检查</div>
                <div class="space-y-1 text-muted-foreground">
                  <div>名称一致：{{ merged.nameAligned ? '是' : '否' }}</div>
                  <div>描述一致：{{ merged.descriptionAligned ? '是' : '否' }}</div>
                  <div>icon 一致：{{ merged.iconAligned ? '是' : '否' }}</div>
                  <div>cover 一致：{{ merged.coverAligned ? '是' : '否' }}</div>
                </div>
              </div>

              <div v-if="detailsLoading" class="text-xs text-muted-foreground">正在加载 manifest 信息...</div>
              <div v-if="detailsError" class="text-xs text-destructive">{{ detailsError }}</div>
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

interface ManifestV2 {
  item?: {
    id?: string
    name?: string
    restype?: string
    description?: string
    icon?: string
    cover?: string
    author?: Array<unknown>
  }
  downloads?: Record<string, unknown>
}

interface ManifestV1 {
  item?: {
    name?: string
    description?: string
    icon?: string
    cover?: string
    source_url?: string
    author?: Array<unknown>
  }
  downloads?: Record<string, unknown>
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
const manifestV2 = ref<ManifestV2 | null>(null)
const manifestV1 = ref<ManifestV1 | null>(null)

const canLoad = computed(() => Boolean(props.owner.trim() && props.repo.trim() && props.token.trim()))
const sidebarClass = computed(() => [
  'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
  isSidebarCollapsed.value
    ? 'w-full p-2.5 lg:w-[5.2rem] lg:p-2.5'
    : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
])
const avatarCache = new Map<string, string>()

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i

const reviewStateText = (state: ReviewState): string => {
  if (state === 'changes_requested') return '需要修改'
  if (state === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

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
      manifestV2.value = null
      manifestV1.value = null
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '加载 PR 失败'
    pullRequests.value = []
    selectedPr.value = null
  } finally {
    loading.value = false
  }
}

const readRepoJsonOrNull = async (owner: string, repo: string, ref: string, path: string): Promise<any | null> => {
  try {
    const file = await githubGet<{ content?: string }>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`
    )
    if (!file.content) return null
    const text = atob(file.content.replace(/\n/g, ''))
    return JSON.parse(text)
  } catch {
    return null
  }
}

const loadPrDetails = async (pr: PullListItem): Promise<void> => {
  detailsLoading.value = true
  detailsError.value = ''
  try {
    if (!pr.headOwner || !pr.headRepo) {
      throw new Error('PR head 仓库信息不完整')
    }
    const [v2, v1] = await Promise.all([
      readRepoJsonOrNull(pr.headOwner, pr.headRepo, pr.headRef, 'manifest_v2.json'),
      readRepoJsonOrNull(pr.headOwner, pr.headRepo, pr.headRef, 'manifest.json')
    ])
    manifestV2.value = v2
    manifestV1.value = v1
  } catch (error: unknown) {
    detailsError.value = error instanceof Error ? error.message : '加载 PR 详情失败'
    manifestV2.value = null
    manifestV1.value = null
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

const merged = computed(() => {
  const v2Item = manifestV2.value?.item || {}
  const v1Item = manifestV1.value?.item || {}

  const v2Name = (v2Item.name || '').trim()
  const v1Name = (v1Item.name || '').trim()
  const v2Desc = (v2Item.description || '').trim()
  const v1Desc = (v1Item.description || '').trim()
  const v2Icon = (v2Item.icon || '').trim()
  const v1Icon = (v1Item.icon || '').trim()
  const v2Cover = (v2Item.cover || '').trim()
  const v1Cover = (v1Item.cover || '').trim()

  return {
    v2: {
      id: (v2Item.id || '').trim(),
      name: v2Name,
      restype: (v2Item.restype || '').trim(),
      authorCount: Array.isArray(v2Item.author) ? v2Item.author.length : 0,
      downloadCount: manifestV2.value?.downloads ? Object.keys(manifestV2.value.downloads).length : 0
    },
    v1: {
      name: v1Name,
      sourceUrl: (v1Item.source_url || '').trim(),
      authorCount: Array.isArray(v1Item.author) ? v1Item.author.length : 0,
      downloadCount: manifestV1.value?.downloads ? Object.keys(manifestV1.value.downloads).length : 0
    },
    nameAligned: Boolean(v2Name && v1Name && v2Name === v1Name),
    descriptionAligned: Boolean(v2Desc && v1Desc && v2Desc === v1Desc),
    iconAligned: Boolean(v2Icon && v1Icon && v2Icon === v1Icon),
    coverAligned: Boolean(v2Cover && v1Cover && v2Cover === v1Cover)
  }
})

watch(
  () => [props.owner, props.repo, props.token] as const,
  () => {
    void loadPullRequests()
  },
  { immediate: true }
)
</script>
