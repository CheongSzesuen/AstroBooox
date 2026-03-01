<template>
  <nav class="navbar" role="navigation" aria-label="主菜单">
    <div class="nav-buttons ui-tabs" role="tablist" aria-label="功能导航">
      <button
        v-for="item in navItems"
        :key="item.mode"
        type="button"
        class="ui-tabs__item"
        :class="{ 'ui-tabs__item--active': mode === item.mode }"
        role="tab"
        :aria-selected="mode === item.mode"
        @click="setMode(item.mode)"
      >
        {{ item.label }}
      </button>
    </div>

    <Button
      variant="outline"
      size="icon"
      class="theme-button"
      :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
      @click="toggleTheme"
    >
      <Moon v-if="theme === 'light'" :size="18" weight="duotone" />
      <Sun v-else :size="18" weight="duotone" />
    </Button>
  </nav>
</template>

<script setup lang="ts">
import { PhMoon as Moon, PhSun as Sun } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import { useTheme } from '@/composables/useTheme'
import type { AppMode } from '@/type/manifest'

const props = defineProps<{
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

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  background: color-mix(in srgb, var(--background) 70%, transparent);
  backdrop-filter: blur(16px);
}

.nav-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.theme-button {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    align-items: stretch;
  }

  .theme-button {
    align-self: flex-end;
  }
}
</style>
