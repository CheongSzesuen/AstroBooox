<template>
  <aside :class="sidebarClass">
    <div
      class="mb-2 hidden items-center border-b border-border pb-2 lg:flex"
      :class="isCollapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2'"
    >
      <div v-if="!isCollapsed" class="min-w-0">
        <p class="truncate text-xs font-semibold text-foreground">Pull Requests</p>
        <p class="text-[11px] text-muted-foreground">{{ pullRequests.length }} open</p>
      </div>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="折叠或展开边栏"
        @click="$emit('toggle')"
      >
        <CaretDoubleRight
          :size="16"
          weight="bold"
          :class="['transition-transform duration-200', isCollapsed ? 'rotate-180' : 'rotate-0']"
        />
      </button>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      加载中...
    </div>

    <div v-else-if="pullRequests.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center text-sm text-muted-foreground">
      <p>没有找到 Pull Request</p>
      <Button variant="secondary" size="sm" @click="$emit('refresh')">重试</Button>
    </div>

    <div v-else class="flex-1 overflow-y-auto pr-1 max-[1023px]:max-h-[20rem]">
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
          <div class="mt-1 flex items-center gap-2 text-[0.74rem] text-muted-foreground">
            <span class="truncate">by {{ pr.user.login }}</span>
            <span>{{ formatDate(pr.created_at) }}</span>
          </div>
        </div>
      </button>
    </div>

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
  'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
  props.isCollapsed
    ? 'w-full p-2.5 lg:w-[4.75rem] lg:p-2'
    : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
])

const itemClass = (pr: PullRequest): string[] => {
  const isActive = !!props.selectedPR && pr.id === props.selectedPR.id
  return [
    'group flex items-center rounded-lg border text-left transition-colors',
    props.isCollapsed ? 'mx-auto h-10 w-10 justify-center p-1.5' : 'w-full gap-2.5 px-2.5 py-2',
    isActive ? 'border-border bg-muted shadow-sm' : 'border-transparent hover:bg-accent'
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
