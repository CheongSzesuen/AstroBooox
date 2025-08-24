<template>
  <div class="tab-content">
    <div class="file-changes">
      <div v-for="file in changedFiles" :key="file.filename" class="file-item">
        <div class="file-name">{{ file.filename }}</div>
        <div class="file-status">{{ file.status }} ({{ file.changes }} changes)</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FilesTabContentProps } from '@/type/codeReview'

defineProps<FilesTabContentProps>()
</script>

<style scoped>
.tab-content {
  padding: 16px;
}

.file-changes {
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e1e4e8;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  flex: 1;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  word-break: break-all;
}

.file-status {
  margin-left: 16px;
  font-size: 12px;
  color: #586069;
  white-space: nowrap;
}
</style>