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
        <div
          v-if="extractReplyMeta(comment.body || '').target"
          class="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"
        >
          <div class="font-medium text-foreground">
            回复 {{ extractReplyMeta(comment.body || '').target }}
          </div>
          <div
            v-if="extractReplyMeta(comment.body || '').excerpt"
            class="mt-1 whitespace-pre-wrap break-words"
          >
            {{ extractReplyMeta(comment.body || '').excerpt }}
          </div>
        </div>
        <div class="pt-1 whitespace-pre-wrap break-words text-foreground">
          {{ extractReplyMeta(comment.body || '').content }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  lineLeft?: number
  avatarRounded?: 'full' | 'md'
  avatarBorder?: boolean
  getAvatarUrl?: (login: string, avatarUrl: string) => string
  onAvatarLoad?: (login: string, avatarUrl: string) => void
}>(), {
  emptyText: '当前 PR 暂无评论',
  showOpenLink: false,
  showReplyAction: false,
  lineLeft: 54,
  avatarRounded: 'full',
  avatarBorder: false
})

const emit = defineEmits<{
  reply: [comment: ReviewCommentItem]
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

const extractReplyMeta = (body: string): { target: string; excerpt: string; content: string } => {
  const normalized = body || ''
  const targetMatch = normalized.match(/^\s*>\s*Reply-To:\s*(.+)$/m)
  if (!targetMatch) {
    return {
      target: '',
      excerpt: '',
      content: normalized
    }
  }
  const target = targetMatch[1].trim()
  const lines = normalized.split('\n')
  const filtered: string[] = []
  let excerpt = ''
  let skipNextQuote = false

  for (const line of lines) {
    if (/^\s*>\s*Reply-To:\s*/.test(line)) {
      skipNextQuote = true
      continue
    }
    if (skipNextQuote && /^\s*>\s*/.test(line)) {
      excerpt = line.replace(/^\s*>\s*/, '').trim()
      skipNextQuote = false
      continue
    }
    filtered.push(line)
  }

  return {
    target,
    excerpt,
    content: filtered.join('\n').trim()
  }
}
</script>
