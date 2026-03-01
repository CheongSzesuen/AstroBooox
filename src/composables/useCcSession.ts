import { computed, ref } from 'vue'

const token = ref('')
const currentUser = ref('')
const avatarUrl = ref('')

export const useCcSession = () => {
  const setSessionUser = (user: { login: string; avatar_url?: string }): void => {
    currentUser.value = user.login
    avatarUrl.value = user.avatar_url || ''
  }

  const clearSessionUser = (): void => {
    currentUser.value = ''
    avatarUrl.value = ''
  }

  return {
    token,
    currentUser: computed(() => currentUser.value),
    avatarUrl: computed(() => avatarUrl.value),
    setSessionUser,
    clearSessionUser
  }
}
