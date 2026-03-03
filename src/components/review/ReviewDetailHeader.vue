<template>
  <header class="rounded-xl border border-border bg-card p-5 md:p-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="min-w-0 space-y-3">
        <Button
          v-if="showBack"
          variant="outline"
          size="sm"
          class="h-8 gap-1.5 px-2.5"
          @click="$emit('back')"
        >
          <ArrowLeft :size="14" weight="bold" />
          {{ backText }}
        </Button>

        <div class="flex flex-wrap items-end gap-x-2 gap-y-1">
          <h1 class="min-w-0 break-words text-xl font-semibold leading-tight text-foreground md:text-2xl">
            {{ title }}
          </h1>
          <span v-if="number !== undefined && number !== null && String(number).trim() !== ''" class="text-sm font-medium text-muted-foreground md:text-base">#{{ number }}</span>
        </div>

        <div v-if="$slots.meta" class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <slot name="meta" />
        </div>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2 md:justify-end">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { PhArrowLeft as ArrowLeft } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'

withDefaults(defineProps<{
  title: string
  number?: string | number
  showBack?: boolean
  backText?: string
}>(), {
  showBack: false,
  backText: '返回'
})

defineEmits<{
  back: []
}>()
</script>
