<template>
  <div class="github-style-diff-view">
    <div class="file-header">
      <div class="file-info">
        <span class="filename">{{ file.filename }}</span>
        <span class="file-stats">
          <span class="changes-count">{{ file.changes }} changes</span>
        </span>
      </div>
      <div class="file-actions">
        <button class="btn-octicon" title="Copy file path" @click="copyFilePath">
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="diff-content" v-if="file.patch">
      <div class="diff-lines">
        <div 
          v-for="(line, index) in diffLines" 
          :key="index" 
          class="diff-line"
          :class="getLineClass(line)"
        >
          <div class="line-number line-number-old">
            <span v-if="!line.startsWith('+') && !line.startsWith('@@')">{{ getOldLineNumber(index) }}</span>
          </div>
          <div class="line-number line-number-new">
            <span v-if="!line.startsWith('-') && !line.startsWith('@@')">{{ getNewLineNumber(index) }}</span>
          </div>
          <div class="line-content">
            <span>{{ line }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="diff-content empty" v-else>
      <p>Binary file not shown</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileChange } from '@/type/codeReview'

const props = defineProps<{
  file: FileChange
}>()

// 跟踪行号的状态
const oldLineNumbers = ref<number[]>([])
const newLineNumbers = ref<number[]>([])

// 将patch文本按行分割并计算行号
const diffLines = computed(() => {
  if (!props.file.patch) return []
  
  const lines = props.file.patch.split('\n')
  oldLineNumbers.value = Array(lines.length).fill(0)
  newLineNumbers.value = Array(lines.length).fill(0)
  
  let oldLine = 0
  let newLine = 0
  
  lines.forEach((line, index) => {
    if (line.startsWith('@@')) {
      // 解析hunk头，例如: @@ -1,4 +1,5 @@
      const hunkMatch = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (hunkMatch) {
        oldLine = parseInt(hunkMatch[1], 10) - 1
        newLine = parseInt(hunkMatch[2], 10) - 1
      }
    } else if (line.startsWith('-')) {
      oldLine++
      oldLineNumbers.value[index] = oldLine
    } else if (line.startsWith('+')) {
      newLine++
      newLineNumbers.value[index] = newLine
    } else {
      oldLine++
      newLine++
      oldLineNumbers.value[index] = oldLine
      newLineNumbers.value[index] = newLine
    }
  })
  
  return lines
})

// 获取行的CSS类
const getLineClass = (line: string) => {
  if (line.startsWith('+')) {
    return 'added'
  } else if (line.startsWith('-')) {
    return 'removed'
  } else if (line.startsWith('@@')) {
    return 'meta'
  }
  return ''
}

// 获取指定索引处的旧行号
const getOldLineNumber = (index: number) => {
  return oldLineNumbers.value[index] || ''
}

// 获取指定索引处的新行号
const getNewLineNumber = (index: number) => {
  return newLineNumbers.value[index] || ''
}

// 复制文件路径到剪贴板
const copyFilePath = () => {
  navigator.clipboard.writeText(props.file.filename)
    .then(() => {
      console.log('File path copied to clipboard')
    })
    .catch(err => {
      console.error('Failed to copy file path: ', err)
    })
}
</script>

<style scoped>
.github-style-diff-view {
  border: 1px solid #d0d7de;
  border-radius: 6px;
  margin-bottom: 16px;
  background-color: #fff;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #d0d7de;
  background-color: #f6f8fa;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}

.filename {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  font-weight: 600;
}

.file-stats {
  margin-left: 8px;
  font-size: 12px;
  color: #656d76;
}

.btn-octicon {
  display: inline-block;
  padding: 4px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #656d76;
  vertical-align: middle;
}

.btn-octicon:hover {
  color: #0969da;
  background-color: #eaeef2;
  border-radius: 6px;
}

.diff-content {
  overflow-x: auto;
}

.diff-content.empty {
  padding: 24px;
  text-align: center;
  color: #656d76;
  font-size: 14px;
}

.diff-lines {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
}

.diff-line {
  display: flex;
}

.diff-line.added {
  background-color: #e6ffec;
}

.diff-line.added .line-content {
  background-color: rgba(46, 160, 67, 0.15);
}

.diff-line.removed {
  background-color: #ffebe9;
}

.diff-line.removed .line-content {
  background-color: rgba(248, 81, 73, 0.15);
}

.diff-line.meta {
  background-color: #f0f5ff;
  color: #656d76;
}

.line-number {
  padding: 0 8px;
  min-width: 40px;
  text-align: right;
  color: rgba(101, 109, 118, 0.75);
  user-select: none;
  background-color: #f6f8fa;
}

.line-number-old {
  border-right: 1px solid #eaeef2;
}

.line-number-new {
  border-right: 1px solid #eaeef2;
}

.line-content {
  flex: 1;
  padding: 0 12px;
  white-space: pre;
}
</style>