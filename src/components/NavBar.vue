<template>
  <nav class="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
    <div class="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
      <a
        href="https://github.com/CheongSzesuen/AstroBooox"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <Code :size="16" weight="duotone" />
        <span class="hidden sm:inline">AstroBooox</span>
      </a>

      <div class="scrollbar-none min-w-0 flex-1 overflow-x-auto">
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
          <span class="hidden sm:inline">Star</span>
          <span class="rounded bg-background/70 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            {{ starCountLabel }}
          </span>
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
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PhCode as Code,
  PhGithubLogo as GithubLogo,
  PhMoon as Moon,
  PhStar as Star,
  PhSun as Sun
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
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
  { mode: 'code-review', label: '代码审查' },
  { mode: 'git-browser', label: 'Git 提交' }
]

const repoUrl = 'https://github.com/CheongSzesuen/AstroBooox'
const starsUrl = `${repoUrl}/stargazers`
const stars = ref<number | null>(null)

const starCountLabel = computed(() => {
  if (stars.value === null) return '--'
  if (stars.value >= 10000) return `${(stars.value / 1000).toFixed(1)}k`
  if (stars.value >= 1000) return `${Math.round(stars.value / 100) / 10}k`
  return `${stars.value}`
})

const setMode = (newMode: AppMode): void => {
  emit('update:mode', newMode)
}

onMounted(async () => {
  try {
    const response = await fetch('https://api.github.com/repos/CheongSzesuen/AstroBooox')
    if (!response.ok) return
    const data = await response.json()
    if (typeof data?.stargazers_count === 'number') {
      stars.value = data.stargazers_count
    }
  } catch {
    stars.value = null
  }
})

const { theme, toggleTheme } = useTheme()
</script>
