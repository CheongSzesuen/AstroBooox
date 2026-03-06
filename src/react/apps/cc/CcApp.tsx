import {
  Archive,
  CheckCircle,
  ClockCounterClockwise,
  GearSix,
  Moon,
  SignOut,
  Sun,
  UploadSimple,
  UserCircle
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import {
  buildCcPath,
  resolveCcRouteFromPath,
  type CcRouteState,
  type CcSettingsSection,
  type CcTab
} from '@/cc/route-config'
import { CcTokenGate } from '@/react/cc/CcTokenGate'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { CcSessionProvider, useCcSession } from '@/react/hooks/useCcSession'
import { useCcSettings } from '@/react/hooks/useCcSettings'
import { useTheme } from '@/react/hooks/useTheme'
import '@/cc/themes.css'

const tabMeta: Array<{ tab: CcTab; label: string; icon: any }> = [
  { tab: 'publish', label: '资源发布', icon: UploadSimple },
  { tab: 'pullrequest', label: '等待审核', icon: ClockCounterClockwise },
  { tab: 'published', label: '资源管理', icon: Archive },
  { tab: 'review', label: '审核', icon: CheckCircle }
]

const placeholderByTab: Record<CcTab, { title: string; description: string }> = {
  publish: {
    title: '资源发布工作台（迁移中）',
    description: '下一批将直接迁移 ResourcePublishWorkbench 的发布流程主逻辑。'
  },
  pullrequest: {
    title: '等待审核（迁移中）',
    description: '下一批将迁移 PR 列表、详情与评论时间线。'
  },
  published: {
    title: '资源管理（迁移中）',
    description: '下一批将迁移资源列表、详情预览与编辑入口。'
  },
  resource_edit: {
    title: '更新资源（迁移中）',
    description: '下一批将迁移更新资源向导和预览图管理。'
  },
  review: {
    title: '审核（迁移中）',
    description: '下一批将迁移审核界面的评论编辑、预览与提交。'
  },
  repositories: {
    title: '仓库管理（迁移中）',
    description: '下一批将迁移仓库列表与协作者邀请。'
  },
  settings: {
    title: '设置（迁移中）',
    description: '下一批将迁移默认仓库、主题、账号与 about。'
  }
}

const resolveInitialCcPath = (): string => {
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

function CcAuthenticatedApp() {
  const [routeState, setRouteState] = useState<CcRouteState>(() => resolveCcRouteFromPath(resolveInitialCcPath()))
  const { theme, toggleTheme } = useTheme()
  const { currentUser, avatarUrl, clearSession } = useCcSession()
  const { defaultTargetOwner, defaultTargetRepo } = useCcSettings()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const workbenchMode = routeState.tab === 'published' ? 'published' : routeState.tab === 'pullrequest' ? 'pullrequest' : 'publish'

  const applyRouteState = (next: CcRouteState, options?: { replace?: boolean }) => {
    const nextPath = buildCcPath(next)
    if (options?.replace) {
      window.history.replaceState({}, '', nextPath)
    } else {
      window.history.pushState({}, '', nextPath)
    }
    setRouteState(resolveCcRouteFromPath(nextPath))
  }

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(resolveCcRouteFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const profileUrl = useMemo(() => (currentUser ? `https://github.com/${currentUser}` : '#'), [currentUser])

  const navigateToTab = (tab: CcTab) => {
    const nextSettings: CcSettingsSection = tab === 'settings' ? routeState.settingsSection || 'defaults' : 'defaults'
    applyRouteState({
      tab,
      settingsSection: nextSettings,
      resourceDetailKey: '',
      pullRequestNumber: 0,
      pullRequestTargetRepo: '',
      requireGhUser: false,
      editResourceId: '',
      editTargetRepo: '',
      editUser: ''
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
          <a href="/" className="inline-flex h-8 w-8 items-center justify-center" aria-label="返回主站">
            <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="h-6 w-6" />
          </a>
          <h1 className="hidden text-sm font-semibold text-foreground sm:block md:text-base">Creator Console</h1>

          <div className="hidden min-w-0 flex-1 overflow-x-auto sm:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
              {tabMeta.map((item) => {
                const Icon = item.icon
                const isActive = routeState.tab === item.tab
                return (
                  <Button key={item.tab} size="sm" className="h-8 shrink-0" variant={isActive ? 'default' : 'ghost'} onClick={() => navigateToTab(item.tab)}>
                    <Icon size={15} weight="duotone" />
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.label.slice(0, 2)}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} weight="duotone" /> : <Sun size={16} weight="duotone" />}
            </Button>

            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
                onClick={() => setShowUserMenu((prev) => !prev)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="h-6 w-6 rounded-full border border-border object-cover" />
                ) : (
                  <UserCircle size={18} weight="duotone" className="text-muted-foreground" />
                )}
                <span className="hidden sm:inline">{currentUser || '未校验 Token'}</span>
              </button>

              {showUserMenu ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircle size={16} weight="duotone" />
                    Profile
                  </a>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setShowUserMenu(false)
                      navigateToTab('settings')
                    }}
                  >
                    <GearSix size={16} weight="duotone" />
                    设置
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      clearSession()
                      setShowUserMenu(false)
                    }}
                  >
                    <SignOut size={16} weight="duotone" />
                    退出
                  </button>
                </div>
              ) : null}
            </div>
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
              <CardContent className="space-y-2">
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">当前路径：{window.location.pathname}</div>
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  默认目标仓库：{defaultTargetOwner}/{defaultTargetRepo}
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  当前模式：{workbenchMode}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

function CcAppContent() {
  const { isAuthenticated } = useCcSession()

  if (!isAuthenticated) {
    return <CcTokenGate />
  }

  return <CcAuthenticatedApp />
}

export function CcApp() {
  return (
    <CcSessionProvider>
      <CcAppContent />
    </CcSessionProvider>
  )
}
