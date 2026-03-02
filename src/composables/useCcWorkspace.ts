import { computed, ref } from 'vue'

export interface WorkspaceTreeItem {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

const workspacePath = ref('')
const workspaceTree = ref<WorkspaceTreeItem[]>([])

export const useCcWorkspace = () => {
  const setWorkspace = (path: string, tree: WorkspaceTreeItem[]): void => {
    workspacePath.value = path.trim()
    workspaceTree.value = [...tree]
  }

  const clearWorkspace = (): void => {
    workspacePath.value = ''
    workspaceTree.value = []
  }

  return {
    workspacePath: computed(() => workspacePath.value),
    workspaceTree: computed(() => workspaceTree.value),
    setWorkspace,
    clearWorkspace
  }
}
