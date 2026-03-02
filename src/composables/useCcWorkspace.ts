import { computed, ref } from 'vue'

export interface WorkspaceTreeItem {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

const workspacePath = ref('')
const workspaceTree = ref<WorkspaceTreeItem[]>([])
const workspaceHandle = ref<unknown | null>(null)

export const useCcWorkspace = () => {
  const setWorkspace = (path: string, tree: WorkspaceTreeItem[], handle?: unknown): void => {
    workspacePath.value = path.trim()
    workspaceTree.value = [...tree]
    if (handle !== undefined) {
      workspaceHandle.value = handle
    }
  }

  const setWorkspaceHandle = (handle: unknown | null): void => {
    workspaceHandle.value = handle
  }

  const clearWorkspace = (): void => {
    workspacePath.value = ''
    workspaceTree.value = []
    workspaceHandle.value = null
  }

  return {
    workspacePath: computed(() => workspacePath.value),
    workspaceTree: computed(() => workspaceTree.value),
    workspaceHandle: computed(() => workspaceHandle.value),
    setWorkspace,
    setWorkspaceHandle,
    clearWorkspace
  }
}
