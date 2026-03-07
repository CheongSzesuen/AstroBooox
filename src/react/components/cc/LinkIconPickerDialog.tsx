import { WarningCircle } from '@phosphor-icons/react'
import { icons as phosphorCoreIcons } from '@phosphor-icons/core'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/react/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'

type LinkIconOption = {
  key: string
  name: string
  pascalName: string
  keywords: string
  baseScore: number
}

const LINK_ICON_MAX_RENDER = 720

const preferredExact = new Set<string>([
  'link',
  'link-simple',
  'link-simple-horizontal',
  'link-simple-break',
  'github-logo',
  'gitlab-logo',
  'git-pull-request',
  'globe',
  'globe-hemisphere-west',
  'globe-simple',
  'code',
  'terminal',
  'book',
  'book-open',
  'article',
  'newspaper',
  'rss',
  'download',
  'download-simple',
  'cloud-arrow-down',
  'package',
  'telegram-logo',
  'discord-logo',
  'youtube-logo',
  'x-logo',
  'twitter-logo',
  'instagram-logo',
  'facebook-logo',
  'wechat-logo',
  'whatsapp-logo',
  'envelope',
  'envelope-simple',
  'chat',
  'chat-circle',
  'notion-logo',
  'figma-logo',
  'medium-logo',
  'dev-to-logo',
  'open-ai-logo'
])

const preferredTokens = [
  'link',
  'git',
  'repo',
  'github',
  'gitlab',
  'code',
  'terminal',
  'web',
  'globe',
  'site',
  'blog',
  'book',
  'article',
  'news',
  'docs',
  'read',
  'rss',
  'download',
  'cloud',
  'package',
  'message',
  'chat',
  'mail',
  'envelope',
  'social',
  'telegram',
  'discord',
  'youtube',
  'twitter',
  'x-logo',
  'instagram',
  'facebook',
  'wechat',
  'whatsapp',
  'notion',
  'figma',
  'medium',
  'dev',
  'stack',
  'open-ai'
]

const phosphorIconModules = import.meta.glob('/node_modules/@phosphor-icons/react/dist/csr/*.es.js')
const iconComponentCache = new Map<string, ComponentType<{ size?: number; className?: string; weight?: string }> | null>()
const iconLoadingPromiseCache = new Map<string, Promise<ComponentType<{ size?: number; className?: string; weight?: string }> | null>>()

const iconNameToPascalName = (iconName: string): string => (
  iconName
    .trim()
    .toLowerCase()
    .split('-')
    .filter(Boolean)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join('')
)

const loadPhosphorIconComponent = async (pascalName: string): Promise<ComponentType<{ size?: number; className?: string; weight?: string }> | null> => {
  if (!pascalName) return null
  if (iconComponentCache.has(pascalName)) {
    return iconComponentCache.get(pascalName) || null
  }
  const pending = iconLoadingPromiseCache.get(pascalName)
  if (pending) return pending

  const loader = (async () => {
    const modulePath = `/node_modules/@phosphor-icons/react/dist/csr/${pascalName}.es.js`
    const importer = phosphorIconModules[modulePath]
    if (!importer) {
      iconComponentCache.set(pascalName, null)
      return null
    }
    try {
      const mod = await importer()
      const exports = mod as Record<string, unknown>
      const picked = (exports[pascalName] || exports[`${pascalName}Icon`]) as ComponentType<{ size?: number; className?: string; weight?: string }> | undefined
      const resolved = picked || null
      iconComponentCache.set(pascalName, resolved)
      return resolved
    } catch {
      iconComponentCache.set(pascalName, null)
      return null
    } finally {
      iconLoadingPromiseCache.delete(pascalName)
    }
  })()

  iconLoadingPromiseCache.set(pascalName, loader)
  return loader
}

const getBaseScore = (name: string, keywords: string): number => {
  let score = 0
  if (preferredExact.has(name)) score += 800
  for (const token of preferredTokens) {
    if (keywords.includes(token)) score += 40
  }
  return score
}

const matchScore = (option: LinkIconOption, token: string): number => {
  const normalized = token.toLowerCase()
  if (option.name === normalized) return 300
  if (option.name.startsWith(normalized)) return 180
  if (option.pascalName.toLowerCase().startsWith(normalized)) return 170
  if (option.name.includes(normalized)) return 120
  if (option.keywords.includes(normalized)) return 60
  return 0
}

function PhosphorIconByPascalName(props: {
  pascalName: string
  size?: number
  className?: string
  fallbackSize?: number
  fallbackClassName?: string
}) {
  const {
    pascalName,
    size = 24,
    className,
    fallbackSize = size,
    fallbackClassName
  } = props
  const [IconComp, setIconComp] = useState<ComponentType<{ size?: number; className?: string; weight?: string }> | null | undefined>(() => {
    if (!pascalName) return null
    if (!iconComponentCache.has(pascalName)) return undefined
    return iconComponentCache.get(pascalName) || null
  })

  useEffect(() => {
    let cancelled = false
    if (!pascalName) {
      setIconComp(null)
      return
    }
    if (!iconComponentCache.has(pascalName)) {
      setIconComp(undefined)
    }

    void loadPhosphorIconComponent(pascalName)
      .then((picked) => {
        if (cancelled) return
        setIconComp(picked)
      })
      .catch(() => {
        if (!cancelled) setIconComp(null)
      })

    return () => {
      cancelled = true
    }
  }, [pascalName])

  if (IconComp === undefined) {
    return <span className={cn('inline-block shrink-0', className)} style={{ width: `${size}px`, height: `${size}px` }} />
  }

  if (IconComp === null) {
    return (
      <WarningCircle
        size={fallbackSize}
        weight="regular"
        className={cn('shrink-0 text-muted-foreground', fallbackClassName)}
      />
    )
  }

  return <IconComp size={size} weight="regular" className={cn('shrink-0', className)} />
}

export function PhosphorIconByName(props: {
  iconName: string
  size?: number
  className?: string
  fallbackSize?: number
  fallbackClassName?: string
}) {
  const { iconName, size, className, fallbackSize, fallbackClassName } = props
  const pascalName = useMemo(() => iconNameToPascalName(iconName), [iconName])
  return (
    <PhosphorIconByPascalName
      pascalName={pascalName}
      size={size}
      className={className}
      fallbackSize={fallbackSize}
      fallbackClassName={fallbackClassName}
    />
  )
}

function PhosphorIconPreview(props: { pascalName: string }) {
  return (
    <PhosphorIconByPascalName
      pascalName={props.pascalName}
      size={24}
      className="h-6 w-6 text-foreground"
      fallbackSize={24}
      fallbackClassName="h-6 w-6 text-muted-foreground"
    />
  )
}

export function LinkIconPickerDialog(props: {
  open: boolean
  initialQuery?: string
  onOpenChange: (open: boolean) => void
  onSelect: (iconName: string) => void
}) {
  const { open, initialQuery, onOpenChange, onSelect } = props
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setQuery((initialQuery || '').trim())
    }
  }, [initialQuery, open])

  const iconOptions = useMemo<LinkIconOption[]>(
    () => phosphorCoreIcons.map((icon) => {
      const keywords = `${icon.name} ${icon.pascal_name} ${icon.tags.join(' ')} ${icon.categories.join(' ')}`.toLowerCase()
      return {
        key: icon.name,
        name: icon.name,
        pascalName: icon.pascal_name,
        keywords,
        baseScore: getBaseScore(icon.name, keywords)
      }
    }),
    []
  )

  const filteredOptions = useMemo(() => {
    const raw = query.trim().toLowerCase()
    const tokens = raw.split(/\s+/).filter(Boolean)
    const matched = tokens.length > 0
      ? iconOptions.filter((option) => tokens.every((token) => option.keywords.includes(token)))
      : iconOptions

    return [...matched].sort((a, b) => {
      const aMatch = tokens.reduce((sum, token) => sum + matchScore(a, token), 0)
      const bMatch = tokens.reduce((sum, token) => sum + matchScore(b, token), 0)
      const scoreDiff = bMatch + b.baseScore - (aMatch + a.baseScore)
      if (scoreDiff !== 0) return scoreDiff
      return a.name.localeCompare(b.name)
    })
  }, [iconOptions, query])

  const displayedOptions = useMemo(
    () => filteredOptions.slice(0, LINK_ICON_MAX_RENDER),
    [filteredOptions]
  )

  const selectIcon = (iconName: string) => {
    onSelect(iconName)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] !max-w-[900px]">
        <DialogHeader>
          <DialogTitle>搜索 phosphor 图标</DialogTitle>
          <DialogDescription>选择后会自动填入 links.icon 的图标名。</DialogDescription>
        </DialogHeader>

        <div className="max-h-[64vh] overflow-y-auto rounded-lg border border-border bg-muted/20">
          <div className="sticky top-0 z-10 border-b border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词，例如 github / link / globe / chat / docs"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              共 {filteredOptions.length} 个候选图标
              {filteredOptions.length > displayedOptions.length ? `，当前仅展示前 ${displayedOptions.length} 个，请继续输入关键词缩小范围` : ''}
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
              {displayedOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-center text-xs text-foreground transition hover:bg-accent"
                  onClick={() => selectIcon(option.name)}
                >
                  <PhosphorIconPreview pascalName={option.pascalName} />
                  <span className="line-clamp-2 break-all text-[11px] leading-4">{option.name}</span>
                </button>
              ))}
            </div>

            {filteredOptions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                没有匹配结果
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
