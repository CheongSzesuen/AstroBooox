<template>
  <header class="pr-header ui-card">
    <div class="pr-main">
      <h1 class="pr-title">
        {{ pr.title }}
        <span class="pr-number">#{{ pr.number }}</span>
      </h1>

      <div class="pr-meta">
        <Badge variant="secondary" class="pr-state-badge">
          <GitPullRequest :size="16" weight="duotone" />
          Open
        </Badge>
        <span class="pr-author">
          <img
            :src="getOptimizedAvatarUrl(pr.user)"
            class="author-avatar"
            loading="lazy"
            @load="cacheAvatar(pr.user)"
          />
          <a :href="pr.user.html_url" target="_blank" class="author-link">{{ pr.user.login }}</a>
          <span class="pr-time-info">opened {{ timeAgo }}</span>
        </span>
      </div>
    </div>

    <div class="pr-actions">
      <Button variant="outline" size="icon" @click="$emit('refresh')" title="刷新数据">
        <ArrowsClockwise :size="18" weight="bold" />
      </Button>
      <Button as="a" :href="pr.html_url" target="_blank" variant="outline" size="icon" title="在 GitHub 查看 PR">
        <GithubLogo :size="18" weight="duotone" />
      </Button>
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

<style scoped>
.pr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.pr-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--foreground);
}

.pr-number {
  margin-left: 8px;
  color: var(--muted-foreground);
  font-size: 1rem;
}

.pr-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.pr-state-badge {
  gap: 6px;
  font-size: 13px;
}

.pr-author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  object-fit: cover;
}

.author-link {
  text-decoration: none;
  color: var(--foreground);
}

.author-link:hover {
  color: var(--primary);
}

.pr-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 900px) {
  .pr-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
