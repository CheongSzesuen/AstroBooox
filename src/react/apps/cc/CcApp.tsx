import {
  Archive,
  CheckCircle,
  ClockCounterClockwise,
  FolderNotchOpenIcon,
  GearSix,
  Moon,
  SignOut,
  Sun,
  UploadSimple,
  UserCircle
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CC_DEFAULT_ROUTE,
  CC_PATHS,
  buildCcPath,
  isCcLoginPath,
  resolveCcRouteFromPath,
  type CcRouteState,
  type CcSettingsSection,
  type CcTab
} from '@/cc/route-config'
import { CcTokenGate } from '@/react/cc/CcTokenGate'
import { CcRepositoriesPanel } from '@/react/apps/cc/CcRepositoriesPanel'
import { CcSettingsPanel } from '@/react/apps/cc/CcSettingsPanel'
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

const sanitizeCcRedirectPath = (rawPath: string | null): string => {
  if (!rawPath) return ''
  const value = rawPath.trim()
  if (!value) return ''
  if (value.startsWith('/cc')) return value
  if (!/^https?:\/\//i.test(value)) return ''
  try {
    const parsed = new URL(value)
    return parsed.pathname.startsWith('/cc') ? parsed.pathname : ''
  } catch {
    return ''
  }
}

const buildLoginUrl = (targetPath: string, expectedUser: string): string => {
  const params = new URLSearchParams()
  const normalizedPath = targetPath.trim()
  if (normalizedPath && normalizedPath !== CC_PATHS.publish) {
    params.set('cc_path', normalizedPath)
  }
  if (expectedUser) {
    params.set('cc_user', expectedUser)
  }
  return params.size > 0 ? `${CC_PATHS.login}?${params.toString()}` : CC_PATHS.login
}

const resolveExpectedUserFromLocation = (): string => {
  const searchParams = new URLSearchParams(window.location.search)
  return (searchParams.get('cc_user') || searchParams.get('gh_user') || '').trim().toLowerCase()
}

const resolveRouteFromLocation = (currentUser: string): CcRouteState => {
  const searchParams = new URLSearchParams(window.location.search)
  const redirectedPath = sanitizeCcRedirectPath(searchParams.get('cc_path'))
  const route = redirectedPath && redirectedPath.startsWith('/cc') ? resolveCcRouteFromPath(redirectedPath) : resolveCcRouteFromPath(window.location.pathname)

  const expected = resolveExpectedUserFromLocation()
  const current = currentUser.trim().toLowerCase()
  if (expected && current && expected !== current) {
    return {
      ...CC_DEFAULT_ROUTE,
      resourceDetailKey: '',
      requireGhUser: false
    }
  }
  return route
}

function CcAuthenticatedApp() {
  const { theme, toggleTheme } = useTheme()
  const { token, currentUser, avatarUrl, clearSession } = useCcSession()
  const { defaultTargetOwner, defaultTargetRepo, defaultCatalogPath } = useCcSettings()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [routeState, setRouteState] = useState<CcRouteState>(() => resolveRouteFromLocation(currentUser))

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(resolveRouteFromLocation(currentUser))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  const profileUrl = useMemo(() => (currentUser ? `https://github.com/${currentUser}` : 'https://github.com'), [currentUser])

  const applyRouteState = (state: CcRouteState, options?: { replace?: boolean; syncUrl?: boolean }) => {
    setRouteState(state)
    if (options?.syncUrl === false) return
    const targetPath = buildCcPath(state)
    const current = `${window.location.pathname}${window.location.search}`
    if (current === targetPath) return
    if (options?.replace) {
      window.history.replaceState(null, '', targetPath)
      return
    }
    window.history.pushState(null, '', targetPath)
  }

  const navigateToTab = (nextTab: CcTab) => {
    const nextState: CcRouteState = {
      tab: nextTab,
      settingsSection: nextTab === 'settings' ? routeState.settingsSection : 'defaults',
      resourceDetailKey: '',
      pullRequestNumber: 0,
      pullRequestTargetRepo: '',
      requireGhUser: false,
      editResourceId: '',
      editTargetRepo: '',
      editUser: ''
    }
    applyRouteState(nextState)
  }

  const openSettingsSection = (section: CcSettingsSection) => {
    applyRouteState({
      tab: 'settings',
      settingsSection: section,
      resourceDetailKey: '',
      pullRequestNumber: 0,
      pullRequestTargetRepo: '',
      requireGhUser: false,
      editResourceId: '',
      editTargetRepo: '',
      editUser: ''
    })
  }

  const renderContent = () => {
    if (routeState.tab === 'repositories') {
      return (
        <CcRepositoriesPanel
          token={token}
          currentUser={currentUser}
          defaultTargetOwner={defaultTargetOwner}
          defaultTargetRepo={defaultTargetRepo}
          defaultCatalogPath={defaultCatalogPath}
        />
      )
    }

    if (routeState.tab === 'settings') {
      return <CcSettingsPanel token={token} section={routeState.settingsSection} onSectionChange={openSettingsSection} />
    }

    return (
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
    )
  }

  const workbenchMode = routeState.tab === 'published' ? 'published' : routeState.tab === 'pullrequest' ? 'review' : 'publish'

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
                      navigateToTab('repositories')
                    }}
                  >
                    <FolderNotchOpenIcon size={16} weight="duotone" />
                    仓库
                  </button>
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
                      window.history.replaceState(null, '', CC_PATHS.login)
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
            {renderContent()}
          </div>
        </section>
      </main>
    </div>
  )
}

function CcAppContent() {
  const { isAuthenticated, currentUser } = useCcSession()
  const pendingLoginRouteRef = useRef<CcRouteState | null>(null)
  const pendingLoginUserRef = useRef('')

  useEffect(() => {
    if (!isAuthenticated) {
      if (!isCcLoginPath(window.location.pathname)) {
        const routeFromLocation = resolveRouteFromLocation(currentUser)
        const targetPath = buildCcPath(routeFromLocation)
        const expected = resolveExpectedUserFromLocation()
        pendingLoginRouteRef.current = routeFromLocation
        pendingLoginUserRef.current = expected
        window.history.replaceState(null, '', buildLoginUrl(targetPath, expected))
      } else {
        pendingLoginRouteRef.current = resolveRouteFromLocation(currentUser)
        pendingLoginUserRef.current = resolveExpectedUserFromLocation()
      }
      return
    }

    if (isCcLoginPath(window.location.pathname)) {
      const expected = pendingLoginUserRef.current
      const current = currentUser.trim().toLowerCase()
      const target = pendingLoginRouteRef.current
      pendingLoginRouteRef.current = null
      pendingLoginUserRef.current = ''
      if (target && (!expected || expected === current)) {
        window.history.replaceState(null, '', buildCcPath(target))
        return
      }
      window.history.replaceState(null, '', buildCcPath(CC_DEFAULT_ROUTE))
    }
  }, [currentUser, isAuthenticated])

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
