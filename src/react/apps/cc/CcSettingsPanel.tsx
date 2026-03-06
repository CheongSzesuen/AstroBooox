import { CalendarBlank, GearSix, GlobeHemisphereWest, Hash, Info, Package, UserCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { type CcSettingsSection } from '@/cc/route-config'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Input } from '@/react/components/ui/input'
import { Label } from '@/react/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'
import { Switch } from '@/react/components/ui/switch'
import { useCcSettings } from '@/react/hooks/useCcSettings'
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

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

export function CcSettingsPanel(props: {
  token: string
  section: CcSettingsSection
  onSectionChange: (section: CcSettingsSection) => void
}) {
  const { token, section, onSectionChange } = props
  const settings = useCcSettings()
  const { themeMode, isFollowingSystem, setThemeMode, setFollowSystem } = useTheme()
  const [accountProfileLoading, setAccountProfileLoading] = useState(false)
  const [accountProfileError, setAccountProfileError] = useState('')
  const [accountProfile, setAccountProfile] = useState<GitHubAuthenticatedProfile | null>(null)
  const [savedHint, setSavedHint] = useState('')
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
    window.setTimeout(() => setSavedHint(''), 1200)
  }

  const aboutInfoEntries = useMemo(
    () => [
      { label: '应用名称', value: __APP_NAME__ || 'AstroBooox', icon: Package },
      { label: '应用版本（package.json）', value: __APP_VERSION__ || '-', icon: Hash },
      { label: '构建版本', value: __BUILD_VERSION__ || '-', icon: GearSix },
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
              {accountProfileLoading ? <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">正在加载账号信息...</div> : null}
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
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">ID</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.id ?? '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">公司</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.company || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">地区</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.location || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">邮箱</div>
                      <div className="mt-1 break-all font-medium text-foreground">{accountProfile.email || '-'}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">创建时间</div>
                      <div className="mt-1 break-all font-medium text-foreground">{formatDateTime(accountProfile.created_at)}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="text-xs text-muted-foreground">更新时间</div>
                      <div className="mt-1 break-all font-medium text-foreground">{formatDateTime(accountProfile.updated_at)}</div>
                    </div>
                  </div>
                </div>
              ) : null}
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
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
