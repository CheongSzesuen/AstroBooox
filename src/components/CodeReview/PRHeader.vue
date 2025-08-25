<template>
  <div class="pr-header">
    <div class="pr-title-container flex-auto">
      <h1 class="pr-title gh-header-title wb-break-word lh-condensed f1 mb-2 mr-0">
        <span class="title-text">{{ pr.title }}</span>
        <span class="pr-number">#{{ pr.number }}</span>
      </h1>
      <div class="pr-meta">
        <span class="pr-state-badge open">
          <svg height="16" class="octicon octicon-git-pull-request" viewBox="0 0 16 16" version="1.1" width="16">
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
          </svg>
          Open
        </span>
        <span class="pr-author">
          <img :src="pr.user.avatar_url" class="author-avatar" />
          <a :href="pr.user.html_url" target="_blank" class="author-link">
            {{ pr.user.login }}
          </a>
          <span class="pr-time-info">
            opened this pull request {{ timeAgo }}
          </span>
        </span>
      </div>
    </div>
    
    <div class="pr-actions">
      <button class="action-button" @click="$emit('refresh')" title="刷新数据">
        <svg class="action-icon refresh-icon" viewBox="0 0 1024 1024">
          <path d="M168 504.2c1-43.7 10-86.1 26.9-126 17.3-41 42.1-77.7 73.7-109.4S337 212.3 378 195c42.4-17.9 87.4-27 133.9-27s91.5 9.1 133.8 27c40.9 17.3 77.7 42.1 109.3 73.8 9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47c-5.3 4.1-3.5 12.5 3 14.1l175.7 43c5 1.2 9.9-2.6 9.9-7.7l0.8-180.9c0-6.7-7.7-10.5-12.9-6.3l-56.4 44.1C765.8 155.1 646.2 92 511.8 92 282.7 92 96.3 275.6 92 503.8c-0.1 4.5 3.5 8.2 8 8.2h60c4.4 0 7.9-3.5 8-7.8zM924 512h-60c-4.4 0-7.9 3.5-8 7.8-1 43.7-10 86.1-26.9 126-17.3 41-42.1 77.8-73.7 109.4S687 811.7 646 829c-42.4 17.9-87.4 27-133.9 27s-91.5-9.1-133.9-27c-40.9-17.3-77.7-42.1-109.3-73.8-9.9-9.9-19.2-20.4-27.8-31.4l60.2-47c5.3-4.1 3.5-12.5 3 14.1l-175.7-43c5-1.2 9.9 2.6 9.9 7.7l-0.7 181c0 6.7 7.7 10.5 12.9 6.3l56.4-44.1C258.2 868.9 377.8 932 512.2 932c229.2 0 415.5-183.7 419.8-411.8 0.1-4.5-3.5-8.2-8-8.2z" fill="currentColor"/>
        </svg>
      </button>
      
      <a :href="pr.html_url" target="_blank" class="action-button github-button" title="在GitHub上查看此Pull Request">
        <svg class="github-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path 
            d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
            class="github-path-body"
          />
          <path 
            d="M9 18c-4.51 2-5-2-7-2"
            class="github-path-tail"
          />
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType, computed } from 'vue'

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
      return typeof value === 'object' && 
             value !== null && 
             'number' in value && 
             'title' in value && 
             'user' in value
    }
  }
})

const timeAgo = computed(() => {
  const now = new Date()
  const created = new Date(props.pr.created_at)
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  }
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
})

defineEmits(['refresh'])
</script>

<style scoped>
.pr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  margin-bottom: 16px;
}

.pr-title-container.flex-auto {
  flex: auto;
}

.pr-title.gh-header-title {
  margin-right: 150px;
  margin-bottom: 8px;
  font-weight: 400;
  line-height: 1.125;
  word-wrap: break-word;
}

.pr-title.wb-break-word {
  word-break: break-word;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.pr-title.lh-condensed {
  line-height: 1.25;
}

.pr-title.f1 {
  font-size: 26px;
}

.pr-title.mb-2 {
  margin-bottom: 8px;
}

.pr-title.mr-0 {
  margin-right: 0;
}

.pr-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  margin: 0;
}

.title-text {
  margin-right: 8px;
}

.pr-number {
  font-size: 1rem;
  color: #6a737d;
  font-weight: 400;
}

.pr-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.875rem;
  color: #586069;
}

.pr-state-badge {
  border-radius: 2em;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  padding: 4px 12px;
  text-align: center;
  white-space: nowrap;
  border: 1px solid transparent;
  box-shadow: 0 1px 0 rgba(27, 31, 36, 0.12);
}

.pr-state-badge.open {
  background-color: #1f883d;
  color: white;
}

.octicon {
  width: 16px;
  height: 16px;
  fill: currentColor;
  vertical-align: text-bottom;
  margin-right: 4px;
}

.pr-author {
  display: flex;
  align-items: center;
  gap: 4px;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.author-link {
  color: #24292e;
  text-decoration: none;
  font-weight: 200;
}

.author-link:hover {
  color: #0366d6;
  text-decoration: underline;
}

.pr-time-info {
  margin-left: 4px;
  color: #57606a;
}

.pr-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background-color: #f3f4f6;
  border: none;
  border-radius: 50%;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #e5e7eb;
  transform: scale(1.05);
}

.action-icon {
  width: 20px;
  height: 20px;
  /* color: #3b82f6; */
  color: #1f2937;
  transition: all 0.2s;
}

.github-icon {
  width: 20px;
  height: 20px;
  color: #1f2937;
  transition: all 0.2s;
  overflow: visible;
}

.refresh-icon {
  transition: transform 0.8s ease;
}

.action-button:hover .refresh-icon {
  transform: rotate(360deg);
}

.action-button:hover .action-icon,
.action-button:hover .github-icon {
  color: #2563eb;
}

.github-path-body,
.github-path-tail {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1000;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0s;
}

.github-button:hover .github-path-body,
.github-button:hover .github-path-tail {
  stroke-dashoffset: 1000;
  animation: draw 2s ease-in-out forwards;
}

.github-button:hover .github-path-tail {
  animation-delay: 0.4s;
}

.github-button:not(:hover) .github-path-body,
.github-button:not(:hover) .github-path-tail {
  animation: none;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0s;
}

@keyframes draw {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}

@media (min-width: 768px) {
  .pr-title.f1 {
    font-size: 32px;
  }
}

@media (max-width: 768px) {
  .pr-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .pr-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .action-button {
    width: 36px;
    height: 36px;
  }
  
  .action-icon,
  .github-icon {
    width: 18px;
    height: 18px;
  }
}
</style>