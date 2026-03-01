<template>
  <header class="rounded-xl border border-border bg-card p-3.5 md:p-4">
    <div class="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0">
        <h1 class="text-lg font-semibold leading-7 text-foreground md:text-xl">
          <span class="break-words">{{ pr.title }}</span>
          <span class="ml-2 text-base font-medium text-muted-foreground">#{{ pr.number }}</span>
        </h1>

        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" class="gap-1.5 text-[0.78rem]">
            <GitPullRequest :size="14" weight="duotone" />
            Open
          </Badge>

          <span class="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <img
              :src="getOptimizedAvatarUrl(pr.user)"
              class="h-5 w-5 shrink-0 rounded-full object-cover"
              loading="lazy"
              @load="cacheAvatar(pr.user)"
            />
            <a :href="pr.user.html_url" target="_blank" class="truncate text-foreground hover:underline">{{ pr.user.login }}</a>
            <span class="shrink-0">opened {{ timeAgo }}</span>
          </span>
        </div>
      </div>

      <div class="flex gap-1.5 md:justify-end">
        <Button variant="outline" size="icon" @click="$emit('refresh')" title="刷新数据" aria-label="刷新数据">
          <ArrowsClockwise :size="16" weight="bold" />
        </Button>
        <Button
          as="a"
          :href="pr.html_url"
          target="_blank"
          variant="outline"
          size="icon"
          title="在 GitHub 查看 PR"
          aria-label="在 GitHub 查看 PR"
        >
          <GithubLogo :size="16" weight="duotone" />
        </Button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhGithubLogo as GithubLogo,
  PhGitPullRequest as GitPullRequest
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

interface PullRequest {
  id: number
  number: number
  title: string
  user: GitHubUser
  created_at: string
  html_url: string
  head: {
    sha: string
    label: string
  }
  base: {
    label: string
  }
  commits?: number
  state: string
}

const props = defineProps({
  pr: {
    type: Object as PropType<PullRequest>,
    required: true,
    validator: (value: unknown): value is PullRequest => {
      return typeof value === 'object' && value !== null && 'number' in value && 'title' in value && 'user' in value
    }
  }
})

defineEmits(['refresh'])

const avatarCache = new Map<string, string>()

const getOptimizedAvatarUrl = (user: GitHubUser): string => {
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
    url += (url.includes('?') ? '&' : '?') + 's=40&q=60'
  }

  avatarCache.set(user.login, url)
  return url
}

const cacheAvatar = (user: GitHubUser): void => {
  const url = getOptimizedAvatarUrl(user)
  localStorage.setItem(`avatar_${user.login}`, url)
}

const timeAgo = computed(() => {
  const now = new Date()
  const created = new Date(props.pr.created_at)
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} 秒前`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} 分钟前`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} 小时前`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} 天前`
})
</script>
