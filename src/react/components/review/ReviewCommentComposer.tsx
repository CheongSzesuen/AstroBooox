import { useRef } from 'react'
import {
  Code,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Quotes,
  TextB,
  TextItalic
} from '@phosphor-icons/react'
import { Button } from '@/react/components/ui/button'
import { Input } from '@/react/components/ui/input'
import { Switch } from '@/react/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react/components/ui/tabs'
import { Textarea } from '@/react/components/ui/textarea'

export function ReviewCommentComposer(props: {
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
  onCommentIdChange: (value: string) => void
  onCommentMessageChange: (value: string) => void
  onTagEnabledChange?: (value: boolean) => void
  onEditorTabChange: (value: 'edit' | 'preview') => void
  onSubmit: () => void
  onOpenFilePicker?: () => void
  onCursorEvent?: () => void
}) {
  const {
    avatarUrl = '',
    commentId,
    commentMessage,
    editorTab,
    previewHtml,
    canSubmit,
    submitting,
    submitButtonTitle,
    submitText = '发送评论',
    tagEnabled = true,
    showTagToggle = true,
    showFilePickerButton = false,
    idPrefix = '[ABCC_NEEDFIX_',
    idPlaceholder = '自定义 ID',
    messagePlaceholder = '评论说明',
    textareaClass = 'min-h-[150px]',
    onCommentIdChange,
    onCommentMessageChange,
    onTagEnabledChange,
    onEditorTabChange,
    onSubmit,
    onOpenFilePicker,
    onCursorEvent
  } = props

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const replaceSelection = (
    transform: (source: string, start: number, end: number) => { value: string; nextStart: number; nextEnd: number }
  ) => {
    const textarea = textareaRef.current
    const source = commentMessage
    const start = textarea?.selectionStart ?? source.length
    const end = textarea?.selectionEnd ?? source.length
    const result = transform(source, start, end)
    onCommentMessageChange(result.value)
    requestAnimationFrame(() => {
      const target = textareaRef.current
      if (!target) return
      target.focus()
      target.setSelectionRange(result.nextStart, result.nextEnd)
      onCursorEvent?.()
    })
  }

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
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

  const prefixLines = (linePrefixBuilder: (index: number) => string) => {
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

  const insertBold = () => wrapSelection('**', '**', '加粗文本')
  const insertItalic = () => wrapSelection('*', '*', '斜体文本')
  const insertInlineCode = () => wrapSelection('`', '`', 'code')
  const insertQuote = () => prefixLines(() => '> ')
  const insertUnorderedList = () => prefixLines(() => '- ')
  const insertOrderedList = () => prefixLines((index) => `${index + 1}. `)
  const insertLink = () => {
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

  return (
    <div className="flex items-start gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          className="hidden h-8 w-8 shrink-0 rounded-full object-cover sm:block"
          loading="lazy"
        />
      ) : null}
      <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-border">
        <Tabs value={editorTab} onValueChange={(value) => onEditorTabChange(value as 'edit' | 'preview')}>
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
            <TabsList className="inline-flex h-8 rounded-md border border-border bg-background p-0.5">
              <TabsTrigger value="edit" className="h-7 px-3 text-xs">Write</TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-3 text-xs">Preview</TabsTrigger>
            </TabsList>
          </div>

          {editorTab === 'edit' ? (
            <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background px-3 py-2">
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertBold}>
                <TextB size={14} />
                粗体
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertItalic}>
                <TextItalic size={14} />
                斜体
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertInlineCode}>
                <Code size={14} />
                代码
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertQuote}>
                <Quotes size={14} />
                引用
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertUnorderedList}>
                <ListBullets size={14} />
                列表
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertOrderedList}>
                <ListNumbers size={14} />
                编号
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertLink}>
                <LinkSimple size={14} />
                链接
              </Button>
              {showFilePickerButton ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 px-2 text-xs max-sm:w-full sm:ml-auto"
                  onClick={onOpenFilePicker}
                >
                  <LinkSimple size={14} weight="bold" />
                  插入文件定位
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="px-3 py-3">
            <TabsContent value="edit" className="mt-0">
              <div className="grid gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className={`flex min-w-0 w-full flex-1 items-center rounded-md border border-input bg-background ${!tagEnabled ? 'opacity-70' : ''}`}>
                    <span className="shrink-0 border-r border-border px-3 text-xs text-muted-foreground">{idPrefix}</span>
                    <Input
                      value={commentId}
                      className="border-0 shadow-none focus-visible:ring-0"
                      placeholder={idPlaceholder}
                      disabled={!tagEnabled}
                      onChange={(event) => onCommentIdChange(event.target.value)}
                    />
                    <span className="shrink-0 px-3 text-xs text-muted-foreground">]</span>
                  </div>
                  {showTagToggle ? (
                    <div className="inline-flex shrink-0 self-end items-center rounded-md border border-border bg-muted/20 px-2 py-1.5 sm:self-auto">
                      <Switch
                        checked={tagEnabled}
                        aria-label="带标签"
                        onCheckedChange={(value) => onTagEnabledChange?.(Boolean(value))}
                      />
                    </div>
                  ) : null}
                </div>
                {!tagEnabled ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                    当前不附带 ABCC 标签，将仅发送正文内容。
                  </div>
                ) : null}
                <Textarea
                  ref={textareaRef}
                  value={commentMessage}
                  placeholder={messagePlaceholder}
                  className={textareaClass}
                  onChange={(event) => onCommentMessageChange(event.target.value)}
                  onClick={() => onCursorEvent?.()}
                  onKeyUp={() => onCursorEvent?.()}
                  onSelect={() => onCursorEvent?.()}
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div
                className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </TabsContent>
          </div>
        </Tabs>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/20 px-3 py-2">
          <span title={submitButtonTitle} className="inline-flex">
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit || submitting}
              onClick={onSubmit}
            >
              {submitting ? '发送中...' : submitText}
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}
