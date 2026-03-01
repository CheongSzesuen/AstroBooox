<template>
  <Tabs :model-value="activeTab" class="mb-3" @update:model-value="onTabChange">
    <TabsList class="h-auto gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
      <TabsTrigger value="analysis" class="gap-1.5 px-3 py-1.5 text-xs md:text-sm">
        <ChartLineUp :size="16" weight="duotone" />
        Analysis
        <Badge v-if="analyzedData" variant="secondary" class="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5">1</Badge>
      </TabsTrigger>
      <TabsTrigger value="files" class="gap-1.5 px-3 py-1.5 text-xs md:text-sm">
        <GitDiff :size="16" weight="duotone" />
        Files changed
        <Badge
          v-if="changedFiles.length > 0"
          variant="secondary"
          class="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5"
        >
          {{ changedFiles.length }}
        </Badge>
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>

<script setup lang="ts">
import { PhChartLineUp as ChartLineUp, PhGitDiff as GitDiff } from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PRTabsProps } from '@/type/codeReview'

withDefaults(defineProps<PRTabsProps>(), {
  activeTab: 'analysis'
})

const emit = defineEmits<{
  'update:activeTab': [tab: 'files' | 'analysis']
}>()

const onTabChange = (value: string | number): void => {
  if (value === 'files' || value === 'analysis') {
    emit('update:activeTab', value)
  }
}
</script>
