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
        <div class="file-header" 
             @click="selectFile(file)"
             :class="{ 'expanded': expandedFiles.has(file.filename) }">
          <div class="file-info-container">
            <Button variant="ghost" size="icon" type="button" class="btn-octicon" aria-label="Toggle diff contents">
              <CaretDown v-if="expandedFiles.has(file.filename)" :size="16" weight="bold" />
              <CaretRight v-else :size="16" weight="bold" />
            </Button>

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

            <div class="file-status-wrapper">
              <Badge variant="outline" class="file-status">{{ getStatusText(file.status) }}</Badge>
            </div>
          </div>

          <div class="file-actions">
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const getStatusText = (status: string): string => {
  switch (status) {
    case 'added':
      return 'Added'
    case 'removed':
      return 'Removed'
    case 'renamed':
      return 'Renamed'
    case 'modified':
      return 'Modified'
    default:
      return status
  }
}
</script>

<style scoped>
.files-tab-content {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
  gap: 1rem;
  height: calc(100vh - 210px);
  margin-top: 0.75rem;
}

.file-tree-container {
  min-width: 0;
  overflow-y: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--card));
}

.file-content {
  flex: 1;
  padding: 0.2rem;
  overflow-y: auto;
  min-width: 0;
}

.file-content.file-diff-list {
  padding: 0.1rem;
}

.file-diff-item {
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  margin-bottom: 0.9rem;
  background-color: hsl(var(--card));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.08);
}

.file-header {
  z-index: 2;
  padding: 0.55rem 0.85rem;
  background-color: hsl(var(--muted) / 0.5);
  border-bottom: 1px solid hsl(var(--border));
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.file-header:hover {
  background-color: hsl(var(--accent));
}

.file-header.expanded {
  border-bottom: 1px solid hsl(var(--border));
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.file-info-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  min-width: 0;
}

.btn-octicon {
  margin-right: 0.2rem;
  flex-shrink: 0;
  height: 1.7rem;
  width: 1.7rem;
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
  color: hsl(var(--foreground));
  font-size: 0.8rem;
}

.file-status-wrapper {
  flex-shrink: 0;
}

.file-status {
  padding: 0.12rem 0.42rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.1;
}

.file-actions {
  flex-shrink: 0;
  font-size: 0.75rem;
}

.file-stats {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
}

.changes {
  color: hsl(var(--muted-foreground));
}

.diffstat {
  font-size: 0.72rem;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  cursor: default;
}

.diffstat-block {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 1px;
}

.diffstat-block-added {
  background-color: hsl(var(--foreground));
}

.diffstat-block-deleted {
  background-color: hsl(var(--foreground));
}

.diffstat-block-neutral {
  background-color: hsl(var(--muted));
  outline: 1px solid hsl(var(--border));
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
  border-bottom: 1px solid hsl(var(--border));
  overflow: hidden;
}

.github-style-diff-view {
  background-color: hsl(var(--card));
  border-radius: 0 0 0.75rem 0.75rem;
}

@media (max-width: 1024px) {
  .files-tab-content {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 240px);
  }

  .file-tree-container {
    max-height: 280px;
  }
}

@media (max-width: 700px) {
  .file-header {
    padding: 0.5rem 0.6rem;
  }

  .file-actions {
    display: none;
  }
}
</style>
