<template>
  <div class="Layout Layout--sidebarPosition-start Layout-sidebar hx_Layout--sidebar position-sticky overflow-y-auto"
       :style="{ top: '60px', height: '555px' }">
    <div class="Layout-sidebar">
      <!-- Search box -->
      <div class="subnav-search-container">
        <div class="subnav-search">
          <input
            type="text"
            class="form-control input-block pl-5 js-filterable-field"
            placeholder="Filter changed files"
            aria-label="Filter changed files"
            v-model="searchQuery"
            autocomplete="off"
          >
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-search subnav-search-icon">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
          </svg>
        </div>
      </div>

      <!-- File tree -->
      <nav aria-label="File Tree Navigation">
        <ul class="ActionList ActionList--tree ActionList--full" role="tree" aria-label="File Tree">
          <template v-for="item in displayItems" :key="item.type + '-' + (item.path || item.file.filename)">
            <!-- 文件夹行 -->
            <li
              v-if="item.type === 'folder'"
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
                  <svg
                    aria-hidden="true"
                    height="16"
                    viewBox="0 0 16 16"
                    version="1.1"
                    width="16"
                    class="octicon octicon-chevron-down ActionList-item-collapseIcon"
                    :class="{ 'rotate-90': !isFolderOpen(item.path) }"
                  >
                    <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"></path>
                  </svg>
                </span>
                <span class="ActionList-item-visual ActionList-item-visual--leading">
                  <svg
                    aria-label="Directory"
                    aria-hidden="true"
                    height="16"
                    viewBox="0 0 16 16"
                    version="1.1"
                    width="16"
                    class="octicon octicon-file-directory-fill"
                    style="color: #54aeff;"
                  >
                    <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                  </svg>
                </span>
                <span class="ActionList-item-label ActionList-item-label--truncate">
                  {{ item.label }}
                </span>
              </div>
            </li>

            <!-- 文件行 -->
            <li
              v-else-if="item.type === 'file'"
              class="ActionList-item js-tree-node"
              role="treeitem"
              :aria-level="item.depth + 1"
              :data-depth="item.depth"
            >
              <div class="ActionList-content hx_ActionList-content">
                <!-- 缩进占位符 -->
                <span
                  v-for="n in item.depth"
                  :key="n"
                  class="ActionList-item-visual ActionList-item-visual--leading"
                  style="width: 16px; min-height: 20px;"
                ></span>

                <span class="ActionList-item-visual ActionList-item-visual--leading" style="width: 20px;">
                  <svg
                    aria-label="File"
                    aria-hidden="true"
                    height="16"
                    viewBox="0 0 16 16"
                    version="1.1"
                    width="16"
                    class="octicon octicon-file"
                    style="color: #57606a;"
                  >
                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25  0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"></path>
                  </svg>
                </span>
                <span
                  class="ActionList-item-label ActionList-item-label--truncate"
                >
                  {{ item.label }}
                </span>
                <span class="ActionList-item-visual ActionList-item-visual--trailing">
                  <svg
                    :title="item.file.status"
                    aria-hidden="true"
                    height="16"
                    viewBox="0 0 16 16"
                    version="1.1"
                    width="16"
                    class="octicon"
                    :style="getStatusIconColor(item.file.status)"
                  >
                    <path v-if="item.file.status === 'added'" d="M2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1Zm10.5 1.5H2.75a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM8 4a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5A.75.75 0 0 1 8 4Z"></path>
                    <path v-else-if="item.file.status === 'removed'" d="M13.25 1c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1ZM2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Zm8.5 6.25h-6.5a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 0 1.5Z"></path>
                    <path v-else-if="item.file.status === 'modified'" d="M13.25 1c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1ZM2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"></path>
                    <path v-else-if="item.file.status === 'renamed'" d="M13.25 1c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1ZM2.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25Zm9.03 6.03-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H4.75a.75.75 0 0 1 0-1.5h4.69L7.47 5.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l3.25 3.25a.75.75 0 0 1 0 1.06Z"></path>
                  </svg>
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
import type { FilesTabContentProps, FileChange } from '@/type/codeReview' // 确保导入 FileChange

const props = defineProps<FilesTabContentProps>()

const searchQuery = ref('')
const openFolders = ref<Set<string>>(new Set())

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

  const items = []
  const addedFolders = new Set<string>() // 跟踪已经添加到列表的文件夹

  // 3. 遍历所有文件，处理其路径上的文件夹和文件本身
  filesToProcess.forEach(file => {
    const filePath = file.filename
    const parts = filePath.split('/')
    let currentPath = ''

    // 4. 为文件的每一级路径（文件夹）创建显示项（如果尚未添加）
    for (let i = 0; i < parts.length - 1; i++) { // parts.length - 1 因为最后一部分是文件名
      currentPath += (i > 0 ? '/' : '') + parts[i]
      if (!addedFolders.has(currentPath)) {
        // 检查这个文件夹是否需要显示（即它或其子路径下有匹配的文件）
        const isFolderRelevant = filesToProcess.some(f =>
          getFolderPath(f.filename) === currentPath || getFolderPath(f.filename).startsWith(currentPath + '/')
        )
        if (isFolderRelevant) {
          items.push({
            type: 'folder',
            path: currentPath,
            label: parts[i], // 文件夹名
            depth: i // 文件夹深度
          })
          addedFolders.add(currentPath)
        }
      }
      // 如果当前路径的文件夹未展开，则停止处理更深的路径
      if (!isFolderOpen(currentPath)) {
        break
      }
    }

    // 5. 添加文件本身到显示列表
    // 确保文件的直接父文件夹已经被处理（或文件在根目录）
    const fileDir = getFolderPath(filePath)
    if (fileDir === '' || addedFolders.has(fileDir)) {
       // 检查父文件夹是否展开（根目录文件除外）
       const shouldShowFileItem = fileDir === '' || isFolderOpen(fileDir);
       if (shouldShowFileItem) {
          items.push({
            type: 'file',
            file: file, // 传递原始文件对象
            label: parts[parts.length - 1], // 文件名
            depth: parts.length - 1 // 文件深度
          })
       }
    }
  })

  // 6. 处理根目录下的文件（没有'/'的文件）
  if (searchQuery.value.trim() === '') { // 如果没有搜索，或者搜索结果包含根目录文件
      const rootFiles = filesToProcess.filter(file => !file.filename.includes('/'))
      // 如果 displayItems 中还没有根目录文件项，则添加它们
      // 注意：上面的循环可能已经添加了根目录文件，这里主要是为了确保逻辑清晰
      // 或者可以简化为直接在最后追加根目录文件，但需要去重或调整顺序
      // 一个更清晰的方式是：在处理完所有非根目录文件后，再单独处理根目录文件
      // 我们可以调整逻辑，先处理文件夹，再处理文件
  }


  // --- 调整逻辑：先确保所有相关文件夹都在，再添加文件 ---
  const finalItems = []
  const finalAddedFolders = new Set<string>()
  const finalProcessedFiles = new Set<string>() // 防止重复添加文件

  filesToProcess.forEach(file => {
    const filePath = file.filename
    const parts = filePath.split('/')
    let currentPath = ''

    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += (i > 0 ? '/' : '') + parts[i]
      if (!finalAddedFolders.has(currentPath)) {
        const isFolderRelevant = filesToProcess.some(f =>
          getFolderPath(f.filename) === currentPath || getFolderPath(f.filename).startsWith(currentPath + '/')
        )
        if (isFolderRelevant) {
          finalItems.push({
            type: 'folder',
            path: currentPath,
            label: parts[i],
            depth: i
          })
          finalAddedFolders.add(currentPath)
        }
      }
      if (!isFolderOpen(currentPath)) {
        break
      }
    }
  })

  // 现在添加文件
  filesToProcess.forEach(file => {
    const filePath = file.filename
    if (finalProcessedFiles.has(filePath)) return // 避免重复
    const parts = filePath.split('/')
    const fileDir = getFolderPath(filePath)
    const fileDepth = parts.length - 1

    const shouldShowFileItem = fileDir === '' || (finalAddedFolders.has(fileDir) && isFolderOpen(fileDir))

    if (shouldShowFileItem) {
      finalItems.push({
        type: 'file',
        file: file,
        label: parts[parts.length - 1],
        depth: fileDepth
      })
      finalProcessedFiles.add(filePath)
    }
  })

  return finalItems
})


// --- 辅助函数 ---

// 判断是否是根目录文件
const isRootFile = (filename: string) => {
  return !filename.includes('/')
}

// 获取文件夹路径
const getFolderPath = (filename: string) => {
  const parts = filename.split('/')
  if (parts.length <= 1) return '' // 根目录文件
  return parts.slice(0, -1).join('/')
}

// 判断文件夹是否展开
const isFolderOpen = (folderPath: string) => {
  return openFolders.value.has(folderPath)
}

// 切换文件夹展开状态
const toggleFolder = (folderPath: string) => {
  if (openFolders.value.has(folderPath)) {
    openFolders.value.delete(folderPath)
  } else {
    openFolders.value.add(folderPath)
  }
}

// 获取文件状态图标颜色
const getStatusIconColor = (status: string) => {
  switch (status) {
    case 'added': return 'color: #1a7f37'
    case 'removed': return 'color: #cf222e'
    case 'modified': return 'color: #9a6700'
    case 'renamed': return 'color: #8250df'
    default: return 'color: #57606a'
  }
}

</script>

<style scoped>
/* Layout styles */
.Layout {
  display: grid;
  --Layout-sidebar-width: 296px;
  --Layout-gutter: 24px;
}

.Layout--sidebarPosition-start .Layout-sidebar {
  grid-column: 1;
}

.Layout-sidebar {
  width: var(--Layout-sidebar-width);
  background-color: #ffffff;
  overflow-x: hidden;
}

.hx_Layout--sidebar {
  position: sticky;
  top: 60px;
  height: 555px;
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
  color: #24292f;
  background-color: #ffffff;
  border: 1px solid #d0d7de;
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
  color: #57606a;
}

.ActionList {
  list-style: none;
  padding: 0 16px;
  margin: 0;
  background-color: #ffffff;
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
  background-color: #d0d7de;
  z-index: 1;
}

.ActionList-content {
  position: relative;
  display: flex;
  width: 100%;
  padding: 6px 0;
  font-size: 14px;
  font-weight: 400;
  color: #24292f;
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
  background-color: #f6f8fa;
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
  color: #24292f;
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