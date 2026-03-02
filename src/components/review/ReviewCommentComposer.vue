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
          <TabsList class="inline-flex h-8 rounded-md border border-border bg-background p-0.5">
            <TabsTrigger value="edit" class="h-7 px-3 text-xs">Write</TabsTrigger>
            <TabsTrigger value="preview" class="h-7 px-3 text-xs">Preview</TabsTrigger>
          </TabsList>
        </div>
        <div v-if="editorTab === 'edit'" class="flex flex-wrap items-center gap-1 border-b border-border bg-background px-3 py-2">
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertBold">
            <TextBolder :size="14" />
            粗体
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertItalic">
            <TextItalic :size="14" />
            斜体
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertInlineCode">
            <Code :size="14" />
            代码
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertQuote">
            <Quotes :size="14" />
            引用
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertUnorderedList">
            <ListBullets :size="14" />
            列表
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertOrderedList">
            <ListNumbers :size="14" />
            编号
          </Button>
          <Button size="sm" variant="ghost" class="h-7 px-2 text-xs" @click="insertLink">
            <LinkSimple :size="14" />
            链接
          </Button>
          <Button
            v-if="showFilePickerButton"
            size="sm"
            variant="outline"
            class="ml-auto h-7 gap-1.5 px-2 text-xs"
            @click="emit('openFilePicker')"
          >
            <LinkSimple :size="14" weight="bold" />
            插入文件定位
          </Button>
        </div>
        <div class="px-3 py-3">
          <TabsContent value="edit" class="mt-0">
            <div class="grid gap-2">
              <div class="flex items-center gap-2">
                <div class="flex min-w-0 flex-1 items-center rounded-md border border-input bg-background" :class="!tagEnabled ? 'opacity-70' : ''">
                  <span class="shrink-0 border-r border-border px-3 text-xs text-muted-foreground">{{ idPrefix }}</span>
                  <Input
                    :model-value="commentId"
                    class="border-0 shadow-none focus-visible:ring-0"
                    :placeholder="idPlaceholder"
                    :disabled="!tagEnabled"
                    @update:model-value="(value) => emit('update:commentId', String(value))"
                  />
                  <span class="shrink-0 px-3 text-xs text-muted-foreground">]</span>
                </div>
                <div v-if="showTagToggle" class="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
                  <span class="text-xs text-muted-foreground">带标签</span>
                  <Switch
                    :checked="Boolean(tagEnabled)"
                    @update:checked="(value: boolean) => emit('update:tagEnabled', Boolean(value))"
                  />
                </div>
              </div>
              <div v-if="!tagEnabled" class="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                当前不附带 ABCC 标签，将仅发送正文内容。
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
import { nextTick } from 'vue'
import {
  PhCode as Code,
  PhLinkSimple as LinkSimple,
  PhListBullets as ListBullets,
  PhListNumbers as ListNumbers,
  PhQuotes as Quotes,
  PhTextBolder as TextBolder,
  PhTextItalic as TextItalic
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(defineProps<{
  avatarUrl?: string
  commentId: string
  commentMessage: string
  editorTab: 'edit' | 'preview'
  previewHtml: string
  canSubmit: boolean
  submitting: boolean
  submitButtonTitle: string
  submitText?: string
  tagEnabled?: boolean
  showTagToggle?: boolean
  showFilePickerButton?: boolean
  idPrefix?: string
  idPlaceholder?: string
  messagePlaceholder?: string
  textareaClass?: string
  textareaId?: string
}>(), {
  avatarUrl: '',
  submitText: '发送评论',
  tagEnabled: true,
  showTagToggle: true,
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
  'update:tagEnabled': [value: boolean]
  'update:editorTab': [value: 'edit' | 'preview']
  submit: []
  openFilePicker: []
  cursorEvent: [event: Event]
}>()

const getTextareaElement = (): HTMLTextAreaElement | null => {
  const element = document.getElementById(props.textareaId)
  return element instanceof HTMLTextAreaElement ? element : null
}

const replaceSelection = (
  transform: (source: string, start: number, end: number) => { value: string; nextStart: number; nextEnd: number }
): void => {
  const textarea = getTextareaElement()
  const source = props.commentMessage
  const start = textarea?.selectionStart ?? source.length
  const end = textarea?.selectionEnd ?? source.length
  const result = transform(source, start, end)
  emit('update:commentMessage', result.value)
  void nextTick(() => {
    const target = getTextareaElement()
    if (!target) return
    target.focus()
    target.setSelectionRange(result.nextStart, result.nextEnd)
    emit('cursorEvent', new Event('change'))
  })
}

const wrapSelection = (prefix: string, suffix: string, placeholder: string): void => {
  replaceSelection((source, start, end) => {
    const selected = source.slice(start, end)
    const content = selected || placeholder
    const inserted = `${prefix}${content}${suffix}`
    const value = `${source.slice(0, start)}${inserted}${source.slice(end)}`
    if (selected) {
      return {
        value,
        nextStart: start + prefix.length,
        nextEnd: start + prefix.length + selected.length
      }
    }
    return {
      value,
      nextStart: start + prefix.length,
      nextEnd: start + prefix.length + placeholder.length
    }
  })
}

const prefixLines = (linePrefixBuilder: (index: number) => string): void => {
  replaceSelection((source, start, end) => {
    const selected = source.slice(start, end) || '内容'
    const lines = selected.split('\n')
    const prefixed = lines.map((line, index) => `${linePrefixBuilder(index)}${line}`).join('\n')
    const value = `${source.slice(0, start)}${prefixed}${source.slice(end)}`
    return {
      value,
      nextStart: start,
      nextEnd: start + prefixed.length
    }
  })
}

const insertBold = (): void => wrapSelection('**', '**', '加粗文本')
const insertItalic = (): void => wrapSelection('*', '*', '斜体文本')
const insertInlineCode = (): void => wrapSelection('`', '`', 'code')
const insertQuote = (): void => prefixLines(() => '> ')
const insertUnorderedList = (): void => prefixLines(() => '- ')
const insertOrderedList = (): void => prefixLines(index => `${index + 1}. `)
const insertLink = (): void => {
  replaceSelection((source, start, end) => {
    const selected = source.slice(start, end) || '链接文字'
    const inserted = `[${selected}](https://)`
    const value = `${source.slice(0, start)}${inserted}${source.slice(end)}`
    const urlStart = start + inserted.length - 'https://'.length - 1
    return {
      value,
      nextStart: urlStart,
      nextEnd: urlStart + 'https://'.length
    }
  })
}
</script>
