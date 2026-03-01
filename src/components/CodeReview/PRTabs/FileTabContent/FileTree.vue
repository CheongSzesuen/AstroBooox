<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <div class="sticky top-0 z-10 border-b border-border bg-card px-3 py-2">
      <div class="relative">
        <Input
          v-model="searchQuery"
          class="h-8 pl-8 text-xs"
          placeholder="Filter changed files"
          aria-label="Filter changed files"
          autocomplete="off"
        />
        <MagnifyingGlass
          aria-hidden="true"
          :size="15"
          weight="bold"
          class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>

    <nav aria-label="File Tree Navigation" class="max-h-[18rem] overflow-y-auto px-2 py-2 lg:max-h-[calc(100vh-16rem)]">
      <ul class="space-y-0.5" role="tree" aria-label="File Tree">
        <template v-for="item in displayItems" :key="getItemKey(item)">
          <li v-if="isFolderItem(item)" role="treeitem" :data-depth="item.depth">
            <button
              type="button"
              class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
              @click="toggleFolder(item.path)"
            >
              <CaretDown
                aria-hidden="true"
                :size="15"
                weight="bold"
                :class="['shrink-0 text-muted-foreground transition-transform duration-200', { '-rotate-90': !isFolderOpen(item.path) }]"
              />
              <Folder aria-label="Directory" aria-hidden="true" :size="15" weight="fill" class="shrink-0 text-muted-foreground" />
              <span class="truncate">{{ item.label }}</span>
            </button>
          </li>

          <li v-else-if="isFileItem(item)" role="treeitem" :aria-level="item.depth + 1" :data-depth="item.depth">
            <button
              type="button"
              class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
              @click="selectFile(item.file)"
            >
              <File aria-label="File" aria-hidden="true" :size="15" weight="duotone" class="shrink-0 text-muted-foreground" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <component
                :is="getStatusIconComponent(item.file.status)"
                :title="item.file.status"
                aria-hidden="true"
                :size="15"
                weight="fill"
                :class="['shrink-0', getStatusIconClass(item.file.status)]"
              />
            </button>
          </li>
        </template>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PhArrowBendDownRight as ArrowBendDownRight,
  PhCaretDown as CaretDown,
  PhCircle as Circle,
  PhFile as File,
  PhFolder as Folder,
  PhMagnifyingGlass as MagnifyingGlass,
  PhMinusSquare as MinusSquare,
  PhPlusSquare as PlusSquare
} from '@phosphor-icons/vue'
import { Input } from '@/components/ui/input'
import type { FileChange } from '@/type/codeReview'

interface Props {
  changedFiles: FileChange[]
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'file-selected', file: FileChange): void
}>()

interface FolderItem {
  type: 'folder'
  path: string
  label: string
  depth: number
}

interface FileItem {
  type: 'file'
  file: FileChange
  label: string
  depth: number
}

type DisplayItem = FolderItem | FileItem

const searchQuery = ref('')
const openFolders = ref<Set<string>>(new Set())

const isFolderItem = (item: DisplayItem): item is FolderItem => item.type === 'folder'
const isFileItem = (item: DisplayItem): item is FileItem => item.type === 'file'

const getStatusIconComponent = (status: string) => {
  if (status === 'added') return PlusSquare
  if (status === 'removed') return MinusSquare
  if (status === 'renamed') return ArrowBendDownRight
  return Circle
}

const getStatusIconClass = (status: string): string => {
  switch (status) {
    case 'added':
    case 'removed':
    case 'modified':
    case 'renamed':
      return 'text-foreground'
    default:
      return 'text-muted-foreground'
  }
}

const displayItems = computed(() => {
  let filesToProcess = props.changedFiles
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filesToProcess = props.changedFiles.filter(file =>
      file.filename.toLowerCase().includes(query)
    )
  }

  const items: DisplayItem[] = []
  const rootFiles: FileItem[] = []

  if (!searchQuery.value.trim()) {
    const rootFilesList: FileChange[] = []
    const nonRootFilesList: FileChange[] = []

    filesToProcess.forEach(file => {
      if (isRootFile(file.filename)) {
        rootFilesList.push(file)
      } else {
        nonRootFilesList.push(file)
      }
    })

    rootFilesList.forEach(file => {
      rootFiles.push({
        type: 'file',
        file,
        label: file.filename,
        depth: 0
      })
    })

    const folderPaths = new Set<string>()
    nonRootFilesList.forEach(file => {
      const dir = getFolderPath(file.filename)
      if (dir) {
        let current = ''
        const parts = dir.split('/')
        for (let i = 0; i < parts.length; i++) {
          current += (i > 0 ? '/' : '') + parts[i]
          folderPaths.add(current)
        }
      }
    })

    const sortedFolders = Array.from(folderPaths).sort((a, b) => {
      const depthA = a.split('/').length
      const depthB = b.split('/').length
      if (depthA !== depthB) return depthA - depthB
      return a.localeCompare(b)
    })

    sortedFolders.forEach(folderPath => {
      const parts = folderPath.split('/')
      const depth = parts.length - 1
      const label = parts[parts.length - 1]

      items.push({
        type: 'folder',
        path: folderPath,
        label,
        depth
      })
    })

    const sortedNonRootFiles = nonRootFilesList.sort((a, b) => {
      const depthA = a.filename.split('/').length
      const depthB = b.filename.split('/').length
      if (depthA !== depthB) return depthA - depthB
      return a.filename.localeCompare(b.filename)
    })

    sortedNonRootFiles.forEach(file => {
      const parts = file.filename.split('/')
      const label = parts[parts.length - 1]
      const depth = parts.length - 1

      items.push({
        type: 'file',
        file,
        label,
        depth
      })
    })

    return [...rootFiles, ...items]
  }

  const folderPaths = new Set<string>()
  filesToProcess.forEach(file => {
    const dir = getFolderPath(file.filename)
    if (dir) {
      let current = ''
      const parts = dir.split('/')
      for (let i = 0; i < parts.length; i++) {
        current += (i > 0 ? '/' : '') + parts[i]
        folderPaths.add(current)
      }
    } else {
      rootFiles.push({
        type: 'file',
        file,
        label: file.filename,
        depth: 0
      })
    }
  })

  const sortedFolders = Array.from(folderPaths).sort((a, b) => {
    const depthA = a.split('/').length
    const depthB = b.split('/').length
    if (depthA !== depthB) return depthA - depthB
    return a.localeCompare(b)
  })

  sortedFolders.forEach(folderPath => {
    const parts = folderPath.split('/')
    const depth = parts.length - 1
    const label = parts[parts.length - 1]

    let isVisible = true
    const pathParts = folderPath.split('/')
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i).join('/')
      if (!isFolderOpen(parentPath)) {
        isVisible = false
        break
      }
    }

    if (isVisible) {
      items.push({
        type: 'folder',
        path: folderPath,
        label,
        depth
      })
    }
  })

  filesToProcess.forEach(file => {
    const filePath = file.filename
    const dir = getFolderPath(filePath)
    const parts = filePath.split('/')
    const label = parts[parts.length - 1]
    const depth = parts.length - 1

    if (dir === '') {
      return
    }

    let isVisible = true
    const pathParts = dir.split('/')
    for (let i = 0; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i + 1).join('/')
      if (!isFolderOpen(parentPath)) {
        isVisible = false
        break
      }
    }

    if (isVisible) {
      items.push({
        type: 'file',
        file,
        label,
        depth
      })
    }
  })

  return [...rootFiles, ...items]
})

const getItemKey = (item: DisplayItem): string => {
  if (isFolderItem(item)) {
    return `folder-${item.path}`
  }
  return `file-${item.file.filename}`
}

const isFolderOpen = (folderPath: string) => openFolders.value.has(folderPath)

const toggleFolder = (folderPath: string) => {
  const isOpen = openFolders.value.has(folderPath)
  if (isOpen) {
    const toRemove = Array.from(openFolders.value).filter(path =>
      path === folderPath || path.startsWith(folderPath + '/')
    )
    toRemove.forEach(p => openFolders.value.delete(p))
  } else {
    openFolders.value.add(folderPath)
  }
}

const isRootFile = (filename: string) => !filename.includes('/')

const getFolderPath = (filename: string) => {
  const parts = filename.split('/')
  return parts.length <= 1 ? '' : parts.slice(0, -1).join('/')
}

const selectFile = (file: FileChange) => {
  emit('file-selected', file)
}
</script>
