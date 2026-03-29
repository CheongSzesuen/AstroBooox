import { DownloadSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'

const VALID_EXTENSIONS = new Set(['.bin', '.face'])
const WATCHFACE_ID_LENGTH = 12
const WATCHFACE_ID_OFFSET = 40

const getFileExtension = (fileName: string): string => {
  const matched = fileName.toLowerCase().match(/\.[^./\\]+$/)
  return matched ? matched[0] : ''
}

const getWatchfaceIdError = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return ''
  if (!/^\d+$/.test(normalized)) return '表盘 ID 必须为纯数字。'
  if (normalized.length !== WATCHFACE_ID_LENGTH) return '表盘 ID 长度必须是 12 位。'
  return ''
}

const getCustomNameError = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return ''
  if (/[\\/:*?"<>|]/.test(normalized)) return '文件名包含非法字符（\\ / : * ? " < > |）。'
  if (normalized.length > 200) return '文件名过长。'
  return ''
}

const resolveDownloadFileName = (originalName: string, customName: string): string => {
  const normalized = customName.trim()
  if (!normalized) return originalName
  if (/\.[^./\\]+$/.test(normalized)) return normalized
  return `${normalized}${getFileExtension(originalName)}`
}

export function WatchfaceIdEditor(props: {
  resourceId: string
  onApplyResourceId: (value: string) => void
}) {
  const { resourceId, onApplyResourceId } = props
  const [uploadedFile, setUploadedFile] = useState<globalThis.File | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [fileError, setFileError] = useState('')
  const [draftId, setDraftId] = useState('')
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    const normalized = resourceId.trim()
    if (!normalized || !/^\d{1,12}$/.test(normalized)) return
    setDraftId((prev) => (prev === normalized ? prev : normalized))
  }, [resourceId])

  const idError = useMemo(() => getWatchfaceIdError(draftId), [draftId])
  const nameError = useMemo(() => getCustomNameError(customName), [customName])
  const isReady = Boolean(uploadedFile && !fileError && !idError && !nameError && draftId.trim().length === WATCHFACE_ID_LENGTH)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] || null
    setFileError('')
    if (!file) {
      setUploadedFile(null)
      setFileName('')
      setFileSize('')
      return
    }

    const extension = getFileExtension(file.name)
    if (!VALID_EXTENSIONS.has(extension)) {
      setUploadedFile(null)
      setFileName('')
      setFileSize('')
      setFileError('请上传 .bin 或 .face 文件。')
      return
    }

    setUploadedFile(file)
    setFileName(file.name)
    setFileSize((file.size / 1024).toFixed(2))
  }

  const handleProcessAndDownload = async (): Promise<void> => {
    if (!uploadedFile) {
      toast('请先上传表盘文件', {
        description: '仅支持 .bin 或 .face。'
      })
      return
    }
    if (idError || draftId.trim().length !== WATCHFACE_ID_LENGTH) {
      toast('表盘 ID 不可用', {
        description: idError || '请输入 12 位纯数字表盘 ID。'
      })
      return
    }
    if (nameError) {
      toast('文件名不可用', {
        description: nameError
      })
      return
    }

    try {
      const buffer = new Uint8Array(await uploadedFile.arrayBuffer())
      if (buffer.length < WATCHFACE_ID_OFFSET + WATCHFACE_ID_LENGTH) {
        throw new Error('文件大小不足，无法写入表盘 ID。')
      }

      const nextId = draftId.trim()
      for (let i = 0; i < WATCHFACE_ID_LENGTH; i++) {
        buffer[WATCHFACE_ID_OFFSET + i] = nextId.charCodeAt(i)
      }

      const blob = new Blob([buffer.buffer], { type: uploadedFile.type || 'application/octet-stream' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = resolveDownloadFileName(uploadedFile.name, customName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)

      onApplyResourceId(nextId)
      toast('表盘文件已生成', {
        description: `资源 ID 已同步为 ${nextId}`
      })
    } catch (cause: unknown) {
      toast('表盘文件处理失败', {
        description: cause instanceof Error ? cause.message : '未知错误'
      })
    }
  }

  return (
    <Card className="border-dashed border-primary/40 bg-primary/[0.03] shadow-none">
      <CardHeader className="pb-3 sm:p-4 sm:pb-3">
        <CardTitle className="text-sm">表盘 ID 修改工具</CardTitle>
        <CardDescription>修改 `.bin` / `.face` 内置 ID，并将该 ID 同步到 `index_v2.csv` 的资源 ID。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 sm:p-4 sm:pt-0">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="watchface-id-editor-file">表盘文件</Label>
            <input
              id="watchface-id-editor-file"
              type="file"
              accept=".bin,.face"
              onChange={handleFileChange}
              className={cn(
                'block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80',
                fileError ? 'border-destructive' : ''
              )}
            />
            {fileName ? <p className="text-xs text-muted-foreground">已选择：{fileName}（{fileSize} KB）</p> : null}
            {fileError ? <p className="text-xs text-destructive">{fileError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watchface-id-editor-id">新表盘 ID</Label>
            <Input
              id="watchface-id-editor-id"
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
              inputMode="numeric"
              maxLength={WATCHFACE_ID_LENGTH}
              placeholder="例如：740616000000"
            />
            {idError ? <p className="text-xs text-destructive">{idError}</p> : null}
            {!idError && draftId.trim().length === WATCHFACE_ID_LENGTH ? (
              <p className="text-xs text-muted-foreground">处理完成后会自动同步到上方资源 ID。</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="watchface-id-editor-name">导出文件名（可选）</Label>
          <Input
            id="watchface-id-editor-name"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="留空则保留原文件名"
          />
          {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void handleProcessAndDownload()} disabled={!isReady}>
            <DownloadSimple data-icon="inline-start" weight="duotone" />
            生成并下载
          </Button>
          {resourceId.trim() ? <span className="text-xs text-muted-foreground">当前资源 ID：{resourceId.trim()}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
