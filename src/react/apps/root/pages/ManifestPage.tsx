import {
  CheckCircle,
  CopySimple,
  DeviceMobile,
  DotsSixVertical,
  DownloadSimple,
  FloppyDisk,
  FolderOpen,
  FolderSimplePlus,
  Info,
  MagnifyingGlass,
  Minus,
  WarningCircle
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { MainLayoutOutletContext } from '@/react/layouts/MainLayout'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'
import { Textarea } from '@/react/components/ui/textarea'

type DeviceType = 'desktop' | 'tablet' | 'phone'

type ManifestData = {
  item: {
    name: string
    description: string
    preview: string[]
    icon: string
    source_url: string
    author: Array<{
      name: string
      author_url?: string
    }>
  }
  downloads: Record<string, { version: string; file_name: string }>
}

type SupportedDevice = {
  codename: string
  name: string
}

type DirectoryHandleLike = FileSystemDirectoryHandle & {
  resolve?: (possibleDescendant: FileSystemFileHandle) => Promise<string[] | null>
}

type WritableFileHandle = FileSystemFileHandle & {
  createWritable: (options?: { keepExistingData?: boolean }) => Promise<{
    write: (data: string) => Promise<void>
    close: () => Promise<void>
  }>
}

const DECLARATION_EXPIRE_DAYS = 7

const SUPPORTED_DEVICES: SupportedDevice[] = [
  { codename: 'n66', name: 'Xiaomi Smart Band 9' },
  { codename: 'n66', name: 'Xiaomi Smart Band 9 NFC' },
  { codename: 'n67', name: 'Xiaomi Smart Band 9 Pro' },
  { codename: 'n67', name: 'Xiaomi Smart Band 9 Pro 国际版' },
  { codename: 'o66', name: 'Xiaomi Smart Band 10' },
  { codename: 'o66nfc', name: 'Xiaomi Smart Band 10 NFC' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列 eSIM版' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列 国际版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 eSIM版' },
  { codename: 'o62m', name: 'Xiaomi Watch S4 15周年纪念版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 Sport版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 41mm' },
  { codename: 'o65', name: 'REDMI Watch 5' },
  { codename: 'o65m', name: 'REDMI Watch 5 eSIM' },
  { codename: 'p65', name: 'REDMI Watch 6' }
]

const createEmptyManifest = (): ManifestData => ({
  item: {
    name: '',
    description: '',
    preview: [],
    icon: '',
    source_url: '',
    author: []
  },
  downloads: {}
})

const detectDeviceType = (): DeviceType => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(userAgent)
  const screenWidth = window.innerWidth

  if (isMobile && !isTablet && screenWidth < 768) {
    return 'phone'
  }

  if (isTablet || (isMobile && screenWidth >= 768)) {
    return 'tablet'
  }

  return 'desktop'
}

const toManifestData = (value: unknown): ManifestData => {
  const root = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const itemRaw = root.item && typeof root.item === 'object' ? (root.item as Record<string, unknown>) : {}
  const downloadsRaw = root.downloads && typeof root.downloads === 'object' ? (root.downloads as Record<string, unknown>) : {}

  const authorRaw = Array.isArray(itemRaw.author) ? itemRaw.author : []
  const author = authorRaw.map((entry) => {
    const row = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    return {
      name: typeof row.name === 'string' ? row.name : '',
      author_url: typeof row.author_url === 'string' ? row.author_url : ''
    }
  })

  const previewRaw = Array.isArray(itemRaw.preview) ? itemRaw.preview : []
  const preview = previewRaw.map((entry) => (typeof entry === 'string' ? entry : '')).filter(Boolean)

  const downloads: Record<string, { version: string; file_name: string }> = {}
  for (const [deviceCode, row] of Object.entries(downloadsRaw)) {
    const parsed = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    downloads[deviceCode] = {
      version: typeof parsed.version === 'string' ? parsed.version : '1.0.0',
      file_name: typeof parsed.file_name === 'string' ? parsed.file_name : ''
    }
  }

  return {
    item: {
      name: typeof itemRaw.name === 'string' ? itemRaw.name : '',
      description: typeof itemRaw.description === 'string' ? itemRaw.description : '',
      preview,
      icon: typeof itemRaw.icon === 'string' ? itemRaw.icon : '',
      source_url: typeof itemRaw.source_url === 'string' ? itemRaw.source_url : '',
      author
    },
    downloads
  }
}

const readFileAsText = (file: File): Promise<string> => file.text()

const fallbackCopyText = (text: string): boolean => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  let success = false
  try {
    success = document.execCommand('copy')
  } catch {
    success = false
  }
  document.body.removeChild(textArea)
  return success
}

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return fallbackCopyText(text)
    }
  }
  return fallbackCopyText(text)
}

const createOpfsVirtualDirectoryHandle = (): FileSystemDirectoryHandle => {
  const createVirtualFileHandle = (name: string): FileSystemFileHandle =>
    ({
      name,
      kind: 'file',
      isSameEntry: async () => false,
      getFile: async () => new File([], name),
      createWritable: async () => {
        throw new Error('Not supported in OPFS mode')
      }
    }) as unknown as FileSystemFileHandle

  const handle = {
    name: 'OPFS_虚拟项目目录',
    kind: 'directory',
    isSameEntry: async () => false,
    getFileHandle: async (name: string) => createVirtualFileHandle(name),
    getDirectoryHandle: async () => createOpfsVirtualDirectoryHandle(),
    removeEntry: async () => {
      throw new Error('Not supported in OPFS mode')
    },
    resolve: async () => null,
    entries: async function* () {},
    [Symbol.asyncIterator]: async function* () {}
  } as unknown as FileSystemDirectoryHandle

  return handle
}

export function ManifestPage() {
  const isFsaSupported = typeof window.showDirectoryPicker === 'function'
  const [manifest, setManifest] = useState<ManifestData>(createEmptyManifest)
  const { projectDirectory, setProjectDirectory } = useOutletContext<MainLayoutOutletContext>()
  const [deviceType, setDeviceType] = useState<DeviceType>(detectDeviceType())

  const [showDeclaration, setShowDeclaration] = useState(true)
  const [isDeclarationScrolledToBottom, setIsDeclarationScrolledToBottom] = useState(false)
  const [showUnsupportedPrompt, setShowUnsupportedPrompt] = useState(!isFsaSupported)
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
  const [showEditPrompt, setShowEditPrompt] = useState(false)

  const [showAlert, setShowAlert] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [draggingPreviewIndex, setDraggingPreviewIndex] = useState<number | null>(null)

  const declarationBodyRef = useRef<HTMLDivElement | null>(null)

  const showPhonePrompt = deviceType === 'phone'
  const isOPFSMode = !isFsaSupported
  const showDirectoryPrompt = !showPhonePrompt && !showUnsupportedPrompt && !projectDirectory && isFsaSupported

  const manifestJsonString = useMemo(() => JSON.stringify(manifest, null, 2), [manifest])

  const showCustomAlert = useCallback((title: string, message: string) => {
    setAlertTitle(title)
    setAlertMessage(message)
    setShowAlert(true)
  }, [])

  const calculateRelativePath = useCallback(async (fileHandle: FileSystemFileHandle): Promise<string> => {
    if (!projectDirectory || isOPFSMode) return fileHandle.name
    const resolver = (projectDirectory as DirectoryHandleLike).resolve
    if (typeof resolver !== 'function') return fileHandle.name

    try {
      const resolved = await resolver(fileHandle)
      if (!resolved) return fileHandle.name
      return resolved.join('/')
    } catch {
      return fileHandle.name
    }
  }, [isOPFSMode, projectDirectory])

  const loadManifestFromHandle = useCallback(async () => {
    if (!projectDirectory) return
    try {
      const fileHandle = await projectDirectory.getFileHandle('manifest.json', { create: false })
      const file = await fileHandle.getFile()
      const text = await readFileAsText(file)
      const parsed = JSON.parse(text)
      setManifest(toManifestData(parsed))
    } catch (error) {
      if (error instanceof Error) {
        showCustomAlert('读取失败', error.message || '读取 manifest.json 文件失败')
      } else {
        showCustomAlert('读取失败', '读取 manifest.json 文件失败')
      }
    }
  }, [projectDirectory, showCustomAlert])

  const findManifest = useCallback(async () => {
    if (!isFsaSupported) {
      setShowEditPrompt(true)
      return
    }

    if (!projectDirectory) {
      showCustomAlert('操作失败', '请先选择项目目录')
      return
    }

    try {
      await projectDirectory.getFileHandle('manifest.json', { create: false })
      setShowEditPrompt(true)
    } catch (error) {
      if (error instanceof Error && error.name !== 'NotFoundError') {
        showCustomAlert('读取失败', error.message || '读取 manifest.json 文件失败')
      }
    }
  }, [isFsaSupported, projectDirectory, showCustomAlert])

  const loadManifestFromFileInput = useCallback(async () => {
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = () => {
        const selected = input.files?.[0] || null
        resolve(selected)
      }
      input.click()
    })

    if (!file) return

    if (file.name !== 'manifest.json') {
      showCustomAlert('文件错误', '请上传名为 manifest.json 的文件')
      return
    }

    try {
      const text = await readFileAsText(file)
      const parsed = JSON.parse(text)
      setManifest(toManifestData(parsed))
    } catch {
      showCustomAlert('解析失败', 'manifest.json 文件格式不正确，无法解析。请检查文件内容。')
    }
  }, [showCustomAlert])

  const performSave = useCallback(async () => {
    if (!projectDirectory) return
    const writableHandle = (await projectDirectory.getFileHandle('manifest.json', { create: true })) as WritableFileHandle
    const writable = await writableHandle.createWritable()
    await writable.write(manifestJsonString)
    await writable.close()
  }, [manifestJsonString, projectDirectory])

  const selectProjectDirectory = useCallback(async () => {
    if (!isFsaSupported) {
      showCustomAlert('当前环境限制', '浏览器不支持 File System Access API，无法直接选择目录。可继续使用下载/上传方式。')
      return
    }

    try {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'manifest-project-directory',
        mode: 'readwrite'
      })
      setProjectDirectory(directoryHandle)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        showCustomAlert('操作失败', error.message || '选择文件夹失败，请重试')
      }
    }
  }, [isFsaSupported, showCustomAlert])

  const continueWithOPFS = useCallback(() => {
    setShowUnsupportedPrompt(false)
    setProjectDirectory((current) => current ?? createOpfsVirtualDirectoryHandle())
  }, [setProjectDirectory])

  useEffect(() => {
    const updateType = () => {
      setDeviceType(detectDeviceType())
    }
    window.addEventListener('resize', updateType)
    return () => {
      window.removeEventListener('resize', updateType)
    }
  }, [])

  useEffect(() => {
    const hasAgreed = localStorage.getItem('hasAgreedToDeclaration')
    const agreedAt = localStorage.getItem('declarationAgreedAt')

    if (hasAgreed !== 'true' || !agreedAt) {
      setShowDeclaration(true)
      return
    }

    const now = Date.now()
    const agreedTime = Number.parseInt(agreedAt, 10)
    const daysPassed = (now - agreedTime) / (1000 * 60 * 60 * 24)

    if (!Number.isFinite(daysPassed) || daysPassed > DECLARATION_EXPIRE_DAYS) {
      localStorage.removeItem('hasAgreedToDeclaration')
      localStorage.removeItem('declarationAgreedAt')
      setShowDeclaration(true)
      return
    }

    setShowDeclaration(false)
  }, [])

  useEffect(() => {
    if (!projectDirectory) return
    void findManifest()
  }, [findManifest, projectDirectory])

  const addAuthor = useCallback(() => {
    setManifest((current) => ({
      ...current,
      item: {
        ...current.item,
        author: [...current.item.author, { name: '', author_url: '' }]
      }
    }))
  }, [])

  const removeAuthor = useCallback((index: number) => {
    setManifest((current) => ({
      ...current,
      item: {
        ...current.item,
        author: current.item.author.filter((_, itemIndex) => itemIndex !== index)
      }
    }))
  }, [])

  const removePreview = useCallback((index: number) => {
    setManifest((current) => ({
      ...current,
      item: {
        ...current.item,
        preview: current.item.preview.filter((_, itemIndex) => itemIndex !== index)
      }
    }))
  }, [])

  const handlePreviewDragStart = useCallback((index: number) => {
    setDraggingPreviewIndex(index)
  }, [])

  const handlePreviewDragEnd = useCallback(() => {
    setDraggingPreviewIndex(null)
  }, [])

  const handlePreviewDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handlePreviewDrop = useCallback((targetIndex: number) => {
    setManifest((current) => {
      if (draggingPreviewIndex === null || draggingPreviewIndex === targetIndex) {
        return current
      }

      const list = [...current.item.preview]
      const [movedItem] = list.splice(draggingPreviewIndex, 1)
      if (!movedItem) {
        return current
      }
      list.splice(targetIndex, 0, movedItem)

      return {
        ...current,
        item: {
          ...current.item,
          preview: list
        }
      }
    })
    setDraggingPreviewIndex(null)
  }, [draggingPreviewIndex])

  const selectMultiplePreviews = useCallback(async () => {
    if (!projectDirectory && isFsaSupported) {
      showCustomAlert('操作失败', '请先选择项目目录')
      return
    }

    if (isFsaSupported && typeof window.showOpenFilePicker === 'function') {
      try {
        const pickerOptions = {
          startIn: projectDirectory as unknown as FileSystemDirectoryHandle,
          multiple: true,
          types: [
            {
              description: '图片文件',
              accept: {
                'image/*': ['.png', '.jpg', '.jpeg', '.webp']
              }
            }
          ]
        } as unknown as Parameters<typeof window.showOpenFilePicker>[0]

        const fileHandles = await window.showOpenFilePicker(pickerOptions)

        const relativePaths = await Promise.all(fileHandles.map((fileHandle) => calculateRelativePath(fileHandle)))
        setManifest((current) => {
          const appended = relativePaths.filter((path) => !current.item.preview.includes(path))
          if (appended.length === 0) {
            showCustomAlert('操作提示', '您选择的文件已存在于预览图列表中')
            return current
          }

          return {
            ...current,
            item: {
              ...current.item,
              preview: [...current.item.preview, ...appended]
            }
          }
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          showCustomAlert('操作失败', error.message || '选择文件失败，请重试')
        }
      }
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*'
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files
      if (!files || files.length === 0) return

      const names = Array.from(files).map((file) => file.name)
      setManifest((current) => {
        const appended = names.filter((name) => !current.item.preview.includes(name))
        if (appended.length === 0) {
          showCustomAlert('操作提示', '您选择的文件已存在于预览图列表中')
          return current
        }
        return {
          ...current,
          item: {
            ...current.item,
            preview: [...current.item.preview, ...appended]
          }
        }
      })
    }
    input.click()
  }, [calculateRelativePath, isFsaSupported, projectDirectory, showCustomAlert])

  const selectFile = useCallback(async (type: 'icon' | 'download', deviceCode?: string) => {
    if (!projectDirectory && isFsaSupported) {
      showCustomAlert('操作失败', '请先选择项目目录')
      return
    }

    if (isFsaSupported && typeof window.showOpenFilePicker === 'function') {
      try {
        const pickerOptions = {
          startIn: projectDirectory as unknown as FileSystemDirectoryHandle,
          multiple: false
        } as unknown as Parameters<typeof window.showOpenFilePicker>[0]

        const fileHandles = await window.showOpenFilePicker(pickerOptions)

        const relativePath = await calculateRelativePath(fileHandles[0])
        if (type === 'icon') {
          setManifest((current) => ({
            ...current,
            item: {
              ...current.item,
              icon: relativePath
            }
          }))
          return
        }

        if (!deviceCode) return
        setManifest((current) => {
          if (!current.downloads[deviceCode]) return current
          return {
            ...current,
            downloads: {
              ...current.downloads,
              [deviceCode]: {
                ...current.downloads[deviceCode],
                file_name: relativePath
              }
            }
          }
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          showCustomAlert('操作失败', error.message || '选择文件失败，请重试')
        }
      }
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (type === 'icon') {
        setManifest((current) => ({
          ...current,
          item: {
            ...current.item,
            icon: file.name
          }
        }))
        return
      }

      if (!deviceCode) return
      setManifest((current) => {
        if (!current.downloads[deviceCode]) return current
        return {
          ...current,
          downloads: {
            ...current.downloads,
            [deviceCode]: {
              ...current.downloads[deviceCode],
              file_name: file.name
            }
          }
        }
      })
    }
    input.click()
  }, [calculateRelativePath, isFsaSupported, projectDirectory, showCustomAlert])

  const getDeviceDisplayName = useCallback((codename: string): string => {
    const devices = SUPPORTED_DEVICES.filter((device) => device.codename === codename)
    const download = manifest.downloads[codename]
    const version = download?.version ? ` (${download.version})` : ''

    if (devices.length === 0) {
      return `${codename}${version}`
    }

    if (devices.length === 1) {
      return `${devices[0].name} [${codename}]${version}`
    }

    return `${devices.map((item) => item.name).join(' / ')} [${codename}]${version}`
  }, [manifest.downloads])

  const openDeviceSelector = useCallback(() => {
    setSelectedDevices(Object.keys(manifest.downloads))
    setShowDeviceSelector(true)
  }, [manifest.downloads])

  const toggleDeviceSelection = useCallback((device: SupportedDevice) => {
    setSelectedDevices((currentSelected) => {
      const exists = currentSelected.includes(device.codename)
      const next = exists
        ? currentSelected.filter((code) => code !== device.codename)
        : [...currentSelected, device.codename]

      setManifest((currentManifest) => {
        const nextDownloads = { ...currentManifest.downloads }
        if (exists) {
          delete nextDownloads[device.codename]
        } else if (!nextDownloads[device.codename]) {
          nextDownloads[device.codename] = {
            version: '1.0.0',
            file_name: ''
          }
        }

        return {
          ...currentManifest,
          downloads: nextDownloads
        }
      })

      return next
    })
  }, [])

  const removeDownload = useCallback((deviceCode: string) => {
    setManifest((current) => {
      const nextDownloads = { ...current.downloads }
      delete nextDownloads[deviceCode]
      return {
        ...current,
        downloads: nextDownloads
      }
    })

    setSelectedDevices((current) => current.filter((code) => code !== deviceCode))
  }, [])

  const saveManifest = useCallback(async () => {
    if (!projectDirectory || isOPFSMode) {
      showCustomAlert('操作失败', '当前浏览器不支持直接保存功能，可使用“下载”导出 manifest.json')
      return
    }

    try {
      await projectDirectory.getFileHandle('manifest.json', { create: false })
      setShowOverwriteDialog(true)
    } catch (error) {
      if (error instanceof Error && error.name !== 'NotFoundError') {
        showCustomAlert('操作失败', error.message || '保存文件失败')
        return
      }

      try {
        await performSave()
        showCustomAlert('操作成功', 'manifest.json 已成功保存')
      } catch (saveError) {
        if (saveError instanceof Error) {
          showCustomAlert('操作失败', saveError.message || '保存文件失败')
        } else {
          showCustomAlert('操作失败', '保存文件失败')
        }
      }
    }
  }, [isOPFSMode, performSave, projectDirectory, showCustomAlert])

  const confirmOverwrite = useCallback(async () => {
    setShowOverwriteDialog(false)
    try {
      await performSave()
      showCustomAlert('操作成功', 'manifest.json 已成功覆盖')
    } catch (error) {
      if (error instanceof Error) {
        showCustomAlert('操作失败', error.message || '覆盖文件失败')
      } else {
        showCustomAlert('操作失败', '覆盖文件失败')
      }
    }
  }, [performSave, showCustomAlert])

  const downloadManifest = useCallback(() => {
    const blob = new Blob([manifestJsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'manifest.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [manifestJsonString])

  const copyManifest = useCallback(async () => {
    const success = await copyText(manifestJsonString)
    if (success) {
      showCustomAlert('操作成功', '已复制到剪贴板')
      return
    }
    showCustomAlert('操作失败', '复制失败，请重试')
  }, [manifestJsonString, showCustomAlert])

  const checkScrollPosition = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget
    const threshold = 1
    const reachedBottom = Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold
    setIsDeclarationScrolledToBottom(reachedBottom)
  }, [])

  const agreeDeclaration = useCallback(() => {
    const now = Date.now()
    localStorage.setItem('hasAgreedToDeclaration', 'true')
    localStorage.setItem('declarationAgreedAt', String(now))
    setShowDeclaration(false)
  }, [])

  const disagreeDeclaration = useCallback(() => {
    showCustomAlert('继续前请确认', '需要同意审核标准后才可继续使用 Manifest 编辑功能。')
  }, [showCustomAlert])

  const confirmEditPrompt = useCallback(async () => {
    setShowEditPrompt(false)
    if (isOPFSMode) {
      await loadManifestFromFileInput()
      return
    }
    await loadManifestFromHandle()
  }, [isOPFSMode, loadManifestFromFileInput, loadManifestFromHandle])

  const resetManifest = useCallback(() => {
    setManifest(createEmptyManifest())
  }, [])

  const isDeviceSelected = useCallback((device: SupportedDevice) => selectedDevices.includes(device.codename), [selectedDevices])

  return (
    <div className="flex min-h-full w-full flex-col">
      <Dialog open={showPhonePrompt}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <DeviceMobile size={36} weight="duotone" className="mt-0.5 text-foreground" />
              <div>
                <DialogTitle>手机设备限制</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">
                  Manifest 功能在手机设备不可用，请改用平板或桌面端。建议使用 Chrome 或 Edge 以获得完整能力。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showUnsupportedPrompt}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <WarningCircle size={36} weight="duotone" className="mt-0.5 text-foreground" />
              <div>
                <DialogTitle>浏览器不支持 FSA API</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">
                  将使用降级模式，无法直接写回目录。建议使用 Chrome 或 Edge；当前模式可导入已有 manifest.json 并通过下载方式保存。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button variant="secondary" onClick={continueWithOPFS}>
              <CheckCircle size={16} weight="fill" />
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDirectoryPrompt} modal={false}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <FolderSimplePlus size={36} weight="duotone" className="mt-0.5 text-foreground" />
              <div>
                <DialogTitle>请选择项目文件夹</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">
                  先选择项目目录，再进行 manifest 编辑与保存。已支持 FSA 模式处理非根目录文件。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button onClick={() => void selectProjectDirectory()}>
              <FolderOpen size={16} weight="duotone" />
              选择文件夹
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showPhonePrompt ? (
        <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-6 text-center text-sm text-muted-foreground">
          当前设备为手机，Manifest 编辑功能已禁用。
        </div>
      ) : null}

      {!showPhonePrompt && projectDirectory ? (
        <div className="flex min-h-[calc(100vh-12rem)] w-full flex-col gap-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-3">
            <span className="min-w-0 flex-1 truncate">
              当前项目路径: {projectDirectory.name} ({isFsaSupported ? 'FSA' : 'OPFS'})
            </span>
            <Button
              variant="outline"
              size="sm"
              className="max-[480px]:w-full max-[480px]:justify-center"
              onClick={() => void selectProjectDirectory()}
              disabled={isOPFSMode}
            >
              更改文件夹
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 max-[480px]:w-full max-[480px]:justify-center"
              onClick={() => {
                void findManifest()
              }}
            >
              <MagnifyingGlass size={16} weight="bold" />
              查找manifest.json
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
            <div className="min-w-0 space-y-4">
              <Card className="w-full border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">应用信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="w-full space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">应用名称</label>
                    <Input
                      value={manifest.item.name}
                      onChange={(event) => {
                        const name = event.target.value
                        setManifest((current) => ({
                          ...current,
                          item: {
                            ...current.item,
                            name
                          }
                        }))
                      }}
                      placeholder="应用名称"
                    />
                  </div>

                  <div className="w-full space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">应用简介</label>
                    <Textarea
                      value={manifest.item.description}
                      onChange={(event) => {
                        const description = event.target.value
                        setManifest((current) => ({
                          ...current,
                          item: {
                            ...current.item,
                            description
                          }
                        }))
                      }}
                      placeholder="应用简介"
                    />
                  </div>

                  <div className="w-full space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">预览图（可排序）</label>
                    <div className="space-y-2">
                      {manifest.item.preview.map((previewPath, index) => (
                        <div
                          key={`${previewPath}-${index}`}
                          onDragOver={handlePreviewDragOver}
                          onDrop={() => handlePreviewDrop(index)}
                          className={[
                            'flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-background p-2.5',
                            draggingPreviewIndex === index ? 'opacity-80' : ''
                          ].join(' ')}
                        >
                          <div
                            draggable
                            onDragStart={() => handlePreviewDragStart(index)}
                            onDragEnd={handlePreviewDragEnd}
                            className="drag-handle flex h-full w-6 cursor-grab items-center justify-center rounded-md bg-muted py-1 active:cursor-grabbing"
                          >
                            <DotsSixVertical size={16} weight="bold" />
                          </div>
                          <Input value={previewPath} readOnly className="flex-1 min-w-0" />
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => removePreview(index)}>
                            <Minus size={16} weight="bold" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="default" className="mt-2 font-semibold" onClick={() => void selectMultiplePreviews()}>
                      + 添加预览图
                    </Button>
                  </div>

                  <div className="w-full space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">图标</label>
                    <div className="flex w-full gap-2 max-[640px]:flex-col">
                      <Input value={manifest.item.icon} readOnly placeholder="icon.png" className="flex-1 min-w-0" />
                      <Button onClick={() => void selectFile('icon')}>选择文件</Button>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">开源仓库 URL（可选）</label>
                    <Input
                      value={manifest.item.source_url}
                      onChange={(event) => {
                        const sourceUrl = event.target.value
                        setManifest((current) => ({
                          ...current,
                          item: {
                            ...current.item,
                            source_url: sourceUrl
                          }
                        }))
                      }}
                      placeholder="开源项目将有更多机会得到推荐"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">作者信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-3">
                    {manifest.item.author.map((author, index) => (
                      <div key={`author-${index}`} className="relative space-y-3 rounded-lg border border-border bg-background p-3.5">
                        <div className="w-full space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">作者名称</label>
                          <Input
                            value={author.name}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setManifest((current) => {
                                const nextAuthors = [...current.item.author]
                                nextAuthors[index] = {
                                  ...nextAuthors[index],
                                  name: nextValue
                                }
                                return {
                                  ...current,
                                  item: {
                                    ...current.item,
                                    author: nextAuthors
                                  }
                                }
                              })
                            }}
                            placeholder="作者名称"
                          />
                        </div>
                        <div className="w-full space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">作者主页（可选）</label>
                          <Input
                            value={author.author_url || ''}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setManifest((current) => {
                                const nextAuthors = [...current.item.author]
                                nextAuthors[index] = {
                                  ...nextAuthors[index],
                                  author_url: nextValue
                                }
                                return {
                                  ...current,
                                  item: {
                                    ...current.item,
                                    author: nextAuthors
                                  }
                                }
                              })
                            }}
                            placeholder="https://github.com/用户名"
                          />
                        </div>
                        <Button variant="outline" onClick={() => removeAuthor(index)}>
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button variant="default" className="font-semibold" onClick={addAuthor}>
                    + 添加作者
                  </Button>
                </CardContent>
              </Card>

              <Card className="w-full border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">支持设备信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-3">
                    {Object.entries(manifest.downloads).map(([deviceCode, download]) => (
                      <div key={deviceCode} className="space-y-3 rounded-lg border border-border bg-background p-3.5">
                        <h4 className="mb-2 text-sm font-semibold text-foreground">{getDeviceDisplayName(deviceCode)}</h4>
                        <div className="w-full space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">应用版本</label>
                          <Input
                            value={download.version}
                            onChange={(event) => {
                              const version = event.target.value
                              setManifest((current) => ({
                                ...current,
                                downloads: {
                                  ...current.downloads,
                                  [deviceCode]: {
                                    ...current.downloads[deviceCode],
                                    version
                                  }
                                }
                              }))
                            }}
                            placeholder="1.0.0"
                          />
                        </div>
                        <div className="w-full space-y-1.5">
                          <label className="block text-sm font-medium text-foreground">资源文件</label>
                          <div className="flex w-full gap-2 max-[640px]:flex-col">
                            <Input value={download.file_name} readOnly className="flex-1 min-w-0" />
                            <Button onClick={() => void selectFile('download', deviceCode)}>选择文件</Button>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => removeDownload(deviceCode)}>
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button onClick={openDeviceSelector}>+ 添加支持的设备</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0 border-border bg-card md:sticky md:top-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">实时 JSON 预览</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  <Button className="gap-2" onClick={() => void saveManifest()} disabled={isOPFSMode}>
                    <FloppyDisk size={16} weight="bold" />
                    保存
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={downloadManifest}>
                    <DownloadSimple size={16} weight="bold" />
                    下载
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => void copyManifest()}>
                    <CopySimple size={16} weight="bold" />
                    复制
                  </Button>
                  <Button variant="ghost" onClick={resetManifest}>重置</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative w-full">
                  <div className="rounded-xl border border-border bg-muted/35 p-4 font-mono text-sm leading-6 text-foreground md:p-5">
                    <pre className="m-0 whitespace-pre-wrap break-words">{manifestJsonString}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {!showPhonePrompt && !projectDirectory && isOPFSMode ? (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/25 px-6 text-center text-sm text-muted-foreground">
          <p>当前浏览器不支持目录写回，建议在桌面 Chrome/Edge 下使用。</p>
          <Button variant="outline" className="gap-2" onClick={() => setShowEditPrompt(true)}>
            <MagnifyingGlass size={16} weight="bold" />
            加载已有 manifest.json
          </Button>
          <p className="max-w-[520px] text-xs leading-6">你仍可导入并编辑内容，再下载 `manifest.json`。</p>
        </div>
      ) : null}

      <Dialog open={showDeclaration}>
        <DialogContent className="max-w-[860px] [&>button]:hidden" onPointerDownOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>AstroBox 官方社区源资源审核标准</DialogTitle>
            <DialogDescription>阅读完毕后方可继续使用生成功能。</DialogDescription>
          </DialogHeader>
          <div
            ref={declarationBodyRef}
            className="mt-3 max-h-[58vh] overflow-y-auto rounded-lg border border-border bg-background p-5 text-sm leading-6 text-muted-foreground"
            onScroll={checkScrollPosition}
          >
            <h4 className="mb-3 mt-6 text-foreground">一、资源结构与清单合规性</h4>
            <ol className="m-0 list-decimal space-y-3 pl-6">
              <li>是否正确在 index.csv 行末添加自己的资源信息</li>
              <li>csv 中添加的 icon 链接是否可正常访问</li>
              <li>csv 中添加的 cover 链接是否可正常访问</li>
              <li>csv 中的兼容设备列表、tags 的分隔符使用是否正确</li>
              <li>csv 中指向的资源 json 是否真实存在</li>
              <li>资源 json 所处的文件夹是否命名合理，json 本身是否命名合理</li>
              <li>资源 json 指向的目标仓库是否真实存在</li>
              <li>目标仓库中的 manifest.json 是否按要求填写，格式是否符合标准 json 规范</li>
              <li>manifest.json 中的资源名称是否与 csv 中的资源名称完全相同</li>
              <li>manifest.json中的downloads map中的设备代号是否真实存在，是否存在填了o66没填o66nfc之类的情况（类似情况可以先不merge，先提醒并得到确认）</li>
              <li>downloads map中的目标文件名是否在仓库中真实存在（特别注意）</li>
              <li>manifest.json中author数组中每个作者author_url的目标指向页面是否合规、是否存在不良内容</li>
              <li>存在任何问题都必须直接在Pull Request中与提交者公开、透明地进行沟通，如无任何问题，可以继续进行资源质量检查。</li>
            </ol>

            <h4 className="mb-3 mt-6 text-foreground">二、资源质量与版权</h4>
            <ol className="m-0 list-decimal space-y-3 pl-6">
              <li>资源不是搬运/转载/盗传</li>
              <li>资源的创意没有明显的剽窃性（这属于主观判断，不要直接关闭Pull Request，由审核员共同探讨是否应该进行merge）</li>
              <li>资源的icon与cover设计是否合理得当、符合大众审美（icon不要求死追严打，cover若出现低质、简陋的情况，直接在Pull Request中对提交者作出修改意见）</li>
              <li>资源本体在支持的设备上基本功能是否运行正常（一般情况下适当测试一个设备即可，剩余问题用户会自己去拷打作者）</li>
              <li>资源若使用了某些知名IP素材，必须在preview中留一张图来进行版权声明（这里不是要求提交者拥有素材版权，而是必须证明素材、IP本身与AstroBox以及小米无关）</li>
            </ol>

            <h4 className="mb-3 mt-6 text-foreground">三、资源数量和付费资源（2025.7.6日公告）</h4>
            <ol className="m-0 list-decimal space-y-3 pl-6">
              <li>任何作者在 AstroBox 官方源上传的免费资源数量必须是付费资源的 2 倍以上</li>
              <li>对于存在任何应用内购买或类型为试用的资源，必须标注为付费</li>
              <li>付费资源将在首页被明显标注，并允许被用户一键过滤。</li>
            </ol>

            <h4 className="mt-6 text-right text-muted-foreground">文档来自官方</h4>
          </div>

          <DialogFooter className="mt-4 flex justify-between gap-2.5 max-[480px]:flex-col">
            <Button variant="outline" onClick={disagreeDeclaration}>
              听不懂私密达
            </Button>
            <Button disabled={!isDeclarationScrolledToBottom} onClick={agreeDeclaration}>
              听懂了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
        <DialogContent className="w-[95vw] !max-w-[1120px]">
          <DialogHeader>
            <DialogTitle>选择设备</DialogTitle>
            <DialogDescription>可多选，建议按实际支持情况勾选。</DialogDescription>
          </DialogHeader>
          <div className="my-3 max-h-[68vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 max-[420px]:grid-cols-1">
              {SUPPORTED_DEVICES.map((device) => (
                <div
                  key={`${device.codename}-${device.name}`}
                  className={[
                    'h-full min-h-[96px] cursor-pointer rounded-lg border p-4 transition-colors',
                    isDeviceSelected(device) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
                  ].join(' ')}
                  onClick={() => toggleDeviceSelection(device)}
                >
                  <div className="mb-1 font-semibold text-foreground">{device.name}</div>
                  <div className="text-xs text-muted-foreground">{device.codename}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeviceSelector(false)}>
              取消
            </Button>
            <Button disabled={selectedDevices.length === 0} onClick={() => setShowDeviceSelector(false)}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>确认覆盖文件</DialogTitle>
            <DialogDescription>项目目录中已存在 manifest.json 文件，确定要覆盖吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)}>
              取消
            </Button>
            <Button onClick={() => void confirmOverwrite()}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditPrompt} onOpenChange={setShowEditPrompt}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isFsaSupported ? '检测到 manifest.json' : '进入 manifest 编辑模式'}</DialogTitle>
            <DialogDescription>
              {isFsaSupported ? '目录中已存在 manifest.json 文件，是否加载并编辑现有文件？' : '是否加载并编辑现有的 manifest.json 文件？'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPrompt(false)}>
              取消
            </Button>
            <Button onClick={() => void confirmEditPrompt()}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{alertTitle || '提示'}</DialogTitle>
            <DialogDescription>{alertMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowAlert(false)}>
              <Info size={16} weight="duotone" />
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
