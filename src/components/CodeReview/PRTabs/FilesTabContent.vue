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
    <div class="file-content" v-if="selectedFile">
      <GithubStyleDiffView :file="selectedFile" />
    </div>
    <div class="file-content placeholder" v-else>
      <p>Select a file to view its content</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileTree from './FileTabContent/FileTree.vue'
import GithubStyleDiffView from './FileTabContent/GithubStyleDiffView.vue'
import type { FilesTabContentProps, FileChange } from '@/type/codeReview'

const props = defineProps<FilesTabContentProps>()

const selectedFile = ref<FileChange | null>(null)

const handleFileSelected = (file: FileChange) => {
  selectedFile.value = file
  console.log('Selected file:', file)
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

.file-content.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}
</style>