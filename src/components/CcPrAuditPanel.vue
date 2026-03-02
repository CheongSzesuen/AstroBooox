<template>
  <Card class="w-full">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between gap-2">
        <CardTitle class="text-base">PR 审核</CardTitle>
        <Button :disabled="loading || !canLoad" @click="load">
          <ArrowsClockwise :size="16" weight="duotone" />
          {{ loading ? '加载中...' : '刷新' }}
        </Button>
      </div>
      <CardDescription>目标仓库：{{ owner }}/{{ repo }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-2 pt-0">
      <div
        v-if="errorMessage"
        class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>
      <div
        v-if="items.length === 0 && !loading && !errorMessage"
        class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
      >
        暂无可审核 PR
      </div>
      <div
        v-for="item in items"
        :key="item.number"
        class="rounded-lg border border-border bg-card px-3 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-semibold text-foreground">#{{ item.number }} · {{ item.title }}</div>
          <Badge variant="outline">{{ reviewStateText(item.status) }}</Badge>
        </div>
        <div class="mt-1 text-xs text-muted-foreground">
          作者：{{ item.author }} · 创建时间：{{ formatDate(item.createdAt) }}
        </div>
        <a
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-1 inline-flex text-xs text-primary hover:underline"
        >
          打开 PR
        </a>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

interface AuditItem {
  number: number
  title: string
  author: string
  createdAt: string
  url: string
  status: ReviewState
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
const items = ref<AuditItem[]>([])
const canLoad = ref(true)

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i

const deriveReviewState = (comments: Array<{ body?: string }>): ReviewState => {
  const needFixes = new Set<string>()
  const fixed = new Set<string>()

  for (const comment of comments) {
    const body = (comment.body || '').trim()
    if (!body) continue
    const match = body.match(COMMENT_PATTERN)
    if (!match) continue
    const kind = match[1].toUpperCase()
    const id = match[2].trim()

    if (kind === 'NEEDFIX') {
      needFixes.add(id)
      fixed.delete(id)
      continue
    }
    if (kind === 'FIXED' && needFixes.has(id)) {
      fixed.add(id)
    }
  }

  if (needFixes.size === 0) return 'waiting_review'
  for (const id of needFixes) {
    if (!fixed.has(id)) return 'changes_requested'
  }
  return 'fixed_waiting'
}

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
  const token = props.token.trim()
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `GitHub API ${response.status}`)
  }
  return response.json() as Promise<T>
}

const load = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''
  try {
    if (!props.token.trim()) {
      throw new Error('当前会话未检测到 GitHub Token，请先登录。')
    }

    const pulls = await githubGet<Array<{
      number: number
      title: string
      html_url: string
      created_at: string
      user?: { login?: string }
    }>>(`/repos/${props.owner}/${props.repo}/pulls?state=open&per_page=50`)

    const list: AuditItem[] = []
    for (const pr of pulls) {
      let status: ReviewState = 'waiting_review'
      try {
        const comments = await githubGet<Array<{ body?: string }>>(
          `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
        )
        status = deriveReviewState(comments)
      } catch {
        status = 'waiting_review'
      }
      list.push({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login || 'unknown',
        createdAt: pr.created_at,
        url: pr.html_url,
        status
      })
    }
    items.value = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '加载审核列表失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

void load()
</script>
