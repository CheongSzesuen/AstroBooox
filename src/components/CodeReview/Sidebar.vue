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
  top: 60px;
  bottom: 20px;
  left: 20px;
  width: 320px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 12px;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-sizing: border-box;
}

.sidebar-collapsed {
  width: 70px;
  padding: 12px 4px;
}

/* 宽屏设备上展开状态的侧边栏项目项样式优化 */
@media (min-width: 769px) {
  .sidebar:not(.sidebar-collapsed) {
    width: 320px;
  }
  
  .sidebar:not(.sidebar-collapsed) .pr-item {
    margin: 6px 0;
  }
  
  .sidebar-collapsed {
    width: 70px; /* 桌面端收起宽度 */
    padding: 10px 4px;
  }
  
  .sidebar-collapsed .pr-item {
    padding: 6px;
    margin: 3px auto;
  }
}

/* 窄屏设备上收起状态的侧边栏项目项样式优化 */
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    left: 10px;
  }
  
  .sidebar-collapsed {
    width: 36px; /* 与头像宽度一致 */
    left: 2px; /* 保持极小的左侧间距 */
    padding: 6px 0;
    box-shadow: none;
    border-radius: 0 4px 4px 0; /* 只保留右侧圆角 */
    top: 60px;
    bottom: 10px; /* 与底部保持一点间距 */
  }
  
  .sidebar-collapsed .pr-item {
    padding: 4px;
    margin: 1px auto;
    width: 36px;
    height: 36px;
  }
  
  /* 窄屏下保持较小的头像间距 */
  .sidebar:not(.sidebar-collapsed) .pr-item {
    margin: 2px 0;
  }
}

/* 自定义滚动条样式 - 只保留垂直滚动条 */
.sidebar:not(.sidebar-collapsed) .pr-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-right: -12px;
  flex: 1;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar {
  width: 6px;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.45);
  border-radius: 3px;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}

.sidebar-collapsed .pr-list {
  overflow: hidden;
  flex: 1;
  padding: 0;
  margin: 0;
}

.pr-list {
  flex: 1;
  min-height: 0;
  padding-top: 8px;
}

.pr-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin: 2px auto;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  width: 36px;
  min-width: 36px;
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
  box-sizing: content-box;
}

/* 修复侧边栏收起时头像的hover状态为正方形 */
.sidebar-collapsed .pr-item {
  padding: 6px; /* 增加padding以适应更宽的侧边栏 */
  margin: 2px auto; /* 增加margin */
  border-radius: 8px;
  width: 36px;
  height: 36px;
  box-sizing: content-box;
}

/* 窄屏设备上收起状态的侧边栏项目项样式优化 */
@media (max-width: 768px) {
  .sidebar {
    width: 280px; /* 窄屏下保持当前宽度 */
    left: 10px;
  }
  
  .sidebar-collapsed {
    width: 50px; /* 增加移动端收起宽度从40px到50px */
    left: 10px;
    padding: 6px 0;
  }
  
  .sidebar-collapsed .pr-item {
    padding: 4px; /* 调整窄屏下的padding */
    margin: 1px auto;
    width: 36px;
    height: 36px;
  }
  
  /* 窄屏下保持较小的头像间距 */
  .sidebar:not(.sidebar-collapsed) .pr-item {
    margin: 2px 0;
  }
}

/* 宽屏设备上展开状态的侧边栏项目项样式优化 */
@media (min-width: 769px) {
  .sidebar:not(.sidebar-collapsed) {
    width: 320px; /* 确保宽屏下的宽度 */
  }
  
  .sidebar:not(.sidebar-collapsed) .pr-item {
    margin: 6px 0; /* 进一步增加宽屏下头像间距到6px */
  }
}

.sidebar:not(.sidebar-collapsed) .pr-item {
  width: auto;
  height: auto;
  justify-content: flex-start;
  margin: 4px 0; /* 增加宽屏下头像间距从2px到4px */
  padding-left: 12px;
  padding-right: 12px;
  box-sizing: border-box;
  min-width: 0;
  border-radius: 6px;
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
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  transition: all 0.3s ease;
}

.sidebar-collapsed .pr-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.pr-info {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
}

.pr-title {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.pr-meta {
  display: flex;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.pr-author {
  margin-right: 8px;
}

.pr-date {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: hsl(var(--muted) / 0.45);
  margin-top: auto;
}

.sidebar-footer:hover {
  background-color: hsl(var(--accent));
}

.collapse-text {
  font-size: 16px;
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
  width: 24px;
  height: 24px;
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
  padding: 16px;
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
  padding: 16px;
}
</style>
