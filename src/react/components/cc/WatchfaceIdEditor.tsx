import { ArrowsClockwise, DiceFive, PencilSimpleLine } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'

const WATCHFACE_ID_LENGTH = 12
const WATCHFACE_ID_OFFSET = 40
const WATCHFACE_ID_RECOMMENDED_PREFIX = '9798'

const getWatchfaceIdError = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return ''
  if (!/^\d+$/.test(normalized)) return '表盘 ID 必须为纯数字。'
  if (normalized.length !== WATCHFACE_ID_LENGTH) return '表盘 ID 长度必须是 12 位。'
  return ''
}

const normalizeWatchfaceIdInput = (value: string): string =>
  value
    .replace(/\D+/g, '')
    .slice(0, WATCHFACE_ID_LENGTH)

const parseWatchfaceIdFromFile = async (file: globalThis.File): Promise<string> => {
  const buffer = new Uint8Array(await file.arrayBuffer())
  if (buffer.length < WATCHFACE_ID_OFFSET + WATCHFACE_ID_LENGTH) {
    throw new Error('文件大小不足，无法读取表盘 ID。')
  }
  const detectedId = String.fromCharCode(...buffer.slice(WATCHFACE_ID_OFFSET, WATCHFACE_ID_OFFSET + WATCHFACE_ID_LENGTH))
  if (!/^\d{12}$/.test(detectedId)) {
    throw new Error(`未识别到有效的 12 位数字 ID：${detectedId}`)
  }
  return detectedId
}

const replaceWatchfaceIdInFile = async (file: globalThis.File, nextId: string): Promise<globalThis.File> => {
  const buffer = new Uint8Array(await file.arrayBuffer())
  if (buffer.length < WATCHFACE_ID_OFFSET + WATCHFACE_ID_LENGTH) {
    throw new Error('文件大小不足，无法写入表盘 ID。')
  }
  for (let i = 0; i < WATCHFACE_ID_LENGTH; i++) {
    buffer[WATCHFACE_ID_OFFSET + i] = nextId.charCodeAt(i)
  }
  return new File([buffer], file.name, {
    type: file.type || 'application/octet-stream',
    lastModified: Date.now()
  })
}

const generateRandomWatchfaceId = (): string => {
  const randomLength = WATCHFACE_ID_LENGTH - WATCHFACE_ID_RECOMMENDED_PREFIX.length
  const random = new Uint32Array(randomLength)
  crypto.getRandomValues(random)
  return `${WATCHFACE_ID_RECOMMENDED_PREFIX}${Array.from(random, (value) => String(value % 10)).join('')}`
}

export type WatchfaceEditorFileOption = {
  path: string
  label: string
}

type WatchfaceInspectRow = {
  path: string
  fileName: string
  originalId: string
  error: string
}

const basenameFromPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] || path
}

export function WatchfaceIdEditor(props: {
  resourceId: string
  fileOptions: WatchfaceEditorFileOption[]
  loadFile: (path: string) => Promise<globalThis.File | null>
  saveFile: (path: string, file: globalThis.File) => Promise<void>
  onApplyResourceId: (value: string) => void
  onScrollToDownloads?: () => void
}) {
  const { resourceId, fileOptions, loadFile, saveFile, onApplyResourceId, onScrollToDownloads } = props
  const [draftId, setDraftId] = useState('')
  const [inspectRows, setInspectRows] = useState<WatchfaceInspectRow[]>([])
  const [detectError, setDetectError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const requestIdRef = useRef(0)

  const idError = useMemo(() => getWatchfaceIdError(draftId), [draftId])
  const hasFileOptions = fileOptions.length > 0
  const originalIds = useMemo(
    () => [...new Set(inspectRows.map((row) => row.originalId).filter(Boolean))],
    [inspectRows]
  )

  const inspectFiles = async (syncResourceIdWhenEmpty: boolean): Promise<void> => {
    const currentRequestId = ++requestIdRef.current
    setDetecting(true)
    setDetectError('')
    setInspectRows([])
    try {
      const results = await Promise.all(
        fileOptions.map(async (option) => {
          const row: WatchfaceInspectRow = {
            path: option.path,
            fileName: basenameFromPath(option.path),
            originalId: '',
            error: ''
          }
          try {
            const file = await loadFile(option.path)
            if (!file) {
              throw new Error('未找到文件')
            }
            row.originalId = await parseWatchfaceIdFromFile(file)
          } catch (cause: unknown) {
            row.error = cause instanceof Error ? cause.message : '读取失败'
          }
          return row
        })
      )
      if (currentRequestId !== requestIdRef.current) return

      setInspectRows(results)
      const uniqueIds = [...new Set(results.map((row) => row.originalId).filter(Boolean))]
      const failedRows = results.filter((row) => row.error)
      if (failedRows.length > 0) {
        setDetectError(`有 ${failedRows.length} 个表盘文件读取失败，请检查文件是否有效。`)
      }
      if (uniqueIds.length === 1) {
        setDraftId(uniqueIds[0])
        if (syncResourceIdWhenEmpty && !resourceId.trim()) {
          onApplyResourceId(uniqueIds[0])
        }
        return
      }

      if (!resourceId.trim()) {
        setDraftId('')
      }
      if (uniqueIds.length > 1) {
        setDetectError('检测到多个不同的表盘 ID，请确认后统一同步所有表盘文件。')
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setDetecting(false)
      }
    }
  }

  useEffect(() => {
    if (!hasFileOptions) {
      setDraftId('')
      setInspectRows([])
      setDetectError('')
      setDetecting(false)
      return
    }
    void inspectFiles(true)
  }, [fileOptions, hasFileOptions])

  const handleGenerateRandomId = (): void => {
    setDraftId(generateRandomWatchfaceId())
  }

  const handleReplaceInPlace = async (): Promise<void> => {
    if (!hasFileOptions) {
      toast('请先准备表盘文件')
      return
    }
    if (idError || draftId.trim().length !== WATCHFACE_ID_LENGTH) {
      toast('表盘 ID 不可用', {
        description: idError || '请输入 12 位纯数字表盘 ID。'
      })
      return
    }

    try {
      setSaving(true)
      const nextId = draftId.trim()
      for (const option of fileOptions) {
        const sourceFile = await loadFile(option.path)
        if (!sourceFile) {
          throw new Error(`未找到目标表盘文件：${option.path}`)
        }
        const nextFile = await replaceWatchfaceIdInFile(sourceFile, nextId)
        await saveFile(option.path, nextFile)
      }
      setInspectRows((prev) => prev.map((row) => ({
        ...row,
        originalId: nextId,
        error: ''
      })))
      setDetectError('')
      onApplyResourceId(nextId)
      toast('已同步表盘 ID', {
        description: `已更新 ${fileOptions.length} 个表盘文件，资源 ID 已同步为 ${nextId}`
      })
    } catch (cause: unknown) {
      toast('同步表盘 ID 失败', {
        description: cause instanceof Error ? cause.message : '未知错误'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-dashed border-primary/40 bg-primary/[0.03] shadow-none">
      <CardHeader className="pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">表盘 ID 修改工具</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => void inspectFiles(false)} disabled={!hasFileOptions || detecting || saving}>
            <ArrowsClockwise data-icon="inline-start" weight="duotone" />
            刷新
          </Button>
        </div>
        <CardDescription className="text-xs">
          会批量读取当前工作区中的所有表盘 `.bin` / `.face` 文件，并统一同步为同一个 ID。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 sm:p-4 sm:pt-0">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-semibold text-foreground">表盘文件原始 ID</Label>
            {hasFileOptions ? <span className="text-xs text-muted-foreground">{fileOptions.length} 个文件</span> : null}
          </div>
          {hasFileOptions ? (
            <div className="overflow-hidden rounded-md border border-border/70 bg-background/70">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(132px,auto)] gap-3 border-b border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <div>表盘文件</div>
                <div className="text-right">原始 ID</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
              {inspectRows.map((row) => (
                <div key={row.path} className="grid grid-cols-[minmax(0,1fr)_minmax(132px,auto)] gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0">
                  <div className="min-w-0 truncate text-sm font-medium text-foreground" title={row.path}>{row.fileName}</div>
                  <div className={`text-right text-sm font-semibold ${row.error ? 'text-destructive' : 'text-foreground'}`}>
                    {detecting && !row.originalId && !row.error ? '读取中...' : (row.originalId || row.error || '--')}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">先在“下载资源”区域给设备选择 `.bin` 或 `.face` 文件，工具会自动批量同步这些表盘文件。</p>
          )}
          {originalIds.length > 1 ? <p className="text-xs text-destructive">当前检测到多个不同的原始 ID，建议先统一后再提交。</p> : null}
        </div>

        <div className="rounded-lg border border-primary/40 bg-background/80 p-3 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="watchface-id-editor-id">新表盘 ID</Label>
            <Input
              id="watchface-id-editor-id"
              value={draftId}
              onChange={(event) => setDraftId(normalizeWatchfaceIdInput(event.target.value))}
              inputMode="numeric"
              maxLength={WATCHFACE_ID_LENGTH}
              placeholder="例如：979812345678"
              disabled={!hasFileOptions || saving}
            />
            {idError ? <p className="text-xs text-destructive">{idError}</p> : null}
            <p className="text-xs text-muted-foreground">
              建议使用以 <code>{WATCHFACE_ID_RECOMMENDED_PREFIX}</code> 开头的 12 位数字 ID；随机生成功能会默认按该前缀生成。
            </p>
          </div>
        </div>

        {detectError ? <p className="text-xs text-destructive">{detectError}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={onScrollToDownloads} disabled={!onScrollToDownloads}>
            添加表盘文件
          </Button>
          <Button type="button" variant="outline" onClick={handleGenerateRandomId} disabled={!hasFileOptions || saving}>
            <DiceFive data-icon="inline-start" weight="duotone" />
            随机生成 ID
          </Button>
          <Button type="button" onClick={() => void handleReplaceInPlace()} disabled={!hasFileOptions || detecting || saving || Boolean(idError) || !draftId.trim()}>
            <PencilSimpleLine data-icon="inline-start" weight="duotone" />
            批量替换并同步 ID
          </Button>
          {resourceId.trim() ? <span className="text-xs text-muted-foreground">当前资源 ID：{resourceId.trim()}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
