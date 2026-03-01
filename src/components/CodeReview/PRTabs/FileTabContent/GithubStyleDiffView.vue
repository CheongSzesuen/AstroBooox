<template>
  <div class="github-style-diff-view">
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

</script>

<style scoped>
.github-style-diff-view {
  background-color: hsl(var(--card));
  border-radius: 0 0 0.75rem 0.75rem;
}

.diff-content {
  overflow-x: auto;
  border-radius: 0 0 0.75rem 0.75rem;
  margin-bottom: 0;
}

.diff-content.empty {
  padding: 1rem;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-style: italic;
  font-size: 0.82rem;
}

.diff-lines {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 10.5px;
  line-height: 1.45;
  margin-bottom: 0;
}

.diff-line {
  display: flex;
  min-height: 1.2rem;
  border-bottom: 1px solid hsl(var(--border));
}

.diff-line:last-child {
  border-bottom: none;
}

.diff-line.added {
  background-color: hsl(var(--muted) / 0.35);
}

.diff-line.added .line-content {
  background-color: hsl(var(--muted) / 0.45);
}

.diff-line.removed {
  background-color: hsl(var(--muted) / 0.35);
}

.diff-line.removed .line-content {
  background-color: hsl(var(--muted) / 0.45);
}

.diff-line.meta {
  background-color: hsl(var(--muted) / 0.6);
  color: hsl(var(--muted-foreground));
}

.line-number {
  padding: 0 0.45rem;
  min-width: 2.35rem;
  text-align: right;
  color: hsl(var(--muted-foreground));
  user-select: none;
  background-color: hsl(var(--muted) / 0.55);
}

.line-number-old {
  border-right: 1px solid hsl(var(--border));
}

.line-number-new {
  border-left: 1px solid hsl(var(--border));
}

.line-content {
  flex: 1;
  padding: 0 0.55rem;
  white-space: pre;
}

@media (max-width: 640px) {
  .diff-lines {
    font-size: 10px;
  }

  .line-number {
    min-width: 2.1rem;
    padding: 0 0.35rem;
  }
}
</style>
