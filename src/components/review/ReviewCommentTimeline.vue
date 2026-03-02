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
        <div class="pt-1 whitespace-pre-wrap break-words text-foreground">{{ comment.body || '' }}</div>
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
  id: number | string
  body?: string
  created_at?: string
  html_url?: string
  user?: ReviewCommentUser
}

const props = withDefaults(defineProps<{
  comments: ReviewCommentItem[]
  emptyText?: string
  showOpenLink?: boolean
  lineLeft?: number
  avatarRounded?: 'full' | 'md'
  avatarBorder?: boolean
  getAvatarUrl?: (login: string, avatarUrl: string) => string
  onAvatarLoad?: (login: string, avatarUrl: string) => void
}>(), {
  emptyText: '当前 PR 暂无评论',
  showOpenLink: false,
  lineLeft: 54,
  avatarRounded: 'full',
  avatarBorder: false
})

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
</script>
