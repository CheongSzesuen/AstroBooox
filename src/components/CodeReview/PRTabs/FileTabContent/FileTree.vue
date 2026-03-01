<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <div class="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
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

    <nav aria-label="File Tree Navigation" class="max-h-[18rem] overflow-y-auto px-3 py-3 lg:max-h-[calc(100vh-16rem)]">
      <ul class="space-y-1" role="tree" aria-label="File Tree">
        <template v-for="item in displayItems" :key="getItemKey(item)">
          <li
            v-if="isFolderItem(item)"
            role="treeitem"
            :aria-level="item.depth + 1"
            :aria-expanded="isFolderOpen(item.path)"
            :data-depth="item.depth"
          >
            <button
              type="button"
              :class="[
                'flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors',
                isFolderOpen(item.path) ? 'bg-muted/60' : 'hover:bg-accent'
              ]"
              :style="{ paddingLeft: `${0.75 + item.depth * 1}rem` }"
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
              :class="[
                'flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-xs text-foreground transition-colors',
                selectedFilePath === item.file.filename ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
              ]"
              :style="{ paddingLeft: `${0.75 + item.depth * 1}rem` }"
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
import { computed, ref, watch } from 'vue'
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
const selectedFilePath = ref('')

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

interface TreeNode {
  name: string
  path: string
  folders: Map<string, TreeNode>
  files: FileChange[]
}

const createTreeNode = (name: string, path: string): TreeNode => ({
  name,
  path,
  folders: new Map<string, TreeNode>(),
  files: []
})

const getFileLabel = (filename: string): string => {
  const segments = filename.split('/')
  return segments[segments.length - 1] || filename
}

const sortFiles = (a: FileChange, b: FileChange): number => a.filename.localeCompare(b.filename)

const buildTree = (files: FileChange[]): TreeNode => {
  const root = createTreeNode('', '')

  for (const file of files) {
    const segments = file.filename.split('/')

    if (segments.length <= 1) {
      root.files.push(file)
      continue
    }

    let currentNode = root
    let currentPath = ''

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      if (!currentNode.folders.has(segment)) {
        currentNode.folders.set(segment, createTreeNode(segment, currentPath))
      }

      currentNode = currentNode.folders.get(segment)!
    }

    currentNode.files.push(file)
  }

  return root
}

const flattenTree = (
  node: TreeNode,
  depth: number,
  forceExpand: boolean,
  items: DisplayItem[]
): void => {
  const folders = Array.from(node.folders.values()).sort((a, b) => a.name.localeCompare(b.name))

  for (const folder of folders) {
    items.push({
      type: 'folder',
      path: folder.path,
      label: folder.name,
      depth
    })

    if (forceExpand || isFolderOpen(folder.path)) {
      flattenTree(folder, depth + 1, forceExpand, items)
    }
  }

  const files = [...node.files].sort(sortFiles)
  for (const file of files) {
    items.push({
      type: 'file',
      file,
      label: getFileLabel(file.filename),
      depth
    })
  }
}

const displayItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filesToProcess = query
    ? props.changedFiles.filter(file => file.filename.toLowerCase().includes(query))
    : props.changedFiles

  if (!filesToProcess.length) {
    return []
  }

  const tree = buildTree(filesToProcess)
  const items: DisplayItem[] = []
  flattenTree(tree, 0, Boolean(query), items)

  return items
})

const getItemKey = (item: DisplayItem): string => {
  if (isFolderItem(item)) {
    return `folder-${item.path}`
  }
  return `file-${item.file.filename}`
}

const isFolderOpen = (folderPath: string) => openFolders.value.has(folderPath)

const toggleFolder = (folderPath: string) => {
  const nextOpenFolders = new Set(openFolders.value)
  const isOpen = nextOpenFolders.has(folderPath)

  if (isOpen) {
    const toRemove = Array.from(nextOpenFolders).filter(path =>
      path === folderPath || path.startsWith(folderPath + '/')
    )
    toRemove.forEach(path => nextOpenFolders.delete(path))
  } else {
    nextOpenFolders.add(folderPath)
  }

  openFolders.value = nextOpenFolders
}

const selectFile = (file: FileChange) => {
  selectedFilePath.value = file.filename
  emit('file-selected', file)
}

watch(
  () => props.changedFiles,
  files => {
    const topLevelFolders = new Set<string>()
    for (const file of files) {
      const parts = file.filename.split('/')
      if (parts.length > 1 && parts[0]) {
        topLevelFolders.add(parts[0])
      }
    }
    openFolders.value = topLevelFolders

    if (!files.some(file => file.filename === selectedFilePath.value)) {
      selectedFilePath.value = ''
    }
  },
  { immediate: true }
)
</script>
