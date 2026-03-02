<template>
  <div class="w-full py-1 md:py-2">
    <div class="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row">
      <aside :class="sidebarClass">
        <div
          class="mb-2 hidden items-center border-b border-border pb-2 lg:flex"
          :class="isSidebarCollapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2'"
        >
          <div v-if="!isSidebarCollapsed" class="min-w-0">
            <p class="truncate text-xs font-semibold text-foreground">Pull Requests</p>
          </div>
          <div class="flex items-center gap-1.5" :class="isSidebarCollapsed ? 'flex-col gap-2' : ''">
            <Button
              v-if="!isSidebarCollapsed"
              :disabled="loading || !canLoad"
              size="sm"
              variant="outline"
              @click="loadPullRequests"
            >
              <ArrowsClockwise :size="14" weight="duotone" />
              <span>{{ loading ? '加载中' : '刷新' }}</span>
            </Button>
            <button
              type="button"
              :title="isSidebarCollapsed ? '展开边栏' : '收起边栏'"
              class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              :class="isSidebarCollapsed ? 'w-8' : 'w-[72px] gap-1.5 px-2'"
              aria-label="折叠或展开边栏"
              @click="isSidebarCollapsed = !isSidebarCollapsed"
            >
              <span v-if="!isSidebarCollapsed" class="shrink-0 whitespace-nowrap text-xs">收起</span>
              <CaretDoubleRight
                :size="16"
                weight="bold"
                :class="['transition-transform duration-200', isSidebarCollapsed ? 'rotate-180' : 'rotate-0']"
              />
            </button>
          </div>
        </div>

        <div
          v-if="errorMessage"
          class="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="pullRequests.length === 0 && !loading && !errorMessage"
          class="flex flex-1 items-center justify-center rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground"
        >
          暂无可审核 PR
        </div>

        <div v-else class="flex-1 space-y-2 overflow-y-auto pr-1 max-[1023px]:max-h-[20rem]">
          <button
            v-for="item in pullRequests"
            :key="item.number"
            type="button"
            class="group flex items-center rounded-lg border text-left transition-colors"
            :class="
              selectedPr?.number === item.number
                ? isSidebarCollapsed
                  ? 'mx-auto h-12 w-12 justify-center p-0.5 border-border bg-muted shadow-sm'
                  : 'w-full gap-2.5 px-2.5 py-2 border-border bg-muted shadow-sm'
                : isSidebarCollapsed
                  ? 'mx-auto h-12 w-12 justify-center p-0.5 border-transparent hover:bg-accent'
                  : 'w-full gap-2.5 px-2.5 py-2 border-transparent hover:bg-accent'
            "
            @click="selectPr(item)"
          >
            <img
              :src="getOptimizedAvatarUrl(item.author, item.authorAvatar)"
              :class="isSidebarCollapsed ? 'h-10 w-10 rounded-md' : 'h-8 w-8 rounded-md'"
              class="shrink-0 object-cover object-center"
              loading="lazy"
              @load="cacheAvatar(item.author, item.authorAvatar)"
            />

            <div v-if="!isSidebarCollapsed" class="min-w-0 flex-1">
              <div class="line-clamp-2 text-sm font-semibold text-foreground">#{{ item.number }} {{ item.title }}</div>
              <div class="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{{ item.author }}</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <div class="min-w-0 flex-1 space-y-4">
        <Card v-if="!selectedPr">
          <CardContent class="pt-6 text-center text-sm text-muted-foreground">
            请先从左侧选择一个 PR
          </CardContent>
        </Card>

        <template v-else>
          <header class="rounded-xl border border-border bg-card p-5 md:p-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 space-y-3">
                <div class="flex flex-wrap items-end gap-x-2 gap-y-1">
                  <h1 class="min-w-0 break-words text-xl font-semibold leading-tight text-foreground md:text-2xl">
                    {{ selectedPr.title }}
                  </h1>
                  <span class="text-sm font-medium text-muted-foreground md:text-base">#{{ selectedPr.number }}</span>
                </div>

                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Badge variant="secondary" class="h-6 gap-1.5 rounded-full px-2.5 text-xs">
                    <GitPullRequest :size="14" weight="duotone" class="shrink-0" />
                    Open
                  </Badge>
                  <span class="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <img
                      :src="getOptimizedAvatarUrl(selectedPr.author, selectedPr.authorAvatar)"
                      class="h-6 w-6 shrink-0 rounded-full object-cover"
                      loading="lazy"
                      @load="cacheAvatar(selectedPr.author, selectedPr.authorAvatar)"
                    />
                    <span class="truncate font-medium text-foreground">{{ selectedPr.author }}</span>
                    <span class="shrink-0">opened {{ formatDate(selectedPr.createdAt) }}</span>
                  </span>
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-2 md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  class="h-9 gap-1.5 px-3"
                  :disabled="detailsLoading"
                  @click="refreshSelectedPrDetails"
                >
                  <ArrowsClockwise :size="16" weight="bold" />
                  刷新
                </Button>
                <Button
                  as="a"
                  :href="selectedPr.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="sm"
                  class="h-9 gap-1.5 px-3"
                >
                  <GithubLogo :size="16" weight="duotone" />
                  GitHub
                </Button>
              </div>
            </div>
          </header>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">审核评论</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 pt-0">
              <div v-if="detailsError" class="text-xs text-destructive">{{ detailsError }}</div>
              <div v-if="repoFilesError" class="text-xs text-destructive">{{ repoFilesError }}</div>

              <div class="space-y-2">
                <div class="flex items-start gap-3">
                  <img
                    v-if="selectedPr?.authorAvatar"
                    :src="getOptimizedAvatarUrl(selectedPr.author, selectedPr.authorAvatar)"
                    class="h-8 w-8 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    @load="cacheAvatar(selectedPr.author, selectedPr.authorAvatar)"
                  />
                  <div class="min-w-0 flex-1 overflow-hidden rounded-md border border-border">
                    <Tabs v-model="commentEditorTab">
                      <div class="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                        <TabsList class="inline-flex h-8 rounded-none border-0 bg-transparent p-0">
                          <TabsTrigger value="edit">Write</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <Button size="sm" variant="outline" class="h-8 gap-1.5 px-2.5 text-xs" @click="openFilePicker">
                          <LinkSimple :size="14" weight="bold" />
                          插入文件定位
                        </Button>
                      </div>
                      <div class="px-3 py-3">
                        <TabsContent value="edit" class="mt-0">
                          <div class="grid gap-2">
                            <div class="flex items-center rounded-md border border-input bg-background">
                              <span class="shrink-0 border-r border-border px-3 text-xs text-muted-foreground">[ABCC_NEEDFIX_</span>
                              <Input
                                v-model="commentId"
                                class="border-0 shadow-none focus-visible:ring-0"
                                placeholder="自定义 ID，例如 icon_png_check"
                              />
                              <span class="shrink-0 px-3 text-xs text-muted-foreground">]</span>
                            </div>
                            <Textarea
                              id="review-comment-message"
                              ref="commentMessageTextareaRef"
                              v-model="commentMessage"
                              placeholder="评论说明（文件引用请用上方按钮插入）"
                              class="min-h-[150px]"
                              @click="syncCommentCursor"
                              @keyup="syncCommentCursor"
                              @select="syncCommentCursor"
                            />
                          </div>
                        </TabsContent>
                        <TabsContent value="preview" class="mt-0">
                          <div
                            class="whitespace-pre-wrap break-words text-sm leading-6 text-foreground"
                            v-html="renderedCommentPreviewHtml"
                          />
                        </TabsContent>
                      </div>
                    </Tabs>
                    <div class="flex items-center justify-end border-t border-border bg-muted/20 px-3 py-2">
                      <span :title="submitButtonTitle" class="inline-flex">
                        <Button
                          size="sm"
                          :disabled="!canSubmitComment || commentSubmitting"
                          @click="submitPresetComment"
                        >
                          {{ commentSubmitting ? '发送中...' : '发送评论' }}
                        </Button>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="pt-1 text-xs font-medium text-muted-foreground">最近评论</div>
                <div
                  v-if="prComments.length === 0"
                  class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
                >
                  当前 PR 暂无评论
                </div>
                <div
                  v-for="comment in prComments"
                  :key="comment.id"
                  class="flex items-start gap-3"
                >
                  <img
                    v-if="comment.user?.avatar_url && comment.user?.login"
                    :src="getOptimizedAvatarUrl(comment.user.login, comment.user.avatar_url)"
                    class="h-8 w-8 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    @load="cacheAvatar(comment.user.login, comment.user.avatar_url)"
                  />
                  <div class="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm">
                    <div class="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
                      <span class="inline-flex min-w-0 items-center gap-2">
                        <span class="truncate font-medium text-foreground">{{ comment.user?.login || 'unknown' }}</span>
                        <span class="shrink-0">{{ formatCommentRelativeTime(comment.created_at) }}</span>
                      </span>
                      <a :href="comment.html_url" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                        打开评论
                      </a>
                    </div>
                    <div class="pt-1 whitespace-pre-wrap break-words text-foreground">{{ comment.body }}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog :open="filePickerOpen" @update:open="filePickerOpen = $event">
            <DialogContent class="h-[88vh] w-[96vw] max-w-[1360px] overflow-hidden p-0">
              <div class="flex h-full flex-col overflow-hidden">
                <DialogHeader class="shrink-0 border-b border-border px-5 py-4">
                  <DialogTitle>插入文件定位</DialogTitle>
                  <DialogDescription>
                    {{ filePickerStep === 'file' ? '第一步：先选择文件。' : '第二步：选择具体行并插入定位。' }}
                  </DialogDescription>
                </DialogHeader>

                <div v-if="filePickerStep === 'file'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div class="shrink-0 border-b border-border px-4 py-3">
                    <div class="flex items-center justify-between gap-2">
                      <Tabs :model-value="filePickerTab" @update:model-value="(v) => filePickerTab = v as 'pr' | 'repo'">
                        <TabsList class="grid w-[260px] grid-cols-2">
                          <TabsTrigger value="pr">PR 文件</TabsTrigger>
                          <TabsTrigger value="repo">作者仓库文件</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <div class="text-xs text-muted-foreground">
                        {{
                          filePickerTab === 'pr'
                            ? '来源：当前 PR 变更文件'
                            : `来源：${selectedPr?.resourceRepoOwner || '-'} / ${selectedPr?.resourceRepoName || '-'}`
                        }}
                      </div>
                    </div>
                    <div class="mt-3">
                      <Input v-model="filePickerSearch" placeholder="筛选文件..." class="h-8 text-xs" />
                    </div>
                  </div>
                  <div class="min-h-0 flex-1 overflow-auto overscroll-contain p-3">
                    <div
                      v-for="item in pickerTreeItems"
                      :key="`tree-${filePickerTab}-${item.type}-${item.path}`"
                      class="mb-1"
                      :style="{ paddingLeft: `${0.5 + Math.min(item.depth, 8) * 0.7}rem` }"
                    >
                      <button
                        v-if="item.type === 'folder'"
                        type="button"
                        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
                        @click="togglePickerFolder(item.path)"
                      >
                        <component
                          :is="isPickerFolderOpen(item.path) ? CaretDown : CaretRight"
                          :size="13"
                          weight="bold"
                          class="shrink-0 text-muted-foreground"
                        />
                        <FolderIcon :size="14" weight="fill" class="shrink-0 text-muted-foreground" />
                        <span class="truncate">{{ item.label }}</span>
                      </button>
                      <button
                        v-else
                        type="button"
                        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition"
                        :class="selectedPickerPath === item.path ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
                        @click="selectPickerPath(item.path)"
                      >
                        <FileIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                        <span class="truncate">{{ item.label }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="shrink-0 border-t border-border bg-background px-4 py-3">
                    <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0 truncate text-xs text-muted-foreground">
                      {{ selectedPickerPath ? `已选择：${selectedPickerPath}` : '请选择文件后继续' }}
                    </div>
                    <div class="flex items-center gap-2">
                      <Button size="sm" variant="outline" :disabled="!selectedPickerPath" @click="insertSelectedFileReference">
                        直接插入文件
                      </Button>
                      <Button
                        v-if="canPickLine"
                        size="sm"
                        :disabled="!selectedPickerPath"
                        @click="enterPickerLineStep"
                      >
                        下一步：选择具体行
                      </Button>
                    </div>
                    </div>
                  </div>
                </div>

                <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div class="shrink-0 border-b border-border px-4 py-3">
                    <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0 text-xs text-muted-foreground">
                      <span class="inline-flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" class="h-7 w-7 p-0" @click="backToPickerFileStep">
                          <ArrowLeft :size="14" weight="bold" />
                        </Button>
                        <FileIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                        <span class="truncate">{{ selectedPickerPath || '未选择文件' }}</span>
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button size="sm" variant="outline" :disabled="!selectedPickerPath" @click="insertSelectedFileReference">
                        不选行，插入文件
                      </Button>
                      <Button
                        v-if="canPickLine"
                        size="sm"
                        :disabled="!selectedPickerPath || !selectedPickerLine"
                        @click="insertSelectedLineReference"
                      >
                        插入行定位
                      </Button>
                    </div>
                    </div>
                  </div>
                  <div class="shrink-0 space-y-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur">
                    <div class="flex items-center gap-2">
                      <Button size="sm" variant="outline" class="h-8 w-8 p-0" @click="runPickerLineSearch">
                        <MagnifyingGlass :size="14" weight="bold" />
                      </Button>
                      <Input v-model="pickerLineSearch" placeholder="搜索当前文件内容..." class="h-8 min-w-0 flex-1 text-xs" />
                    </div>
                    <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{{ pickerMatchedLineNumbers.length }} 个匹配</span>
                      <div class="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          class="h-8 w-8 p-0"
                          :disabled="pickerMatchedLineNumbers.length === 0"
                          @click="gotoPrevPickerMatch"
                        >
                          <ArrowUp :size="14" weight="bold" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          class="h-8 w-8 p-0"
                          :disabled="pickerMatchedLineNumbers.length === 0"
                          @click="gotoNextPickerMatch"
                        >
                          <ArrowDown :size="14" weight="bold" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div class="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/20 p-4">
                    <div v-if="pickerLoading" class="text-xs text-muted-foreground">加载文件内容中...</div>
                    <div v-else-if="pickerError" class="text-xs text-destructive">{{ pickerError }}</div>
                    <div v-else-if="!selectedPickerPath" class="text-xs text-muted-foreground">请先返回上一步选择文件</div>
                    <div v-else class="h-full font-mono text-xs leading-5">
                      <button
                        v-for="(line, index) in pickerContentLines"
                        :ref="el => setPickerLineRowRef(index + 1, el as Element | null)"
                        :key="`line-${index}`"
                        type="button"
                        class="flex w-full items-start gap-3 rounded px-2 py-0.5 text-left hover:bg-accent/60"
                        :class="[
                          selectedPickerLine === index + 1 ? 'bg-accent text-accent-foreground' : '',
                          isPickerLineMatched(index + 1) ? 'ring-1 ring-primary/40' : ''
                        ]"
                        @click="selectPickerLine(index + 1)"
                      >
                        <span class="w-10 shrink-0 text-right text-muted-foreground">{{ index + 1 }}</span>
                        <span class="whitespace-pre-wrap break-all">{{ line || ' ' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">资源提交信息</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 pt-0 text-sm">
              <div v-if="detailsLoading" class="text-xs text-muted-foreground">正在加载文件变更...</div>
              <div
                v-else-if="!hasSubmissionOverview"
                class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
              >
                未在 PR 内容中识别到结构化资源信息（请确认包含“## 资源信息”等区块）
              </div>
              <div v-else class="space-y-3">
                <div class="grid gap-3 xl:grid-cols-2">
                  <div class="rounded-md border border-border p-3">
                    <div class="mb-2 text-xs font-semibold text-muted-foreground">资源信息</div>
                    <div class="space-y-2">
                      <div
                        v-for="item in submissionOverview.resourceInfo"
                        :key="item.key"
                        class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between"
                      >
                        <span class="text-xs text-muted-foreground">{{ item.key }}</span>
                        <span
                          v-if="hasUrl(item.value)"
                          class="min-w-0 text-sm font-medium text-foreground"
                          v-html="renderTextWithLinks(item.value || '-')"
                        />
                        <span v-else class="text-sm font-medium text-foreground">{{ item.value || '-' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-md border border-border p-3">
                    <div class="mb-2 text-xs font-semibold text-muted-foreground">支持设备</div>
                    <div class="space-y-2">
                      <div
                        v-for="device in submissionOverview.supportedDevices"
                        :key="device"
                        class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground"
                      >
                        {{ device }}
                      </div>
                    </div>
                  </div>

                  <div class="rounded-md border border-border p-3">
                    <div class="mb-2 text-xs font-semibold text-muted-foreground">仓库信息</div>
                    <div class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span v-if="submissionOverview.repoUrl" class="inline-flex min-w-0 items-center gap-1.5">
                          <GithubLogo :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <a
                            :href="submissionOverview.repoUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="break-all text-primary hover:underline"
                          >
                            {{ submissionOverview.repoUrl }}
                          </a>
                        </span>
                        <span v-else class="text-foreground">-</span>
                        <code class="shrink-0 text-foreground">{{ submissionOverview.shortHash || '-' }}</code>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-md border border-border p-3">
                    <div class="mb-2 text-xs font-semibold text-muted-foreground">图片资源（Raw）</div>
                    <div class="space-y-2 text-sm">
                      <div v-if="submissionOverview.images.icon" class="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <div class="text-xs text-muted-foreground">Icon · {{ submissionOverview.images.icon.file }}</div>
                        <span class="inline-flex items-center gap-1.5">
                          <ImageIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <a :href="submissionOverview.images.icon.url" target="_blank" rel="noopener noreferrer" class="break-all text-primary hover:underline">
                            {{ submissionOverview.images.icon.url }}
                          </a>
                        </span>
                      </div>
                      <div v-if="submissionOverview.images.cover" class="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <div class="text-xs text-muted-foreground">Cover · {{ submissionOverview.images.cover.file }}</div>
                        <span class="inline-flex items-center gap-1.5">
                          <ImageIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <a :href="submissionOverview.images.cover.url" target="_blank" rel="noopener noreferrer" class="break-all text-primary hover:underline">
                            {{ submissionOverview.images.cover.url }}
                          </a>
                        </span>
                      </div>
                      <div
                        v-for="preview in submissionOverview.images.previews"
                        :key="`${preview.file}-${preview.url}`"
                        class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                      >
                        <div class="text-xs text-muted-foreground">Preview · {{ preview.file }}</div>
                        <span class="inline-flex items-center gap-1.5">
                          <ImageIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <a :href="preview.url" target="_blank" rel="noopener noreferrer" class="break-all text-primary hover:underline">
                            {{ preview.url }}
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 text-xs font-semibold text-muted-foreground">下载资源（downloads）</div>
                  <div class="space-y-2 text-sm">
                    <div
                      v-for="item in submissionOverview.downloads"
                      :key="`${item.device}-${item.file}`"
                      class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                    >
                      <div class="font-medium text-foreground">{{ item.device }}</div>
                      <div class="mt-1 text-xs text-muted-foreground">version: {{ item.version || '-' }}</div>
                      <div class="mt-1 text-xs text-muted-foreground">file: {{ item.file || '-' }}</div>
                      <span v-if="item.raw" class="mt-1 inline-flex items-center gap-1.5">
                        <DownloadIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                        <a
                          :href="item.raw"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="block break-all text-xs text-primary hover:underline"
                        >
                          {{ item.raw }}
                        </a>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 text-xs font-semibold text-muted-foreground">链接（manifest_v2.links）</div>
                  <div class="space-y-2 text-sm">
                    <div
                      v-for="link in submissionOverview.links"
                      :key="`${link.title}-${link.url}`"
                      class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                    >
                      <div class="text-foreground">
                        {{ link.title }}<span v-if="link.type">（{{ link.type }}）</span>
                      </div>
                      <span class="inline-flex items-center gap-1.5">
                        <component :is="getUrlIcon(link.url, link.type)" :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                        <a :href="link.url" target="_blank" rel="noopener noreferrer" class="break-all text-primary hover:underline">
                          {{ link.url }}
                        </a>
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  PhArrowLeft as ArrowLeft,
  PhArrowDown as ArrowDown,
  PhArrowUp as ArrowUp,
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretDown as CaretDown,
  PhCaretDoubleRight as CaretDoubleRight,
  PhCaretRight as CaretRight,
  PhFile as FileIcon,
  PhFolder as FolderIcon,
  PhGithubLogo as GithubLogo,
  PhAddressBook as AddressBookIcon,
  PhGlobeHemisphereWest as GlobeIcon,
  PhImageSquare as ImageIcon,
  PhDownloadSimple as DownloadIcon,
  PhGitPullRequest as GitPullRequest,
  PhLinkSimple as LinkSimple,
  PhMagnifyingGlass as MagnifyingGlass
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

type ReviewState = 'waiting_review' | 'changes_requested' | 'fixed_waiting'

interface NeedFixItem {
  id: string
  message: string
  fixed: boolean
}

interface ReviewStatusResult {
  state: ReviewState
  items: NeedFixItem[]
}

interface PullListItem {
  number: number
  title: string
  body: string
  author: string
  authorAvatar: string
  createdAt: string
  url: string
  headOwner: string
  headRepo: string
  headRef: string
  resourceRepoOwner: string
  resourceRepoName: string
  resourceRepoRef: string
  status: ReviewState
  review: ReviewStatusResult
}

interface IssueCommentItem {
  id: number
  body: string
  user?: { login?: string; avatar_url?: string; html_url?: string }
  created_at: string
  html_url: string
}

interface PullFileItem {
  sha: string
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  blob_url?: string
  raw_url?: string
  patch?: string
}

interface DownloadItem {
  device: string
  version: string
  file: string
  raw: string
}

interface LinkItem {
  title: string
  type: string
  url: string
}

interface SubmissionOverview {
  resourceInfo: Array<{ key: string; value: string }>
  supportedDevices: string[]
  repoUrl: string
  shortHash: string
  images: {
    icon: { file: string; url: string } | null
    cover: { file: string; url: string } | null
    previews: Array<{ file: string; url: string }>
  }
  downloads: DownloadItem[]
  links: LinkItem[]
}

interface PickerTreeItem {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

const props = withDefaults(defineProps<{
  owner: string
  repo: string
  token: string
}>(), {
  owner: 'AstralSightStudios',
  repo: 'AstroBox-Repo',
  token: ''
})

const loading = ref(false)
const errorMessage = ref('')
const pullRequests = ref<PullListItem[]>([])
const selectedPr = ref<PullListItem | null>(null)
const isSidebarCollapsed = ref(false)
const detailsLoading = ref(false)
const detailsError = ref('')
const prComments = ref<IssueCommentItem[]>([])
const prFiles = ref<PullFileItem[]>([])
const repoFiles = ref<string[]>([])
const repoFilesLoading = ref(false)
const repoFilesError = ref('')
const filePickerOpen = ref(false)
const filePickerStep = ref<'file' | 'line'>('file')
const filePickerTab = ref<'pr' | 'repo'>('pr')
const prPickerOpenFolders = ref<string[]>([])
const repoPickerOpenFolders = ref<string[]>([])
const filePickerSearch = ref('')
const selectedPickerPath = ref('')
const selectedPickerContent = ref('')
const selectedPickerLine = ref<number | null>(null)
const pickerLineSearch = ref('')
const pickerLoading = ref(false)
const pickerError = ref('')
const commentId = ref('')
const commentMessage = ref('')
const commentEditorTab = ref<'edit' | 'preview'>('edit')
const commentMessageTextareaRef = ref<unknown>(null)
const commentCursorStart = ref<number | null>(null)
const commentCursorEnd = ref<number | null>(null)
const commentSubmitting = ref(false)

const canLoad = computed(() => Boolean(props.owner.trim() && props.repo.trim() && props.token.trim()))
const sidebarClass = computed(() => [
  'flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 lg:sticky lg:top-0',
  isSidebarCollapsed.value
    ? 'w-full p-2.5 lg:w-[5.2rem] lg:p-2.5'
    : 'w-full p-3 lg:w-[18rem] lg:p-3 xl:w-80'
])
const avatarCache = new Map<string, string>()

const COMMENT_PATTERN = /^\s*\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]\s*(.*)$/i

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const formatCommentRelativeTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'commented just now'
  const diffMs = Date.now() - date.getTime()
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (absMs < minute) return 'commented just now'
  if (absMs < hour) return `commented ${Math.max(1, Math.round(absMs / minute))} minute${Math.round(absMs / minute) > 1 ? 's' : ''} ago`
  if (absMs < day) return `commented ${Math.max(1, Math.round(absMs / hour))} hour${Math.round(absMs / hour) > 1 ? 's' : ''} ago`
  if (absMs < month) return `commented ${Math.max(1, Math.round(absMs / day))} day${Math.round(absMs / day) > 1 ? 's' : ''} ago`
  if (absMs < year) return `commented ${Math.max(1, Math.round(absMs / month))} month${Math.round(absMs / month) > 1 ? 's' : ''} ago`
  return `commented ${Math.max(1, Math.round(absMs / year))} year${Math.round(absMs / year) > 1 ? 's' : ''} ago`
}

const getOptimizedAvatarUrl = (login: string, avatarUrl: string): string => {
  if (avatarCache.has(login)) {
    return avatarCache.get(login)!
  }
  const cachedUrl = localStorage.getItem(`avatar_${login}`)
  if (cachedUrl) {
    avatarCache.set(login, cachedUrl)
    return cachedUrl
  }
  let url = avatarUrl
  if (url.includes('githubusercontent.com')) {
    url += (url.includes('?') ? '&' : '?') + 's=64&q=70'
  }
  avatarCache.set(login, url)
  return url
}

const cacheAvatar = (login: string, avatarUrl: string): void => {
  const url = getOptimizedAvatarUrl(login, avatarUrl)
  localStorage.setItem(`avatar_${login}`, url)
}

const isImageFile = (filename: string): boolean => /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i.test(filename)
const canPickLine = computed(() => Boolean(selectedPickerPath.value && !isImageFile(selectedPickerPath.value)))
const normalizeCommentId = (value: string): string => value.trim().replace(/\s+/g, '_').replace(/\]/g, '')
const normalizedCommentId = computed(() => normalizeCommentId(commentId.value))
const commentBodyPreview = computed(() => {
  const bodyParts = [commentMessage.value.trim()].filter(Boolean)
  const prefixId = normalizedCommentId.value || '<填写ID>'
  return `[ABCC_NEEDFIX_${prefixId}] ${bodyParts.join('\n')}`.trim()
})
const submitCommentBody = computed(() => {
  if (!normalizedCommentId.value) return ''
  const bodyParts = [commentMessage.value.trim()].filter(Boolean)
  return `[ABCC_NEEDFIX_${normalizedCommentId.value}] ${bodyParts.join('\n')}`.trim()
})
const renderedCommentPreviewHtml = computed(() => {
  if (!commentBodyPreview.value) return '<span class="text-muted-foreground">（这里显示评论内容）</span>'
  return renderMarkdownPreview(commentBodyPreview.value)
})
const canSubmitComment = computed(() => Boolean(normalizedCommentId.value))
const submitButtonTitle = computed(() => (canSubmitComment.value ? '' : '请填写id'))
const submissionBodySource = computed(() => {
  const prBody = selectedPr.value?.body || ''
  if (prBody.includes('## 资源信息')) return prBody
  const candidate = prComments.value.find(comment => comment.body?.includes('## 资源信息'))
  return candidate?.body || prBody
})
const pickerPaths = computed(() => {
  const source = filePickerTab.value === 'pr'
    ? prFiles.value.map(file => file.filename)
    : repoFiles.value
  const query = filePickerSearch.value.trim().toLowerCase()
  if (!query) return source
  return source.filter(path => path.toLowerCase().includes(query))
})
const pickerOpenFolders = computed(() =>
  filePickerTab.value === 'pr' ? prPickerOpenFolders.value : repoPickerOpenFolders.value
)
const pickerTreeItems = computed<PickerTreeItem[]>(() => {
  interface TreeNode {
    path: string
    depth: number
    label: string
    folders: Map<string, TreeNode>
    files: Array<{ path: string; label: string; depth: number }>
  }
  const root: TreeNode = {
    path: '',
    depth: -1,
    label: '',
    folders: new Map(),
    files: []
  }

  for (const path of pickerPaths.value) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue
    let current = root
    for (let i = 0; i < parts.length - 1; i += 1) {
      const folderPath = parts.slice(0, i + 1).join('/')
      const existing = current.folders.get(parts[i])
      if (existing) {
        current = existing
        continue
      }
      const node: TreeNode = {
        path: folderPath,
        depth: i,
        label: parts[i],
        folders: new Map(),
        files: []
      }
      current.folders.set(parts[i], node)
      current = node
    }
    current.files.push({
      path,
      label: parts[parts.length - 1],
      depth: Math.max(parts.length - 1, 0)
    })
  }

  const output: PickerTreeItem[] = []
  const walk = (node: TreeNode): void => {
    const subFolders = Array.from(node.folders.values()).sort((a, b) => a.path.localeCompare(b.path))
    for (const folder of subFolders) {
      output.push({
        type: 'folder',
        path: folder.path,
        label: folder.label,
        depth: folder.depth
      })
      if (pickerOpenFolders.value.includes(folder.path)) {
        walk(folder)
      }
    }
    const sortedFiles = [...node.files].sort((a, b) => a.path.localeCompare(b.path))
    for (const file of sortedFiles) {
      output.push({
        type: 'file',
        path: file.path,
        label: file.label,
        depth: file.depth
      })
    }
  }

  walk(root)
  return output
})
const pickerContentLines = computed(() => selectedPickerContent.value.split('\n'))
const normalizedPickerLineSearch = computed(() => pickerLineSearch.value.trim().toLowerCase())
const pickerMatchedLineNumbers = computed(() => {
  const query = normalizedPickerLineSearch.value
  if (!query) return []
  const numbers: number[] = []
  pickerContentLines.value.forEach((line, index) => {
    if (line.toLowerCase().includes(query)) {
      numbers.push(index + 1)
    }
  })
  return numbers
})
const pickerMatchCursor = ref(-1)
const pickerLineRowRefs = new Map<number, HTMLElement>()

const setPickerLineRowRef = (lineNumber: number, element: Element | null): void => {
  if (!(element instanceof HTMLElement)) {
    pickerLineRowRefs.delete(lineNumber)
    return
  }
  pickerLineRowRefs.set(lineNumber, element)
}

const isPickerLineMatched = (lineNumber: number): boolean =>
  pickerMatchedLineNumbers.value.includes(lineNumber)

const scrollToPickerLine = async (lineNumber: number): Promise<void> => {
  await nextTick()
  const row = pickerLineRowRefs.get(lineNumber)
  row?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
}

const focusPickerMatchByCursor = async (): Promise<void> => {
  if (pickerMatchCursor.value < 0 || pickerMatchedLineNumbers.value.length === 0) return
  const lineNumber = pickerMatchedLineNumbers.value[pickerMatchCursor.value]
  selectedPickerLine.value = lineNumber
  await scrollToPickerLine(lineNumber)
}

const gotoNextPickerMatch = async (): Promise<void> => {
  const total = pickerMatchedLineNumbers.value.length
  if (total === 0) return
  pickerMatchCursor.value = (pickerMatchCursor.value + 1 + total) % total
  await focusPickerMatchByCursor()
}

const gotoPrevPickerMatch = async (): Promise<void> => {
  const total = pickerMatchedLineNumbers.value.length
  if (total === 0) return
  pickerMatchCursor.value = (pickerMatchCursor.value - 1 + total) % total
  await focusPickerMatchByCursor()
}

const runPickerLineSearch = async (): Promise<void> => {
  if (pickerMatchedLineNumbers.value.length === 0) return
  if (pickerMatchCursor.value < 0) {
    pickerMatchCursor.value = 0
    await focusPickerMatchByCursor()
    return
  }
  await gotoNextPickerMatch()
}

const selectPickerLine = (lineNumber: number): void => {
  selectedPickerLine.value = lineNumber
}

const buildRepoBlobUrl = (path: string): string => {
  if (!selectedPr.value) return ''
  const owner = filePickerTab.value === 'repo'
    ? selectedPr.value.resourceRepoOwner
    : selectedPr.value.headOwner
  const repo = filePickerTab.value === 'repo'
    ? selectedPr.value.resourceRepoName
    : selectedPr.value.headRepo
  const refName = filePickerTab.value === 'repo'
    ? selectedPr.value.resourceRepoRef
    : selectedPr.value.headRef
  const ref = encodeURIComponent(refName || 'main')
  if (!owner || !repo) return ''
  const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
  return `https://github.com/${owner}/${repo}/blob/${ref}/${encodedPath}`
}

const buildReferenceUrl = (path: string, line: number | null): string => {
  const base = buildRepoBlobUrl(path)
  if (!base) return ''
  if (!line || line < 1) return base
  return `${base}#L${line}`
}

const getCommentTextareaElement = (): HTMLTextAreaElement | null => {
  const refValue = commentMessageTextareaRef.value as
    | HTMLTextAreaElement
    | { $el?: Element | null }
    | null
  if (refValue instanceof HTMLTextAreaElement) return refValue
  if (refValue?.$el instanceof HTMLTextAreaElement) return refValue.$el
  const element = document.getElementById('review-comment-message')
  return element instanceof HTMLTextAreaElement ? element : null
}

const syncCommentCursor = (event?: Event): void => {
  if (event?.target instanceof HTMLTextAreaElement) {
    commentCursorStart.value = event.target.selectionStart
    commentCursorEnd.value = event.target.selectionEnd
    return
  }
  const textarea = getCommentTextareaElement()
  if (!textarea) return
  commentCursorStart.value = textarea.selectionStart
  commentCursorEnd.value = textarea.selectionEnd
}

const addCommentReference = (path: string, line: number | null): void => {
  if (!path) return
  const label = line ? `${path}#L${line}` : path
  const url = buildReferenceUrl(path, line)
  if (!url) return
  const markdown = `[\`${label}\`](${url})`

  const source = commentMessage.value
  const start = commentCursorStart.value ?? source.length
  const end = commentCursorEnd.value ?? start
  const prefix = source.slice(0, start)
  const suffix = source.slice(end)
  const inserted = markdown
  const nextCursor = start + inserted.length
  commentMessage.value = `${prefix}${inserted}${suffix}`
  commentCursorStart.value = nextCursor
  commentCursorEnd.value = nextCursor
  commentEditorTab.value = 'edit'
  void nextTick(() => {
    const textarea = getCommentTextareaElement()
    if (!textarea) return
    textarea.focus()
    textarea.setSelectionRange(nextCursor, nextCursor)
  })
}

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const renderMarkdownPreview = (source: string): string => {
  let html = escapeHtml(source)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
    const normalizedLabel = label.replace(/^`(.+)`$/, '$1')
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2">${normalizedLabel}</a>`
  })
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">$1</code>')
  html = html.replace(/\n/g, '<br>')
  return html
}

const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

const parseResourceRepoFromPrBody = (body: string): { owner: string; repo: string } | null => {
  if (!body) return null
  const labeled = body.match(/资源仓库\s*[:：]\s*https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i)
  if (labeled?.[1] && labeled?.[2]) {
    return { owner: labeled[1], repo: labeled[2] }
  }
  const generic = body.match(/https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i)
  if (generic?.[1] && generic?.[2]) {
    return { owner: generic[1], repo: generic[2] }
  }
  return null
}

const stripMarkdown = (value: string): string => value
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\s+/g, ' ')
  .trim()

const hasUrl = (value: string): boolean => /https?:\/\/[^\s)]+/.test(value)

const renderTextWithLinks = (value: string): string => {
  const escaped = escapeHtml(value)
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`
  )
}

const getUrlIcon = (url: string, type = '') => {
  const normalized = `${type} ${url}`.toLowerCase()
  if (normalized.includes('address-book')) return AddressBookIcon
  if (normalized.includes('github')) return GithubLogo
  if (normalized.includes('download') || /\.(rpk|zip|apk|bin)(\?|$)/i.test(url)) return DownloadIcon
  if (normalized.includes('image') || /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)(\?|$)/i.test(url)) return ImageIcon
  if (normalized.includes('github.com')) return GithubLogo
  return GlobeIcon
}

const parseSubmissionOverview = (body: string): SubmissionOverview => {
  const overview: SubmissionOverview = {
    resourceInfo: [],
    supportedDevices: [],
    repoUrl: '',
    shortHash: '',
    images: {
      icon: null,
      cover: null,
      previews: []
    },
    downloads: [],
    links: []
  }
  if (!body) return overview

  const lines = body.split('\n')
  let currentSection = ''
  let currentDownload: DownloadItem | null = null
  let waitingImageLabel: 'icon' | 'cover' | 'preview' | null = null
  let waitingImageFile = ''

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = line.match(/^##\s+(.+)$/)
    if (heading) {
      currentSection = heading[1].trim()
      currentDownload = null
      waitingImageLabel = null
      waitingImageFile = ''
      continue
    }

    if (line.startsWith('---')) {
      continue
    }

    if (currentSection.includes('资源信息')) {
      const m = line.match(/^-\s*([^：:]+)[：:]\s*(.+)$/)
      if (m) {
        overview.resourceInfo.push({ key: stripMarkdown(m[1]), value: stripMarkdown(m[2]) })
      }
      continue
    }

    if (currentSection.includes('支持设备')) {
      const m = line.match(/^-\s*(.+)$/)
      if (m) overview.supportedDevices.push(stripMarkdown(m[1]))
      continue
    }

    if (currentSection.includes('仓库信息')) {
      const m = line.match(/^-\s*([^：:]+)[：:]\s*(.+)$/)
      if (!m) continue
      const key = stripMarkdown(m[1])
      const value = stripMarkdown(m[2])
      if (key.includes('资源仓库')) overview.repoUrl = value
      if (key.includes('提交短哈希')) overview.shortHash = value
      continue
    }

    if (currentSection.includes('图片资源')) {
      const m = line.match(/^-\s*([^：:]+)[：:]\s*(.*)$/)
      if (m) {
        const label = stripMarkdown(m[1]).toLowerCase()
        const rest = stripMarkdown(m[2])
        const fileMatch = m[2].match(/`([^`]+)`/)
        if (label.includes('icon')) {
          waitingImageLabel = 'icon'
          waitingImageFile = fileMatch?.[1] || rest
        } else if (label.includes('cover')) {
          waitingImageLabel = 'cover'
          waitingImageFile = fileMatch?.[1] || rest
        } else if (label.includes('preview')) {
          waitingImageLabel = 'preview'
          waitingImageFile = ''
        }
        continue
      }
      const previewFile = line.match(/^-\s*`([^`]+)`\s*$/)
      if (previewFile && waitingImageLabel === 'preview') {
        waitingImageFile = previewFile[1]
        continue
      }
      const urlMatch = line.match(/https?:\/\/\S+/)
      if (urlMatch && waitingImageLabel) {
        const item = { file: waitingImageFile || urlMatch[0].split('/').pop() || '', url: urlMatch[0] }
        if (waitingImageLabel === 'icon') overview.images.icon = item
        if (waitingImageLabel === 'cover') overview.images.cover = item
        if (waitingImageLabel === 'preview') overview.images.previews.push(item)
        waitingImageLabel = null
        waitingImageFile = ''
      }
      continue
    }

    if (currentSection.includes('下载资源')) {
      const deviceLine = line.match(/^-\s*`?([^`:]+)`?\s*$/)
      if (deviceLine) {
        currentDownload = {
          device: stripMarkdown(deviceLine[1]),
          version: '',
          file: '',
          raw: ''
        }
        overview.downloads.push(currentDownload)
        continue
      }
      const m = line.match(/^-\s*([^：:]+)[：:]\s*(.+)$/)
      if (m && currentDownload) {
        const key = stripMarkdown(m[1]).toLowerCase()
        const value = stripMarkdown(m[2])
        if (key === 'version') currentDownload.version = value
        if (key === 'file') currentDownload.file = value
        if (key === 'raw') currentDownload.raw = value
      }
      continue
    }

    if (currentSection.includes('links')) {
      const m = line.match(/^-\s*([^（(:：]+)(?:（([^）]+)）)?[：:]\s*(https?:\/\/\S+)/)
      if (m) {
        overview.links.push({
          title: stripMarkdown(m[1]),
          type: stripMarkdown(m[2] || ''),
          url: stripMarkdown(m[3])
        })
      }
    }
  }

  return overview
}

const submissionOverview = computed<SubmissionOverview>(() => parseSubmissionOverview(submissionBodySource.value))
const hasSubmissionOverview = computed(() =>
  submissionOverview.value.resourceInfo.length > 0
  || submissionOverview.value.supportedDevices.length > 0
  || Boolean(submissionOverview.value.repoUrl)
  || submissionOverview.value.downloads.length > 0
  || submissionOverview.value.links.length > 0
  || Boolean(submissionOverview.value.images.icon)
  || Boolean(submissionOverview.value.images.cover)
  || submissionOverview.value.images.previews.length > 0
)

async function githubGet<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${props.token.trim()}`
    }
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `GitHub API ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function githubPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${props.token.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `GitHub API ${response.status}`)
  }
  return response.json() as Promise<T>
}

const deriveReviewStatus = (comments: Array<{ body?: string }>): ReviewStatusResult => {
  const needFixes = new Map<string, string>()
  const fixed = new Set<string>()
  const fixedMessages = new Map<string, string>()

  for (const comment of comments) {
    const body = comment.body?.trim()
    if (!body) continue
    const match = body.match(COMMENT_PATTERN)
    if (!match) continue
    const kind = match[1].toUpperCase()
    const id = match[2].trim()
    const message = (match[3] || '').trim()

    if (kind === 'NEEDFIX') {
      needFixes.set(id, message)
      fixed.delete(id)
      fixedMessages.delete(id)
      continue
    }
    if (kind === 'FIXED' && needFixes.has(id)) {
      fixed.add(id)
      if (message) fixedMessages.set(id, message)
    }
  }

  if (needFixes.size === 0) {
    return { state: 'waiting_review', items: [] }
  }

  const items = Array.from(needFixes.entries()).map(([id, message]) => ({
    id,
    message: fixedMessages.get(id) ? `${message}（${fixedMessages.get(id)}）` : message,
    fixed: fixed.has(id)
  }))

  const hasUnresolved = items.some(item => !item.fixed)
  return {
    state: hasUnresolved ? 'changes_requested' : 'fixed_waiting',
    items
  }
}

const loadPullRequests = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''
  try {
    if (!canLoad.value) throw new Error('请先登录并配置目标仓库')

    const pulls = await githubGet<Array<{
      number: number
      title: string
      html_url: string
      created_at: string
      body?: string
      user?: { login?: string; avatar_url?: string }
      head?: { ref?: string; repo?: { name?: string; owner?: { login?: string } } }
    }>>(`/repos/${props.owner}/${props.repo}/pulls?state=open&per_page=50`)

    const list: PullListItem[] = []
    for (const pr of pulls) {
      const comments = await githubGet<Array<{ body?: string }>>(
        `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
      )
      const review = deriveReviewStatus(comments)
      const headOwner = pr.head?.repo?.owner?.login || ''
      const headRepo = pr.head?.repo?.name || ''
      const headRef = pr.head?.ref || 'main'
      const parsedResourceRepo = parseResourceRepoFromPrBody(pr.body || '')
      list.push({
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        author: pr.user?.login || 'unknown',
        authorAvatar: pr.user?.avatar_url || '',
        createdAt: pr.created_at,
        url: pr.html_url,
        headOwner,
        headRepo,
        headRef,
        resourceRepoOwner: parsedResourceRepo?.owner || '',
        resourceRepoName: parsedResourceRepo?.repo || '',
        resourceRepoRef: 'main',
        status: review.state,
        review
      })
    }
    pullRequests.value = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (pullRequests.value.length === 1) {
      isSidebarCollapsed.value = true
    }
    if (pullRequests.value.length > 0) {
      await selectPr(pullRequests.value[0])
    } else {
      selectedPr.value = null
      prComments.value = []
      prFiles.value = []
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : '加载 PR 失败'
    pullRequests.value = []
    selectedPr.value = null
  } finally {
    loading.value = false
  }
}

const loadPrDetails = async (pr: PullListItem): Promise<void> => {
  detailsLoading.value = true
  detailsError.value = ''
  repoFilesError.value = ''
  filePickerSearch.value = ''
  selectedPickerPath.value = ''
  selectedPickerContent.value = ''
  selectedPickerLine.value = null
  try {
    const [pullDetail, comments, files] = await Promise.all([
      githubGet<{ body?: string }>(
        `/repos/${props.owner}/${props.repo}/pulls/${pr.number}`
      ),
      githubGet<IssueCommentItem[]>(
        `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
      ),
      githubGet<PullFileItem[]>(
        `/repos/${props.owner}/${props.repo}/pulls/${pr.number}/files?per_page=100`
      )
    ])
    pr.body = pullDetail.body || pr.body
    prComments.value = comments
    prFiles.value = files
    await loadRepoFiles(pr)
    prPickerOpenFolders.value = getTopLevelFolders(prFiles.value.map(file => file.filename))
    repoPickerOpenFolders.value = getTopLevelFolders(repoFiles.value)
  } catch (error: unknown) {
    detailsError.value = error instanceof Error ? error.message : '加载 PR 详情失败'
    prComments.value = []
    prFiles.value = []
    repoFiles.value = []
  } finally {
    detailsLoading.value = false
  }
}

const loadRepoFiles = async (pr: PullListItem): Promise<void> => {
  repoFilesLoading.value = true
  repoFilesError.value = ''
  try {
    if (!pr.resourceRepoOwner || !pr.resourceRepoName) {
      repoFiles.value = []
      repoFilesError.value = '未在 PR 描述中识别到资源仓库（资源仓库：https://github.com/{owner}/{repo}）'
      return
    }
    const repoMeta = await githubGet<{ default_branch?: string }>(
      `/repos/${pr.resourceRepoOwner}/${pr.resourceRepoName}`
    )
    const repoBranch = repoMeta.default_branch || 'main'
    pr.resourceRepoRef = repoBranch
    const commit = await githubGet<{ commit?: { tree?: { sha?: string } } }>(
      `/repos/${pr.resourceRepoOwner}/${pr.resourceRepoName}/commits/${encodeURIComponent(repoBranch)}`
    )
    const treeSha = commit.commit?.tree?.sha
    if (!treeSha) {
      repoFiles.value = []
      return
    }
    const tree = await githubGet<{ tree?: Array<{ path?: string; type?: string }> }>(
      `/repos/${pr.resourceRepoOwner}/${pr.resourceRepoName}/git/trees/${treeSha}?recursive=1`
    )
    repoFiles.value = (tree.tree || [])
      .filter(item => item.type === 'blob' && item.path)
      .map(item => item.path as string)
      .slice(0, 3000)
  } catch (error: unknown) {
    repoFilesError.value = error instanceof Error ? error.message : '仓库文件加载失败'
    repoFiles.value = []
  } finally {
    repoFilesLoading.value = false
  }
}

const selectPr = async (pr: PullListItem): Promise<void> => {
  selectedPr.value = pr
  await loadPrDetails(pr)
}

const refreshSelectedPrDetails = async (): Promise<void> => {
  if (!selectedPr.value) return
  await loadPrDetails(selectedPr.value)
}

const getTopLevelFolders = (paths: string[]): string[] =>
  Array.from(new Set(paths.map(path => path.split('/').filter(Boolean)[0]).filter(Boolean)))

const isPickerFolderOpen = (path: string): boolean => pickerOpenFolders.value.includes(path)

const togglePickerFolder = (path: string): void => {
  if (filePickerTab.value === 'pr') {
    prPickerOpenFolders.value = prPickerOpenFolders.value.includes(path)
      ? prPickerOpenFolders.value.filter(item => item !== path)
      : [...prPickerOpenFolders.value, path]
    return
  }
  repoPickerOpenFolders.value = repoPickerOpenFolders.value.includes(path)
    ? repoPickerOpenFolders.value.filter(item => item !== path)
    : [...repoPickerOpenFolders.value, path]
}

const openFilePicker = (): void => {
  syncCommentCursor()
  filePickerOpen.value = true
  filePickerStep.value = 'file'
  filePickerTab.value = 'pr'
  prPickerOpenFolders.value = getTopLevelFolders(prFiles.value.map(file => file.filename))
  repoPickerOpenFolders.value = getTopLevelFolders(repoFiles.value)
  filePickerSearch.value = ''
  selectedPickerPath.value = ''
  selectedPickerContent.value = ''
  selectedPickerLine.value = null
  pickerLineSearch.value = ''
  pickerMatchCursor.value = -1
  pickerLineRowRefs.clear()
  pickerError.value = ''
}

const readRepoTextFileOrEmpty = async (path: string): Promise<string> => {
  if (!selectedPr.value) return ''
  try {
    const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
    const owner = filePickerTab.value === 'repo'
      ? selectedPr.value.resourceRepoOwner
      : selectedPr.value.headOwner
    const repo = filePickerTab.value === 'repo'
      ? selectedPr.value.resourceRepoName
      : selectedPr.value.headRepo
    const ref = filePickerTab.value === 'repo'
      ? selectedPr.value.resourceRepoRef
      : selectedPr.value.headRef
    if (!owner || !repo || !ref) return ''
    const file = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
    )
    if (!file.content) return ''
    if (file.encoding && file.encoding !== 'base64') return ''
    return decodeBase64Utf8(file.content.replace(/\n/g, ''))
  } catch {
    return ''
  }
}

const selectPickerPath = (path: string): void => {
  selectedPickerPath.value = path
  selectedPickerLine.value = null
  pickerLineSearch.value = ''
  pickerMatchCursor.value = -1
  pickerLineRowRefs.clear()
}

const enterPickerLineStep = async (): Promise<void> => {
  if (!selectedPickerPath.value || !canPickLine.value) return
  filePickerStep.value = 'line'
  pickerLineSearch.value = ''
  pickerMatchCursor.value = -1
  pickerLineRowRefs.clear()
  pickerError.value = ''
  pickerLoading.value = true
  try {
    const text = await readRepoTextFileOrEmpty(selectedPickerPath.value)
    selectedPickerContent.value = text || '无法预览该文件内容（可能是二进制文件）'
  } catch (error: unknown) {
    pickerError.value = error instanceof Error ? error.message : '读取文件失败'
    selectedPickerContent.value = ''
  } finally {
    pickerLoading.value = false
  }
}

const backToPickerFileStep = (): void => {
  filePickerStep.value = 'file'
}

const insertSelectedFileReference = (): void => {
  if (!selectedPickerPath.value) return
  addCommentReference(selectedPickerPath.value, null)
}

const insertSelectedLineReference = (): void => {
  if (!selectedPickerPath.value || !selectedPickerLine.value) return
  addCommentReference(selectedPickerPath.value, selectedPickerLine.value)
  filePickerOpen.value = false
}

const submitPresetComment = async (): Promise<void> => {
  if (!selectedPr.value) return
  const body = submitCommentBody.value
  if (!body) {
    detailsError.value = '评论 ID 不能为空'
    return
  }
  commentSubmitting.value = true
  detailsError.value = ''
  try {
    await githubPost(
      `/repos/${props.owner}/${props.repo}/issues/${selectedPr.value.number}/comments`,
      { body }
    )
    commentMessage.value = ''
    commentEditorTab.value = 'edit'
    await loadPrDetails(selectedPr.value)
    await loadPullRequests()
  } catch (error: unknown) {
    detailsError.value = error instanceof Error ? error.message : '评论发送失败'
  } finally {
    commentSubmitting.value = false
  }
}

watch(
  () => [props.owner, props.repo, props.token] as const,
  () => {
    void loadPullRequests()
  },
  { immediate: true }
)

watch(
  () => filePickerTab.value,
  () => {
    selectedPickerPath.value = ''
    selectedPickerLine.value = null
    selectedPickerContent.value = ''
    pickerLineSearch.value = ''
    pickerMatchCursor.value = -1
    pickerLineRowRefs.clear()
    pickerError.value = ''
    pickerLoading.value = false
    filePickerStep.value = 'file'
  }
)

watch(
  () => [normalizedPickerLineSearch.value, pickerContentLines.value.length] as const,
  async () => {
    if (!normalizedPickerLineSearch.value) {
      pickerMatchCursor.value = -1
      return
    }
    pickerMatchCursor.value = pickerMatchedLineNumbers.value.length > 0 ? 0 : -1
    await focusPickerMatchByCursor()
  }
)
</script>
