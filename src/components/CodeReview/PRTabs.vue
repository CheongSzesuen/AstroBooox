<template>
  <div class="tabnav-container">
    <nav class="tabnav-tabs">
      <button 
        class="tabnav-tab"
        :class="{ 'selected': activeTab === 'analysis' }"
        @click="emit('update:activeTab', 'analysis')"
      >
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
          <path d="M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v7.736a.75.75 0 0 1-1.5 0V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13.274 9.537v-.001l-4.557 4.45a.75.75 0 0 1-1.055-.008l-1.943-1.95a.75.75 0 0 1 1.062-1.058l1.419 1.425 4.026-3.932a.75.75 0 1 1 1.048 1.074ZM4.75 4h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM4 7.75A.75.75 0 0 1 4.75 7h2a.75.75 0 0 1 0 1.5h-2A.75.75 0 0 1 4 7.75Z"/>
        </svg>
        Analysis
        <span v-if="analyzedData" class="counter">1</span>
      </button>
      <button 
        class="tabnav-tab"
        :class="{ 'selected': activeTab === 'files' }"
        @click="emit('update:activeTab', 'files')"
      >
        <svg class="octicon octicon-file-diff" viewBox="0 0 16 16" width="16" height="16">
          <path d="M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"/>
        </svg>
        Files changed
        <span v-if="changedFiles.length > 0" class="counter">{{ changedFiles.length }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { PRTabsProps } from '@/type/codeReview'

// 修改默认值为 'analysis'
const props = withDefaults(defineProps<PRTabsProps>(), {
  activeTab: 'analysis'  // 这里设置默认值为 'analysis'
})

const emit = defineEmits(['update:activeTab'])
</script>

<style scoped>
.tabnav-container {
  border-bottom: 1px solid #d0d7de;
  margin-bottom: 16px;
}

.tabnav-tabs {
  display: flex;
  margin-bottom: -1px;
}

.tabnav-tab {
  position: relative;
  padding: 8px 16px;
  font-size: 14px;
  line-height: 20px;
  color: #57606a;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tabnav-tab:hover {
  color: #0969da;
}

.tabnav-tab.selected {
  color: #0969da;
  background-color: #ffffff;
  border-color: #d0d7de;
  border-bottom-color: #ffffff;
}

.tabnav-tab svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #57606a;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 50%;
  margin-left: 4px;
}

.tabnav-tab.selected .counter {
  background-color: rgba(9, 105, 218, 0.1);
  color: #0969da;
}
</style>