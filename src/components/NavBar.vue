<template>
  <nav class="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
    <div class="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
      <div class="flex items-center gap-2 sm:hidden">
        <Button
          variant="outline"
          size="icon"
          class="h-8 w-8"
          aria-label="打开导航菜单"
          @click="showMobileNavSheet = true"
        >
          <List :size="16" weight="duotone" />
        </Button>
        <a href="/" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card" aria-label="返回主页">
          <img src="/favicon.svg" alt="AstroBooox" class="h-5 w-5" />
        </a>
      </div>
      <a
        href="https://github.com/CheongSzesuen/AstroBooox"
        target="_blank"
        rel="noopener noreferrer"
        class="hidden shrink-0 items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent sm:inline-flex"
      >
        <Code :size="16" weight="duotone" />
        <span class="hidden sm:inline">AstroBooox</span>
      </a>

      <div class="scrollbar-none hidden min-w-0 flex-1 overflow-x-auto sm:block">
        <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <Button
            v-for="item in navItems"
            :key="item.mode"
            :variant="mode === item.mode ? 'default' : 'ghost'"
            size="sm"
            class="h-8 shrink-0"
            @click="setMode(item.mode)"
          >
            {{ item.label }}
          </Button>
        </div>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          as="a"
          href="/cc/"
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2 sm:px-3"
          aria-label="进入 CC 页面"
        >
          <Compass :size="15" weight="duotone" />
          <span>CC</span>
        </Button>

        <Button
          as="a"
          :href="repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
          class="hidden h-8 gap-1.5 lg:inline-flex"
        >
          <GithubLogo :size="15" weight="duotone" />
          GitHub
        </Button>

        <Button
          as="a"
          :href="starsUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="sm"
          class="h-8 gap-1.5 px-2 sm:px-3"
        >
          <Star :size="15" weight="duotone" />
          <span>Star</span>
        </Button>

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

    <Sheet :open="showMobileNavSheet" @update:open="showMobileNavSheet = $event">
      <SheetContent side="left" :hide-close="true" class="!w-auto max-w-[calc(100vw-1.5rem)] p-0 sm:hidden">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <img src="/favicon.svg" alt="AstroBooox" class="h-5 w-5" />
          <SheetClose as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8" aria-label="关闭导航菜单">
              <X :size="16" weight="bold" />
            </Button>
          </SheetClose>
        </div>
        <nav class="w-max space-y-1 px-3 py-3">
          <Button
            v-for="item in navItems"
            :key="`mobile-${item.mode}`"
            class="h-9 w-full min-w-max justify-start"
            :variant="mode === item.mode ? 'default' : 'ghost'"
            @click="setModeFromMobile(item.mode)"
          >
            {{ item.label }}
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  PhCompass as Compass,
  PhCode as Code,
  PhGithubLogo as GithubLogo,
  PhList as List,
  PhMoon as Moon,
  PhStar as Star,
  PhSun as Sun,
  PhX as X
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet'
import { useTheme } from '@/composables/useTheme'
import type { AppMode } from '@/type/manifest'

defineProps<{
  mode: AppMode
}>()

const emit = defineEmits<{
  'update:mode': [mode: AppMode]
}>()

const navItems: Array<{ mode: AppMode; label: string }> = [
  { mode: 'manifest', label: 'manifest内容' },
  { mode: 'csv', label: 'CSV 生成' },
  { mode: 'res-link', label: '资源链接生成' },
  { mode: 'code-review', label: '代码审查' }
]

const repoUrl = 'https://github.com/CheongSzesuen/AstroBooox'
const starsUrl = `${repoUrl}/stargazers`
const showMobileNavSheet = ref(false)

const setMode = (newMode: AppMode): void => {
  emit('update:mode', newMode)
}

const setModeFromMobile = (newMode: AppMode): void => {
  showMobileNavSheet.value = false
  setMode(newMode)
}

const { theme, toggleTheme } = useTheme()
</script>
