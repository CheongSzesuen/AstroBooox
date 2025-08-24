<template>
  <div class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
    <div class="sidebar-header">
      <h2 v-if="!isCollapsed">PR列表</h2>
    </div>
    
    <div v-if="loading" class="loading">加载PR列表中...</div>
    <div v-else-if="pullRequests.length === 0" class="empty-state">
      <p>没有找到Pull Request</p>
      <button @click="$emit('refresh')" class="refresh-btn">重试</button>
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
          <img :src="pr.user.avatar_url" class="pr-avatar" />
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
      <span class="collapse-text" v-if="!isCollapsed">折叠侧栏</span>
      <svg class="arrow-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <path 
          :transform="isCollapsed ? '' : 'rotate(90 512 512)'"
          d="M493.504 558.144a31.904 31.904 0 0 0 45.28 0l308.352-308.352a31.968 31.968 0 1 0-45.248-45.248L516.16 490.272 221.984 196.128a31.968 31.968 0 1 0-45.248 45.248l316.768 316.768z" 
          fill="#3b82f6"
        />
        <path 
          :transform="isCollapsed ? '' : 'rotate(90 512 512)'"
          d="M801.888 460.576L516.16 746.304 222.016 452.16a31.968 31.968 0 1 0-45.248 45.248l316.768 316.768a31.904 31.904 0 0 0 45.28 0l308.352-308.352a32 32 0 1 0-45.28-45.248z" 
          fill="#3b82f6"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
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

defineProps({
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
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 60px;
  bottom: 20px;
  left: 20px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 12px;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 8px 12px;
  margin-bottom: 12px;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* 自定义滚动条样式 - 只保留垂直滚动条 */
.sidebar:not(.sidebar-collapsed) .pr-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  margin-right: -12px;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar {
  width: 6px;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 3px;
}

.sidebar:not(.sidebar-collapsed) .pr-list::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.sidebar-collapsed .pr-list {
  overflow: hidden;
}

.pr-list {
  flex: 1;
  padding: 8px 0;
}

.pr-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pr-item:hover {
  background-color: #f3f4f6;
}

.pr-item.active {
  background-color: #dbeafe;
  border-left: 3px solid #3b82f6;
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
  color: #6b7280;
}

.pr-author {
  margin-right: 8px;
}

.pr-date {
  font-size: 13px;
  color: #9ca3af;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f9fafb;
}

.sidebar-footer:hover {
  background-color: #f1f5f9;
}

.collapse-text {
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
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
  color: #6b7280;
  font-size: 14px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #6b7280;
  gap: 1rem;
}

.refresh-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #3b82f6;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #2563eb;
}

@media (max-width: 768px) {
  .sidebar {
    width: 260px;
    left: 10px;
  }
}
</style>