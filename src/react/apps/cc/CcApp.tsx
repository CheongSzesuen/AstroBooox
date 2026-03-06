import { Archive, CheckCircle, ClockCounterClockwise, Moon, Sun, UploadSimple } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { buildCcPath, resolveCcRouteFromPath, type CcRouteState, type CcTab } from '@/cc/route-config'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { useTheme } from '@/react/hooks/useTheme'
import '@/cc/themes.css'

const tabMeta: Array<{ tab: CcTab; label: string; icon: any }> = [
  { tab: 'publish', label: '资源发布', icon: UploadSimple },
  { tab: 'pullrequest', label: '等待审核', icon: ClockCounterClockwise },
  { tab: 'published', label: '资源管理', icon: Archive },
  { tab: 'review', label: '审核', icon: CheckCircle }
]

const resolveInitialPath = (): string => {
  const url = new URL(window.location.href)
  const encoded = url.searchParams.get('cc_path')
  if (!encoded) return window.location.pathname
  const decoded = decodeURIComponent(encoded)
  if (!decoded.startsWith('/cc')) return window.location.pathname

  const nextSearch = new URLSearchParams(url.search)
  nextSearch.delete('cc_path')
  const nextQuery = nextSearch.toString()
  const nextUrl = `${decoded}${nextQuery ? `?${nextQuery}` : ''}${url.hash}`
  window.history.replaceState({}, '', nextUrl)
  return decoded
}

const placeholderByTab: Record<CcTab, { title: string; description: string }> = {
  publish: {
    title: '资源发布工作台（React 迁移中）',
    description: '该区域正在从 Vue 完整迁移到 React + shadcn。下一批会优先迁移发布流程与图片预览/撤销。'
  },
  pullrequest: {
    title: '等待审核（React 迁移中）',
    description: '待审列表与评论流会在下一批提交迁入。'
  },
  published: {
    title: '资源管理（React 迁移中）',
    description: '资源详情、封面/预览图展示、编辑入口会逐步迁入。'
  },
  resource_edit: {
    title: '更新资源（React 迁移中）',
    description: '更新流程与预览轮播编辑会作为重点迁移。'
  },
  review: {
    title: '审核（React 迁移中）',
    description: 'Review 区域将复用资源页面预览组件并保持一致行为。'
  },
  repositories: {
    title: '仓库管理（React 迁移中）',
    description: '协作者管理与仓库配置能力正在迁移。'
  },
  settings: {
    title: '设置（React 迁移中）',
    description: '默认仓库、主题与账号设置页面会在后续补齐。'
  }
}

export function CcApp() {
  const initialPath = useMemo(() => resolveInitialPath(), [])
  const routeState = useMemo<CcRouteState>(() => resolveCcRouteFromPath(initialPath), [initialPath])
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
          <a href="/" className="inline-flex h-8 w-8 items-center justify-center" aria-label="返回主站">
            <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="h-6 w-6" />
          </a>
          <h1 className="hidden text-sm font-semibold text-foreground md:text-base sm:block">Creator Console</h1>
          <div className="hidden min-w-0 flex-1 overflow-x-auto sm:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              {tabMeta.map((item) => {
                const Icon = item.icon
                const targetPath = buildCcPath({ ...routeState, tab: item.tab, settingsSection: 'defaults' })
                const isActive = routeState.tab === item.tab
                return (
                  <Button key={item.tab} size="sm" className="h-8 shrink-0" variant={isActive ? 'default' : 'ghost'} asChild>
                    <a href={targetPath}>
                      <Icon size={15} weight="duotone" />
                      <span>{item.label}</span>
                    </a>
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} weight="duotone" /> : <Sun size={16} weight="duotone" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] p-3 sm:p-4 md:p-6">
        <section className="min-w-0 flex justify-center">
          <div className="w-full max-w-[1320px] space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{placeholderByTab[routeState.tab].title}</CardTitle>
                <CardDescription>{placeholderByTab[routeState.tab].description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  当前路径：{window.location.pathname}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
