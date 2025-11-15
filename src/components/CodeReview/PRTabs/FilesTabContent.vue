<!-- src/components/CodeReview/PRTabs/FilesTabContent.vue -->
<template>
  <div class="files-tab-content">
    <div class="file-tree-container">
      <FileTree 
        :changed-files="changedFiles"
        @file-selected="handleFileSelected"
      />
    </div>
    
    <!-- 文件内容显示区域 -->
    <div class="file-content file-diff-list">
      <div 
        v-for="file in sortedFiles" 
        :key="file.filename"
        class="file-diff-item"
      >
        <div class="file-header" @click="selectFile(file)">
          <div class="file-info">
            <span class="file-name">{{ file.filename }}</span>
            <span :class="['file-status', file.status]">{{ file.status }}</span>
          </div>
          <div class="file-stats">
            <span class="additions" v-if="file.additions">+{{ file.additions }}</span>
            <span class="deletions" v-if="file.deletions">-{{ file.deletions }}</span>
          </div>
        </div>
        <div class="file-diff-content" v-show="expandedFiles.has(file.filename)">
          <GithubStyleDiffView :file="file" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FileTree from './FileTabContent/FileTree.vue'
import GithubStyleDiffView from './FileTabContent/GithubStyleDiffView.vue'
import type { FilesTabContentProps, FileChange } from '@/type/codeReview'

const props = defineProps<FilesTabContentProps>()

const selectedFile = ref<FileChange | null>(null)
const expandedFiles = ref<Set<string>>(new Set())

// 计算排序后的文件列表，按照文件路径深度和字母顺序排序
const sortedFiles = computed(() => {
  return [...props.changedFiles].sort((a, b) => {
    // 首先按路径深度排序
    const depthA = a.filename.split('/').length
    const depthB = b.filename.split('/').length
    if (depthA !== depthB) return depthA - depthB
    
    // 然后按字母顺序排序
    return a.filename.localeCompare(b.filename)
  })
})

const handleFileSelected = (file: FileChange) => {
  selectedFile.value = file
  console.log('Selected file:', file)
}

// 默认选中第一个文件
onMounted(() => {
  if (props.changedFiles && props.changedFiles.length > 0) {
    selectedFile.value = props.changedFiles[0]
    // 展开所有文件
    props.changedFiles.forEach(file => {
      expandedFiles.value.add(file.filename)
    })
  }
})

const selectFile = (file: FileChange) => {
  // 切换文件展开状态
  if (expandedFiles.value.has(file.filename)) {
    expandedFiles.value.delete(file.filename)
  } else {
    expandedFiles.value.add(file.filename)
  }
}
</script>

<style scoped>
.files-tab-content {
  display: flex;
  height: calc(100vh - 180px);
  margin-top: 16px;
}

.file-tree-container {
  width: 300px;
  overflow-y: auto;
  border-right: none; /* 移除边框 */
}

.file-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.file-content.file-diff-list {
  padding: 0;
}

.file-diff-item {
  border-bottom: 1px solid #e1e4e8;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: #f6f8fa;
}

.file-header:hover {
  background-color: #eaeff5;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-name {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  color: #032f62;
  font-weight: 600;
}

.file-status {
  padding: 2px 6px;
  border-radius: 2em;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.file-status.added {
  background-color: #dcffe4;
  color: #1a7f37;
}

.file-status.modified {
  background-color: #ddf4ff;
  color: #0969da;
}

.file-status.removed {
  background-color: #ffebe9;
  color: #cf222e;
}

.file-status.renamed {
  background-color: #cff4fc;
  color: #8250df;
}

.file-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.additions {
  color: #28a745;
}

.deletions {
  color: #d73a49;
}

.file-diff-content {
  border-top: 1px solid #e1e4e8;
}
</style>