<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle class="text-base">资源更新</CardTitle>
            <CardDescription>与资源发布分离的独立更新入口（当前为更新草稿页）。</CardDescription>
          </div>
          <Button variant="outline" @click="emit('back')">返回资源管理</Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-3 pt-0">
        <div v-if="!draft" class="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
          暂无更新上下文，请先从“资源管理”里选择资源并点击更新。
        </div>
        <template v-else>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div class="text-xs text-muted-foreground">资源名</div>
              <div class="mt-1 text-sm font-medium text-foreground">{{ draft.name || '-' }}</div>
            </div>
            <div class="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div class="text-xs text-muted-foreground">资源类型</div>
              <div class="mt-1 text-sm font-medium text-foreground">{{ draft.restype || '-' }}</div>
            </div>
          </div>
          <div class="rounded-md border border-border bg-muted/20 px-3 py-2">
            <div class="text-xs text-muted-foreground">仓库</div>
            <div class="mt-1 break-all text-sm font-medium text-foreground">{{ draft.repoOwner }}/{{ draft.repoName }}</div>
          </div>
          <div class="rounded-md border border-border bg-muted/20 px-3 py-2">
            <div class="text-xs text-muted-foreground">描述</div>
            <div class="mt-1 whitespace-pre-wrap text-sm text-foreground">{{ draft.description || '-' }}</div>
          </div>
          <div class="rounded-md border border-border bg-muted/20 px-3 py-2">
            <div class="text-xs text-muted-foreground">标签</div>
            <div class="mt-1 text-sm text-foreground">{{ draft.tags.join(' / ') || '-' }}</div>
          </div>
          <div class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            下一步会在这里接入与发布分离的“资源更新提交流”（不复用发布步骤）。
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCcResourceEdit } from '@/composables/useCcResourceEdit'

const emit = defineEmits<{
  (event: 'back'): void
}>()

const { draft } = useCcResourceEdit()
</script>
