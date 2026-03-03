<template>
  <CcTokenGate v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <div v-else class="min-h-screen bg-background">
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5">
      <div
        class="h-full bg-primary transition-all duration-200"
        :style="{ width: `${routeProgress}%`, opacity: routeProgressVisible ? 1 : 0 }"
      />
    </div>

    <header
      class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
        <a href="/" class="text-sm text-muted-foreground hover:text-foreground">返回主站</a>
        <div class="h-4 w-px bg-border" />
        <h1 class="text-sm font-semibold text-foreground md:text-base">Creator Console</h1>
        <div class="ml-2 min-w-0 flex-1 overflow-x-auto">
          <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'publish' ? 'default' : 'ghost'"
              @click="navigateToTab('publish')"
            >
              <UploadSimple :size="15" weight="duotone" />
              资源发布
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'review' ? 'default' : 'ghost'"
              @click="navigateToTab('review')"
            >
              <ClockCounterClockwise :size="15" weight="duotone" />
              等待审核
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'published' ? 'default' : 'ghost'"
              @click="navigateToTab('published')"
            >
              <ArchiveBox :size="15" weight="duotone" />
              资源管理
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'audit' ? 'default' : 'ghost'"
              @click="navigateToTab('audit')"
            >
              <CheckCircle :size="15" weight="duotone" />
              审核
            </Button>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
            @click="toggleTheme"
          >
            <Moon v-if="theme === 'light'" :size="16" weight="duotone" />
            <Sun v-else :size="16" weight="duotone" />
          </Button>

          <div ref="userMenuRoot" class="relative">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
              :class="{ 'bg-accent': showUserMenu }"
              :title="currentUser ? `当前用户：${currentUser}` : '未校验 Token'"
              @click="toggleUserMenu"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="User Avatar"
                class="h-6 w-6 rounded-full border border-border object-cover"
              />
              <UserCircle v-else :size="18" weight="duotone" class="text-muted-foreground" />
              <span class="hidden sm:inline">{{ currentUser || '未校验 Token' }}</span>
              <CaretDown :size="14" weight="bold" class="text-muted-foreground" />
            </button>

            <div
              v-if="showUserMenu && currentUser"
              class="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <a
                :href="profileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                @click="closeUserMenu"
              >
                <UserCircle :size="16" weight="duotone" />
                Profile
              </a>
              <a
                :href="repositoriesUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                @click="closeUserMenu"
              >
                <Folders :size="16" weight="duotone" />
                Repositories
              </a>
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                @click="openSettingsPage"
              >
                <GearSix :size="16" weight="duotone" />
                设置
              </button>
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                @click="handleSignOut"
              >
                <SignOut :size="16" weight="duotone" />
                退出
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] p-4 md:p-6">
      <section class="min-w-0 flex justify-center">
        <ResourcePublishWorkbench
          v-if="tab !== 'settings' && tab !== 'audit'"
          :mode="workbenchMode"
          @request-tab="navigateToTab"
        />
        <CcPrReviewWorkbench
          v-else-if="tab === 'audit'"
          :owner="defaultTargetOwner"
          :repo="defaultTargetRepo"
          :token="token"
        />
        <div v-else class="w-full max-w-[1120px] space-y-4">
          <div>
            <h2 class="text-base font-semibold text-foreground">Settings</h2>
            <p class="mt-1 text-sm text-muted-foreground">管理 Creator Console 的默认行为与偏好。</p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
            <aside class="rounded-xl border border-border bg-card p-3 md:p-4">
              <nav class="space-y-1">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition"
                  :class="settingsSection === 'defaults' ? 'border-border bg-accent text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'"
                  @click="openSettingsSection('defaults')"
                >
                  <span class="inline-flex items-center gap-2">
                    <GearSix :size="16" weight="duotone" />
                    General
                  </span>
                </button>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition"
                  :class="settingsSection === 'account' ? 'border-border bg-accent text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'"
                  @click="openSettingsSection('account')"
                >
                  <span class="inline-flex items-center gap-2">
                    <UserCircle :size="16" weight="duotone" />
                    Account
                  </span>
                </button>
              </nav>
            </aside>

            <section class="rounded-xl border border-border bg-card p-5">
              <div v-if="settingsSection === 'defaults'" class="space-y-5">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">默认目标仓库</h3>
                  <p class="mt-1 text-xs text-muted-foreground">用于“等待审核 / 资源管理 / 审核”页面的默认仓库配置。</p>
                </div>
                <div class="space-y-3">
                  <div class="space-y-1.5">
                    <Label for="cc-setting-owner">Owner / Repo</Label>
                    <div class="flex items-center gap-2">
                      <img
                        :src="settingsOwnerAvatarUrl"
                        alt="owner avatar"
                        class="h-7 w-7 shrink-0 rounded-full border border-border bg-muted/30 object-cover"
                      />
                      <Input id="cc-setting-owner" v-model="settingsForm.defaultTargetOwner" placeholder="AstralSightStudios" />
                      <span class="text-sm text-muted-foreground">/</span>
                      <Input id="cc-setting-repo" v-model="settingsForm.defaultTargetRepo" placeholder="AstroBox-Repo" />
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="cc-setting-owned-priority">资源管理展示优先版本</Label>
                    <Select v-model="settingsForm.ownedDisplayPriority">
                      <SelectTrigger id="cc-setting-owned-priority">
                        <SelectValue placeholder="选择优先版本" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v2">V2 优先</SelectItem>
                        <SelectItem value="v1">V1 优先</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="cc-setting-v2-followup-tag">显示“v2需要跟进”标签</Label>
                    <Select v-model="settingsForm.showV2FollowUpTag">
                      <SelectTrigger id="cc-setting-v2-followup-tag">
                        <SelectValue placeholder="选择显示策略" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on">显示</SelectItem>
                        <SelectItem value="off">隐藏</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div class="flex justify-end">
                  <Button @click="saveSettings">保存设置</Button>
                </div>
              </div>

              <div v-else class="space-y-4">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">账号信息</h3>
                  <p class="mt-1 text-xs text-muted-foreground">基于当前 Token 拉取并展示 GitHub /user 信息。</p>
                </div>
                <div v-if="accountProfileLoading" class="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                  正在加载账号信息...
                </div>
                <div v-else-if="accountProfileError" class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {{ accountProfileError }}
                </div>
                <div v-else-if="accountProfile" class="space-y-3">
                  <div class="rounded-lg border border-border bg-muted/20 p-4">
                    <div class="flex items-start gap-3">
                      <img
                        :src="accountProfile.avatar_url || 'https://github.com/ghost.png'"
                        alt="GitHub Avatar"
                        class="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                      />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="truncate text-sm font-semibold text-foreground">{{ accountProfile.name || accountProfile.login }}</span>
                          <Badge variant="outline">@{{ accountProfile.login }}</Badge>
                        </div>
                        <div class="mt-1 text-xs text-muted-foreground">{{ accountProfile.bio || '暂无简介' }}</div>
                        <a
                          :href="accountProfile.html_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <LinkSimple :size="14" weight="duotone" />
                          打开 GitHub 主页
                        </a>
                        <div class="mt-3 flex flex-nowrap gap-2">
                          <div class="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div class="inline-flex items-center gap-1 text-muted-foreground">
                              <ArchiveBox :size="13" weight="duotone" />
                              <span class="text-[11px]">仓库</span>
                            </div>
                            <div class="mt-1 text-sm font-semibold text-foreground">{{ accountProfile.public_repos ?? '-' }}</div>
                          </div>
                          <div class="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div class="inline-flex items-center gap-1 text-muted-foreground">
                              <Users :size="13" weight="duotone" />
                              <span class="text-[11px]">粉丝</span>
                            </div>
                            <div class="mt-1 text-sm font-semibold text-foreground">{{ accountProfile.followers ?? '-' }}</div>
                          </div>
                          <div class="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-2 text-center">
                            <div class="inline-flex items-center gap-1 text-muted-foreground">
                              <UserPlus :size="13" weight="duotone" />
                              <span class="text-[11px]">关注</span>
                            </div>
                            <div class="mt-1 text-sm font-semibold text-foreground">{{ accountProfile.following ?? '-' }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><Hash :size="13" weight="duotone" /> ID</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.id ?? '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><Buildings :size="13" weight="duotone" /> 公司</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.company || '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin :size="13" weight="duotone" /> 地区</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.location || '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><EnvelopeSimple :size="13" weight="duotone" /> 邮箱</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.email || '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><GlobeHemisphereWest :size="13" weight="duotone" /> 博客</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.blog || '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><TwitterLogo :size="13" weight="duotone" /> Twitter</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ accountProfile.twitter_username || '-' }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarBlank :size="13" weight="duotone" /> 创建时间</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ formatDateTime(accountProfile.created_at) }}</div>
                    </div>
                    <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div class="inline-flex items-center gap-1 text-xs text-muted-foreground"><ClockCounterClockwise :size="13" weight="duotone" /> 更新时间</div>
                      <div class="mt-1 break-all font-medium text-foreground">{{ formatDateTime(accountProfile.updated_at) }}</div>
                    </div>
                  </div>
                </div>
                <div class="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  账号的 Token 管理请通过右上角菜单执行退出后重新登录。
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhBuildings as Buildings,
  PhCalendarBlank as CalendarBlank,
  PhCaretDown as CaretDown,
  PhCheckCircle as CheckCircle,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhFolders as Folders,
  PhGearSix as GearSix,
  PhGlobeHemisphereWest as GlobeHemisphereWest,
  PhHash as Hash,
  PhLinkSimple as LinkSimple,
  PhMapPin as MapPin,
  PhMoon as Moon,
  PhEnvelopeSimple as EnvelopeSimple,
  PhSignOut as SignOut,
  PhSun as Sun,
  PhTwitterLogo as TwitterLogo,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle,
  PhUserPlus as UserPlus,
  PhUsers as Users
} from '@phosphor-icons/vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import CcPrReviewWorkbench from '@/components/CcPrReviewWorkbench.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CcTokenGate from '@/cc/CcTokenGate.vue'
import { useCcSettings } from '@/composables/useCcSettings'
import { useCcSession } from '@/composables/useCcSession'
import { useCcWorkspace } from '@/composables/useCcWorkspace'
import { useTheme } from '@/composables/useTheme'
import { getAuthenticatedProfile, type GitHubAuthenticatedProfile } from '@/utils/githubGitApi'
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

const tab = ref<CcTab>('publish')
const { token, currentUser, avatarUrl, isAuthenticated, clearSession } = useCcSession()
const { clearWorkspace, clearRemoteWorkspace } = useCcWorkspace()
const { theme, toggleTheme } = useTheme()
const {
  defaultTargetOwner,
  defaultTargetRepo,
  defaultCatalogPath,
  ownedDisplayPriority,
  showV2FollowUpTag,
  customDisplayName,
  customAvatarUrl,
  saveDefaults
} = useCcSettings()
const showUserMenu = ref(false)
const userMenuRoot = ref<HTMLElement | null>(null)
const settingsForm = ref({
  defaultTargetOwner: defaultTargetOwner.value,
  defaultTargetRepo: defaultTargetRepo.value,
  defaultCatalogPath: defaultCatalogPath.value,
  ownedDisplayPriority: ownedDisplayPriority.value,
  showV2FollowUpTag: showV2FollowUpTag.value ? 'on' : 'off',
  customDisplayName: customDisplayName.value,
  customAvatarUrl: customAvatarUrl.value
})
const accountProfileLoading = ref(false)
const accountProfileError = ref('')
const accountProfile = ref<GitHubAuthenticatedProfile | null>(null)
const settingsSection = ref<CcSettingsSection>('defaults')
const routeProgress = ref(0)
const routeProgressVisible = ref(false)
let routeProgressTimer: ReturnType<typeof setInterval> | null = null
const workbenchMode = computed<'publish' | 'review' | 'published'>(() =>
  tab.value === 'settings' || tab.value === 'audit' ? 'publish' : tab.value
)

const profileUrl = computed(() =>
  currentUser.value ? `https://github.com/${currentUser.value}` : 'https://github.com'
)
const repositoriesUrl = computed(() =>
  currentUser.value
    ? `https://github.com/${currentUser.value}?tab=repositories`
    : 'https://github.com'
)
const settingsOwnerAvatarUrl = computed(() => {
  const owner = settingsForm.value.defaultTargetOwner.trim()
  if (!owner) return 'https://github.com/ghost.png'
  return `https://github.com/${owner}.png`
})
const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const resolveRouteFromLocation = (): CcRouteState => {
  if (typeof window === 'undefined') return CC_DEFAULT_ROUTE
  const searchParams = new URLSearchParams(window.location.search)
  const redirectedPath = searchParams.get('cc_path')
  if (redirectedPath && redirectedPath.startsWith('/cc')) {
    return resolveCcRouteFromPath(redirectedPath)
  }
  return resolveCcRouteFromPath(window.location.pathname)
}

const startRouteProgress = (): void => {
  if (routeProgressTimer) {
    clearInterval(routeProgressTimer)
    routeProgressTimer = null
  }
  routeProgressVisible.value = true
  routeProgress.value = 14
  routeProgressTimer = setInterval(() => {
    if (routeProgress.value < 82) {
      routeProgress.value = Math.min(82, routeProgress.value + 7)
    }
  }, 80)
}

const finishRouteProgress = (): void => {
  if (routeProgressTimer) {
    clearInterval(routeProgressTimer)
    routeProgressTimer = null
  }
  routeProgress.value = 100
  window.setTimeout(() => {
    routeProgressVisible.value = false
    routeProgress.value = 0
  }, 220)
}

const applyRouteState = (
  state: CcRouteState,
  options?: { replace?: boolean; syncUrl?: boolean; withProgress?: boolean }
): void => {
  const withProgress = Boolean(options?.withProgress)
  if (withProgress) {
    startRouteProgress()
  }

  tab.value = state.tab
  settingsSection.value = state.settingsSection

  if (options?.syncUrl !== false && typeof window !== 'undefined') {
    const targetPath = buildCcPath(state)
    if (window.location.pathname !== targetPath) {
      const method = options?.replace ? 'replaceState' : 'pushState'
      window.history[method](null, '', targetPath)
    }
  }

  if (withProgress) {
    window.setTimeout(() => {
      finishRouteProgress()
    }, 180)
  }
}

const navigateToTab = (nextTab: CcTab): void => {
  const nextState: CcRouteState = {
    tab: nextTab,
    settingsSection: nextTab === 'settings' ? settingsSection.value : 'defaults'
  }
  applyRouteState(nextState, { withProgress: true })
}

const openSettingsSection = (section: CcSettingsSection): void => {
  applyRouteState(
    {
      tab: 'settings',
      settingsSection: section
    },
    { withProgress: true }
  )
}

const closeUserMenu = (): void => {
  showUserMenu.value = false
}

const toggleUserMenu = (): void => {
  if (!currentUser.value) return
  showUserMenu.value = !showUserMenu.value
}

const openSettingsPage = (): void => {
  settingsForm.value = {
    defaultTargetOwner: defaultTargetOwner.value,
    defaultTargetRepo: defaultTargetRepo.value,
    defaultCatalogPath: defaultCatalogPath.value,
    ownedDisplayPriority: ownedDisplayPriority.value,
    showV2FollowUpTag: showV2FollowUpTag.value ? 'on' : 'off',
    customDisplayName: customDisplayName.value,
    customAvatarUrl: customAvatarUrl.value
  }
  accountProfileError.value = ''
  closeUserMenu()
  openSettingsSection('defaults')
}

const saveSettings = (): void => {
  saveDefaults({
    defaultTargetOwner: settingsForm.value.defaultTargetOwner,
    defaultTargetRepo: settingsForm.value.defaultTargetRepo,
    defaultCatalogPath: settingsForm.value.defaultCatalogPath,
    ownedDisplayPriority: settingsForm.value.ownedDisplayPriority,
    showV2FollowUpTag: settingsForm.value.showV2FollowUpTag === 'on',
    customDisplayName: settingsForm.value.customDisplayName,
    customAvatarUrl: settingsForm.value.customAvatarUrl
  })
}

const loadAccountProfile = async (): Promise<void> => {
  try {
    accountProfileLoading.value = true
    accountProfileError.value = ''
    accountProfile.value = null
    const resolvedToken = token.value.trim()
    if (!resolvedToken) {
      throw new Error('请先登录 GitHub Token')
    }
    accountProfile.value = await getAuthenticatedProfile(resolvedToken)
  } catch (error: unknown) {
    accountProfileError.value = error instanceof Error ? error.message : '加载账号信息失败'
  } finally {
    accountProfileLoading.value = false
  }
}

const handleGlobalPointerDown = (event: MouseEvent): void => {
  if (!showUserMenu.value) return
  const root = userMenuRoot.value
  if (!root) return
  if (event.target instanceof Node && !root.contains(event.target)) {
    closeUserMenu()
  }
}

const handleEscapeKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closeUserMenu()
  }
}

const handlePopState = (): void => {
  if (!isAuthenticated.value) return
  applyRouteState(resolveCcRouteFromPath(window.location.pathname), {
    syncUrl: false,
    withProgress: true
  })
}

const handleAuthenticated = (): void => {
  navigateToTab('publish')
}

const handleSignOut = (): void => {
  closeUserMenu()
  clearWorkspace()
  clearRemoteWorkspace()
  clearSession()
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', CC_PATHS.login)
  }
}

onMounted(() => {
  if (!isAuthenticated.value) {
    if (!isCcLoginPath(window.location.pathname)) {
      window.history.replaceState(null, '', CC_PATHS.login)
    }
  } else {
    applyRouteState(resolveRouteFromLocation(), {
      replace: true,
      withProgress: false
    })
    if (window.location.pathname === CC_PATHS.root && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.has('cc_path')) {
        const targetPath = buildCcPath(resolveRouteFromLocation())
        window.history.replaceState(null, '', targetPath)
      }
    }
  }
  window.addEventListener('popstate', handlePopState)
  document.addEventListener('mousedown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleEscapeKey)
})

watch(
  () => isAuthenticated.value,
  authed => {
    if (typeof window === 'undefined') return
    if (!authed) {
      if (!isCcLoginPath(window.location.pathname)) {
        window.history.replaceState(null, '', CC_PATHS.login)
      }
      return
    }
    if (isCcLoginPath(window.location.pathname)) {
      applyRouteState(CC_DEFAULT_ROUTE, { replace: true, withProgress: false })
    }
  }
)

watch(
  () => [tab.value, settingsSection.value, token.value] as const,
  ([currentTab, currentSection]) => {
    if (currentTab === 'settings' && currentSection === 'account') {
      void loadAccountProfile()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (routeProgressTimer) {
    clearInterval(routeProgressTimer)
    routeProgressTimer = null
  }
  window.removeEventListener('popstate', handlePopState)
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>
