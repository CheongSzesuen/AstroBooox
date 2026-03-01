<!-- src/components/CodeReview/PRTabs/FilesTabContent.vue -->
<template>
  <div class="mt-2 grid gap-3 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)]">
    <div class="min-w-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-13rem)]">
      <FileTree
        :changed-files="changedFiles"
        @file-selected="handleFileSelected"
      />
    </div>

    <div class="min-w-0">
      <div class="flex flex-col gap-3">
        <Card
          v-for="file in sortedFiles"
          :key="file.filename"
          class="overflow-hidden border-border bg-card shadow-sm"
        >
          <div
            class="flex cursor-pointer items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2 transition-colors hover:bg-accent max-[700px]:px-2"
            @click="selectFile(file)"
          >
            <div class="flex min-w-0 w-full items-center justify-between gap-1.5 font-mono text-[12px]">
              <Button variant="ghost" size="icon" type="button" class="h-6.5 w-6.5 shrink-0" aria-label="Toggle diff contents">
                <CaretDown v-if="expandedFiles.has(file.filename)" :size="16" weight="bold" />
                <CaretRight v-else :size="16" weight="bold" />
              </Button>

              <div class="shrink-0">
                <span class="sr-only">
                  {{ file.changes }} changes
                </span>
                <span class="cursor-default whitespace-nowrap text-[0.68rem] font-semibold text-muted-foreground" aria-hidden="true">
                  {{ file.changes }}
                  <span
                    v-for="i in 5"
                    :key="i"
                    :class="[
                      'ml-px inline-block h-[6px] w-[6px]',
                      i <= Math.min(5, file.changes) ? 'bg-foreground' : 'bg-muted outline outline-1 -outline-offset-1 outline-border'
                    ]"
                  ></span>
                </span>
              </div>

              <div class="min-w-0 flex-1 truncate text-[0.78rem] font-semibold text-foreground">{{ file.filename }}</div>

              <Badge variant="outline" class="shrink-0 rounded-full px-1.5 py-[0.1rem] text-[0.66rem] leading-tight">
                {{ getStatusText(file.status) }}
              </Badge>
            </div>

            <div class="shrink-0 text-[0.72rem] text-muted-foreground max-[700px]:hidden">
              {{ file.changes }} changes
            </div>
          </div>

          <div v-show="expandedFiles.has(file.filename)" class="border-b border-border">
            <GithubStyleDiffView :file="file" />
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PhCaretDown as CaretDown, PhCaretRight as CaretRight } from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import FileTree from './FileTabContent/FileTree.vue'
import GithubStyleDiffView from './FileTabContent/GithubStyleDiffView.vue'
import type { FilesTabContentProps, FileChange } from '@/type/codeReview'

const props = defineProps<FilesTabContentProps>()

const selectedFile = ref<FileChange | null>(null)
const expandedFiles = ref<Set<string>>(new Set())

const sortedFiles = computed(() => {
  return [...props.changedFiles].sort((a, b) => {
    const depthA = a.filename.split('/').length
    const depthB = b.filename.split('/').length
    if (depthA !== depthB) return depthA - depthB

    return a.filename.localeCompare(b.filename)
  })
})

const handleFileSelected = (file: FileChange) => {
  selectedFile.value = file
  console.log('Selected file:', file)
}

onMounted(() => {
  if (props.changedFiles && props.changedFiles.length > 0) {
    selectedFile.value = props.changedFiles[0]
    props.changedFiles.forEach(file => {
      expandedFiles.value.add(file.filename)
    })
  }
})

const selectFile = (file: FileChange) => {
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
