<template>
  <div class="flex items-start gap-3">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      class="h-8 w-8 shrink-0 rounded-full object-cover"
      loading="lazy"
    />
    <div class="min-w-0 flex-1 overflow-hidden rounded-md border border-border">
      <Tabs :model-value="editorTab" @update:model-value="(value) => emit('update:editorTab', value as 'edit' | 'preview')">
        <div class="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <TabsList class="inline-flex h-8 rounded-none border-0 bg-transparent p-0">
            <TabsTrigger value="edit">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <Button
            v-if="showFilePickerButton"
            size="sm"
            variant="outline"
            class="h-8 gap-1.5 px-2.5 text-xs"
            @click="emit('openFilePicker')"
          >
            <LinkSimple :size="14" weight="bold" />
            插入文件定位
          </Button>
        </div>
        <div class="px-3 py-3">
          <TabsContent value="edit" class="mt-0">
            <div class="grid gap-2">
              <div class="flex items-center rounded-md border border-input bg-background">
                <span class="shrink-0 border-r border-border px-3 text-xs text-muted-foreground">{{ idPrefix }}</span>
                <Input
                  :model-value="commentId"
                  class="border-0 shadow-none focus-visible:ring-0"
                  :placeholder="idPlaceholder"
                  @update:model-value="(value) => emit('update:commentId', String(value))"
                />
                <span class="shrink-0 px-3 text-xs text-muted-foreground">]</span>
              </div>
              <Textarea
                :id="textareaId"
                :model-value="commentMessage"
                :placeholder="messagePlaceholder"
                :class="textareaClass"
                @update:model-value="(value) => emit('update:commentMessage', String(value))"
                @click="emit('cursorEvent', $event)"
                @keyup="emit('cursorEvent', $event)"
                @select="emit('cursorEvent', $event)"
              />
            </div>
          </TabsContent>
          <TabsContent value="preview" class="mt-0">
            <div
              class="whitespace-pre-wrap break-words text-sm leading-6 text-foreground"
              v-html="previewHtml"
            />
          </TabsContent>
        </div>
      </Tabs>
      <div class="flex items-center justify-end border-t border-border bg-muted/20 px-3 py-2">
        <span :title="submitButtonTitle" class="inline-flex">
          <Button
            size="sm"
            :disabled="!canSubmit || submitting"
            @click="emit('submit')"
          >
            {{ submitting ? '发送中...' : submitText }}
          </Button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PhLinkSimple as LinkSimple } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

withDefaults(defineProps<{
  avatarUrl?: string
  commentId: string
  commentMessage: string
  editorTab: 'edit' | 'preview'
  previewHtml: string
  canSubmit: boolean
  submitting: boolean
  submitButtonTitle: string
  submitText?: string
  showFilePickerButton?: boolean
  idPrefix?: string
  idPlaceholder?: string
  messagePlaceholder?: string
  textareaClass?: string
  textareaId?: string
}>(), {
  avatarUrl: '',
  submitText: '发送评论',
  showFilePickerButton: false,
  idPrefix: '[ABCC_NEEDFIX_',
  idPlaceholder: '自定义 ID',
  messagePlaceholder: '评论说明',
  textareaClass: 'min-h-[150px]',
  textareaId: 'review-comment-message'
})

const emit = defineEmits<{
  'update:commentId': [value: string]
  'update:commentMessage': [value: string]
  'update:editorTab': [value: 'edit' | 'preview']
  submit: []
  openFilePicker: []
  cursorEvent: [event: Event]
}>()
</script>
