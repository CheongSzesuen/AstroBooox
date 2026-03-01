<template>
  <aside :class="sidebarClass">
    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      加载中...
    </div>

    <div v-else-if="pullRequests.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center text-sm text-muted-foreground">
      <p>没有找到 Pull Request</p>
      <Button variant="secondary" size="sm" @click="$emit('refresh')">重试</Button>
    </div>

    <div v-else class="flex-1 overflow-y-auto pr-1">
      <button
        v-for="pr in pullRequests"
        :key="pr.id"
        type="button"
        :class="itemClass(pr)"
        @click="$emit('select', pr)"
      >
        <img
          :src="getOptimizedAvatarUrl(pr.user)"
          :class="isCollapsed ? 'h-8 w-8 rounded-md' : 'h-8 w-8 rounded-md'"
          class="shrink-0 object-cover"
          loading="lazy"
          @load="cacheAvatar(pr.user)"
        />

        <div v-if="!isCollapsed" class="min-w-0 flex-1">
          <div class="truncate text-[0.92rem] font-medium text-foreground">#{{ pr.number }} {{ pr.title }}</div>
          <div class="mt-0.5 flex items-center gap-2 text-[0.74rem] text-muted-foreground">
            <span class="truncate">by {{ pr.user.login }}</span>
            <span>{{ formatDate(pr.created_at) }}</span>
          </div>
        </div>
      </button>
    </div>

    <button
      type="button"
      class="mt-1.5 inline-flex w-full items-center justify-between rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
      @click="$emit('toggle')"
    >
      <span v-if="!isCollapsed" class="truncate">折叠边栏</span>
      <CaretDoubleRight :size="18" weight="bold" :class="['shrink-0 transition-transform duration-300', isCollapsed ? '-rotate-90' : 'rotate-0']" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PhCaretDoubleRight as CaretDoubleRight } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/utils/dateUtils'

interface GitHubUser {
  login: string
  avatar_url: string
}

interface PullRequest {
  id: number
  number: number
  title: string
  user: GitHubUser
  created_at: string
}

const props = defineProps({
  pullRequests: {
    type: Array as () => PullRequest[],
    required: true
  },
  selectedPR: {
    type: Object as () => PullRequest | null,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select', 'toggle', 'refresh'])

const avatarCache = new Map<string, string>()

const sidebarClass = computed(() => [
  'fixed z-40 flex flex-col overflow-hidden border border-border bg-card shadow-sm transition-all duration-300',
  props.isCollapsed
    ? 'left-2 top-[4rem] bottom-3 w-[3.1rem] rounded-lg p-1.5 md:left-4 md:top-[4.25rem] md:bottom-4 md:w-[4.75rem]'
    : 'left-3 top-[4rem] bottom-3 w-[17.25rem] rounded-xl p-2 md:left-4 md:top-[4.25rem] md:bottom-4 md:w-80 md:p-2.5'
])

const itemClass = (pr: PullRequest): string[] => {
  const isActive = !!props.selectedPR && pr.id === props.selectedPR.id
  return [
    'group flex items-center rounded-md border text-left transition-colors',
    props.isCollapsed ? 'mx-auto h-9 w-9 justify-center p-1' : 'w-full gap-2 px-2 py-1.5',
    isActive ? 'border-border bg-muted' : 'border-transparent hover:bg-accent'
  ]
}

const getOptimizedAvatarUrl = (user: GitHubUser) => {
  if (avatarCache.has(user.login)) {
    return avatarCache.get(user.login)!
  }

  const cachedUrl = localStorage.getItem(`avatar_${user.login}`)
  if (cachedUrl) {
    avatarCache.set(user.login, cachedUrl)
    return cachedUrl
  }

  let url = user.avatar_url
  if (url.includes('githubusercontent.com')) {
    url += (url.includes('?') ? '&' : '?') + 's=64&q=70'
  }

  avatarCache.set(user.login, url)
  return url
}

const cacheAvatar = (user: GitHubUser) => {
  const url = getOptimizedAvatarUrl(user)
  localStorage.setItem(`avatar_${user.login}`, url)
}
</script>
