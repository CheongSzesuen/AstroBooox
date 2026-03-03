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
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
              >
                <DetailIcon :size="12" />
                详情
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                side="bottom"
                align="end"
                :side-offset="6"
                class="z-50 min-w-[150px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
              >
                <DropdownMenuItem
                  v-if="showReplyAction"
                  class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  @select="emit('reply', comment)"
                >
                  <ReplyIcon :size="14" />
                  回复
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="showEditAction"
                  class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  @select="emit('edit', comment)"
                >
                  <EditIcon :size="14" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="showDeleteAction"
                  class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                  @select="emit('delete', comment)"
                >
                  <DeleteIcon :size="14" />
                  删除
                </DropdownMenuItem>
                <DropdownMenuSeparator
                  v-if="showOpenLink && comment.html_url"
                  class="my-1 h-px bg-border"
                />
                <DropdownMenuItem
                  v-if="showOpenLink && comment.html_url"
                  class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                  @select="openCommentLink(comment.html_url)"
                >
                  <OpenIcon :size="14" />
                  打开评论
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>
        <div
          v-if="parsedOf(comment).replyTarget"
          class="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="font-medium text-foreground">
              回复 {{ parsedOf(comment).replyTarget }}
            </div>
            <button
              v-if="getReplyTargetId(parsedOf(comment).replyTarget)"
              type="button"
              class="inline-flex items-center gap-1 text-primary hover:underline"
              @click="scrollToReplyTarget(parsedOf(comment).replyTarget)"
            >
              <OpenIcon :size="12" />
              定位
            </button>
          </div>
          <div
            v-if="parsedOf(comment).replyExcerpt"
            class="mt-1 break-words"
            v-html="renderCommentHtml(parsedOf(comment).replyExcerpt)"
          />
        </div>
        <div
          :data-review-comment-content-id="String(comment.id)"
          class="pt-1 break-words text-foreground"
          :class="isCollapsed(comment) ? 'max-h-36 overflow-hidden' : ''"
        >
          <span
            v-if="parsedOf(comment).tagId"
            class="mr-1 inline-flex items-center rounded border px-2 py-0.5 text-[11px]"
            :class="getTagBadgeClass(parsedOf(comment).tagType)"
          >
            {{ parsedOf(comment).tagType || 'COMMENT' }} · {{ parsedOf(comment).tagId }}
          </span>
          <span class="align-middle" v-html="renderCommentInlineHtml(parsedOf(comment).content)" />
        </div>
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
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import {
  PhArrowSquareOut as OpenIcon,
  PhDotsThreeVertical as DetailIcon,
  PhPencilSimple as EditIcon,
  PhTrash as DeleteIcon,
  PhArrowBendUpLeft as ReplyIcon
} from '@phosphor-icons/vue'
import {
  parseReviewCommentBody,
  renderCommentMarkdownHtml,
  renderCommentMarkdownInlineHtml,
  type ParsedReviewComment
} from '@/utils/reviewComment'

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

const openCommentLink = (url?: string): void => {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

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
const renderCommentInlineHtml = (content: string): string => renderCommentMarkdownInlineHtml(content)
const getTagBadgeClass = (tagType: ParsedReviewComment['tagType']): string => {
  if (tagType === 'NEEDFIX') return 'border-red-500/40 bg-red-500/15 text-red-700'
  if (tagType === 'FIXED') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
  return 'border-border bg-muted/30 text-muted-foreground'
}
const getReplyTargetId = (replyTarget: string): number | null => {
  const match = replyTarget.match(/#(\d+)/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

const highlightReviewCommentElement = (element: HTMLElement): void => {
  element.classList.add('rounded-md', 'bg-primary/10', 'transition-colors')
  setTimeout(() => {
    element.classList.remove('rounded-md', 'bg-primary/10', 'transition-colors')
  }, 1500)
}

const scrollToReplyTarget = async (replyTarget: string): Promise<void> => {
  const id = getReplyTargetId(replyTarget)
  if (!id) return
  const selector = `[data-review-comment-content-id="${id}"]`
  for (let i = 0; i < 8; i += 1) {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightReviewCommentElement(element)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 80))
  }
}

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
