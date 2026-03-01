<template>
  <div class="min-h-screen bg-background">
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
              :class="tab === 'git' ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-background text-foreground hover:bg-muted/30'"
              @click="tab = 'git'"
            >
              <span>Git 提交</span>
              <GitBranch :size="16" weight="duotone" />
            </button>
          </div>
        </aside>

        <section class="min-w-0">
          <ResourcePublishWorkbench v-if="tab === 'publish'" />
          <GitBrowserOps v-else />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  PhGitBranch as GitBranch,
  PhMoon as Moon,
  PhSun as Sun,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle
} from '@phosphor-icons/vue'
import GitBrowserOps from '@/components/GitBrowserOps.vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import { Button } from '@/components/ui/button'
import { useCcSession } from '@/composables/useCcSession'
import { useTheme } from '@/composables/useTheme'

const tab = ref<'publish' | 'git'>('publish')
const { currentUser, avatarUrl } = useCcSession()
const { theme, toggleTheme } = useTheme()
</script>
