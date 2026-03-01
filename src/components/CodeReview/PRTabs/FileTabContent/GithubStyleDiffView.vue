<template>
  <div class="rounded-b-xl bg-card">
    <div v-if="file.patch" class="scrollbar-none overflow-x-auto rounded-b-xl">
      <div class="font-mono text-xs leading-5">
        <div
          v-for="(line, index) in diffLines"
          :key="index"
          :class="lineRowClass(line)"
        >
          <div class="select-none border-r border-border bg-muted/55 px-1.5 text-right text-muted-foreground">
            <span v-if="!line.startsWith('+') && !line.startsWith('@@')">{{ getOldLineNumber(index) }}</span>
          </div>
          <div class="select-none border-l border-border bg-muted/55 px-1.5 text-right text-muted-foreground">
            <span v-if="!line.startsWith('-') && !line.startsWith('@@')">{{ getNewLineNumber(index) }}</span>
          </div>
          <div :class="lineContentClass(line)">
            <span>{{ line }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rounded-b-xl p-4 text-center text-sm italic text-muted-foreground">
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

const oldLineNumbers = ref<number[]>([])
const newLineNumbers = ref<number[]>([])

const diffLines = computed(() => {
  if (!props.file.patch) return []

  const lines = props.file.patch.split('\n')
  oldLineNumbers.value = Array(lines.length).fill(0)
  newLineNumbers.value = Array(lines.length).fill(0)

  let oldLine = 0
  let newLine = 0

  lines.forEach((line, index) => {
    if (line.startsWith('@@')) {
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

const lineRowClass = (line: string): string[] => [
  'grid min-h-[1.5rem] grid-cols-[2.75rem_2.75rem_minmax(0,1fr)] border-b border-border last:border-b-0',
  line.startsWith('@@') ? 'bg-muted/60 text-muted-foreground' : 'bg-transparent',
  (line.startsWith('+') || line.startsWith('-')) ? 'bg-muted/35' : ''
]

const lineContentClass = (line: string): string[] => [
  'whitespace-pre px-2.5',
  (line.startsWith('+') || line.startsWith('-')) ? 'bg-muted/45' : ''
]

const getOldLineNumber = (index: number) => oldLineNumbers.value[index] || ''
const getNewLineNumber = (index: number) => newLineNumbers.value[index] || ''
</script>
