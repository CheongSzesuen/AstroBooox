<template>
  <div class="tabnav-container">
    <nav class="tabnav-tabs">
      <button
        class="tabnav-tab"
        :class="{ selected: activeTab === 'analysis' }"
        @click="emit('update:activeTab', 'analysis')"
      >
        <ChartLineUp :size="16" weight="duotone" />
        Analysis
        <span v-if="analyzedData" class="counter">1</span>
      </button>
      <button
        class="tabnav-tab"
        :class="{ selected: activeTab === 'files' }"
        @click="emit('update:activeTab', 'files')"
      >
        <GitDiff :size="16" weight="duotone" />
        Files changed
        <span v-if="changedFiles.length > 0" class="counter">{{ changedFiles.length }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { PhChartLineUp as ChartLineUp, PhGitDiff as GitDiff } from '@phosphor-icons/vue'
import type { PRTabsProps } from '@/type/codeReview'

withDefaults(defineProps<PRTabsProps>(), {
  activeTab: 'analysis'
})

const emit = defineEmits<{
  'update:activeTab': [tab: 'files' | 'analysis']
}>()
</script>

<style scoped>
.tabnav-container {
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.tabnav-tabs {
  display: flex;
  margin-bottom: -1px;
}

.tabnav-tab {
  position: relative;
  padding: 8px 16px;
  font-size: 14px;
  color: var(--muted-foreground);
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tabnav-tab:hover {
  color: var(--primary);
}

.tabnav-tab.selected {
  color: var(--primary);
  background-color: var(--card);
  border-color: var(--border);
  border-bottom-color: var(--card);
}

.counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
  background-color: color-mix(in srgb, var(--muted) 80%, transparent);
  border-radius: 50%;
  margin-left: 4px;
}

.tabnav-tab.selected .counter {
  background-color: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}
</style>
