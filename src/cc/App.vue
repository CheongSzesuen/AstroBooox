<template>
  <CcTokenGate v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <div v-else class="min-h-screen bg-background">
    <header
      class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
        <a href="/" class="text-sm text-muted-foreground hover:text-foreground">返回主站</a>
        <div class="h-4 w-px bg-border" />
        <h1 class="text-sm font-semibold text-foreground md:text-base">Creator Console</h1>
        <div class="ml-2 min-w-0 flex-1 overflow-x-auto">
          <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'publish' ? 'default' : 'ghost'"
              @click="tab = 'publish'"
            >
              <UploadSimple :size="15" weight="duotone" />
              资源发布
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'review' ? 'default' : 'ghost'"
              @click="tab = 'review'"
            >
              <ClockCounterClockwise :size="15" weight="duotone" />
              等待审核
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'published' ? 'default' : 'ghost'"
              @click="tab = 'published'"
            >
              <ArchiveBox :size="15" weight="duotone" />
              已发布资源
            </Button>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
            @click="toggleTheme"
          >
            <Moon v-if="theme === 'light'" :size="16" weight="duotone" />
            <Sun v-else :size="16" weight="duotone" />
          </Button>

          <div ref="userMenuRoot" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
              :class="{ 'bg-accent': showUserMenu }"
              :title="currentUser ? `当前用户：${currentUser}` : '未校验 Token'"
              @click="toggleUserMenu"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="User Avatar"
                class="h-6 w-6 rounded-full border border-border object-cover"
              />
              <UserCircle v-else :size="18" weight="duotone" class="text-muted-foreground" />
              <span class="hidden sm:inline">{{ currentUser || '未校验 Token' }}</span>
              <CaretDown :size="14" weight="bold" class="text-muted-foreground" />
            </button>

            <div
              v-if="showUserMenu && currentUser"
              class="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <a
                :href="profileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                @click="closeUserMenu"
              >
                <UserCircle :size="16" weight="duotone" />
                Profile
              </a>
              <a
                :href="repositoriesUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                @click="closeUserMenu"
              >
                <Folders :size="16" weight="duotone" />
                Repositories
              </a>
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                @click="handleSignOut"
              >
                <SignOut :size="16" weight="duotone" />
                退出
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] p-4 md:p-6">
      <section class="min-w-0 flex justify-center">
        <ResourcePublishWorkbench :mode="tab" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhCaretDown as CaretDown,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhFolders as Folders,
  PhMoon as Moon,
  PhSignOut as SignOut,
  PhSun as Sun,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle
} from '@phosphor-icons/vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import { Button } from '@/components/ui/button'
import CcTokenGate from '@/cc/CcTokenGate.vue'
import { useCcSession } from '@/composables/useCcSession'
import { useCcWorkspace } from '@/composables/useCcWorkspace'
import { useTheme } from '@/composables/useTheme'

const tab = ref<'publish' | 'review' | 'published'>('publish')
const { currentUser, avatarUrl, isAuthenticated, clearSession } = useCcSession()
const { clearWorkspace, clearRemoteWorkspace } = useCcWorkspace()
const { theme, toggleTheme } = useTheme()
const showUserMenu = ref(false)
const userMenuRoot = ref<HTMLElement | null>(null)

const profileUrl = computed(() =>
  currentUser.value ? `https://github.com/${currentUser.value}` : 'https://github.com'
)
const repositoriesUrl = computed(() =>
  currentUser.value
    ? `https://github.com/${currentUser.value}?tab=repositories`
    : 'https://github.com'
)

const closeUserMenu = (): void => {
  showUserMenu.value = false
}

const toggleUserMenu = (): void => {
  if (!currentUser.value) return
  showUserMenu.value = !showUserMenu.value
}

const handleGlobalPointerDown = (event: MouseEvent): void => {
  if (!showUserMenu.value) return
  const root = userMenuRoot.value
  if (!root) return
  if (event.target instanceof Node && !root.contains(event.target)) {
    closeUserMenu()
  }
}

const handleEscapeKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closeUserMenu()
  }
}

const handleAuthenticated = (): void => {
  tab.value = 'publish'
}

const handleSignOut = (): void => {
  closeUserMenu()
  clearWorkspace()
  clearRemoteWorkspace()
  clearSession()
  tab.value = 'publish'
}

onMounted(() => {
  document.addEventListener('mousedown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>
