import { CopySimple, MagnifyingGlass, Minus } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createGitHubClient } from '@/utils/githubOctokitClient'
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
import { Label } from '@/react/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/react/components/ui/radio-group'

type BadgeStyle = 'standard' | 'rounded' | 'linked'
type BadgeColor = 'black' | 'gray' | 'white'
type BadgeLanguage = 'zhcn' | 'en'

type ResourceItem = {
  name: string
  restype: string
  path: string
  [key: string]: string
}

const BASE_URL = 'https://astrobox.online/open?source=res&res='
const SUFFIX_URL = '&provider=official'

const decodeBase64Utf8 = (base64: string): string => {
  const normalized = base64.replace(/\n/g, '')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

const splitCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }
  result.push(current)
  return result.map((value) => value.trim())
}

const getAuthorName = (path: string): string => {
  if (!path) return '未知'
  const parts = path.split('/')
  return parts.length > 0 ? parts[0] : '未知'
}

const fallbackCopyTextToClipboard = (text: string): boolean => {
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

export function ResLinkPage() {
  const [resourceName, setResourceName] = useState('')
  const [showResourceSearch, setShowResourceSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allResources, setAllResources] = useState<ResourceItem[]>([])
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([])
  const [loadingResources, setLoadingResources] = useState(false)

  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>('standard')
  const [badgeColor, setBadgeColor] = useState<BadgeColor>('black')
  const [badgeLanguage, setBadgeLanguage] = useState<BadgeLanguage>('zhcn')

  const [copyButtonText, setCopyButtonText] = useState('复制链接')
  const [copyBadgeButtonText, setCopyBadgeButtonText] = useState('复制代码')
  const copyLinkTimerRef = useRef<number | null>(null)
  const copyBadgeTimerRef = useRef<number | null>(null)

  const generatedLink = useMemo(() => {
    if (!resourceName.trim()) return '...'
    const encodedResourceName = encodeURIComponent(resourceName)
    return `${BASE_URL}${encodedResourceName}${SUFFIX_URL}`
  }, [resourceName])

  const badgeImageUrl = useMemo(() => {
    let stylePath = ''
    if (badgeStyle === 'rounded') stylePath = 'rounded/'
    if (badgeStyle === 'linked') stylePath = 'linked/'
    return `https://astrobox.online/goab/${badgeLanguage}/${stylePath}${badgeColor}.svg`
  }, [badgeColor, badgeLanguage, badgeStyle])

  const badgeHtmlCode = useMemo(() => {
    if (!resourceName.trim()) {
      return '<!-- 请输入资源名称后生成徽标代码 -->'
    }
    return `<a href="${generatedLink}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeImageUrl}" alt="Get it on AstroBox" height="46">
</a>`
  }, [badgeImageUrl, generatedLink, resourceName])

  useEffect(() => {
    return () => {
      if (copyLinkTimerRef.current !== null) {
        window.clearTimeout(copyLinkTimerRef.current)
      }
      if (copyBadgeTimerRef.current !== null) {
        window.clearTimeout(copyBadgeTimerRef.current)
      }
    }
  }, [])

  const filterResourcesByQuery = (query: string, source: ResourceItem[]): ResourceItem[] => {
    if (!query.trim()) return [...source]
    const normalized = query.trim().toLowerCase()
    return source.filter((resource) => {
      const nameMatch = (resource.name || '').toLowerCase().includes(normalized)
      const authorMatch = getAuthorName(resource.path || '').toLowerCase().includes(normalized)
      return nameMatch || authorMatch
    })
  }

  const loadResources = async (): Promise<ResourceItem[]> => {
    try {
      setLoadingResources(true)
      const { rest } = createGitHubClient()
      const { data } = await rest.repos.getContent({
        owner: 'AstralSightStudios',
        repo: 'AstroBox-Repo',
        path: 'index.csv',
        ref: 'main'
      })

      if (Array.isArray(data) || data.type !== 'file' || !data.content) {
        throw new Error('index.csv 内容获取失败')
      }

      const csvText = decodeBase64Utf8(data.content)
      const lines = csvText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line)
      if (lines.length <= 1) {
        setAllResources([])
        setFilteredResources([])
        return []
      }

      const headers = splitCsvLine(lines[0])
      const resources = lines
        .slice(1)
        .map((line) => {
          const values = splitCsvLine(line)
          const mapped: ResourceItem = { name: '', restype: '', path: '' }
          headers.forEach((header, index) => {
            mapped[header] = values[index] || ''
          })
          return mapped
        })
        .filter((resource) => (resource.name || '').trim())

      setAllResources(resources)
      setFilteredResources(resources)
      return resources
    } catch (error) {
      console.error('加载资源列表失败:', error)
      setAllResources([])
      setFilteredResources([])
      return []
    } finally {
      setLoadingResources(false)
    }
  }

  const openResourceSearch = async () => {
    const source = allResources.length > 0 ? allResources : await loadResources()
    setSearchQuery('')
    setFilteredResources(source)
    setShowResourceSearch(true)
  }

  const closeResourceSearch = () => {
    setShowResourceSearch(false)
  }

  const selectResource = (resource: ResourceItem) => {
    setResourceName(resource.name || '')
    closeResourceSearch()
  }

  const isResourceSelected = (resource: ResourceItem): boolean => resourceName === resource.name

  const copyText = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        return fallbackCopyTextToClipboard(text)
      }
    }
    return fallbackCopyTextToClipboard(text)
  }

  const copyLink = async () => {
    if (!resourceName.trim()) return
    const success = await copyText(generatedLink)
    setCopyButtonText(success ? '已复制！' : '复制失败')
    if (copyLinkTimerRef.current !== null) {
      window.clearTimeout(copyLinkTimerRef.current)
    }
    copyLinkTimerRef.current = window.setTimeout(() => {
      setCopyButtonText('复制链接')
    }, 1500)
  }

  const copyBadgeCode = async () => {
    if (!resourceName.trim()) return
    const success = await copyText(badgeHtmlCode)
    setCopyBadgeButtonText(success ? '已复制！' : '复制失败')
    if (copyBadgeTimerRef.current !== null) {
      window.clearTimeout(copyBadgeTimerRef.current)
    }
    copyBadgeTimerRef.current = window.setTimeout(() => {
      setCopyBadgeButtonText('复制代码')
    }, 1500)
  }

  const clearInput = () => {
    setResourceName('')
    setCopyButtonText('复制链接')
    if (copyLinkTimerRef.current !== null) {
      window.clearTimeout(copyLinkTimerRef.current)
      copyLinkTimerRef.current = null
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">资源信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <Label className="mb-2 block text-sm font-semibold text-foreground">资源名称</Label>
            <div className="flex items-center gap-2 max-[768px]:flex-col">
              <Input
                id="resourceNameInput"
                value={resourceName}
                onChange={(event) => setResourceName(event.target.value)}
                placeholder="PoP☆P"
                className="flex-1"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void copyLink()
                  }
                }}
              />
              <Button variant="outline" className="gap-2 max-[768px]:w-full" onClick={() => void openResourceSearch()}>
                <MagnifyingGlass size={16} weight="bold" />
                搜索
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="min-w-9 max-[768px]:w-full max-[768px]:justify-center"
                disabled={!resourceName.trim()}
                onClick={clearInput}
              >
                <Minus size={16} weight="bold" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            生成的链接<span className="ml-1 text-xs font-normal text-muted-foreground">（点击可跳转）</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div
            className={[
              'rounded-lg border border-border bg-background p-4 text-sm leading-6',
              resourceName.trim() ? 'text-foreground' : 'italic text-muted-foreground'
            ].join(' ')}
          >
            <pre className="m-0 whitespace-pre-wrap break-words font-mono">
              {resourceName.trim() ? (
                <a href={generatedLink} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {generatedLink}
                </a>
              ) : (
                generatedLink
              )}
            </pre>
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!resourceName.trim()} onClick={() => void copyLink()}>
              <CopySimple size={16} weight="bold" />
              {copyButtonText}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">徽标代码生成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-stretch gap-4 max-[768px]:flex-col">
            <div className="flex min-w-0 max-w-[400px] flex-1 flex-col max-[768px]:max-w-full">
              <div className="mb-4">
                <Label className="mb-2 block text-sm font-semibold text-foreground">语言</Label>
                <RadioGroup
                  value={badgeLanguage}
                  onValueChange={(value) => setBadgeLanguage(value as BadgeLanguage)}
                  className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                >
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-lang-zhcn" value="zhcn" />
                    <Label htmlFor="badge-lang-zhcn">简体中文</Label>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-lang-en" value="en" />
                    <Label htmlFor="badge-lang-en">英文</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="mb-4">
                <Label className="mb-2 block text-sm font-semibold text-foreground">样式</Label>
                <RadioGroup
                  value={badgeStyle}
                  onValueChange={(value) => setBadgeStyle(value as BadgeStyle)}
                  className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                >
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-style-standard" value="standard" />
                    <Label htmlFor="badge-style-standard">标准</Label>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-style-rounded" value="rounded" />
                    <Label htmlFor="badge-style-rounded">胶囊</Label>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-style-linked" value="linked" />
                    <Label htmlFor="badge-style-linked">链接</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-semibold text-foreground">配色</Label>
                <RadioGroup
                  value={badgeColor}
                  onValueChange={(value) => setBadgeColor(value as BadgeColor)}
                  className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                >
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-color-black" value="black" />
                    <Label htmlFor="badge-color-black">黑色</Label>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-color-gray" value="gray" />
                    <Label htmlFor="badge-color-gray">灰色</Label>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                    <RadioGroupItem id="badge-color-white" value="white" />
                    <Label htmlFor="badge-color-white">亮色</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col max-[768px]:order-first">
              <Label className="mb-2 block text-sm font-semibold text-foreground">
                徽标预览<span className="ml-1 text-xs font-normal text-muted-foreground">（点击可跳转）</span>
              </Label>
              <div className="mt-2 flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-background p-4">
                {resourceName.trim() ? (
                  <a href={generatedLink} target="_blank" rel="noopener noreferrer">
                    <img src={badgeImageUrl} alt="徽标预览" className="max-h-full max-w-full object-contain transition-all" />
                  </a>
                ) : (
                  <img src={badgeImageUrl} alt="徽标预览" className="max-h-full max-w-full object-contain transition-all" />
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-semibold text-foreground">生成的HTML代码</Label>
            <div className="scrollbar-none mt-2 overflow-x-auto rounded-lg border border-border bg-background p-4">
              <pre className="m-0 whitespace-pre-wrap break-words font-mono text-[0.85rem] text-foreground">{badgeHtmlCode}</pre>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button disabled={!resourceName.trim()} onClick={() => void copyBadgeCode()}>
              <CopySimple size={16} weight="bold" />
              {copyBadgeButtonText}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showResourceSearch} onOpenChange={setShowResourceSearch}>
        <DialogContent className="max-w-[840px]">
          <DialogHeader>
            <DialogTitle>搜索资源</DialogTitle>
            <DialogDescription>暂时不支持模糊拼写纠错，请输入关键字搜索。</DialogDescription>
          </DialogHeader>
          <div className="w-full pb-3">
            <Input
              value={searchQuery}
              onChange={(event) => {
                const next = event.target.value
                setSearchQuery(next)
                setFilteredResources(filterResourcesByQuery(next, allResources))
              }}
              placeholder="输入资源名称或作者名搜索..."
              className="w-full"
            />
          </div>
          <div className="grid max-h-[52vh] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 overflow-y-auto p-1 min-[1200px]:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] max-[768px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-[768px]:gap-3">
            {filteredResources.map((resource) => (
              <button
                key={`${resource.name}-${resource.path}-${resource.restype}`}
                type="button"
                className={[
                  'flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border px-3.5 py-3 text-left transition-colors',
                  isResourceSelected(resource) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
                ].join(' ')}
                onClick={() => selectResource(resource)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-foreground">{resource.name}</div>
                  <div className="shrink-0 whitespace-nowrap rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.7rem] text-foreground">
                    {resource.restype === 'quickapp' ? '快应用' : '表盘'}
                  </div>
                </div>
                <div className="truncate text-xs text-muted-foreground">作者: {getAuthorName(resource.path)}</div>
              </button>
            ))}
            {!loadingResources && filteredResources.length === 0 ? (
              <div className="col-[1/-1] p-8 text-center text-sm text-muted-foreground">没有找到匹配的资源</div>
            ) : null}
            {loadingResources ? (
              <div className="col-[1/-1] p-8 text-center text-sm text-muted-foreground">资源列表加载中...</div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResourceSearch}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
