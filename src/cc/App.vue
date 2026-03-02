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
      <div class="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="rounded-xl border border-border bg-card p-3 lg:sticky lg:top-[84px] lg:self-start">
          <div class="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">功能导航</div>
          <div class="space-y-1.5">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="tab === 'publish' ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-background text-foreground hover:bg-muted/30'"
              @click="tab = 'publish'"
            >
              <span>资源发布</span>
              <UploadSimple :size="16" weight="duotone" />
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="tab === 'review' ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-background text-foreground hover:bg-muted/30'"
              @click="tab = 'review'"
            >
              <span>进行中审核</span>
              <ClockCounterClockwise :size="16" weight="duotone" />
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="tab === 'published' ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-background text-foreground hover:bg-muted/30'"
              @click="tab = 'published'"
            >
              <span>已发布资源</span>
              <ArchiveBox :size="16" weight="duotone" />
            </button>
          </div>

          <div v-if="workspacePath || workspaceFiles.length" class="mt-4 space-y-2">
            <div class="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">File Tree</div>
            <div class="rounded-lg border border-border bg-background p-2">
              <p class="truncate text-[11px] text-muted-foreground">{{ workspacePath || '未选择文件夹' }}</p>
              <div class="mt-2 max-h-56 overflow-y-auto">
                <div
                  v-if="workspaceFiles.length === 0"
                  class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
                >
                  当前文件夹暂无可识别文件
                </div>
                <ul v-else class="space-y-1">
                  <li
                    v-for="file in workspaceFiles"
                    :key="file"
                    class="truncate rounded px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                    :title="file"
                  >
                    {{ file }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </aside>

        <section class="min-w-0">
          <ResourcePublishWorkbench :mode="tab" />
        </section>
      </div>
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
const { workspacePath, workspaceFiles } = useCcWorkspace()
const { theme, toggleTheme } = useTheme()

const handleAuthenticated = (): void => {
  tab.value = 'publish'
}

const handleSignOut = (): void => {
  clearSession()
}
</script>
