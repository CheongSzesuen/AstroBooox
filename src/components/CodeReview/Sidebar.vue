<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="pullRequests.length === 0" class="empty-state">
      <p>没有找到Pull Request</p>
      <Button variant="secondary" size="sm" @click="$emit('refresh')">重试</Button>
    </div>
    <div v-else class="pr-list">
      <div 
        v-for="pr in pullRequests" 
        :key="pr.id"
        class="pr-item"
        :class="{ active: selectedPR && pr.id === selectedPR.id }"
        @click="$emit('select', pr)"
      >
        <div class="avatar-container">
          <img 
            :src="getOptimizedAvatarUrl(pr.user)" 
            class="pr-avatar" 
            loading="lazy"
            @load="cacheAvatar(pr.user)"
          />
        </div>
        <div class="pr-info" v-if="!isCollapsed">
          <div class="pr-title">#{{ pr.number }} {{ pr.title }}</div>
          <div class="pr-meta">
            <span class="pr-author">by {{ pr.user.login }}</span>
            <span class="pr-date">{{ formatDate(pr.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sidebar-footer" @click="$emit('toggle')">
      <span class="collapse-text" v-if="!isCollapsed">折叠边栏</span>
      <CaretDoubleRight class="arrow-icon" :class="{ expanded: !isCollapsed }" :size="20" weight="bold" />
    </div>
  </div>
</template>

<script setup lang="ts">
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

// 内存缓存
const avatarCache = new Map<string, string>()

// 获取优化后的头像URL
const getOptimizedAvatarUrl = (user: GitHubUser) => {
  // 1. 检查内存缓存
  if (avatarCache.has(user.login)) {
    return avatarCache.get(user.login)!
  }

  // 2. 检查本地存储缓存
  const cachedUrl = localStorage.getItem(`avatar_${user.login}`)
  if (cachedUrl) {
    avatarCache.set(user.login, cachedUrl)
    return cachedUrl
  }

  // 3. 生成优化后的URL
  let url = user.avatar_url
  if (url.includes('githubusercontent.com')) {
    url += (url.includes('?') ? '&' : '?') + 's=64&q=70'
  }

  // 存入内存缓存
  avatarCache.set(user.login, url)
  return url
}

// 缓存头像到本地存储
const cacheAvatar = (user: GitHubUser) => {
  const url = getOptimizedAvatarUrl(user)
  localStorage.setItem(`avatar_${user.login}`, url)
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 4.25rem;
  bottom: 1rem;
  left: 1rem;
  width: 20rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.08);
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  z-index: 100;
  transition: width 0.25s ease, left 0.25s ease, padding 0.25s ease;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 4.75rem;
  padding: 0.75rem 0.35rem;
}

.pr-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin-right: -0.25rem;
  padding-right: 0.25rem;
  padding-top: 0.5rem;
}

.sidebar:not(.sidebar-collapsed) .pr-item {
  width: 100%;
  justify-content: flex-start;
  margin: 0.2rem 0;
  padding: 0.5rem 0.6rem;
  min-width: 0;
  border-radius: 0.55rem;
}

.sidebar-collapsed .pr-item {
  width: 2.25rem;
  height: 2.25rem;
  margin: 0.2rem auto;
  padding: 0.2rem;
  border-radius: 0.55rem;
  justify-content: center;
}

.pr-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.pr-item:hover {
  background-color: hsl(var(--accent));
}

/* 修复侧边栏收起时头像的hover状态为正方形 */
.sidebar-collapsed .pr-item:hover {
  background-color: hsl(var(--accent));
  border-radius: 8px;
}

.pr-item.active {
  background-color: hsl(var(--muted));
  border-left: 3px solid hsl(var(--ring));
}

/* 侧边栏收起时，为活动项添加特殊样式 */
.sidebar-collapsed .pr-item.active {
  border-left: none;
  background-color: hsl(var(--muted));
  border-radius: 8px;
}

.avatar-container {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pr-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.sidebar-collapsed .pr-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.55rem;
}

.pr-info {
  margin-left: 0.7rem;
  flex: 1;
  min-width: 0;
}

.pr-title {
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.pr-meta {
  display: flex;
  font-size: 0.78rem;
  color: hsl(var(--muted-foreground));
}

.pr-author {
  margin-right: 8px;
}

.pr-date {
  font-size: 0.76rem;
  color: hsl(var(--muted-foreground));
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  border-top: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: hsl(var(--muted) / 0.45);
  margin-top: auto;
  border-radius: 0.5rem;
}

.sidebar-footer:hover {
  background-color: hsl(var(--accent));
}

.collapse-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  opacity: 1;
  transition: 
    opacity 0.15s ease 0.1s,
    max-width 0.3s ease,
    margin-right 0.3s ease;
}

.sidebar-collapsed .collapse-text {
  opacity: 0;
  max-width: 0;
  margin-right: 0;
  transition: 
    opacity 0.1s ease,
    max-width 0.3s ease 0.1s,
    margin-right 0.3s ease 0.1s;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.sidebar:not(.sidebar-collapsed) .arrow-icon {
  transform: rotate(360deg);
}

.sidebar-collapsed .arrow-icon {
  transform: rotate(270deg);
}

.loading {
  padding: 1rem;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
  color: hsl(var(--muted-foreground));
  gap: 1rem;
  padding: 1rem;
}

.pr-list::-webkit-scrollbar {
  width: 6px;
}

.pr-list::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.45);
  border-radius: 3px;
}

.pr-list::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}

@media (max-width: 768px) {
  .sidebar {
    width: 17.25rem;
    left: 0.75rem;
    top: 4rem;
    bottom: 0.75rem;
  }

  .sidebar-collapsed {
    width: 3.1rem;
    left: 0.5rem;
    padding: 0.5rem 0.15rem;
  }

  .sidebar-collapsed .pr-item {
    width: 2rem;
    height: 2rem;
  }
}
</style>
