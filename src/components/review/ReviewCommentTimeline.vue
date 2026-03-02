<template>
  <div
    v-if="comments.length === 0"
    class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
  >
    {{ emptyText }}
  </div>
  <div v-else class="relative space-y-5">
    <div
      class="pointer-events-none absolute bottom-4 top-5 w-0.5 bg-border/90"
      :style="{ left: `${lineLeft}px` }"
    />
    <div
      v-for="comment in comments"
      :key="comment.id"
      class="relative flex items-start gap-3"
      :data-review-comment-id="String(comment.id)"
    >
      <img
        v-if="comment.user?.avatar_url && comment.user?.login"
        :src="resolveAvatarUrl(comment.user.login, comment.user.avatar_url)"
        :class="avatarClass"
        loading="lazy"
        @load="handleAvatarLoad(comment.user.login, comment.user.avatar_url)"
      />
      <div class="relative z-10 min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2.5 text-sm">
        <div class="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
          <span class="inline-flex min-w-0 items-center gap-2">
            <span class="truncate font-medium text-foreground">{{ comment.user?.login || 'unknown' }}</span>
            <span class="shrink-0">{{ formatCommentRelativeTime(comment.created_at || '') }}</span>
          </span>
          <div class="inline-flex items-center gap-3">
            <button
              v-if="showReplyAction"
              type="button"
              class="text-primary hover:underline"
              @click="emit('reply', comment)"
            >
              回复
            </button>
            <button
              v-if="showEditAction"
              type="button"
              class="text-primary hover:underline"
              @click="emit('edit', comment)"
            >
              编辑
            </button>
            <button
              v-if="showDeleteAction"
              type="button"
              class="text-destructive hover:underline"
              @click="emit('delete', comment)"
            >
              删除
            </button>
            <a
              v-if="showOpenLink && comment.html_url"
              :href="comment.html_url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              打开评论
            </a>
          </div>
        </div>
        <div v-if="parsedOf(comment).tagId" class="mb-2 inline-flex items-center rounded border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
          {{ parsedOf(comment).tagType || 'COMMENT' }} · {{ parsedOf(comment).tagId }}
        </div>
        <div
          v-if="parsedOf(comment).replyTarget"
          class="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"
        >
          <div class="font-medium text-foreground">
            回复 {{ parsedOf(comment).replyTarget }}
          </div>
          <div
            v-if="parsedOf(comment).replyExcerpt"
            class="mt-1 whitespace-pre-wrap break-words"
          >
            {{ parsedOf(comment).replyExcerpt }}
          </div>
        </div>
        <div
          class="pt-1 break-words text-foreground"
          :class="isCollapsed(comment) ? 'max-h-36 overflow-hidden' : ''"
          v-html="renderCommentHtml(parsedOf(comment).content)"
        ></div>
        <button
          v-if="isLongContent(comment)"
          type="button"
          class="mt-2 text-xs text-primary hover:underline"
          @click="toggleCollapsed(comment)"
        >
          {{ isCollapsed(comment) ? '展开' : '收起' }}
        </button>
        <div
          v-if="isCollapsed(comment) && isLongContent(comment)"
          class="pointer-events-none absolute bottom-10 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseReviewCommentBody, renderCommentMarkdownHtml, type ParsedReviewComment } from '@/utils/reviewComment'

interface ReviewCommentUser {
  login?: string
  avatar_url?: string
}

interface ReviewCommentItem {
  id: number
  body?: string
  created_at?: string
  html_url?: string
  user?: ReviewCommentUser
}

const props = withDefaults(defineProps<{
  comments: ReviewCommentItem[]
  emptyText?: string
  showOpenLink?: boolean
  showReplyAction?: boolean
  showEditAction?: boolean
  showDeleteAction?: boolean
  lineLeft?: number
  avatarRounded?: 'full' | 'md'
  avatarBorder?: boolean
  getAvatarUrl?: (login: string, avatarUrl: string) => string
  onAvatarLoad?: (login: string, avatarUrl: string) => void
}>(), {
  emptyText: '当前 PR 暂无评论',
  showOpenLink: false,
  showReplyAction: false,
  showEditAction: false,
  showDeleteAction: false,
  lineLeft: 54,
  avatarRounded: 'full',
  avatarBorder: false
})

const emit = defineEmits<{
  reply: [comment: ReviewCommentItem]
  edit: [comment: ReviewCommentItem]
  delete: [comment: ReviewCommentItem]
}>()

const avatarClass = computed(() => [
  'relative z-10 h-8 w-8 shrink-0 bg-background object-cover',
  props.avatarRounded === 'md' ? 'rounded-md' : 'rounded-full',
  props.avatarBorder ? 'border border-border' : ''
])

const resolveAvatarUrl = (login: string, avatarUrl: string): string => {
  if (props.getAvatarUrl) return props.getAvatarUrl(login, avatarUrl)
  return avatarUrl
}

const handleAvatarLoad = (login: string, avatarUrl: string): void => {
  if (props.onAvatarLoad) props.onAvatarLoad(login, avatarUrl)
}

const formatCommentRelativeTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'commented just now'
  const diffMs = Date.now() - date.getTime()
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (absMs < minute) return 'commented just now'
  if (absMs < hour) return `commented ${Math.max(1, Math.round(absMs / minute))} minute${Math.round(absMs / minute) > 1 ? 's' : ''} ago`
  if (absMs < day) return `commented ${Math.max(1, Math.round(absMs / hour))} hour${Math.round(absMs / hour) > 1 ? 's' : ''} ago`
  if (absMs < month) return `commented ${Math.max(1, Math.round(absMs / day))} day${Math.round(absMs / day) > 1 ? 's' : ''} ago`
  if (absMs < year) return `commented ${Math.max(1, Math.round(absMs / month))} month${Math.round(absMs / month) > 1 ? 's' : ''} ago`
  return `commented ${Math.max(1, Math.round(absMs / year))} year${Math.round(absMs / year) > 1 ? 's' : ''} ago`
}

const parsedMap = computed(() => {
  const next = new Map<string, ParsedReviewComment>()
  for (const comment of props.comments) {
    next.set(String(comment.id), parseReviewCommentBody(comment.body || ''))
  }
  return next
})

const parsedOf = (comment: ReviewCommentItem): ParsedReviewComment =>
  parsedMap.value.get(String(comment.id)) || {
    tagType: '',
    tagId: '',
    replyTarget: '',
    replyExcerpt: '',
    content: comment.body || ''
  }

const renderCommentHtml = (content: string): string => renderCommentMarkdownHtml(content)

const collapsedState = ref<Record<string, boolean>>({})
const isLongText = (text: string): boolean => (text || '').length > 360 || (text || '').split('\n').length > 8

const isLongContent = (comment: ReviewCommentItem): boolean => isLongText(parsedOf(comment).content)
const isCollapsed = (comment: ReviewCommentItem): boolean =>
  collapsedState.value[String(comment.id)] ?? isLongContent(comment)

const toggleCollapsed = (comment: ReviewCommentItem): void => {
  const key = String(comment.id)
  collapsedState.value = {
    ...collapsedState.value,
    [key]: !isCollapsed(comment)
  }
}

watch(
  () => props.comments.map(item => `${item.id}:${item.body || ''}`),
  () => {
    const next: Record<string, boolean> = {}
    for (const comment of props.comments) {
      const key = String(comment.id)
      next[key] = collapsedState.value[key] ?? isLongContent(comment)
    }
    collapsedState.value = next
  },
  { immediate: true }
)
</script>
