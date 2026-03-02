<template>
  <div class="w-full">
    <div class="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card class="xl:sticky xl:top-[72px] xl:self-start">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between gap-2">
            <CardTitle class="text-base">PR 列表</CardTitle>
            <Button :disabled="loading || !canLoad" size="sm" @click="loadPullRequests">
              <ArrowsClockwise :size="14" weight="duotone" />
              {{ loading ? '加载中' : '刷新' }}
            </Button>
          </div>
          <CardDescription>{{ owner }}/{{ repo }}</CardDescription>
        </CardHeader>
        <CardContent class="pt-0">
          <div
            v-if="errorMessage"
            class="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {{ errorMessage }}
          </div>
          <div
            v-if="pullRequests.length === 0 && !loading && !errorMessage"
            class="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
          >
            暂无可审核 PR
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="item in pullRequests"
              :key="item.number"
              type="button"
              class="w-full rounded-lg border px-3 py-2 text-left transition"
              :class="
                selectedPr?.number === item.number
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border bg-card hover:bg-muted/30'
              "
              @click="selectPr(item)"
            >
              <div class="line-clamp-2 text-sm font-semibold text-foreground">#{{ item.number }} {{ item.title }}</div>
              <div class="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{{ item.author }}</span>
                <Badge variant="outline">{{ reviewStateText(item.status) }}</Badge>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <Card v-if="!selectedPr">
          <CardContent class="pt-6 text-center text-sm text-muted-foreground">
            请先从左侧选择一个 PR
          </CardContent>
        </Card>

        <template v-else>
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">PR 概览</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 pt-0 text-sm">
              <div class="font-semibold text-foreground">#{{ selectedPr.number }} {{ selectedPr.title }}</div>
              <div class="text-muted-foreground">作者：{{ selectedPr.author }}</div>
              <div class="text-muted-foreground">创建时间：{{ formatDate(selectedPr.createdAt) }}</div>
              <div class="text-muted-foreground">状态：{{ reviewStateText(selectedPr.status) }}</div>
              <a
                :href="selectedPr.url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex text-primary hover:underline"
              >
                在 GitHub 打开此 PR
              </a>
            </CardContent>
          </Card>

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
import { PhArrowsClockwise as ArrowsClockwise } from '@phosphor-icons/vue'
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
const detailsLoading = ref(false)
const detailsError = ref('')
const manifestV2 = ref<ManifestV2 | null>(null)
const manifestV1 = ref<ManifestV1 | null>(null)

const canLoad = computed(() => Boolean(props.owner.trim() && props.repo.trim() && props.token.trim()))

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
      user?: { login?: string }
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
