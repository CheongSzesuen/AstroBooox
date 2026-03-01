<template>
  <Tabs :model-value="activeTab" class="mb-4" @update:model-value="onTabChange">
    <TabsList class="h-auto w-full justify-start gap-1 rounded-lg border border-border bg-muted/50 p-1">
      <TabsTrigger value="analysis" class="h-9 shrink-0 px-3 text-xs md:text-sm">
        <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
          <ChartLineUp :size="16" weight="duotone" />
          <span>Analysis</span>
          <Badge v-if="analyzedData" variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5">1</Badge>
        </span>
      </TabsTrigger>
      <TabsTrigger value="files" class="h-9 shrink-0 px-3 text-xs md:text-sm">
        <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
          <GitDiff :size="16" weight="duotone" />
          <span>Files changed</span>
          <Badge
            v-if="changedFiles.length > 0"
            variant="secondary"
            class="h-5 min-w-5 justify-center rounded-full px-1.5"
          >
            {{ changedFiles.length }}
          </Badge>
        </span>
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
