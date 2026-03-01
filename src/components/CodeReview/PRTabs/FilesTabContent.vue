<!-- src/components/CodeReview/PRTabs/FilesTabContent.vue -->
<template>
  <div class="mt-3 grid gap-4 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)]">
    <div class="min-w-0 lg:sticky lg:top-0 lg:max-h-[calc(100vh-13rem)]">
      <FileTree
        :changed-files="changedFiles"
        @file-selected="handleFileSelected"
      />
    </div>

    <div class="min-w-0">
      <div class="flex flex-col gap-4">
        <Card
          v-for="file in sortedFiles"
          :key="file.filename"
          :id="getFileCardId(file.filename)"
          class="overflow-hidden border-border bg-card shadow-sm"
        >
          <div
            :class="[
              'flex cursor-pointer items-center justify-between gap-2 border-b border-border px-4 py-3 transition-colors max-[700px]:px-3',
              selectedFile?.filename === file.filename ? 'bg-accent' : 'bg-muted/50 hover:bg-accent'
            ]"
            @click="toggleFile(file)"
          >
            <div class="flex min-w-0 w-full items-center justify-between gap-1.5 font-mono text-[12px]">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                class="h-6.5 w-6.5 shrink-0"
                aria-label="Toggle diff contents"
                @click.stop="toggleFile(file)"
              >
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
import { computed, nextTick, ref, watch } from 'vue'
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

const getFileCardId = (filename: string): string =>
  `file-card-${filename.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const openFilePanel = (filename: string): void => {
  const nextExpanded = new Set(expandedFiles.value)
  nextExpanded.add(filename)
  expandedFiles.value = nextExpanded
}

const toggleFilePanel = (filename: string): void => {
  const nextExpanded = new Set(expandedFiles.value)
  if (nextExpanded.has(filename)) {
    nextExpanded.delete(filename)
  } else {
    nextExpanded.add(filename)
  }
  expandedFiles.value = nextExpanded
}

const handleFileSelected = async (file: FileChange) => {
  selectedFile.value = file
  openFilePanel(file.filename)

  await nextTick()
  const target = document.getElementById(getFileCardId(file.filename))
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => props.changedFiles,
  files => {
    if (!files.length) {
      selectedFile.value = null
      expandedFiles.value = new Set<string>()
      return
    }

    selectedFile.value = files[0]
    expandedFiles.value = new Set(files.map(file => file.filename))
  },
  { immediate: true }
)

const toggleFile = (file: FileChange) => {
  selectedFile.value = file
  toggleFilePanel(file.filename)
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
