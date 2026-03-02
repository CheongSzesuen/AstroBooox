import { computed, ref } from 'vue'

const workspacePath = ref('')
const workspaceFiles = ref<string[]>([])

export const useCcWorkspace = () => {
  const setWorkspace = (path: string, files: string[]): void => {
    workspacePath.value = path.trim()
    workspaceFiles.value = [...files]
  }

  const clearWorkspace = (): void => {
    workspacePath.value = ''
    workspaceFiles.value = []
  }

  return {
    workspacePath: computed(() => workspacePath.value),
    workspaceFiles: computed(() => workspaceFiles.value),
    setWorkspace,
    clearWorkspace
  }
}
