<template>
  <CcTokenGate v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <div v-else class="min-h-screen bg-background">
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
              @click="tab = 'publish'"
            >
              <UploadSimple :size="15" weight="duotone" />
              资源发布
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'review' ? 'default' : 'ghost'"
              @click="tab = 'review'"
            >
              <ClockCounterClockwise :size="15" weight="duotone" />
              等待审核
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'published' ? 'default' : 'ghost'"
              @click="tab = 'published'"
            >
              <ArchiveBox :size="15" weight="duotone" />
              已发布资源
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'audit' ? 'default' : 'ghost'"
              @click="tab = 'audit'"
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
        <ResourcePublishWorkbench v-if="tab !== 'settings' && tab !== 'audit'" :mode="workbenchMode" />
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
                  @click="settingsSection = 'defaults'"
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
                  @click="settingsSection = 'account'"
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
                  <p class="mt-1 text-xs text-muted-foreground">用于“等待审核 / 已发布资源 / 审核”页面的默认仓库配置。</p>
                </div>
                <div class="space-y-3">
                  <div class="space-y-1.5">
                    <Label for="cc-setting-owner">Owner</Label>
                    <Input id="cc-setting-owner" v-model="settingsForm.defaultTargetOwner" placeholder="AstralSightStudios" />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="cc-setting-repo">Repo</Label>
                    <Input id="cc-setting-repo" v-model="settingsForm.defaultTargetRepo" placeholder="AstroBox-Repo" />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="cc-setting-catalog">Catalog Path</Label>
                    <Input id="cc-setting-catalog" v-model="settingsForm.defaultCatalogPath" placeholder="index_v2.csv" />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="cc-setting-owned-priority">已发布展示优先版本</Label>
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
                </div>
                <div class="flex justify-end">
                  <Button @click="saveSettings">保存设置</Button>
                </div>
              </div>

              <div v-else class="space-y-4">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">账号信息</h3>
                  <p class="mt-1 text-xs text-muted-foreground">当前登录的 GitHub 会话信息。</p>
                </div>
                <div class="rounded-md border border-border bg-muted/20 p-3 text-sm">
                  <div class="text-xs text-muted-foreground">当前账号</div>
                  <div class="mt-1 font-medium text-foreground">{{ currentUser || '未登录' }}</div>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhCaretDown as CaretDown,
  PhCheckCircle as CheckCircle,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhFolders as Folders,
  PhGearSix as GearSix,
  PhMoon as Moon,
  PhSignOut as SignOut,
  PhSun as Sun,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle
} from '@phosphor-icons/vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import CcPrReviewWorkbench from '@/components/CcPrReviewWorkbench.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CcTokenGate from '@/cc/CcTokenGate.vue'
import { useCcSettings } from '@/composables/useCcSettings'
import { useCcSession } from '@/composables/useCcSession'
import { useCcWorkspace } from '@/composables/useCcWorkspace'
import { useTheme } from '@/composables/useTheme'

const tab = ref<'publish' | 'review' | 'published' | 'audit' | 'settings'>('publish')
const { token, currentUser, avatarUrl, isAuthenticated, clearSession } = useCcSession()
const { clearWorkspace, clearRemoteWorkspace } = useCcWorkspace()
const { theme, toggleTheme } = useTheme()
const { defaultTargetOwner, defaultTargetRepo, defaultCatalogPath, ownedDisplayPriority, saveDefaults } = useCcSettings()
const showUserMenu = ref(false)
const userMenuRoot = ref<HTMLElement | null>(null)
const settingsForm = ref({
  defaultTargetOwner: defaultTargetOwner.value,
  defaultTargetRepo: defaultTargetRepo.value,
  defaultCatalogPath: defaultCatalogPath.value,
  ownedDisplayPriority: ownedDisplayPriority.value
})
const settingsSection = ref<'defaults' | 'account'>('defaults')
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
    ownedDisplayPriority: ownedDisplayPriority.value
  }
  settingsSection.value = 'defaults'
  closeUserMenu()
  tab.value = 'settings'
}

const saveSettings = (): void => {
  saveDefaults(settingsForm.value)
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

const handleAuthenticated = (): void => {
  tab.value = 'publish'
}

const handleSignOut = (): void => {
  closeUserMenu()
  clearWorkspace()
  clearRemoteWorkspace()
  clearSession()
  tab.value = 'publish'
}

onMounted(() => {
  document.addEventListener('mousedown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>
