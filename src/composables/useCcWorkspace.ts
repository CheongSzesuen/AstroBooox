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
const remoteWorkspacePath = ref('')
const remoteWorkspaceTree = ref<WorkspaceTreeItem[]>([])

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

  const setRemoteWorkspace = (path: string, tree: WorkspaceTreeItem[]): void => {
    remoteWorkspacePath.value = path.trim()
    remoteWorkspaceTree.value = [...tree]
  }

  const clearRemoteWorkspace = (): void => {
    remoteWorkspacePath.value = ''
    remoteWorkspaceTree.value = []
  }

  return {
    workspacePath: computed(() => workspacePath.value),
    workspaceTree: computed(() => workspaceTree.value),
    workspaceHandle: computed(() => workspaceHandle.value),
    remoteWorkspacePath: computed(() => remoteWorkspacePath.value),
    remoteWorkspaceTree: computed(() => remoteWorkspaceTree.value),
    setWorkspace,
    setWorkspaceHandle,
    clearWorkspace,
    setRemoteWorkspace,
    clearRemoteWorkspace
  }
}
