import { computed, ref } from 'vue'

export interface CcResourceEditDraft {
  key: string
  catalogId: string
  repoOwner: string
  repoName: string
  repoCommitHash: string
  name: string
  restype: string
  description: string
  tags: string[]
  deviceVendors: string
  devices: string
  paidType: string
  icon: string
  cover: string
  previews: string[]
}

const draft = ref<CcResourceEditDraft | null>(null)

export const useCcResourceEdit = () => {
  const setDraft = (next: CcResourceEditDraft): void => {
    draft.value = next
  }

  const clearDraft = (): void => {
    draft.value = null
  }

  return {
    draft: computed(() => draft.value),
    setDraft,
    clearDraft
  }
}
