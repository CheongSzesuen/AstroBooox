import {
  Archive,
  Buildings,
  CalendarBlank,
  ClockCounterClockwise,
  EnvelopeSimple,
  GearSix,
  GitBranch,
  GlobeHemisphereWest,
  Hash,
  Info,
  LinkSimple,
  MapPin,
  Package,
  TwitterLogo,
  UserCircle,
  UserPlus,
  Users
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type CcSettingsSection } from '@/cc/route-config'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'
import { Skeleton } from '@/react/components/ui/skeleton'
import { Switch } from '@/react/components/ui/switch'
import { CC_THEMES, useCcTheme, type CcTheme } from '@/react/hooks/useCcTheme'
import { type CcSettingsState } from '@/react/hooks/useCcSettings'
import { useTheme } from '@/react/hooks/useTheme'
import { getAuthenticatedProfile, type GitHubAuthenticatedProfile } from '@/utils/githubGitApi'

type SettingsFormState = {
  defaultTargetRepo: string
  defaultCatalogPath: string
  ownedDisplayPriority: 'v1' | 'v2'
  showV2FollowUpTag: 'on' | 'off'
  customDisplayName: string
  customAvatarUrl: string
}

type AboutCommitItem = {
  sha: string
  shortSha: string
  message: string
  author: string
  dateUtc8: string
  url: string
}

const ABOUT_COMMIT_PAGE_SIZE = 20

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const formatUtc8DateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} (UTC+8)`
}

export function CcSettingsPanel(props: {
  token: string
  section: CcSettingsSection
  settings: CcSettingsState
  onSectionChange: (section: CcSettingsSection) => void
}) {
  const { token, section, settings, onSectionChange } = props
  const { themeMode, isFollowingSystem, setThemeMode, setFollowSystem } = useTheme()
  const { activeCcTheme, setCcTheme } = useCcTheme()

  const [accountProfileLoading, setAccountProfileLoading] = useState(false)
  const [accountProfileError, setAccountProfileError] = useState('')
  const [accountProfile, setAccountProfile] = useState<GitHubAuthenticatedProfile | null>(null)

  const [aboutCommitLoading, setAboutCommitLoading] = useState(false)
  const [aboutCommitLoadingMore, setAboutCommitLoadingMore] = useState(false)
  const [aboutCommitError, setAboutCommitError] = useState('')
  const [aboutCommitHasMore, setAboutCommitHasMore] = useState(true)
  const [aboutCommitShowLoadMore, setAboutCommitShowLoadMore] = useState(false)
  const [aboutCommits, setAboutCommits] = useState<AboutCommitItem[]>([])
  const aboutCommitPageRef = useRef(1)
  const aboutCommitLoadingRef = useRef(false)
  const aboutCommitLoadingMoreRef = useRef(false)
  const aboutCommitHasMoreRef = useRef(true)

  const [savedHint, setSavedHint] = useState('')
  const savedHintTimerRef = useRef<number | null>(null)
  const [form, setForm] = useState<SettingsFormState>({
    defaultTargetRepo: settings.defaultTargetRepo,
    defaultCatalogPath: settings.defaultCatalogPath,
    ownedDisplayPriority: settings.ownedDisplayPriority,
    showV2FollowUpTag: settings.showV2FollowUpTag ? 'on' : 'off',
    customDisplayName: settings.customDisplayName,
    customAvatarUrl: settings.customAvatarUrl
  })

  useEffect(() => {
    setForm({
      defaultTargetRepo: settings.defaultTargetRepo,
      defaultCatalogPath: settings.defaultCatalogPath,
      ownedDisplayPriority: settings.ownedDisplayPriority,
      showV2FollowUpTag: settings.showV2FollowUpTag ? 'on' : 'off',
      customDisplayName: settings.customDisplayName,
      customAvatarUrl: settings.customAvatarUrl
    })
  }, [
    settings.customAvatarUrl,
    settings.customDisplayName,
    settings.defaultCatalogPath,
    settings.defaultTargetRepo,
    settings.ownedDisplayPriority,
    settings.showV2FollowUpTag
  ])

  useEffect(() => {
    if (section !== 'account') return
    const resolvedToken = token.trim()
    if (!resolvedToken) {
      setAccountProfileError('请先登录 GitHub Token')
      setAccountProfile(null)
      return
    }

    const run = async () => {
      try {
        setAccountProfileLoading(true)
        setAccountProfileError('')
        setAccountProfile(null)
        const profile = await getAuthenticatedProfile(resolvedToken)
        setAccountProfile(profile)
      } catch (cause: unknown) {
        setAccountProfileError(cause instanceof Error ? cause.message : '加载账号信息失败')
      } finally {
        setAccountProfileLoading(false)
      }
    }

    void run()
  }, [section, token])

  const loadAboutCommits = useCallback(
    async (options: { append?: boolean } = {}) => {
      const { append = false } = options
      if (append) {
        if (aboutCommitLoadingRef.current || aboutCommitLoadingMoreRef.current || !aboutCommitHasMoreRef.current) return
        aboutCommitLoadingMoreRef.current = true
        setAboutCommitLoadingMore(true)
      } else {
        if (aboutCommitLoadingRef.current) return
        aboutCommitLoadingRef.current = true
        setAboutCommitLoading(true)
        setAboutCommitError('')
        setAboutCommitHasMore(true)
        aboutCommitHasMoreRef.current = true
        aboutCommitPageRef.current = 1
        setAboutCommitShowLoadMore(false)
        setAboutCommits([])
      }

      const currentPage = append ? aboutCommitPageRef.current : 1
      try {
        const endpoint = new URL('https://api.github.com/repos/CheongSzesuen/AstroBooox/commits')
        endpoint.searchParams.set('per_page', String(ABOUT_COMMIT_PAGE_SIZE))
        endpoint.searchParams.set('page', String(currentPage))

        const resolvedToken = token.trim()
        const response = await fetch(endpoint.toString(), {
          headers: {
            Accept: 'application/vnd.github+json',
            ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {})
          }
        })

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error(resolvedToken ? '请求被 GitHub 限流，请稍后重试' : '请求被 GitHub 限流，请先登录 Token 后重试')
          }
          throw new Error(`请求失败（${response.status}）`)
        }

        const payload = (await response.json()) as Array<{
          sha?: string
          html_url?: string
          commit?: {
            message?: string
            author?: { name?: string; date?: string }
          }
        }>

        const next = payload.map((item) => {
          const sha = item.sha || ''
          const firstLine = item.commit?.message?.split('\n')[0]?.trim() || '(no message)'
          return {
            sha,
            shortSha: sha.slice(0, 12),
            message: firstLine,
            author: item.commit?.author?.name || '-',
            dateUtc8: formatUtc8DateTime(item.commit?.author?.date),
            url: item.html_url || `https://github.com/CheongSzesuen/AstroBooox/commit/${sha}`
          }
        })

        setAboutCommits((prev) => (append ? [...prev, ...next] : next))
        aboutCommitPageRef.current = currentPage + 1
        const hasMore = payload.length >= ABOUT_COMMIT_PAGE_SIZE
        aboutCommitHasMoreRef.current = hasMore
        setAboutCommitHasMore(hasMore)
        if (append) {
          setAboutCommitShowLoadMore(false)
        }
      } catch (cause: unknown) {
        if (!append) {
          setAboutCommits([])
        }
        setAboutCommitError(cause instanceof Error ? cause.message : '加载提交记录失败')
      } finally {
        if (append) {
          aboutCommitLoadingMoreRef.current = false
          setAboutCommitLoadingMore(false)
          return
        }
        aboutCommitLoadingRef.current = false
        setAboutCommitLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (section !== 'about') return
    void loadAboutCommits()
  }, [section, token, loadAboutCommits])

  const handleAboutCommitScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    const remain = el.scrollHeight - el.scrollTop - el.clientHeight
    setAboutCommitShowLoadMore(remain <= 140 && aboutCommitHasMore)
  }

  const loadMoreAboutCommits = () => {
    if (!aboutCommitHasMore || aboutCommitLoadingMore || aboutCommitLoading) return
    void loadAboutCommits({ append: true })
  }

  const saveSettings = () => {
    settings.saveDefaults({
      defaultTargetOwner: settings.defaultTargetOwner,
      defaultTargetRepo: form.defaultTargetRepo,
      defaultCatalogPath: form.defaultCatalogPath,
      ownedDisplayPriority: form.ownedDisplayPriority,
      showV2FollowUpTag: form.showV2FollowUpTag === 'on',
      customDisplayName: form.customDisplayName,
      customAvatarUrl: form.customAvatarUrl
    })
    setSavedHint('已保存')
    if (savedHintTimerRef.current !== null) {
      window.clearTimeout(savedHintTimerRef.current)
    }
    savedHintTimerRef.current = window.setTimeout(() => {
      setSavedHint('')
      savedHintTimerRef.current = null
    }, 1200)
  }

  useEffect(() => {
    return () => {
      if (savedHintTimerRef.current !== null) {
        window.clearTimeout(savedHintTimerRef.current)
      }
    }
  }, [])

  const aboutInfoEntries = useMemo(
    () => [
      { label: '应用名称', value: __APP_NAME__ || 'AstroBooox', icon: Package },
      { label: '应用版本（package.json）', value: __APP_VERSION__ || '-', icon: Hash },
      { label: '构建版本', value: __BUILD_VERSION__ || '-', icon: GearSix },
      { label: '当前构建分支', value: __BUILD_BRANCH__ || '-', icon: GitBranch },
      { label: '构建时间（UTC+8）', value: __BUILD_TIME_UTC8__ ? `${__BUILD_TIME_UTC8__} (UTC+8)` : '-', icon: CalendarBlank },
      { label: 'Environment', value: String(import.meta.env.MODE || 'unknown'), icon: GlobeHemisphereWest }
    ],
    []
  )

  return (
    <div className="w-full max-w-[1120px] space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">管理 Creator Console 的默认行为与偏好。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-3 md:sticky md:top-[90px] md:h-[calc(100vh-140px)] md:p-4">
          <nav className="flex h-full flex-col">
            <div className="space-y-1">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  section === 'defaults'
                    ? 'border-border bg-accent text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'
                }`}
                onClick={() => onSectionChange('defaults')}
              >
                <span className="inline-flex items-center gap-2">
                  <GearSix size={16} weight="duotone" />
                  General
                </span>
              </button>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  section === 'account'
                    ? 'border-border bg-accent text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'
                }`}
                onClick={() => onSectionChange('account')}
              >
                <span className="inline-flex items-center gap-2">
                  <UserCircle size={16} weight="duotone" />
                  Account
                </span>
              </button>
            </div>

            <button
              type="button"
              className={`mt-auto flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                section === 'about'
                  ? 'border-border bg-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'
              }`}
              onClick={() => onSectionChange('about')}
            >
              <span className="inline-flex items-center gap-2">
                <Info size={16} weight="duotone" />
                About
              </span>
            </button>
          </nav>
        </aside>

        <section className="rounded-xl border border-border bg-card p-5">
          {section === 'defaults' ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">默认目标仓库</h3>
                <p className="mt-1 text-xs text-muted-foreground">用于“等待审核 / 资源管理 / 审核”页面的默认仓库配置。</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-setting-owner">Owner / Repo</Label>
                  <div className="flex items-center gap-2">
                    <img src={`https://github.com/${settings.defaultTargetOwner.trim() || 'ghost'}.png`} alt="owner avatar" className="h-7 w-7 shrink-0 rounded-full border border-border bg-muted/30 object-cover" />
                    <Input id="cc-setting-owner" value={settings.defaultTargetOwner} readOnly className="cursor-not-allowed bg-muted/40 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">/</span>
                    <Input
                      id="cc-setting-repo"
                      value={form.defaultTargetRepo}
                      onChange={(event) => setForm((prev) => ({ ...prev, defaultTargetRepo: event.target.value }))}
                      placeholder="AstroBox-Repo"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cc-setting-owned-priority">资源管理展示优先版本</Label>
                  <Select
                    value={form.ownedDisplayPriority}
                    onValueChange={(value: 'v1' | 'v2') => setForm((prev) => ({ ...prev, ownedDisplayPriority: value }))}
                  >
                    <SelectTrigger id="cc-setting-owned-priority">
                      <SelectValue placeholder="选择优先版本" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v2">V2 优先</SelectItem>
                      <SelectItem value="v1">V1 优先</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cc-setting-v2-followup-tag">显示“v2需要跟进”标签</Label>
                  <Select
                    value={form.showV2FollowUpTag}
                    onValueChange={(value: 'on' | 'off') => setForm((prev) => ({ ...prev, showV2FollowUpTag: value }))}
                  >
                    <SelectTrigger id="cc-setting-v2-followup-tag">
                      <SelectValue placeholder="选择显示策略" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">显示</SelectItem>
                      <SelectItem value="off">隐藏</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cc-setting-theme-style">CC 主题风格</Label>
                  <Select value={activeCcTheme} onValueChange={(value: CcTheme) => setCcTheme(value)}>
                    <SelectTrigger id="cc-setting-theme-style">
                      <SelectValue placeholder="选择主题风格" />
                    </SelectTrigger>
                    <SelectContent>
                      {CC_THEMES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">亮暗色跟随系统</div>
                      <p className="mt-1 text-xs text-muted-foreground">开启后将根据系统外观自动切换亮暗模式。</p>
                    </div>
                    <Switch checked={isFollowingSystem} onCheckedChange={(next) => setFollowSystem(Boolean(next))} aria-label="亮暗色跟随系统" />
                  </div>
                  {!isFollowingSystem ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="cc-setting-theme-mode">手动亮暗模式</Label>
                      <Select value={themeMode === 'dark' ? 'dark' : 'light'} onValueChange={(value: 'light' | 'dark') => setThemeMode(value)}>
                        <SelectTrigger id="cc-setting-theme-mode">
                          <SelectValue placeholder="选择亮暗模式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">浅色</SelectItem>
                          <SelectItem value="dark">深色</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                {savedHint ? <Badge variant="outline">{savedHint}</Badge> : null}
                <Button onClick={saveSettings}>保存设置</Button>
              </div>
            </div>
          ) : null}

          {section === 'account' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">账号信息</h3>
                <p className="mt-1 text-xs text-muted-foreground">基于当前 Token 拉取并展示 GitHub /user 信息。</p>
              </div>
              {accountProfileLoading ? (
                <div className="space-y-3 rounded-md border border-border bg-card/80 p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56 max-w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                </div>
              ) : null}
              {accountProfileError ? <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{accountProfileError}</div> : null}
              {accountProfile ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <img src={accountProfile.avatar_url || 'https://github.com/ghost.png'} alt="GitHub Avatar" className="h-14 w-14 shrink-0 rounded-full border border-border object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">{accountProfile.name || accountProfile.login}</span>
                          <Badge variant="outline">@{accountProfile.login}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{accountProfile.bio || '暂无简介'}</div>
                        <a
                          href={accountProfile.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <LinkSimple size={14} weight="duotone" />
                          打开 GitHub 主页
                        </a>
                        <div className="mt-3 flex flex-nowrap gap-2">
                          <div className="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div className="inline-flex items-center gap-1 text-muted-foreground">
                              <Archive size={13} weight="duotone" />
                              <span className="text-[11px]">仓库</span>
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{accountProfile.public_repos ?? '-'}</div>
                          </div>
                          <div className="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div className="inline-flex items-center gap-1 text-muted-foreground">
                              <Users size={13} weight="duotone" />
                              <span className="text-[11px]">粉丝</span>
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{accountProfile.followers ?? '-'}</div>
                          </div>
                          <div className="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div className="inline-flex items-center gap-1 text-muted-foreground">
                              <UserPlus size={13} weight="duotone" />
                              <span className="text-[11px]">关注</span>
                            </div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{accountProfile.following ?? '-'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Hash size={13} weight="duotone" /> ID</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.id ?? '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Buildings size={13} weight="duotone" /> 公司</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.company || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} weight="duotone" /> 地区</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.location || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><EnvelopeSimple size={13} weight="duotone" /> 邮箱</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.email || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><GlobeHemisphereWest size={13} weight="duotone" /> 博客</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.blog || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><TwitterLogo size={13} weight="duotone" /> Twitter</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.twitter_username || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarBlank size={13} weight="duotone" /> 创建时间</div>
                      <div className="mt-1 break-all font-medium text-foreground">{formatDateTime(accountProfile.created_at)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ClockCounterClockwise size={13} weight="duotone" /> 更新时间</div>
                      <div className="mt-1 break-all font-medium text-foreground">{formatDateTime(accountProfile.updated_at)}</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">账号的 Token 管理请通过右上角菜单执行退出后重新登录。</div>
            </div>
          ) : null}

          {section === 'about' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">关于工具</h3>
                <p className="mt-1 text-xs text-muted-foreground">展示当前 Creator Console 可识别到的运行、构建与环境信息。</p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {aboutInfoEntries.map((entry) => (
                  <div key={entry.label} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <entry.icon size={13} weight="duotone" />
                      <span>{entry.label}</span>
                    </div>
                    <div className="mt-1 break-all font-medium text-foreground">{entry.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">链接</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href="https://astrobooox-ng.waijade.cn/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    主站
                  </a>
                  <a href="https://astrobooox-ng.waijade.cn/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Creator Console
                  </a>
                  <a href="https://github.com/CheongSzesuen/AstroBooox" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    GitHub 仓库
                  </a>
                  <a href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Issues
                  </a>
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">最近 Commit</div>
                    <div className="mt-1 text-sm font-medium text-foreground">展示当前构建分支最近提交</div>
                  </div>
                  <div className="text-xs text-muted-foreground">当前 {aboutCommits.length} 条</div>
                </div>

                {aboutCommitLoading ? <div className="mt-3 text-xs text-muted-foreground">正在加载提交记录...</div> : null}
                {!aboutCommitLoading && aboutCommitError ? <div className="mt-3 text-xs text-destructive">{aboutCommitError}</div> : null}
                {!aboutCommitLoading && !aboutCommitError && aboutCommits.length === 0 ? <div className="mt-3 text-xs text-muted-foreground">暂无提交记录</div> : null}
                {!aboutCommitLoading && !aboutCommitError && aboutCommits.length > 0 ? (
                  <div className="mt-3 max-h-[420px] overflow-y-auto" onScroll={handleAboutCommitScroll}>
                    <ul className="space-y-2">
                      {aboutCommits.map((item) => (
                        <li key={item.sha} className="rounded border border-border bg-background/60 p-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-foreground">{item.shortSha}</span>
                            <span className="text-muted-foreground">{item.author}</span>
                            <span className="text-muted-foreground">{item.dateUtc8}</span>
                          </div>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-primary hover:underline">
                            {item.message}
                          </a>
                        </li>
                      ))}
                    </ul>
                    {aboutCommitShowLoadMore && aboutCommitHasMore ? (
                      <div className="py-2 text-center">
                        <Button size="sm" variant="outline" disabled={aboutCommitLoadingMore} onClick={loadMoreAboutCommits}>
                          {aboutCommitLoadingMore ? '加载中...' : '加载更多'}
                        </Button>
                      </div>
                    ) : null}
                    {!aboutCommitShowLoadMore && aboutCommitLoadingMore ? <div className="py-2 text-center text-xs text-muted-foreground">加载中...</div> : null}
                    {!aboutCommitHasMore ? <div className="py-2 text-center text-xs text-muted-foreground">已加载完</div> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
