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
        <div class="file-header d-flex flex-md-row flex-column flex-md-items-center file-header--expandable sticky-file-header" 
             @click="selectFile(file)"
             :class="{ 'expanded': expandedFiles.has(file.filename) }">
          <div class="file-info-container d-flex align-items-center min-width-0 flex-auto">
            <button type="button" class="btn-octicon js-details-target" aria-label="Toggle diff contents">
              <CaretDown v-if="expandedFiles.has(file.filename)" :size="16" weight="bold" />
              <CaretRight v-else :size="16" weight="bold" />
            </button>

            <div class="diffstat-summary mr-2">
              <span class="sr-only">
                {{ file.changes }} changes
              </span>
              <span class="diffstat" aria-hidden="true">
                {{ file.changes }}
                <span v-for="i in 5" :key="i" 
                      :class="[
                        'diffstat-block', 
                        i <= Math.min(5, file.changes) ? 'diffstat-block-added' : 
                        'diffstat-block-neutral'
                      ]"></span>
              </span>
            </div>

            <div class="file-info Truncate flex-auto">
              <span class="file-name Truncate-text">{{ file.filename }}</span>
            </div>

            <div class="file-status-wrapper ml-2">
              <span :class="['file-status', file.status]">{{ file.status }}</span>
            </div>
          </div>

          <div class="file-actions d-flex flex-items-center">
            <div class="file-stats">
              <span class="changes">{{ file.changes }} changes</span>
            </div>
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
import { PhCaretDown as CaretDown, PhCaretRight as CaretRight } from '@phosphor-icons/vue'
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
  margin-right: 20px; /* 添加右边距 */
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
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  margin-bottom: 16px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.file-header {
  z-index: 2;
  padding: 8px 16px;
  background-color: #f6f8fa;
  border-bottom: 1px solid #e1e4e8;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-header:hover {
  background-color: #eaeff5;
}

.file-header.expanded {
  border-bottom: 1px solid #e1e4e8;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.file-info-container {
  display: flex;
  align-items: center;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  min-width: 0;
}

.btn-octicon {
  display: inline-block;
  padding: 5px;
  margin-right: 5px;
  line-height: 1;
  color: #57606a;
  vertical-align: middle;
  background: transparent;
  border: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.mr-2 {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

.diffstat-summary {
  flex-shrink: 0;
}

.Truncate {
  display: inline-flex;
  max-width: 100%;
  min-width: 0;
}

.Truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name {
  font-weight: 600;
  color: #032f62;
}

.file-status-wrapper {
  flex-shrink: 0;
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

.file-actions {
  flex-shrink: 0;
  font-size: 12px;
}

.file-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.changes {
  color: #57606a;
}

.diffstat {
  font-size: 12px;
  font-weight: 600;
  color: #57606a;
  white-space: nowrap;
  cursor: default;
}

.diffstat-block {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 1px;
}

.diffstat-block-added {
  background-color: #28a745;
}

.diffstat-block-deleted {
  background-color: #d73a49;
}

.diffstat-block-neutral {
  background-color: #d0d7de;
  outline: 1px solid #d0d7de;
  outline-offset: -1px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.file-diff-content {
  border-bottom: 1px solid #e1e4e8;
  overflow: hidden;
}

.github-style-diff-view {
  background-color: white;
  border-radius: 0 0 6px 6px;
}
</style>
