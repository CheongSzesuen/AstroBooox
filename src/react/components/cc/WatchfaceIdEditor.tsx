import { DiceFive, PencilSimpleLine } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'

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

export function WatchfaceIdEditor(props: {
  resourceId: string
  fileOptions: WatchfaceEditorFileOption[]
  loadFile: (path: string) => Promise<globalThis.File | null>
  saveFile: (path: string, file: globalThis.File) => Promise<void>
  onApplyResourceId: (value: string) => void
}) {
  const { resourceId, fileOptions, loadFile, saveFile, onApplyResourceId } = props
  const [selectedPath, setSelectedPath] = useState('')
  const [draftId, setDraftId] = useState('')
  const [originalId, setOriginalId] = useState('')
  const [detectError, setDetectError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const requestIdRef = useRef(0)

  const idError = useMemo(() => getWatchfaceIdError(draftId), [draftId])
  const hasFileOptions = fileOptions.length > 0

  const inspectFile = async (path: string, syncResourceIdWhenEmpty: boolean): Promise<void> => {
    const currentRequestId = ++requestIdRef.current
    setDetecting(true)
    setDetectError('')
    setOriginalId('')
    try {
      const file = await loadFile(path)
      if (!file) {
        throw new Error('未找到目标表盘文件，请先确认下载资源路径有效。')
      }
      const detectedId = await parseWatchfaceIdFromFile(file)
      if (currentRequestId !== requestIdRef.current) return
      setOriginalId(detectedId)
      setDraftId(detectedId)
      if (syncResourceIdWhenEmpty && !resourceId.trim()) {
        onApplyResourceId(detectedId)
      }
    } catch (cause: unknown) {
      if (currentRequestId !== requestIdRef.current) return
      setDetectError(cause instanceof Error ? cause.message : '读取原始 ID 失败')
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setDetecting(false)
      }
    }
  }

  useEffect(() => {
    if (!hasFileOptions) {
      setSelectedPath('')
      setDraftId('')
      setOriginalId('')
      setDetectError('')
      setDetecting(false)
      return
    }
    if (selectedPath && fileOptions.some((option) => option.path === selectedPath)) return
    const nextPath = fileOptions[0].path
    setSelectedPath(nextPath)
    void inspectFile(nextPath, true)
  }, [fileOptions, hasFileOptions, selectedPath])

  const handleSelectPath = (path: string): void => {
    setSelectedPath(path)
    void inspectFile(path, true)
  }

  const handleGenerateRandomId = (): void => {
    setDraftId(generateRandomWatchfaceId())
  }

  const handleReplaceInPlace = async (): Promise<void> => {
    const path = selectedPath.trim()
    if (!path) {
      toast('请先选择表盘文件')
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
      const sourceFile = await loadFile(path)
      if (!sourceFile) {
        throw new Error('未找到目标表盘文件，请重新选择。')
      }
      const nextId = draftId.trim()
      const nextFile = await replaceWatchfaceIdInFile(sourceFile, nextId)
      await saveFile(path, nextFile)
      setOriginalId(nextId)
      setDetectError('')
      onApplyResourceId(nextId)
      toast('已替换表盘文件', {
        description: `文件保持原名，资源 ID 已同步为 ${nextId}`
      })
    } catch (cause: unknown) {
      toast('替换表盘文件失败', {
        description: cause instanceof Error ? cause.message : '未知错误'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-dashed border-primary/40 bg-primary/[0.03] shadow-none">
      <CardHeader className="pb-3 sm:p-4 sm:pb-3">
        <CardTitle className="text-sm">表盘 ID 修改工具</CardTitle>
        <CardDescription>直接读取操作区已选的表盘文件，自动识别原始 ID，并原地替换回同一路径同名文件。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 sm:p-4 sm:pt-0">
        <div className="space-y-1.5">
          <Label htmlFor="watchface-id-editor-target">操作区表盘文件</Label>
          <Select value={selectedPath} onValueChange={handleSelectPath} disabled={!hasFileOptions || detecting || saving}>
            <SelectTrigger id="watchface-id-editor-target">
              <SelectValue placeholder={hasFileOptions ? '请选择表盘文件' : '请先在下载资源里选择 .bin / .face 文件'} />
            </SelectTrigger>
            <SelectContent>
              {fileOptions.map((option) => (
                <SelectItem key={option.path} value={option.path}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasFileOptions ? <p className="text-xs text-muted-foreground">先在“下载资源”区域给设备选择 `.bin` 或 `.face` 文件，这里才会出现可操作目标。</p> : null}
          {selectedPath ? <p className="text-xs text-muted-foreground">当前路径：{selectedPath}</p> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="watchface-id-editor-original">检测到的原始 ID</Label>
            <Input id="watchface-id-editor-original" value={detecting ? '正在读取...' : originalId} readOnly placeholder="选择文件后自动检测" />
            {detectError ? <p className="text-xs text-destructive">{detectError}</p> : null}
          </div>

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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={handleGenerateRandomId} disabled={!hasFileOptions || saving}>
            <DiceFive data-icon="inline-start" weight="duotone" />
            随机生成 ID
          </Button>
          <Button type="button" onClick={() => void handleReplaceInPlace()} disabled={!hasFileOptions || detecting || saving || Boolean(idError) || !draftId.trim()}>
            <PencilSimpleLine data-icon="inline-start" weight="duotone" />
            原地替换并同步 ID
          </Button>
          {resourceId.trim() ? <span className="text-xs text-muted-foreground">当前资源 ID：{resourceId.trim()}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
