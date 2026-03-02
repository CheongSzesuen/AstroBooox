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
          <a
            v-if="currentUser"
            :href="`https://github.com/${currentUser}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
            :title="`打开 ${currentUser} 的 GitHub 页面`"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="User Avatar"
              class="h-6 w-6 rounded-full border border-border object-cover"
            />
            <UserCircle v-else :size="18" weight="duotone" class="text-muted-foreground" />
            <span class="hidden sm:inline">{{ currentUser }}</span>
          </a>
          <div
            v-else
            class="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
          >
            <UserCircle :size="18" weight="duotone" />
            <span class="hidden sm:inline">未校验 Token</span>
          </div>

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

          <Button variant="outline" size="sm" class="h-8 px-2" @click="handleSignOut">
            <SignOut :size="15" weight="duotone" />
            <span class="hidden sm:inline">退出</span>
          </Button>
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
import { ref } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhClockCounterClockwise as ClockCounterClockwise,
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

const handleAuthenticated = (): void => {
  tab.value = 'publish'
}

const handleSignOut = (): void => {
  clearSession()
}
</script>
