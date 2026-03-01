<template>
  <nav class="sticky top-0 z-50 border-b bg-background/90 backdrop-blur">
    <div class="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-for="item in navItems"
          :key="item.mode"
          :variant="mode === item.mode ? 'default' : 'ghost'"
          size="sm"
          @click="setMode(item.mode)"
        >
          {{ item.label }}
        </Button>
      </div>

      <Button
        variant="outline"
        size="icon"
        :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
        @click="toggleTheme"
      >
        <Moon v-if="theme === 'light'" :size="18" weight="duotone" />
        <Sun v-else :size="18" weight="duotone" />
      </Button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { PhMoon as Moon, PhSun as Sun } from '@phosphor-icons/vue'
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
  { mode: 'code-review', label: '代码审查' }
]

const setMode = (newMode: AppMode): void => {
  emit('update:mode', newMode)
}

const { theme, toggleTheme } = useTheme()
</script>
