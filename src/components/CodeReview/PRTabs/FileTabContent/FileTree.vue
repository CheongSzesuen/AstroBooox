<!-- src/components/FileTree.vue -->
<template>
  <div class="Layout Layout--sidebarPosition-start Layout-sidebar hx_Layout--sidebar position-sticky overflow-y-auto"
       :style="{ top: '0', height: '100%' }">
    <div class="Layout-sidebar">
      <!-- Search box -->
      <div class="subnav-search-container">
        <div class="subnav-search">
          <Input
            class="form-control input-block pl-5 js-filterable-field"
            placeholder="Filter changed files"
            aria-label="Filter changed files"
            v-model="searchQuery"
            autocomplete="off"
          />
          <MagnifyingGlass aria-hidden="true" :size="16" weight="bold" class="subnav-search-icon" />
        </div>
      </div>

      <!-- File tree -->
      <nav aria-label="File Tree Navigation">
        <ul class="ActionList ActionList--tree ActionList--full" role="tree" aria-label="File Tree">
          <template v-for="item in displayItems" :key="getItemKey(item)">
            <!-- 文件夹行 -->
            <li
              v-if="isFolderItem(item)"
              class="ActionList-item js-tree-node"
              role="treeitem"
              :data-depth="item.depth"
            >
              <div class="ActionList-content hx_ActionList-content" @click="toggleFolder(item.path)">
                <!-- 缩进占位符 -->
                <template v-if="item.depth > 0">
                  <span
                    v-for="n in item.depth"
                    :key="n"
                    class="ActionList-item-visual ActionList-item-visual--leading"
                    style="width: 16px; min-height: 20px;"
                  ></span>
                </template>

                <span class="ActionList-item-action ActionList-item-action--leading">
                  <CaretDown
                    aria-hidden="true"
                    :size="16"
                    weight="bold"
                    class="ActionList-item-collapseIcon"
                    :class="{ 'rotate-90': !isFolderOpen(item.path) }"
                  />
                </span>
                <span class="ActionList-item-visual ActionList-item-visual--leading">
                  <Folder aria-label="Directory" aria-hidden="true" :size="16" weight="fill" class="icon-muted" />
                </span>
                <span class="ActionList-item-label ActionList-item-label--truncate">
                  {{ item.label }}
                </span>
              </div>
            </li>

            <!-- 文件行 -->
            <li
              v-else-if="isFileItem(item)"
              class="ActionList-item js-tree-node"
              role="treeitem"
              :aria-level="item.depth + 1"
              :data-depth="item.depth"
            >
              <div class="ActionList-content hx_ActionList-content" @click="selectFile(item.file)">
                <!-- 缩进占位符 -->
                <span
                  v-for="n in item.depth"
                  :key="n"
                  class="ActionList-item-visual ActionList-item-visual--leading"
                  style="width: 16px; min-height: 20px;"
                ></span>

                <span class="ActionList-item-visual ActionList-item-visual--leading" style="width: 20px;">
                  <File aria-label="File" aria-hidden="true" :size="16" weight="duotone" class="icon-muted" />
                </span>
                <span
                  class="ActionList-item-label ActionList-item-label--truncate"
                >
                  {{ item.label }}
                </span>
                <span class="ActionList-item-visual ActionList-item-visual--trailing">
                  <component
                    :is="getStatusIconComponent(item.file.status)"
                    :title="item.file.status"
                    aria-hidden="true"
                    :size="16"
                    weight="fill"
                    :style="getStatusIconColor(item.file.status)"
                  />
                </span>
              </div>
            </li>
          </template>
        </ul>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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

// 定义 props
interface Props {
  changedFiles: FileChange[]
}
const props = defineProps<Props>()

// 定义 emits
const emit = defineEmits<{
  (e: 'file-selected', file: FileChange): void
}>()

// 定义类型
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

// 类型守卫函数
const isFolderItem = (item: DisplayItem): item is FolderItem => {
  return item.type === 'folder'
}

const isFileItem = (item: DisplayItem): item is FileItem => {
  return item.type === 'file'
}

const getStatusIconComponent = (status: string) => {
  if (status === 'added') return PlusSquare
  if (status === 'removed') return MinusSquare
  if (status === 'renamed') return ArrowBendDownRight
  return Circle
}

// --- 新增和修改的逻辑 ---

// 1. 计算所有唯一的文件夹路径
const allFolders = computed(() => {
  const folders = new Set<string>()
  props.changedFiles.forEach(file => {
    const dir = getFolderPath(file.filename)
    if (dir) { // 只添加非空的路径（即非根目录文件）
      folders.add(dir)
    }
  })
  return Array.from(folders).sort() // 排序以确保层级顺序正确
})

// 2. 计算最终用于显示的项目列表（文件夹和文件）
const displayItems = computed(() => {
  let filesToProcess = props.changedFiles
  // 应用搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filesToProcess = props.changedFiles.filter(file =>
      file.filename.toLowerCase().includes(query)
    )
  }

  const items: DisplayItem[] = []
  const rootFiles: FileItem[] = []

  // 如果没有搜索查询，则显示所有文件和文件夹，但按照层级排序
  // 即使没有打开的文件夹，也要显示所有文件
  if (!searchQuery.value.trim()) {
    // 首先分离出根目录文件
    const rootFilesList: FileChange[] = []
    const nonRootFilesList: FileChange[] = []
    
    filesToProcess.forEach(file => {
      if (isRootFile(file.filename)) {
        rootFilesList.push(file)
      } else {
        nonRootFilesList.push(file)
      }
    })

    // 添加根目录文件到rootFiles数组
    rootFilesList.forEach(file => {
      rootFiles.push({
        type: 'file',
        file: file,
        label: file.filename,
        depth: 0
      })
    })

    // 收集所有非根目录文件的文件夹路径
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

    // 构建文件夹项（按层级顺序）
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

      // 总是显示文件夹（因为我们想显示所有内容）
      items.push({
        type: 'folder',
        path: folderPath,
        label,
        depth
      })
    })

    // 添加所有非根目录文件项，按照路径深度排序
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
      
      // 总是显示文件（因为我们想显示所有内容）
      items.push({
        type: 'file',
        file,
        label,
        depth
      })
    })
    
    return [...rootFiles, ...items]
  }

  // Step 1: 收集所有相关的文件夹路径
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
      // 根目录文件
      rootFiles.push({
        type: 'file',
        file: file,
        label: file.filename,
        depth: 0
      })
    }
  })

  // Step 2: 构建文件夹项（按层级顺序）
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

    // 检查所有祖先路径是否都展开
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

  // Step 3: 添加文件项（包括根目录文件）
  filesToProcess.forEach(file => {
    const filePath = file.filename
    const dir = getFolderPath(filePath)
    const parts = filePath.split('/')
    const label = parts[parts.length - 1]
    const depth = parts.length - 1

    if (dir === '') {
      // 已在 rootFiles 中处理
      return
    }

    // 检查所有祖先路径是否都展开
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

  // Step 4: 插入根目录文件在最前面
  return [...rootFiles, ...items]
})

// 获取项目的 key（用于模板）
const getItemKey = (item: DisplayItem): string => {
  if (isFolderItem(item)) {
    return `folder-${item.path}`
  } else {
    return `file-${item.file.filename}`
  }
}

// 获取文件夹是否展开状态
const isFolderOpen = (folderPath: string) => {
  return openFolders.value.has(folderPath)
}

// 切换文件夹展开状态
const toggleFolder = (folderPath: string) => {
  const isOpen = openFolders.value.has(folderPath)
  if (isOpen) {
    // 关闭当前文件夹及其所有子文件夹
    const toRemove = Array.from(openFolders.value).filter(path =>
      path === folderPath || path.startsWith(folderPath + '/')
    )
    toRemove.forEach(p => openFolders.value.delete(p))
  } else {
    openFolders.value.add(folderPath)
  }
}

// --- 辅助函数 ---

// 判断是否是根目录文件
const isRootFile = (filename: string) => {
  return !filename.includes('/')
}

// 获取文件夹路径
const getFolderPath = (filename: string) => {
  const parts = filename.split('/')
  return parts.length <= 1 ? '' : parts.slice(0, -1).join('/')
}

// 获取文件状态图标颜色
const getStatusIconColor = (status: string) => {
  switch (status) {
    case 'added': return 'color: hsl(var(--foreground))'
    case 'removed': return 'color: hsl(var(--foreground))'
    case 'modified': return 'color: hsl(var(--foreground))'
    case 'renamed': return 'color: hsl(var(--foreground))'
    default: return 'color: hsl(var(--muted-foreground))'
  }
}

// 选择文件并发出事件
const selectFile = (file: FileChange) => {
  emit('file-selected', file)
}
</script>

<style scoped>
/* Layout styles */
.Layout {
  display: grid;
  --Layout-sidebar-width: 296px;
  --Layout-gutter: 24px;
  height: 100%;
}

.Layout--sidebarPosition-start .Layout-sidebar {
  grid-column: 1;
}

.Layout-sidebar {
  width: var(--Layout-sidebar-width);
  background-color: hsl(var(--card));
  overflow-x: hidden;
}

.hx_Layout--sidebar {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.position-sticky {
  position: sticky !important;
}

.overflow-y-auto {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.subnav-search-container {
  padding: 0 16px;
  margin-bottom: 8px;
}

.subnav-search {
  position: relative;
  width: 100%;
}

.subnav-search .form-control {
  display: block;
  width: 100%;
  padding: 6px 12px 6px 32px;
  font-size: 14px;
  line-height: 20px;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--input));
  border-radius: 6px;
  outline: none;
  box-shadow: none;
  box-sizing: border-box;
}

.subnav-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  width: 16px;
  height: 16px;
  margin-top: -8px;
  color: hsl(var(--muted-foreground));
}

.ActionList {
  list-style: none;
  padding: 0 16px;
  margin: 0;
  background-color: hsl(var(--card));
  width: 100%;
  box-sizing: border-box;
}

.ActionList--tree {
  --ActionList-tree-depth: 1;
}

.ActionList--full {
  padding: 0;
}

.ActionList-item {
  position: relative;
}

/* 层级线 - 只对有深度的项目显示，根目录不显示 */
.ActionList-item[data-depth]:not([data-depth="0"]) .ActionList-content::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--depth-offset, 0) * 16px + 12px);
  width: 1px;
  background-color: hsl(var(--border));
  z-index: 1;
}

.ActionList-content {
  position: relative;
  display: flex;
  width: 100%;
  padding: 6px 0;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--foreground));
  text-align: left;
  user-select: none;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  transition: background 0.1s ease;
  align-items: center;
  cursor: pointer;
}

.ActionList-content:hover {
  background-color: hsl(var(--accent));
}

.ActionList-item-action {
  display: flex;
  min-height: 20px;
  pointer-events: none;
  align-items: center;
  flex-shrink: 0;
}

.ActionList-item-action--leading {
  margin-right: 4px;
  width: 16px;
}

.ActionList-item-visual {
  display: flex;
  min-height: 20px;
  pointer-events: none;
  align-items: center;
  flex-shrink: 0;
}

.ActionList-item-visual--leading {
  margin-right: 4px;
}

.ActionList-item-visual--trailing {
  margin-left: 8px;
}

.ActionList-item-label {
  position: relative;
  font-weight: 400;
  line-height: 20px;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}

.octicon {
  display: inline-block;
  overflow: visible !important;
  vertical-align: text-bottom;
  fill: currentColor;
}

/* 箭头旋转动画 */
.ActionList-item-collapseIcon {
  transition: transform 0.2s ease;
}

.rotate-90 {
  transform: rotate(-90deg);
}

.icon-muted {
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1012px) {
  .Layout {
    --Layout-sidebar-width: 256px;
  }
}

@media (max-width: 768px) {
  .Layout {
    --Layout-sidebar-width: 220px;
  }
}

@media (max-width: 544px) {
  .Layout {
    --Layout-sidebar-width: 100%;
  }

  .subnav-search-container,
  .ActionList {
    padding: 0 12px;
  }
}
</style>
