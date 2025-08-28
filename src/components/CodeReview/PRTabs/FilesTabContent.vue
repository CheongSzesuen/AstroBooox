<!-- src/components/CodeReview/PRTabs/FilesTabContent.vue -->
<template>
  <div class="files-tab-content">
    <FileTree 
      :changed-files="changedFiles"
      :search-query="searchQuery"
      @update:searchQuery="updateSearchQuery"
      @file-selected="handleFileSelected"
    />
    
    <!-- 文件内容显示区域 -->
    <div class="file-content" v-if="selectedFile">
      <h3>Selected File: {{ selectedFile.filename }}</h3>
      <!-- 这里可以添加文件内容的显示 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FileTree from './FileTabContent/FileTree.vue'
import type { FilesTabContentProps, FileChange } from '@/type/codeReview'

const props = defineProps<FilesTabContentProps>()

const searchQuery = ref('')
const selectedFile = ref<FileChange | null>(null)

const updateSearchQuery = (query: string) => {
  searchQuery.value = query
}

const handleFileSelected = (file: FileChange) => {
  selectedFile.value = file
  // 这里可以添加处理文件选择的逻辑
  console.log('Selected file:', file)
}
</script>

<style scoped>
.files-tab-content {
  display: flex;
}

.file-content {
  flex: 1;
  padding: 20px;
}
</style>