import {
  Archive,
  CaretDown,
  CheckCircle,
  ClockCounterClockwise,
  FolderNotchOpenIcon,
  GearSix,
  List,
  Moon,
  SignOut,
  Sun,
  UploadSimple,
  UserCircle,
  X
} from '@phosphor-icons/react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
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
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Sheet, SheetClose, SheetContent } from '@/react/components/ui/sheet'
import { Toaster } from '@/react/components/ui/sonner'
import { useCcTheme } from '@/react/hooks/useCcTheme'
import { CcSessionProvider, useCcSession } from '@/react/hooks/useCcSession'
import { useCcSettings } from '@/react/hooks/useCcSettings'
import { useTheme } from '@/react/hooks/useTheme'
import '@/cc/themes.css'

const CcRepositoriesPanel = lazy(() => import('@/react/apps/cc/CcRepositoriesPanel').then((mod) => ({ default: mod.CcRepositoriesPanel })))
const CcSettingsPanel = lazy(() => import('@/react/apps/cc/CcSettingsPanel').then((mod) => ({ default: mod.CcSettingsPanel })))
const CcPrReviewWorkbench = lazy(() => import('@/react/apps/cc/CcPrReviewWorkbench').then((mod) => ({ default: mod.CcPrReviewWorkbench })))
const CcPullRequestPanel = lazy(() => import('@/react/apps/cc/CcPullRequestPanel').then((mod) => ({ default: mod.CcPullRequestPanel })))
const CcPublishedPanel = lazy(() => import('@/react/apps/cc/CcPublishedPanel').then((mod) => ({ default: mod.CcPublishedPanel })))
const CcPublishWorkbench = lazy(() => import('@/react/apps/cc/CcPublishWorkbench').then((mod) => ({ default: mod.CcPublishWorkbench })))

const tabMeta: Array<{ tab: CcTab; label: string; shortLabel: string; icon: any }> = [
  { tab: 'publish', label: '资源发布', shortLabel: '发布', icon: UploadSimple },
  { tab: 'pullrequest', label: '等待审核', shortLabel: '待审', icon: ClockCounterClockwise },
  { tab: 'published', label: '资源管理', shortLabel: '管理', icon: Archive },
  { tab: 'review', label: '审核', shortLabel: '审', icon: CheckCircle }
]

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
  const routeBase = redirectedPath && redirectedPath.startsWith('/cc') ? resolveCcRouteFromPath(redirectedPath) : resolveCcRouteFromPath(window.location.pathname)

  const route: CcRouteState = {
    ...routeBase,
    pullRequestTargetRepo: routeBase.pullRequestTargetRepo || '',
    editResourceId: routeBase.editResourceId || '',
    editTargetRepo: routeBase.editTargetRepo || '',
    editUser: routeBase.editUser || ''
  }

  const routeTargetRepo = (searchParams.get('target_repo') || '').trim().toLowerCase()
  if (route.tab === 'pullrequest' && (route.pullRequestNumber || 0) > 0) {
    route.pullRequestTargetRepo = routeTargetRepo
  }
  if (route.tab === 'resource_edit') {
    route.editResourceId = (searchParams.get('edit_resource') || '').trim()
    route.editTargetRepo = (searchParams.get('edit_target_repo') || '').trim().toLowerCase()
    route.editUser = (searchParams.get('edit_user') || '').trim().toLowerCase()
  }

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

const buildCcUrlWithUser = (path: string, state: CcRouteState, currentUser: string): string => {
  const normalizedPath = path || CC_PATHS.root
  const params = new URLSearchParams()
  const isPullRequestDetail = state.tab === 'pullrequest' && (state.pullRequestNumber || 0) > 0

  if (state.requireGhUser && !isPullRequestDetail) {
    const login = currentUser.trim()
    if (login) params.set('gh_user', login)
  }

  if (isPullRequestDetail) {
    const targetRepo = (state.pullRequestTargetRepo || '').trim().toLowerCase()
    if (targetRepo) params.set('target_repo', targetRepo)
  }

  if (state.tab === 'resource_edit') {
    const editResource = (state.editResourceId || '').trim()
    const editTargetRepo = (state.editTargetRepo || '').trim().toLowerCase()
    const editUser = (state.editUser || '').trim().toLowerCase()
    if (editResource) params.set('edit_resource', editResource)
    if (editTargetRepo) params.set('edit_target_repo', editTargetRepo)
    if (editUser) params.set('edit_user', editUser)
  }

  if (params.size === 0) return normalizedPath
  return `${normalizedPath}?${params.toString()}`
}

function CcAuthenticatedApp() {
  const { theme, toggleTheme } = useTheme()
  useCcTheme()

  const { token, currentUser, avatarUrl, clearSession } = useCcSession()
  const ccSettings = useCcSettings()
  const {
    defaultTargetOwner,
    defaultTargetRepo,
    defaultCatalogPath,
    ownedDisplayPriority,
    showV2FollowUpTag
  } = ccSettings

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileNavSheet, setShowMobileNavSheet] = useState(false)
  const [routeState, setRouteState] = useState<CcRouteState>(() => resolveRouteFromLocation(currentUser))
  const [routeProgress, setRouteProgress] = useState(0)
  const [routeProgressVisible, setRouteProgressVisible] = useState(false)

  const routeProgressTimerRef = useRef<number | null>(null)
  const userMenuRootRef = useRef<HTMLDivElement | null>(null)

  const profileUrl = useMemo(() => (currentUser ? `https://github.com/${currentUser}` : 'https://github.com'), [currentUser])

  useEffect(() => {
    return () => {
      if (routeProgressTimerRef.current !== null) {
        window.clearInterval(routeProgressTimerRef.current)
        routeProgressTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleGlobalPointerDown = (event: MouseEvent) => {
      if (!showUserMenu) return
      const root = userMenuRootRef.current
      if (!root) return
      if (event.target instanceof Node && !root.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleGlobalPointerDown)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('mousedown', handleGlobalPointerDown)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showUserMenu])

  const startRouteProgress = () => {
    if (routeProgressTimerRef.current !== null) {
      window.clearInterval(routeProgressTimerRef.current)
      routeProgressTimerRef.current = null
    }
    setRouteProgressVisible(true)
    setRouteProgress(14)
    routeProgressTimerRef.current = window.setInterval(() => {
      setRouteProgress((prev) => (prev < 82 ? Math.min(82, prev + 7) : prev))
    }, 80)
  }

  const finishRouteProgress = () => {
    if (routeProgressTimerRef.current !== null) {
      window.clearInterval(routeProgressTimerRef.current)
      routeProgressTimerRef.current = null
    }
    setRouteProgress(100)
    window.setTimeout(() => {
      setRouteProgressVisible(false)
      setRouteProgress(0)
    }, 220)
  }

  const applyRouteState = (
    state: CcRouteState,
    options?: {
      replace?: boolean
      syncUrl?: boolean
      withProgress?: boolean
    }
  ) => {
    const withProgress = Boolean(options?.withProgress)
    if (withProgress) {
      startRouteProgress()
    }

    setRouteState(state)

    if (options?.syncUrl !== false) {
      const targetPath = buildCcPath(state)
      const targetUrl = buildCcUrlWithUser(targetPath, state, currentUser)
      const current = `${window.location.pathname}${window.location.search}`
      if (current !== targetUrl) {
        if (options?.replace) {
          window.history.replaceState(null, '', targetUrl)
        } else {
          window.history.pushState(null, '', targetUrl)
        }
      }
    }

    if (withProgress) {
      window.setTimeout(() => {
        finishRouteProgress()
      }, 180)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      applyRouteState(resolveRouteFromLocation(currentUser), {
        syncUrl: false,
        withProgress: true
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

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
    applyRouteState(nextState, { withProgress: true })
  }

  const navigateToTabFromMobile = (nextTab: CcTab) => {
    setShowMobileNavSheet(false)
    navigateToTab(nextTab)
  }

  const openSettingsSection = (section: CcSettingsSection) => {
    applyRouteState(
      {
        tab: 'settings',
        settingsSection: section,
        resourceDetailKey: '',
        pullRequestNumber: 0,
        pullRequestTargetRepo: '',
        requireGhUser: false,
        editResourceId: '',
        editTargetRepo: '',
        editUser: ''
      },
      { withProgress: true }
    )
  }

  const openSettingsPage = () => {
    setShowMobileNavSheet(false)
    setShowUserMenu(false)
    openSettingsSection('defaults')
  }

  const openRepositoriesPage = () => {
    setShowMobileNavSheet(false)
    setShowUserMenu(false)
    navigateToTab('repositories')
  }

  const openPublishedResourceDetail = (detailKey: string) => {
    applyRouteState(
      {
        tab: 'published',
        settingsSection: routeState.settingsSection,
        resourceDetailKey: detailKey,
        pullRequestNumber: 0,
        pullRequestTargetRepo: '',
        requireGhUser: Boolean(detailKey.trim()),
        editResourceId: '',
        editTargetRepo: '',
        editUser: ''
      },
      { withProgress: true }
    )
  }

  const openResourceEditFromPublished = (payload: {
    resourceId: string
    targetRepo: string
    user: string
  }) => {
    applyRouteState(
      {
        tab: 'resource_edit',
        settingsSection: routeState.settingsSection,
        resourceDetailKey: '',
        pullRequestNumber: 0,
        pullRequestTargetRepo: '',
        requireGhUser: true,
        editResourceId: payload.resourceId.trim(),
        editTargetRepo: payload.targetRepo.trim().toLowerCase(),
        editUser: payload.user.trim().toLowerCase()
      },
      { withProgress: true }
    )
  }

  const handleSignOut = () => {
    setShowUserMenu(false)
    clearSession()
    window.history.replaceState(null, '', CC_PATHS.login)
  }

  const openPullRequestDetail = (prNumber: number, targetRepoName: string) => {
    applyRouteState(
      {
        tab: 'pullrequest',
        settingsSection: routeState.settingsSection,
        resourceDetailKey: '',
        pullRequestNumber: prNumber > 0 ? prNumber : 0,
        pullRequestTargetRepo: targetRepoName.trim().toLowerCase(),
        requireGhUser: false,
        editResourceId: '',
        editTargetRepo: '',
        editUser: ''
      },
      { withProgress: true }
    )
  }

  const renderContent = () => {
    if (routeState.tab === 'repositories') {
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcRepositoriesPanel
            token={token}
            currentUser={currentUser}
            defaultTargetOwner={defaultTargetOwner}
            defaultTargetRepo={defaultTargetRepo}
            defaultCatalogPath={defaultCatalogPath}
          />
        </Suspense>
      )
    }

    if (routeState.tab === 'settings') {
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcSettingsPanel token={token} section={routeState.settingsSection} settings={ccSettings} onSectionChange={openSettingsSection} />
        </Suspense>
      )
    }

    if (routeState.tab === 'pullrequest') {
      const pullRequestTargetRepo = routeState.pullRequestTargetRepo ? routeState.pullRequestTargetRepo : defaultTargetRepo
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcPullRequestPanel
            token={token}
            currentUser={currentUser}
            targetOwner={defaultTargetOwner}
            targetRepo={pullRequestTargetRepo}
            catalogPath={defaultCatalogPath}
            initialPrNumber={Number(routeState.pullRequestNumber || 0)}
            onSelectPr={openPullRequestDetail}
          />
        </Suspense>
      )
    }

    if (routeState.tab === 'review') {
      const reviewTargetRepo =
        routeState.pullRequestTargetRepo ? routeState.pullRequestTargetRepo : defaultTargetRepo
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcPrReviewWorkbench
            owner={defaultTargetOwner}
            repo={reviewTargetRepo}
            token={token}
            initialPrNumber={0}
          />
        </Suspense>
      )
    }

    if (routeState.tab === 'published') {
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcPublishedPanel
            token={token}
            currentUser={currentUser}
            defaultTargetOwner={defaultTargetOwner}
            defaultTargetRepo={defaultTargetRepo}
            defaultCatalogPath={defaultCatalogPath}
            ownedDisplayPriority={ownedDisplayPriority}
            showV2FollowUpTag={showV2FollowUpTag}
            resourceDetailKey={routeState.resourceDetailKey || ''}
            onResourceDetailKeyChange={openPublishedResourceDetail}
            onStartEditResource={openResourceEditFromPublished}
          />
        </Suspense>
      )
    }

    if (routeState.tab === 'publish') {
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcPublishWorkbench
            mode="publish"
            token={token}
            currentUser={currentUser}
            defaultTargetOwner={defaultTargetOwner}
            defaultTargetRepo={defaultTargetRepo}
            defaultCatalogPath={defaultCatalogPath}
          />
        </Suspense>
      )
    }

    if (routeState.tab === 'resource_edit') {
      return (
        <Suspense fallback={<PanelLoading />}>
          <CcPublishWorkbench
            mode="resource_edit"
            token={token}
            currentUser={currentUser}
            defaultTargetOwner={defaultTargetOwner}
            defaultTargetRepo={defaultTargetRepo}
            defaultCatalogPath={defaultCatalogPath}
            editContext={{
              resourceId: routeState.editResourceId || '',
              targetRepo: routeState.editTargetRepo || '',
              user: routeState.editUser || ''
            }}
          />
        </Suspense>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>页面迁移中</CardTitle>
          <CardDescription>当前路由尚未完成 React 版功能映射。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">当前路径：{window.location.pathname}</div>
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            默认目标仓库：{defaultTargetOwner}/{defaultTargetRepo}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5">
        <div className="h-full bg-primary transition-all duration-200" style={{ width: `${routeProgress}%`, opacity: routeProgressVisible ? 1 : 0 }} />
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="打开导航菜单" onClick={() => setShowMobileNavSheet(true)}>
              <List size={16} weight="duotone" />
            </Button>
            <a href="/" className="inline-flex h-8 w-8 items-center justify-center" aria-label="返回主站">
              <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="h-6 w-6" />
            </a>
          </div>

          <a href="/" className="hidden h-8 w-8 items-center justify-center sm:inline-flex" aria-label="返回主站">
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
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} weight="duotone" /> : <Sun size={16} weight="duotone" />}
            </Button>

            <div ref={userMenuRootRef} className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
                title={currentUser ? `当前用户：${currentUser}` : '未校验 Token'}
                onClick={() => {
                  if (!currentUser) return
                  setShowUserMenu((prev) => !prev)
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User Avatar" className="h-6 w-6 rounded-full border border-border object-cover" />
                ) : (
                  <UserCircle size={18} weight="duotone" className="text-muted-foreground" />
                )}
                <span className="hidden sm:inline">{currentUser || '未校验 Token'}</span>
                <CaretDown size={14} weight="bold" className="text-muted-foreground" />
              </button>

              {showUserMenu && currentUser ? (
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
                  <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={openRepositoriesPage}>
                    <FolderNotchOpenIcon size={16} weight="duotone" />
                    仓库
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={openSettingsPage}>
                    <GearSix size={16} weight="duotone" />
                    设置
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={handleSignOut}>
                    <SignOut size={16} weight="duotone" />
                    退出
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <Sheet open={showMobileNavSheet} onOpenChange={setShowMobileNavSheet}>
        <SheetContent side="left" hideClose className="!w-[max(61.8vw,max-content)] max-w-[calc(100vw-1.5rem)] p-0 sm:hidden">
          <div className="relative border-b border-border px-3 py-3.5">
            <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="h-6 w-6" />
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2" aria-label="关闭导航菜单">
                <X size={18} weight="bold" />
              </Button>
            </SheetClose>
          </div>
          <nav className="w-full space-y-1 px-3 py-3">
            {tabMeta.map((item) => {
              const Icon = item.icon
              const isActive = routeState.tab === item.tab
              return (
                <Button key={item.tab} className="h-9 w-full justify-start whitespace-nowrap" variant={isActive ? 'default' : 'ghost'} onClick={() => navigateToTabFromMobile(item.tab)}>
                  <Icon size={15} weight="duotone" />
                  {item.label}
                </Button>
              )
            })}
            <div className="my-2 h-px w-full bg-border" />
            <Button className="h-9 w-full justify-start whitespace-nowrap" variant="ghost" onClick={openRepositoriesPage}>
              <FolderNotchOpenIcon size={15} weight="duotone" />
              仓库
            </Button>
            <Button className="h-9 w-full justify-start whitespace-nowrap" variant="ghost" onClick={openSettingsPage}>
              <GearSix size={15} weight="duotone" />
              设置
            </Button>
          </nav>
        </SheetContent>
      </Sheet>

      <main className="mx-auto w-full max-w-[1440px] p-3 sm:p-4 md:p-6">
        <section className="min-w-0 flex justify-center">
          <div className="w-full max-w-[1320px] space-y-4">{renderContent()}</div>
        </section>
      </main>

      <Toaster />
    </div>
  )
}

function PanelLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>加载中</CardTitle>
        <CardDescription>正在按需加载页面模块...</CardDescription>
      </CardHeader>
    </Card>
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
