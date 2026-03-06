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
        <div class="flex items-center gap-2 sm:hidden">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            aria-label="打开导航菜单"
            @click="showMobileNavSheet = true"
          >
            <List :size="16" weight="duotone" />
          </Button>
          <a href="/" class="inline-flex h-8 w-8 items-center justify-center" aria-label="返回主站">
            <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" class="h-6 w-6" />
          </a>
        </div>
        <a href="/" class="hidden h-8 w-8 items-center justify-center sm:inline-flex" aria-label="返回主站">
          <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" class="h-6 w-6" />
        </a>
        <h1 class="hidden text-sm font-semibold text-foreground md:text-base sm:block">Creator Console</h1>
        <div class="hidden min-w-0 flex-1 overflow-x-auto sm:ml-2 sm:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'publish' ? 'default' : 'ghost'"
              @click="navigateToTab('publish')"
            >
              <UploadSimple :size="15" weight="duotone" />
              <span class="hidden sm:inline">资源发布</span>
              <span class="sm:hidden">发布</span>
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'pullrequest' ? 'default' : 'ghost'"
              @click="navigateToTab('pullrequest')"
            >
              <ClockCounterClockwise :size="15" weight="duotone" />
              <span class="hidden sm:inline">等待审核</span>
              <span class="sm:hidden">待审</span>
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'published' ? 'default' : 'ghost'"
              @click="navigateToTab('published')"
            >
              <ArchiveBox :size="15" weight="duotone" />
              <span class="hidden sm:inline">资源管理</span>
              <span class="sm:hidden">管理</span>
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'review' ? 'default' : 'ghost'"
              @click="navigateToTab('review')"
            >
              <CheckCircle :size="15" weight="duotone" />
              <span class="hidden sm:inline">审核</span>
              <span class="sm:hidden">审</span>
            </Button>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2">
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
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                @click="openRepositoriesPage"
              >
                <RepoIcon :size="16" weight="duotone" />
                仓库
              </button>
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

    <Sheet :open="showMobileNavSheet" @update:open="showMobileNavSheet = $event">
      <SheetContent side="left" :hide-close="true" class="!w-[max(61.8vw,max-content)] max-w-[calc(100vw-1.5rem)] p-0 sm:hidden">
        <div class="relative border-b border-border px-3 py-3.5">
          <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" class="h-6 w-6" />
          <SheetClose as-child>
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2"
              aria-label="关闭导航菜单"
            >
              <X :size="18" weight="bold" />
            </Button>
          </SheetClose>
        </div>
        <nav class="w-full space-y-1 px-3 py-3">
          <Button
            class="h-9 w-full justify-start whitespace-nowrap"
            :variant="tab === 'publish' ? 'default' : 'ghost'"
            @click="navigateToTabFromMobile('publish')"
          >
            <UploadSimple :size="15" weight="duotone" />
            资源发布
          </Button>
          <Button
            class="h-9 w-full justify-start whitespace-nowrap"
            :variant="tab === 'pullrequest' ? 'default' : 'ghost'"
            @click="navigateToTabFromMobile('pullrequest')"
          >
            <ClockCounterClockwise :size="15" weight="duotone" />
            等待审核
          </Button>
          <Button
            class="h-9 w-full justify-start whitespace-nowrap"
            :variant="tab === 'published' ? 'default' : 'ghost'"
            @click="navigateToTabFromMobile('published')"
          >
            <ArchiveBox :size="15" weight="duotone" />
            资源管理
          </Button>
          <Button
            class="h-9 w-full justify-start whitespace-nowrap"
            :variant="tab === 'review' ? 'default' : 'ghost'"
            @click="navigateToTabFromMobile('review')"
          >
            <CheckCircle :size="15" weight="duotone" />
            审核
          </Button>
          <div class="my-2 h-px w-full bg-border" />
          <Button class="h-9 w-full justify-start whitespace-nowrap" variant="ghost" @click="openRepositoriesPage">
            <RepoIcon :size="15" weight="duotone" />
            仓库
          </Button>
          <Button class="h-9 w-full justify-start whitespace-nowrap" variant="ghost" @click="openSettingsPage">
            <GearSix :size="15" weight="duotone" />
            设置
          </Button>
        </nav>
      </SheetContent>
    </Sheet>

    <main class="mx-auto w-full max-w-[1440px] p-4 md:p-6">
      <section class="min-w-0 flex justify-center">
        <CcPrReviewWorkbench
          v-if="tab === 'review'"
          :owner="defaultTargetOwner"
          :repo="defaultTargetRepo"
          :token="token"
        />
        <div v-else-if="tab === 'repositories'" class="w-full max-w-[1120px] space-y-4">
          <div>
            <h2 class="text-base font-semibold text-foreground">仓库</h2>
            <p class="mt-1 text-sm text-muted-foreground">展示当前账号在发布目录中出现过的资源仓库。</p>
          </div>

          <div v-if="repositoriesLoading" class="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            正在加载仓库列表...
          </div>
          <div v-else-if="repositoriesError" class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {{ repositoriesError }}
          </div>
          <div v-else-if="repositoriesList.length === 0" class="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            暂无可展示仓库
          </div>
          <div v-else class="space-y-3">
            <article v-for="repo in repositoriesList" :key="repo.fullName" class="rounded-xl border border-border bg-card p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <a
                    :href="repo.htmlUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <RepoIcon :size="16" weight="duotone" />
                    {{ repo.fullName }}
                  </a>
                  <div class="mt-1 text-xs text-muted-foreground">
                    默认分支：{{ repo.defaultBranch || '-' }} · 来源版本：{{ repo.sources.join(' + ') }}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-8"
                  @click="openInviteDialog(repo)"
                >
                  <UserPlus :size="14" weight="duotone" />
                  邀请协作者
                </Button>
              </div>
              <div class="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div class="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span class="text-muted-foreground">最近更新时间</span>
                  <div class="mt-0.5 text-foreground">{{ formatDateTime(repo.latestCommitDate) }}</div>
                </div>
                <div class="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span class="text-muted-foreground">资源类型</span>
                  <div class="mt-0.5 text-foreground">{{ formatRestypeLabels(repo.restypes) }}</div>
                </div>
                <div class="rounded border border-border bg-muted/20 px-2 py-1.5">
                  <span class="text-muted-foreground">资源名称</span>
                  <div class="mt-0.5 text-foreground">{{ repo.resourceNames.join('、') || '-' }}</div>
                </div>
              </div>
              <div v-if="repo.collaborators.length > 0" class="mt-3 rounded border border-border bg-muted/20 px-3 py-2">
                <div class="text-xs text-muted-foreground">协作者</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <a
                    v-for="user in repo.collaborators"
                    :key="`${repo.fullName}-${user.login}`"
                    :href="user.htmlUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                  >
                    <img :src="user.avatarUrl" :alt="user.login" class="h-5 w-5 rounded-full border border-border object-cover" />
                    <span class="font-medium text-foreground">{{ user.login }}</span>
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
        <div v-else-if="tab === 'settings'" class="w-full max-w-[1120px] space-y-4">
          <div>
            <h2 class="text-base font-semibold text-foreground">Settings</h2>
            <p class="mt-1 text-sm text-muted-foreground">管理 Creator Console 的默认行为与偏好。</p>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
            <aside class="rounded-xl border border-border bg-card p-3 md:sticky md:top-[90px] md:h-[calc(100vh-140px)] md:p-4">
              <nav class="flex h-full flex-col">
                <div class="space-y-1">
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
                </div>

                <button
                  type="button"
                  class="mt-auto flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition"
                  :class="settingsSection === 'about' ? 'border-border bg-accent text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent/70 hover:text-foreground'"
                  @click="openSettingsSection('about')"
                >
                  <span class="inline-flex items-center gap-2">
                    <Info :size="16" weight="duotone" />
                    About
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
                      <Input
                        id="cc-setting-owner"
                        :model-value="defaultTargetOwner"
                        readonly
                        class="cursor-not-allowed bg-muted/40 text-muted-foreground"
                      />
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
                  <div class="space-y-1.5">
                    <Label for="cc-setting-theme-style">CC 主题风格</Label>
                    <Select v-model="activeCcTheme">
                      <SelectTrigger id="cc-setting-theme-style">
                        <SelectValue placeholder="选择主题风格" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="item in CC_THEMES" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-sm font-medium text-foreground">亮暗色跟随系统</div>
                        <p class="mt-1 text-xs text-muted-foreground">开启后将根据系统外观自动切换亮暗模式。</p>
                      </div>
                      <Switch
                        :checked="isFollowingSystem"
                        aria-label="亮暗色跟随系统"
                        @update:checked="handleFollowSystemChange"
                      />
                    </div>
                    <div v-if="!isFollowingSystem" class="space-y-1.5">
                      <Label for="cc-setting-theme-mode">手动亮暗模式</Label>
                      <Select v-model="manualThemeMode">
                        <SelectTrigger id="cc-setting-theme-mode">
                          <SelectValue placeholder="选择亮暗模式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">浅色</SelectItem>
                          <SelectItem value="dark">深色</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div class="flex justify-end">
                  <Button @click="saveSettings">保存设置</Button>
                </div>
              </div>

              <div v-else-if="settingsSection === 'account'" class="space-y-4">
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

              <div v-else class="space-y-4">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">关于工具</h3>
                  <p class="mt-1 text-xs text-muted-foreground">展示当前 Creator Console 可识别到的运行、构建与环境信息。</p>
                </div>

                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div v-for="entry in aboutInfoEntries" :key="entry.label" class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                    <div class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <component :is="entry.icon" :size="13" weight="duotone" />
                      <span>{{ entry.label }}</span>
                    </div>
                    <div class="mt-1 break-all font-medium text-foreground">{{ entry.value }}</div>
                  </div>
                </div>

                <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                  <div class="text-xs text-muted-foreground">链接</div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <a href="https://astrobooox-ng.waijade.cn/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
                      主站
                    </a>
                    <a href="https://astrobooox-ng.waijade.cn/cc/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
                      Creator Console
                    </a>
                    <a href="https://github.com/CheongSzesuen/AstroBooox" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
                      GitHub 仓库
                    </a>
                    <a href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
                      Issues
                    </a>
                  </div>
                </div>

                <div class="rounded-md border border-border bg-muted/20 p-3 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div class="text-xs text-muted-foreground">最近 Commit</div>
                      <div class="mt-1 text-sm font-medium text-foreground">展示当前构建分支最近提交</div>
                    </div>
                    <div class="text-xs text-muted-foreground">当前 {{ aboutCommits.length }} 条</div>
                  </div>

                  <div v-if="aboutCommitLoading" class="mt-3 text-xs text-muted-foreground">正在加载提交记录...</div>
                  <div v-else-if="aboutCommitError" class="mt-3 text-xs text-destructive">{{ aboutCommitError }}</div>
                  <div v-else-if="aboutCommits.length === 0" class="mt-3 text-xs text-muted-foreground">暂无提交记录</div>
                  <div
                    v-else
                    ref="aboutCommitScrollRef"
                    class="mt-3 max-h-[420px] overflow-y-auto"
                    @scroll="handleAboutCommitScroll"
                  >
                    <ul class="space-y-2">
                      <li v-for="item in aboutCommits" :key="item.sha" class="rounded border border-border bg-background/60 p-2">
                        <div class="flex flex-wrap items-center gap-2 text-xs">
                          <span class="font-mono text-foreground">{{ item.shortSha }}</span>
                          <span class="text-muted-foreground">{{ item.author }}</span>
                          <span class="text-muted-foreground">{{ item.dateUtc8 }}</span>
                        </div>
                        <a
                          :href="item.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-1 block text-sm text-primary hover:underline"
                        >
                          {{ item.message }}
                        </a>
                      </li>
                    </ul>
                    <div v-if="aboutCommitShowLoadMore && aboutCommitHasMore" class="py-2 text-center">
                      <Button size="sm" variant="outline" :disabled="aboutCommitLoadingMore" @click="loadMoreAboutCommits">
                        {{ aboutCommitLoadingMore ? '加载中...' : '加载更多' }}
                      </Button>
                    </div>
                    <div v-else-if="aboutCommitLoadingMore" class="py-2 text-center text-xs text-muted-foreground">加载中...</div>
                    <div v-else-if="!aboutCommitHasMore" class="py-2 text-center text-xs text-muted-foreground">已加载完</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        <ResourcePublishWorkbench
          v-else
          :mode="workbenchMode"
          @request-tab="navigateToTab"
          @request-route="applyRouteState($event, { withProgress: true })"
          :resource-detail-key="publishedResourceDetailKey"
          :pull-request-number="pullRequestRouteNumber"
          :pull-request-target-repo="pullRequestRouteTargetRepo"
        />
      </section>
    </main>

    <Dialog :open="inviteDialogOpen" @update:open="handleInviteDialogOpenChange">
      <DialogContent class="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>邀请协作者</DialogTitle>
          <DialogDescription>
            目标仓库：{{ inviteTargetRepo ? `${inviteTargetRepo.owner}/${inviteTargetRepo.name}` : '-' }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-3 py-1">
          <div class="space-y-1.5">
            <Label for="invite-username">GitHub 用户名 / 邮箱 / 主页链接</Label>
            <div class="flex items-center gap-2">
              <Input
                id="invite-username"
                v-model.trim="inviteForm.username"
                placeholder="例如：octocat 或 octocat@example.com"
                :disabled="inviteSubmitting"
                class="flex-1"
              />
              <Select v-model="inviteForm.permission" :disabled="inviteSubmitting">
                <SelectTrigger class="w-[150px]">
                  <SelectValue placeholder="权限" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="pull">只读（pull）</SelectItem>
                <SelectItem value="push">读写（push）</SelectItem>
                <SelectItem value="triage">分流（triage）</SelectItem>
                <SelectItem value="maintain">维护（maintain）</SelectItem>
                <SelectItem value="admin">管理员（admin）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="rounded-md border border-border bg-muted/20">
            <div v-if="inviteSearchLoading" class="px-3 py-2 text-xs text-muted-foreground">搜索中...</div>
            <div v-else-if="inviteSearchError" class="px-3 py-2 text-xs text-destructive">{{ inviteSearchError }}</div>
            <div v-else-if="inviteForm.username.trim() && inviteSearchResults.length === 0" class="px-3 py-2 text-xs text-muted-foreground">
              没有找到匹配用户
            </div>
            <ul v-else-if="inviteSearchResults.length > 0" class="max-h-[220px] overflow-y-auto py-1">
              <li v-for="user in inviteSearchResults" :key="user.login">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent"
                  @click="selectInviteCandidate(user)"
                >
                  <img :src="user.avatarUrl" :alt="user.login" class="h-6 w-6 rounded-full border border-border object-cover" />
                  <span class="text-sm font-medium text-foreground">{{ user.login }}</span>
                </button>
              </li>
            </ul>
            <div v-else class="px-3 py-2 text-xs text-muted-foreground">输入用户名或邮箱后显示候选结果</div>
          </div>
          <div v-if="inviteError" class="text-xs text-destructive">{{ inviteError }}</div>
          <div v-else-if="inviteSuccess" class="text-xs text-emerald-600 dark:text-emerald-400">{{ inviteSuccess }}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="inviteSubmitting" @click="inviteDialogOpen = false">取消</Button>
          <Button :disabled="inviteSubmitting" @click="submitInvite">
            {{ inviteSubmitting ? '邀请中...' : '发送邀请' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhBuildings as Buildings,
  PhCalendarBlank as CalendarBlank,
  PhCaretDown as CaretDown,
  PhCheckCircle as CheckCircle,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhFolderNotchOpen as RepoIcon,
  PhGearSix as GearSix,
  PhGlobeHemisphereWest as GlobeHemisphereWest,
  PhHash as Hash,
  PhInfo as Info,
  PhGitBranch as GitBranch,
  PhLinkSimple as LinkSimple,
  PhList as List,
  PhMapPin as MapPin,
  PhPackage as Package,
  PhEnvelopeSimple as EnvelopeSimple,
  PhSignOut as SignOut,
  PhTwitterLogo as TwitterLogo,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle,
  PhUserPlus as UserPlus,
  PhUsers as Users,
  PhX as X
} from '@phosphor-icons/vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import CcPrReviewWorkbench from '@/components/CcPrReviewWorkbench.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CcTokenGate from '@/cc/CcTokenGate.vue'
import { CC_THEMES, useCcTheme } from '@/composables/useCcTheme'
import { useCcSettings } from '@/composables/useCcSettings'
import { useCcSession } from '@/composables/useCcSession'
import { useCcWorkspace } from '@/composables/useCcWorkspace'
import { useTheme } from '@/composables/useTheme'
import {
  getAuthenticatedProfile,
  inviteRepositoryCollaborator,
  listRepositoryCollaborators,
  searchGitHubUsers,
  type GitHubAuthenticatedProfile,
  type GitHubUserSearchResult,
  type RepositoryCollaborator,
  type RepositoryCollaboratorPermission
} from '@/utils/githubGitApi'
import { loadOwnedResources, type OwnedResourceEntry } from '@/utils/resourcePublishApi'
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
const { themeMode, isFollowingSystem, setThemeMode, setFollowSystem } = useTheme()
const { activeCcTheme } = useCcTheme()
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
const showMobileNavSheet = ref(false)
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
const repositoriesLoading = ref(false)
const repositoriesError = ref('')
const repositoriesList = ref<Array<{
  fullName: string
  owner: string
  name: string
  htmlUrl: string
  defaultBranch: string
  latestCommitDate: string
  sources: string[]
  restypes: string[]
  resourceNames: string[]
  collaborators: RepositoryCollaborator[]
}>>([])
const inviteDialogOpen = ref(false)
const inviteSubmitting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')
const inviteSearchLoading = ref(false)
const inviteSearchError = ref('')
const inviteSearchResults = ref<GitHubUserSearchResult[]>([])
const inviteTargetRepo = ref<{ owner: string; name: string } | null>(null)
const inviteForm = ref<{
  username: string
  permission: RepositoryCollaboratorPermission
}>({
  username: '',
  permission: 'admin'
})
const settingsSection = ref<CcSettingsSection>('defaults')
const aboutCommitLoading = ref(false)
const aboutCommitLoadingMore = ref(false)
const aboutCommitError = ref('')
const aboutCommitHasMore = ref(true)
const aboutCommitPage = ref(1)
const aboutCommitShowLoadMore = ref(false)
const aboutCommitScrollRef = ref<HTMLElement | null>(null)
const ABOUT_COMMIT_PAGE_SIZE = 20
const aboutCommits = ref<Array<{ sha: string; shortSha: string; message: string; author: string; dateUtc8: string; url: string }>>([])
const routeProgress = ref(0)
const routeProgressVisible = ref(false)
let routeProgressTimer: ReturnType<typeof setInterval> | null = null
let inviteSearchTimer: ReturnType<typeof setTimeout> | null = null
let inviteSearchRequestId = 0
const pendingLoginRoute = ref<CcRouteState | null>(null)
const pendingLoginUser = ref('')
const publishedResourceDetailKey = ref('')
const pullRequestRouteNumber = ref(0)
const pullRequestRouteTargetRepo = ref('')
const workbenchMode = computed<'publish' | 'review' | 'published'>(() =>
  tab.value === 'settings' || tab.value === 'review' || tab.value === 'resource_edit' || tab.value === 'repositories'
    ? 'publish'
    : tab.value === 'pullrequest'
      ? 'review'
      : tab.value
)

const profileUrl = computed(() =>
  currentUser.value ? `https://github.com/${currentUser.value}` : 'https://github.com'
)
const settingsOwnerAvatarUrl = computed(() => {
  const owner = settingsForm.value.defaultTargetOwner.trim()
  if (!owner) return 'https://github.com/ghost.png'
  return `https://github.com/${owner}.png`
})
const manualThemeMode = computed<'light' | 'dark'>({
  get: () => (themeMode.value === 'dark' ? 'dark' : 'light'),
  set: (next) => setThemeMode(next)
})
const handleFollowSystemChange = (checked: boolean): void => {
  setFollowSystem(Boolean(checked))
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

const loadAboutCommits = async (options: { append?: boolean } = {}): Promise<void> => {
  const { append = false } = options
  const loadingRef = append ? aboutCommitLoadingMore : aboutCommitLoading
  if (loadingRef.value) return
  if (append && !aboutCommitHasMore.value) return
  try {
    loadingRef.value = true
    if (!append) {
      aboutCommitError.value = ''
      aboutCommitHasMore.value = true
      aboutCommitPage.value = 1
      aboutCommitShowLoadMore.value = false
      aboutCommits.value = []
    }
    const branch = (__BUILD_BRANCH__ || '').trim()
    const commitRef = (__BUILD_COMMIT_REF__ || '').trim()
    const endpoint = new URL('https://api.github.com/repos/CheongSzesuen/AstroBooox/commits')
    endpoint.searchParams.set('per_page', String(ABOUT_COMMIT_PAGE_SIZE))
    endpoint.searchParams.set('page', String(aboutCommitPage.value))
    if (branch && branch.toLowerCase() !== 'head' && branch.toLowerCase() !== 'unknown') {
      endpoint.searchParams.set('sha', branch)
    } else if (commitRef && commitRef.toLowerCase() !== 'local') {
      endpoint.searchParams.set('sha', commitRef)
    }
    const authToken = token.value.trim()
    const response = await fetch(endpoint.toString(), {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    })
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(authToken ? '请求被 GitHub 限流，请稍后重试' : '请求被 GitHub 限流，请先登录 Token 后重试')
      }
      throw new Error(`请求失败（${response.status}）`)
    }
    const payload = await response.json() as Array<{
      sha?: string
      html_url?: string
      commit?: {
        message?: string
        author?: { name?: string; date?: string }
      }
    }>
    const next = payload.map(item => {
      const sha = item.sha || ''
      const messageRaw = item.commit?.message || ''
      const firstLine = messageRaw.split('\n')[0]?.trim() || '(no message)'
      return {
        sha,
        shortSha: sha.slice(0, 12),
        message: firstLine,
        author: item.commit?.author?.name || '-',
        dateUtc8: formatUtc8DateTime(item.commit?.author?.date),
        url: item.html_url || `https://github.com/CheongSzesuen/AstroBooox/commit/${sha}`
      }
    })
    aboutCommits.value = append ? [...aboutCommits.value, ...next] : next
    aboutCommitPage.value += 1
    aboutCommitHasMore.value = payload.length >= ABOUT_COMMIT_PAGE_SIZE
    if (append) {
      aboutCommitShowLoadMore.value = false
    }
  } catch (error: unknown) {
    if (!append) {
      aboutCommits.value = []
    }
    aboutCommitError.value = error instanceof Error ? error.message : '加载提交记录失败'
  } finally {
    loadingRef.value = false
  }
}

const handleAboutCommitScroll = (): void => {
  const el = aboutCommitScrollRef.value
  if (!el) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  aboutCommitShowLoadMore.value = remain <= 140 && aboutCommitHasMore.value
}

const loadMoreAboutCommits = (): void => {
  if (!aboutCommitHasMore.value || aboutCommitLoadingMore.value || aboutCommitLoading.value) return
  void loadAboutCommits({ append: true })
}

const aboutInfoEntries = computed<Array<{ label: string; value: string; icon: Component }>>(() => {
  return [
    { label: '应用名称', value: __APP_NAME__ || 'AstroBooox', icon: Package as Component },
    { label: '应用版本（package.json）', value: __APP_VERSION__ || '-', icon: Hash as Component },
    { label: '构建版本', value: __BUILD_VERSION__ || '-', icon: GearSix as Component },
    { label: '当前构建分支', value: __BUILD_BRANCH__ || '-', icon: GitBranch as Component },
    { label: '构建时间（UTC+8）', value: __BUILD_TIME_UTC8__ ? `${__BUILD_TIME_UTC8__} (UTC+8)` : '-', icon: CalendarBlank as Component },
    { label: 'Environment', value: String(import.meta.env.MODE || 'unknown'), icon: GlobeHemisphereWest as Component }
  ]
})
const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const formatRestypeLabel = (value: string): string => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'quickapp') return '快应用'
  if (normalized === 'watchface') return '表盘'
  return value || '-'
}

const formatRestypeLabels = (values: string[]): string => {
  const labels = values.map(item => formatRestypeLabel(item)).filter(Boolean)
  return labels.length ? labels.join('、') : '-'
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

const resolveRouteFromLocation = (): CcRouteState => {
  if (typeof window === 'undefined') return CC_DEFAULT_ROUTE
  const searchParams = new URLSearchParams(window.location.search)
  const redirectedPath = sanitizeCcRedirectPath(searchParams.get('cc_path'))
  const route = redirectedPath && redirectedPath.startsWith('/cc')
    ? resolveCcRouteFromPath(redirectedPath)
    : resolveCcRouteFromPath(window.location.pathname)
  const routeTargetRepo = (searchParams.get('target_repo') || '').trim().toLowerCase()
  if (route.tab === 'pullrequest' && route.pullRequestNumber && route.pullRequestNumber > 0) {
    route.pullRequestTargetRepo = routeTargetRepo
  }
  if (route.tab === 'resource_edit') {
    route.editResourceId = (searchParams.get('edit_resource') || '').trim()
    route.editTargetRepo = (searchParams.get('edit_target_repo') || '').trim().toLowerCase()
    route.editUser = (searchParams.get('edit_user') || '').trim().toLowerCase()
  }
  const expected = (
    searchParams.get('gh_user') ||
    searchParams.get('cc_user') ||
    ''
  ).trim().toLowerCase()
  const current = currentUser.value.trim().toLowerCase()
  if (expected && current && expected !== current) {
    return {
      ...CC_DEFAULT_ROUTE,
      resourceDetailKey: '',
      requireGhUser: false
    }
  }
  return route
}

const resolveExpectedUserFromLocation = (): string => {
  if (typeof window === 'undefined') return ''
  const searchParams = new URLSearchParams(window.location.search)
  return (
    searchParams.get('cc_user') ||
    searchParams.get('gh_user') ||
    ''
  ).trim().toLowerCase()
}

const buildCcUrlWithUser = (path: string, state: CcRouteState): string => {
  const normalizedPath = path || CC_PATHS.root
  const params = new URLSearchParams()
  const isPullRequestDetail = state.tab === 'pullrequest' && (state.pullRequestNumber || 0) > 0
  if (state.requireGhUser && !isPullRequestDetail) {
    const login = currentUser.value.trim()
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
  publishedResourceDetailKey.value = state.tab === 'published' ? (state.resourceDetailKey || '') : ''
  pullRequestRouteNumber.value = state.tab === 'pullrequest' ? Number(state.pullRequestNumber || 0) : 0
  pullRequestRouteTargetRepo.value = state.tab === 'pullrequest' ? (state.pullRequestTargetRepo || '') : ''

  if (options?.syncUrl !== false && typeof window !== 'undefined') {
    const targetPath = buildCcPath(state)
    const targetUrl = buildCcUrlWithUser(targetPath, state)
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (currentUrl !== targetUrl) {
      const method = options?.replace ? 'replaceState' : 'pushState'
      window.history[method](null, '', targetUrl)
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
    settingsSection: nextTab === 'settings' ? settingsSection.value : 'defaults',
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

const navigateToTabFromMobile = (nextTab: CcTab): void => {
  showMobileNavSheet.value = false
  navigateToTab(nextTab)
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
  showMobileNavSheet.value = false
  closeUserMenu()
  openSettingsSection('defaults')
}

const openRepositoriesPage = (): void => {
  showMobileNavSheet.value = false
  closeUserMenu()
  navigateToTab('repositories')
}

const openInviteDialog = (repo: { owner: string; name: string }): void => {
  inviteTargetRepo.value = { owner: repo.owner, name: repo.name }
  inviteForm.value = {
    username: '',
    permission: 'admin'
  }
  inviteError.value = ''
  inviteSuccess.value = ''
  inviteSearchError.value = ''
  inviteSearchResults.value = []
  inviteDialogOpen.value = true
}

const handleInviteDialogOpenChange = (open: boolean): void => {
  inviteDialogOpen.value = open
  if (!open) {
    inviteSubmitting.value = false
    inviteError.value = ''
    inviteSuccess.value = ''
    inviteSearchLoading.value = false
    inviteSearchError.value = ''
    inviteSearchResults.value = []
    if (inviteSearchTimer) {
      clearTimeout(inviteSearchTimer)
      inviteSearchTimer = null
    }
  }
}

const normalizeInviteQuery = (value: string): string => {
  const raw = value.trim().replace(/^@+/, '')
  if (!raw) return ''
  if (raw.includes('://github.com/')) {
    const matched = raw.match(/github\.com\/([^/?#]+)/i)
    return (matched?.[1] || '').trim()
  }
  if (raw.includes('@')) {
    const local = raw.split('@')[0]?.trim() || ''
    return local || raw
  }
  return raw
}

const searchInviteCandidates = async (keyword: string): Promise<void> => {
  const normalizedToken = token.value.trim()
  const normalized = normalizeInviteQuery(keyword)
  if (!inviteDialogOpen.value || !normalizedToken || !normalized) {
    inviteSearchLoading.value = false
    inviteSearchError.value = ''
    inviteSearchResults.value = []
    return
  }
  const requestId = ++inviteSearchRequestId
  try {
    inviteSearchLoading.value = true
    inviteSearchError.value = ''
    const results = await searchGitHubUsers({
      token: normalizedToken,
      query: normalized,
      perPage: 8
    })
    if (requestId !== inviteSearchRequestId) return
    inviteSearchResults.value = results
  } catch (error: unknown) {
    if (requestId !== inviteSearchRequestId) return
    inviteSearchResults.value = []
    inviteSearchError.value = error instanceof Error ? error.message : '搜索用户失败'
  } finally {
    if (requestId === inviteSearchRequestId) {
      inviteSearchLoading.value = false
    }
  }
}

const selectInviteCandidate = (user: GitHubUserSearchResult): void => {
  inviteForm.value.username = user.login
  inviteError.value = ''
  inviteSearchError.value = ''
  inviteSearchResults.value = []
  if (inviteSearchTimer) {
    clearTimeout(inviteSearchTimer)
    inviteSearchTimer = null
  }
}

const submitInvite = async (): Promise<void> => {
  if (inviteSubmitting.value) return
  const targetRepo = inviteTargetRepo.value
  if (!targetRepo) {
    inviteError.value = '未找到目标仓库'
    return
  }
  const resolvedToken = token.value.trim()
  if (!resolvedToken) {
    inviteError.value = '请先登录 GitHub Token'
    return
  }
  const username = normalizeInviteQuery(inviteForm.value.username)
  if (!username) {
    inviteError.value = '请先填写协作者用户名'
    return
  }
  try {
    inviteSubmitting.value = true
    inviteError.value = ''
    inviteSuccess.value = ''
    const result = await inviteRepositoryCollaborator({
      token: resolvedToken,
      owner: targetRepo.owner,
      repo: targetRepo.name,
      username,
      permission: inviteForm.value.permission
    })
    if (result.status === 204) {
      inviteSuccess.value = `@${username} 已经是协作者`
      await refreshRepositoryCollaborators(targetRepo.owner, targetRepo.name)
      return
    }
    inviteSuccess.value = result.invitationUrl
      ? `邀请已发送：${result.invitationUrl}`
      : `已向 @${username} 发送邀请`
    await refreshRepositoryCollaborators(targetRepo.owner, targetRepo.name)
  } catch (error: unknown) {
    inviteError.value = error instanceof Error ? error.message : '邀请失败'
  } finally {
    inviteSubmitting.value = false
  }
}

const refreshRepositoryCollaborators = async (owner: string, repoName: string): Promise<void> => {
  const resolvedToken = token.value.trim()
  if (!resolvedToken) return
  try {
    const list = await listRepositoryCollaborators({
      token: resolvedToken,
      owner,
      repo: repoName
    })
    const ownerLower = owner.toLowerCase()
    const filtered = list.filter(item => item.login.toLowerCase() !== ownerLower)
    repositoriesList.value = repositoriesList.value.map(item => {
      if (item.owner === owner && item.name === repoName) {
        return { ...item, collaborators: filtered }
      }
      return item
    })
  } catch {
    // 协作者信息仅用于展示，不阻塞主流程
  }
}

const saveSettings = (): void => {
  saveDefaults({
    defaultTargetOwner: defaultTargetOwner.value,
    defaultTargetRepo: settingsForm.value.defaultTargetRepo,
    defaultCatalogPath: settingsForm.value.defaultCatalogPath,
    ownedDisplayPriority: settingsForm.value.ownedDisplayPriority,
    showV2FollowUpTag: settingsForm.value.showV2FollowUpTag === 'on',
    customDisplayName: settingsForm.value.customDisplayName,
    customAvatarUrl: settingsForm.value.customAvatarUrl
  })
}

const loadRepositories = async (): Promise<void> => {
  try {
    repositoriesLoading.value = true
    repositoriesError.value = ''
    repositoriesList.value = []

    const username = currentUser.value.trim()
    if (!username) {
      throw new Error('请先校验 Token')
    }

    const items: OwnedResourceEntry[] = await loadOwnedResources({
      token: token.value.trim(),
      username,
      upstreamOwner: defaultTargetOwner.value.trim(),
      upstreamRepo: defaultTargetRepo.value.trim(),
      upstreamBranch: 'main',
      catalogPath: defaultCatalogPath.value.trim()
    })

    const grouped = new Map<string, {
      fullName: string
      owner: string
      name: string
      htmlUrl: string
      defaultBranch: string
      latestCommitDate: string
      sources: Set<string>
      restypes: Set<string>
      resourceNames: Set<string>
      collaborators: RepositoryCollaborator[]
    }>()

    for (const item of items) {
      const owner = item.repo_owner.trim()
      const repo = item.repo_name.trim()
      if (!owner || !repo) continue
      if (owner.toLowerCase() !== username.toLowerCase()) continue
      const key = `${owner.toLowerCase()}/${repo.toLowerCase()}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          fullName: `${owner}/${repo}`,
          owner,
          name: repo,
          htmlUrl: `https://github.com/${owner}/${repo}`,
          defaultBranch: item.repo_commit_hash?.trim() || 'main',
          latestCommitDate: item.commitDate || '',
          sources: new Set([item.source]),
          restypes: new Set([item.restype]),
          resourceNames: new Set(item.name ? [item.name] : []),
          collaborators: []
        })
        continue
      }
      if (item.source) existing.sources.add(item.source)
      if (item.restype) existing.restypes.add(item.restype)
      if (item.name) existing.resourceNames.add(item.name)
      if (item.commitDate && (!existing.latestCommitDate || item.commitDate > existing.latestCommitDate)) {
        existing.latestCommitDate = item.commitDate
        existing.defaultBranch = item.repo_commit_hash?.trim() || existing.defaultBranch
      }
    }

    repositoriesList.value = Array.from(grouped.values())
      .map(item => ({
        fullName: item.fullName,
        owner: item.owner,
        name: item.name,
        htmlUrl: item.htmlUrl,
        defaultBranch: item.defaultBranch,
        latestCommitDate: item.latestCommitDate,
        sources: Array.from(item.sources).sort((a, b) => a.localeCompare(b, 'zh-CN')),
        restypes: Array.from(item.restypes).sort((a, b) => a.localeCompare(b, 'zh-CN')),
        resourceNames: Array.from(item.resourceNames).sort((a, b) => a.localeCompare(b, 'zh-CN')),
        collaborators: item.collaborators
      }))
      .sort((a, b) => (b.latestCommitDate || '').localeCompare(a.latestCommitDate || ''))

    const resolvedToken = token.value.trim()
    if (!resolvedToken || repositoriesList.value.length === 0) {
      return
    }

    const collaboratorEntries = await Promise.all(
      repositoriesList.value.map(async repo => {
        try {
          const list = await listRepositoryCollaborators({
            token: resolvedToken,
            owner: repo.owner,
            repo: repo.name
          })
          return {
            fullName: repo.fullName,
            collaborators: list.filter(item => item.login.toLowerCase() !== repo.owner.toLowerCase())
          }
        } catch {
          return {
            fullName: repo.fullName,
            collaborators: [] as RepositoryCollaborator[]
          }
        }
      })
    )
    const collaboratorMap = new Map(collaboratorEntries.map(item => [item.fullName, item.collaborators]))
    repositoriesList.value = repositoriesList.value.map(repo => ({
      ...repo,
      collaborators: collaboratorMap.get(repo.fullName) || []
    }))
  } catch (error: unknown) {
    repositoriesError.value = error instanceof Error ? error.message : '加载仓库失败'
  } finally {
    repositoriesLoading.value = false
  }
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
  applyRouteState(resolveRouteFromLocation(), {
    syncUrl: false,
    withProgress: true
  })
}

const handleAuthenticated = (): void => {
  const expected = pendingLoginUser.value
  const current = currentUser.value.trim().toLowerCase()
  const target = pendingLoginRoute.value
  pendingLoginRoute.value = null
  pendingLoginUser.value = ''
  if (target && (!expected || expected === current)) {
    applyRouteState(target, { replace: true, withProgress: false })
    return
  }
  applyRouteState(CC_DEFAULT_ROUTE, { replace: true, withProgress: false })
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
      const routeFromLocation = resolveRouteFromLocation()
      const targetPath = buildCcPath(routeFromLocation)
      const expected = resolveExpectedUserFromLocation()
      pendingLoginRoute.value = routeFromLocation
      pendingLoginUser.value = expected
      window.history.replaceState(null, '', buildLoginUrl(targetPath, expected))
    } else {
      pendingLoginRoute.value = resolveRouteFromLocation()
      pendingLoginUser.value = resolveExpectedUserFromLocation()
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
        const routeFromLocation = resolveRouteFromLocation()
        const targetPath = buildCcPath(routeFromLocation)
        const expected = resolveExpectedUserFromLocation() || currentUser.value.trim().toLowerCase()
        pendingLoginRoute.value = routeFromLocation
        pendingLoginUser.value = expected
        window.history.replaceState(null, '', buildLoginUrl(targetPath, expected))
      }
      return
    }
    if (isCcLoginPath(window.location.pathname)) {
      handleAuthenticated()
    }
  }
)

watch(
  () => [tab.value, settingsSection.value, token.value] as const,
  ([currentTab, currentSection]) => {
    if (currentTab === 'repositories') {
      void loadRepositories()
      return
    }
    if (currentTab === 'settings' && currentSection === 'account') {
      void loadAccountProfile()
      return
    }
    if (currentTab === 'settings' && currentSection === 'about') {
      void loadAboutCommits()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (inviteSearchTimer) {
    clearTimeout(inviteSearchTimer)
    inviteSearchTimer = null
  }
  if (routeProgressTimer) {
    clearInterval(routeProgressTimer)
    routeProgressTimer = null
  }
  window.removeEventListener('popstate', handlePopState)
  document.removeEventListener('mousedown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleEscapeKey)
})

watch(
  () => [inviteDialogOpen.value, inviteForm.value.username, token.value] as const,
  ([open, keyword]) => {
    if (!open) return
    if (inviteSearchTimer) {
      clearTimeout(inviteSearchTimer)
      inviteSearchTimer = null
    }
    inviteSearchTimer = setTimeout(() => {
      void searchInviteCandidates(keyword)
    }, 220)
  }
)
</script>
