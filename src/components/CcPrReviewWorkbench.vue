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
          <ReviewDetailHeader :title="selectedPr.title" :number="selectedPr.number">
            <template #meta>
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
            </template>
            <template #actions>
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
            </template>
          </ReviewDetailHeader>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">审核评论</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 pt-0">
              <div v-if="repoFilesError" class="text-xs text-destructive">{{ repoFilesError }}</div>

              <div class="space-y-2">
                <ReviewCommentComposer
                  :avatar-url="selectedPr?.authorAvatar ? getOptimizedAvatarUrl(selectedPr.author, selectedPr.authorAvatar) : ''"
                  :comment-id="commentId"
                  :comment-message="commentMessage"
                  :editor-tab="commentEditorTab"
                  :preview-html="renderedCommentPreviewHtml"
                  :can-submit="canSubmitComment"
                  :submitting="commentSubmitting"
                  :submit-button-title="submitButtonTitle"
                  :show-file-picker-button="true"
                  id-placeholder="自定义 ID，例如 icon_png_check"
                  message-placeholder="评论说明（文件引用请用上方按钮插入）"
                  textarea-class="min-h-[140px]"
                  @update:comment-id="commentId = $event"
                  @update:comment-message="commentMessage = $event"
                  @update:editor-tab="commentEditorTab = $event"
                  @open-file-picker="openFilePicker"
                  @submit="submitPresetComment"
                  @cursor-event="syncCommentCursor"
                />

                <div class="pt-1 text-xs font-medium text-muted-foreground">最近评论</div>
                <ReviewCommentTimeline
                  :comments="prComments"
                  :line-left="54"
                  show-open-link
                  avatar-rounded="full"
                  :get-avatar-url="getOptimizedAvatarUrl"
                  :on-avatar-load="cacheAvatar"
                />
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

          <Dialog :open="commentResultDialogOpen" @update:open="commentResultDialogOpen = $event">
            <DialogContent class="max-w-[420px]">
              <DialogHeader>
                <DialogTitle>{{ commentResultDialogTitle }}</DialogTitle>
                <DialogDescription>{{ commentResultDialogMessage }}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button @click="commentResultDialogOpen = false">我知道了</Button>
              </DialogFooter>
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
                    <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <NoteIcon :size="14" weight="duotone" />
                      资源信息
                    </div>
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
                      <div class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between">
                        <span class="text-xs text-muted-foreground">仓库信息</span>
                        <span v-if="submissionOverview.repoUrl" class="min-w-0 text-sm font-medium text-foreground">
                          <a
                            :href="submissionOverview.repoUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="break-all text-primary hover:underline"
                          >
                            {{ submissionOverview.repoUrl }}
                          </a>
                        </span>
                        <span v-else class="text-sm font-medium text-foreground">-</span>
                      </div>
                      <div class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                        <span class="text-xs text-muted-foreground">链接（manifest_v2.links）</span>
                        <div v-if="submissionOverview.links.length > 0" class="space-y-1 text-sm font-medium text-foreground">
                          <div
                            v-for="link in submissionOverview.links"
                            :key="`resource-links-${link.title}-${link.url}`"
                            class="min-w-0"
                          >
                            <a
                              :href="link.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="inline-flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-primary hover:underline"
                          >
                              <component
                                :is="resolvePhosphorLinkIcon(link.type)"
                                :size="14"
                                weight="duotone"
                                class="shrink-0 text-muted-foreground"
                              />
                              <span class="shrink-0 text-foreground">{{ link.title || '-' }}</span>
                              <span v-if="link.type" class="shrink-0 text-muted-foreground">{{ link.type }}</span>
                              <span class="truncate">{{ link.url }}</span>
                            </a>
                          </div>
                        </div>
                        <span v-else class="text-sm font-medium text-foreground">-</span>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-md border border-border p-3">
                    <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <GlobeIcon :size="14" weight="duotone" />
                      支持设备
                    </div>
                    <div class="space-y-2">
                      <div
                        v-for="group in groupedDownloads"
                        :key="`${group.raw || group.file}-${group.version}`"
                        class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                      >
                        <div class="text-xs text-muted-foreground">支持设备：{{ group.devices.join(' / ') || '-' }}</div>
                        <div class="mt-1 text-xs text-muted-foreground">版本：{{ group.version || '-' }}</div>
                        <div class="mt-1 text-xs text-muted-foreground">文件：{{ group.file || '-' }}</div>
                        <a
                          v-if="group.raw"
                          :href="group.raw"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-1 block break-all text-xs text-primary hover:underline"
                        >
                          {{ group.raw }}
                        </a>
                      </div>
                      <div
                        v-if="groupedDownloads.length === 0"
                        class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground"
                      >
                        {{ submissionOverview.supportedDevices.join(' / ') || '-' }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <ImageIcon :size="14" weight="duotone" />
                      图片资源（Raw）
                    </div>
                    <div v-if="imageSlides.length > 1" class="inline-flex items-center gap-1">
                      <Button size="icon" variant="outline" class="h-7 w-7" :disabled="!canImagePrev" @click="scrollImagePrev">
                        <CaretLeft :size="14" weight="bold" />
                      </Button>
                      <Button size="icon" variant="outline" class="h-7 w-7" :disabled="!canImageNext" @click="scrollImageNext">
                        <CaretRight :size="14" weight="bold" />
                      </Button>
                    </div>
                  </div>
                  <div v-if="imageSlides.length === 0" class="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                    未检测到图片资源
                  </div>
                  <div v-else class="space-y-3">
                    <div class="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                      <div v-if="submissionOverview.images.icon" class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                        <div class="text-xs text-muted-foreground">Icon · {{ submissionOverview.images.icon.file }}</div>
                        <div class="mt-1 text-xs text-muted-foreground">
                          像素：{{ formatImageDimensions(submissionOverview.images.icon.url) }} ·
                          <span :class="isIconRatioValid(submissionOverview.images.icon.url) ? '' : 'font-semibold text-red-600'">
                            宽高比：{{ formatAspectRatio(submissionOverview.images.icon.url) }}
                          </span>
                        </div>
                        <a
                          :href="submissionOverview.images.icon.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-2 mx-auto flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/70"
                        >
                          <img
                            :src="getDisplayImageUrl(submissionOverview.images.icon.url)"
                            alt="Icon 预览"
                            class="h-full w-full rounded-full object-contain p-3"
                            loading="lazy"
                            @load="(event) => handleImageLoad(submissionOverview.images.icon!.url, event)"
                          />
                        </a>
                      </div>
                      <div v-if="submissionOverview.images.cover" class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                        <div class="text-xs text-muted-foreground">Cover · {{ submissionOverview.images.cover.file }}</div>
                        <div class="mt-1 text-xs text-muted-foreground">
                          像素：{{ formatImageDimensions(submissionOverview.images.cover.url) }} ·
                          <span :class="isCoverRatioValid(submissionOverview.images.cover.url) ? '' : 'font-semibold text-red-600'">
                            宽高比：{{ formatAspectRatio(submissionOverview.images.cover.url) }}
                          </span>
                        </div>
                        <a
                          :href="submissionOverview.images.cover.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="mt-2 block overflow-hidden rounded-md border border-border/60 bg-background/70"
                        >
                          <img
                            :src="getDisplayImageUrl(submissionOverview.images.cover.url)"
                            alt="Cover 预览"
                            class="max-h-[420px] w-full object-contain"
                            loading="lazy"
                            @load="(event) => handleImageLoad(submissionOverview.images.cover!.url, event)"
                          />
                        </a>
                      </div>
                    </div>
                    <div v-if="imageSlides.length > 0" class="overflow-hidden" ref="imageCarouselRef">
                      <div class="flex">
                        <div
                          v-for="slide in imageSlides"
                          :key="slide.key"
                          class="min-w-0 shrink-0 grow-0 basis-full pr-2"
                        >
                          <div class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                            <div class="text-xs text-muted-foreground">Preview · {{ slide.file }}</div>
                            <a
                              :href="slide.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="mt-2 block overflow-hidden rounded-md border border-border/60 bg-background/70"
                            >
                              <img
                                :src="getDisplayImageUrl(slide.url)"
                                :alt="`${slide.file} 预览`"
                                class="max-h-64 w-full object-contain"
                                loading="lazy"
                              />
                            </a>
                            <span class="mt-2 inline-flex items-center gap-1.5">
                              <a :href="slide.url" target="_blank" rel="noopener noreferrer" class="break-all text-primary hover:underline">
                                {{ slide.url }}
                              </a>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <CheckCircleIcon :size="14" weight="duotone" />
                    规范自动检查
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="item in ruleChecks"
                      :key="item.title"
                      class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                    >
                      <div class="flex items-start gap-2">
                        <component
                          :is="item.status === 'pass' ? CheckCircleIcon : WarningCircleIcon"
                          :size="14"
                          weight="fill"
                          :class="item.status === 'pass' ? 'text-emerald-600' : item.status === 'fail' ? 'text-red-600' : item.status === 'warn' ? 'text-amber-500' : 'text-slate-500'"
                          class="mt-0.5 shrink-0"
                        />
                        <div class="min-w-0">
                          <div class="text-sm font-medium text-foreground">{{ item.title }}</div>
                          <div class="text-xs text-muted-foreground">{{ item.detail }}</div>
                        </div>
                      </div>
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  PhCheckCircle as CheckCircleIcon,
  PhWarningCircle as WarningCircleIcon,
  PhArrowLeft as ArrowLeft,
  PhArrowDown as ArrowDown,
  PhArrowUp as ArrowUp,
  PhArrowsClockwise as ArrowsClockwise,
  PhAddressBook as AddressBookIcon,
  PhCaretLeft as CaretLeft,
  PhCaretDown as CaretDown,
  PhCaretDoubleRight as CaretDoubleRight,
  PhCaretRight as CaretRight,
  PhFile as FileIcon,
  PhFolder as FolderIcon,
  PhGithubLogo as GithubLogo,
  PhGlobeHemisphereWest as GlobeIcon,
  PhImageSquare as ImageIcon,
  PhHouse as HouseIcon,
  PhNote as NoteIcon,
  PhGitPullRequest as GitPullRequest,
  PhLinkSimple as LinkSimple,
  PhMagnifyingGlass as MagnifyingGlass,
  PhTelegramLogo as TelegramLogo
} from '@phosphor-icons/vue'
import emblaCarouselVue from 'embla-carousel-vue'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import ReviewCommentComposer from '@/components/review/ReviewCommentComposer.vue'
import ReviewCommentTimeline from '@/components/review/ReviewCommentTimeline.vue'
import ReviewDetailHeader from '@/components/review/ReviewDetailHeader.vue'
import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'
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

interface CsvV2Row {
  id: string
  name: string
  restype: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  icon: string
  cover: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
}

interface RuleCheckItem {
  title: string
  status: 'pass' | 'fail' | 'warn' | 'manual'
  detail: string
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

const SITE_DEFAULT_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''
const resolvedToken = computed(() => props.token.trim() || SITE_DEFAULT_TOKEN)

const loading = ref(false)
const errorMessage = ref('')
const pullRequests = ref<PullListItem[]>([])
const selectedPr = ref<PullListItem | null>(null)
const isSidebarCollapsed = ref(false)
const detailsLoading = ref(false)
const detailsError = ref('')
const prComments = ref<IssueCommentItem[]>([])
const prFiles = ref<PullFileItem[]>([])
const csvRowFromRepoDiff = ref<CsvV2Row | null>(null)
const repoFiles = ref<string[]>([])
const repoFilesLoading = ref(false)
const repoFilesError = ref('')
const manifestV2Data = ref<Record<string, any> | null>(null)
const manifestLoadError = ref('')
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
const commentResultDialogOpen = ref(false)
const commentResultDialogTitle = ref('')
const commentResultDialogMessage = ref('')

const canLoad = computed(() => Boolean(props.owner.trim() && props.repo.trim() && resolvedToken.value))
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
const imageBlobUrlMap = ref<Record<string, string>>({})
const imageMetaMap = ref<Record<string, { width?: number; height?: number }>>({})
const loadingImageSet = new Set<string>()
const [imageCarouselRef, imageCarouselApi] = emblaCarouselVue({ loop: false, align: 'start' })
const canImagePrev = ref(false)
const canImageNext = ref(false)

const updateImageCarouselState = (): void => {
  const api = imageCarouselApi.value
  if (!api) {
    canImagePrev.value = false
    canImageNext.value = false
    return
  }
  canImagePrev.value = api.canScrollPrev()
  canImageNext.value = api.canScrollNext()
}

const scrollImagePrev = (): void => {
  imageCarouselApi.value?.scrollPrev()
}

const scrollImageNext = (): void => {
  imageCarouselApi.value?.scrollNext()
}

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

const openCommentResultDialog = (title: string, message: string): void => {
  commentResultDialogTitle.value = title
  commentResultDialogMessage.value = message
  commentResultDialogOpen.value = true
}

const decodeBase64Utf8 = (base64: string): string => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

const decodeBase64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const inferImageMimeType = (url: string): string => {
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.avif')) return 'image/avif'
  return 'application/octet-stream'
}

const parseRawGithubUrl = (rawUrl: string): { owner: string; repo: string; ref: string; path: string } | null => {
  const matched = rawUrl.match(/^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/i)
  if (!matched) return null
  return {
    owner: matched[1],
    repo: matched[2],
    ref: matched[3],
    path: matched[4]
  }
}

const getDisplayImageUrl = (url: string): string => imageBlobUrlMap.value[url] || url
const getImageMeta = (url: string): { width?: number; height?: number } => imageMetaMap.value[url] || {}

const setImageMeta = (url: string, next: { width?: number; height?: number }): void => {
  if (!url) return
  imageMetaMap.value = {
    ...imageMetaMap.value,
    [url]: {
      ...imageMetaMap.value[url],
      ...next
    }
  }
}

const formatImageDimensions = (url: string): string => {
  const meta = getImageMeta(url)
  if (!meta.width || !meta.height) return '-'
  return `${meta.width} × ${meta.height}`
}

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x || 1
}

const formatAspectRatio = (url: string): string => {
  const meta = getImageMeta(url)
  if (!meta.width || !meta.height) return '-'
  const divisor = gcd(meta.width, meta.height)
  return `${meta.width / divisor}:${meta.height / divisor}`
}

const getAspectRatioValue = (url: string): number | null => {
  const meta = getImageMeta(url)
  if (!meta.width || !meta.height) return null
  return meta.width / meta.height
}

const isIconRatioValid = (url: string): boolean => {
  const ratio = getAspectRatioValue(url)
  if (ratio === null) return true
  return Math.abs(ratio - 1) <= 0.01
}

const isCoverRatioValid = (url: string): boolean => {
  const ratio = getAspectRatioValue(url)
  if (ratio === null) return true
  return Math.abs(ratio - 1.5) <= 0.01
}

const LINK_ICON_MAP: Record<string, unknown> = {
  'address-book': AddressBookIcon,
  'github-logo': GithubLogo,
  'globe-hemisphere-west': GlobeIcon,
  'house': HouseIcon,
  'link': LinkSimple,
  'telegram-logo': TelegramLogo
}

const resolvePhosphorLinkIcon = (iconName?: string) => {
  if (!iconName) return LinkSimple
  const normalized = iconName.trim().toLowerCase()
  return LINK_ICON_MAP[normalized] || LinkSimple
}

const handleImageLoad = (url: string, event: Event): void => {
  if (!(event.target instanceof HTMLImageElement)) return
  const width = event.target.naturalWidth
  const height = event.target.naturalHeight
  if (!width || !height) return
  setImageMeta(url, { width, height })
}

const ensureImageDisplayUrl = async (url: string): Promise<void> => {
  if (!url || imageBlobUrlMap.value[url] || loadingImageSet.has(url)) return
  const parsed = parseRawGithubUrl(url)
  if (!parsed) return
  if (!resolvedToken.value) return
  loadingImageSet.add(url)
  try {
    const encodedPath = parsed.path.split('/').map(segment => encodeURIComponent(segment)).join('/')
    const file = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${parsed.owner}/${parsed.repo}/contents/${encodedPath}?ref=${encodeURIComponent(parsed.ref)}`
    )
    if (!file.content || (file.encoding && file.encoding !== 'base64')) return
    const bytes = decodeBase64ToBytes(file.content.replace(/\n/g, ''))
    const blob = new Blob([bytes], { type: inferImageMimeType(url) })
    const objectUrl = URL.createObjectURL(blob)
    imageBlobUrlMap.value = {
      ...imageBlobUrlMap.value,
      [url]: objectUrl
    }
  } catch {
    // 保持原始 URL 作为回退
  } finally {
    loadingImageSet.delete(url)
  }
}

onBeforeUnmount(() => {
  Object.values(imageBlobUrlMap.value).forEach((url) => URL.revokeObjectURL(url))
})

const hasUrl = (value: string): boolean => /https?:\/\/[^\s)]+/.test(value)

const renderTextWithLinks = (value: string): string => {
  const escaped = escapeHtml(value)
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`
  )
}

const buildRawGithubUrl = (owner: string, repo: string, ref: string, path: string): string => {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`
}

const toNonEmptyString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(item => toNonEmptyString(item))
    .filter(Boolean)
}

const submissionOverview = computed<SubmissionOverview>(() => {
  const manifest = manifestV2Data.value || {}
  const item = (manifest.item && typeof manifest.item === 'object') ? manifest.item as Record<string, unknown> : {}
  const downloads = (manifest.downloads && typeof manifest.downloads === 'object') ? manifest.downloads as Record<string, unknown> : {}
  const links = Array.isArray(manifest.links) ? manifest.links as Array<Record<string, unknown>> : []
  const owner = selectedPr.value?.headOwner || ''
  const repo = selectedPr.value?.headRepo || ''
  const ref = selectedPr.value?.headRef || 'main'

  const toImageAsset = (pathValue: unknown): { file: string; url: string } | null => {
    const raw = toNonEmptyString(pathValue)
    if (!raw || raw === '--') return null
    const file = raw.split('/').filter(Boolean).pop() || raw
    if (/^https?:\/\//i.test(raw)) {
      return { file, url: raw }
    }
    if (!owner || !repo || !ref) return null
    return {
      file,
      url: buildRawGithubUrl(owner, repo, ref, raw)
    }
  }

  const previewAssets = toStringArray(item.preview)
    .map(path => toImageAsset(path))
    .filter((asset): asset is { file: string; url: string } => Boolean(asset))

  const overview: SubmissionOverview = {
    resourceInfo: [],
    supportedDevices: [],
    repoUrl: owner && repo ? `https://github.com/${owner}/${repo}` : '',
    shortHash: toNonEmptyString(selectedPr.value?.headRef),
    images: {
      icon: toImageAsset(item.icon),
      cover: toImageAsset(item.cover),
      previews: previewAssets
    },
    downloads: [],
    links: links
      .map((link) => ({
        title: toNonEmptyString(link.title),
        type: toNonEmptyString(link.icon),
        url: toNonEmptyString(link.url)
      }))
      .filter(link => link.title || link.type || link.url)
  }

  const pushResourceInfo = (key: string, value: unknown): void => {
    const normalized = toNonEmptyString(value)
    if (!normalized) return
    overview.resourceInfo.push({ key, value: normalized })
  }

  pushResourceInfo('资源名称', item.name)
  pushResourceInfo('资源 ID', item.id)
  pushResourceInfo('资源类型', item.restype)
  pushResourceInfo('资源描述', item.description)

  for (const [device, entry] of Object.entries(downloads)) {
    const record = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {}
    const file = toNonEmptyString(record.file_name)
    const version = toNonEmptyString(record.version)
    const raw = file && owner && repo && ref ? buildRawGithubUrl(owner, repo, ref, file) : ''
    if (device) {
      overview.supportedDevices.push(device)
    }
    overview.downloads.push({
      device,
      version,
      file,
      raw
    })
  }

  return overview
})
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
const groupedDownloads = computed<Array<{ raw: string; file: string; version: string; devices: string[] }>>(() => {
  const map = new Map<string, { raw: string; file: string; version: string; devices: string[] }>()
  for (const item of submissionOverview.value.downloads) {
    const key = `${item.raw || ''}||${item.file || ''}||${item.version || ''}`
    if (!map.has(key)) {
      map.set(key, {
        raw: item.raw || '',
        file: item.file || '',
        version: item.version || '',
        devices: []
      })
    }
    const target = map.get(key)!
    if (item.device && !target.devices.includes(item.device)) {
      target.devices.push(item.device)
    }
  }
  return Array.from(map.values())
})
const imageSlides = computed<Array<{ key: string; label: string; file: string; url: string }>>(() => {
  const slides: Array<{ key: string; label: string; file: string; url: string }> = []
  for (const preview of submissionOverview.value.images.previews) {
    slides.push({
      key: `preview-${preview.file}-${preview.url}`,
      label: 'Preview',
      file: preview.file,
      url: preview.url
    })
  }
  return slides
})

watch(
  () => [
    submissionOverview.value.images.icon?.url || '',
    submissionOverview.value.images.cover?.url || '',
    ...submissionOverview.value.images.previews.map(item => item.url)
  ],
  (urls) => {
    urls
      .filter(Boolean)
      .forEach((url) => {
        void ensureImageDisplayUrl(url)
      })
  },
  { immediate: true }
)

watch(imageCarouselApi, (api) => {
  if (!api) {
    canImagePrev.value = false
    canImageNext.value = false
    return
  }
  api.on('select', updateImageCarouselState)
  api.on('reInit', updateImageCarouselState)
  updateImageCarouselState()
})

watch(
  () => imageSlides.value.length,
  async () => {
    await nextTick()
    imageCarouselApi.value?.reInit()
    updateImageCarouselState()
  }
)

const knownDeviceIds = new Set([
  'xmb9', 'xmb9p', 'xmb10', 'xmb10nfc',
  'xmws3', 'xmws4', 'xmws4xring',
  'xmrw5', 'xmrw5xring', 'xmrw6',
  'vivowgt2'
])
const repoTreeCache = new Map<string, Array<{ path?: string; type?: string; sha?: string }>>()

const normalizeText = (value: string): string => value.trim().toLowerCase()

const getResourceInfoValue = (keywords: string[]): string => {
  const item = submissionOverview.value.resourceInfo.find(entry => keywords.some(key => normalizeText(entry.key).includes(normalizeText(key))))
  return item?.value || ''
}

const splitCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }
  result.push(current)
  return result.map(value => value.trim())
}

const parseCsvV2Row = (line: string): CsvV2Row | null => {
  const cells = splitCsvLine(line)
  if (cells.length >= 12) {
    return {
      id: cells[0],
      name: cells[1],
      restype: cells[2],
      repo_owner: cells[3],
      repo_name: cells[4],
      repo_commit_hash: cells[5],
      icon: cells[6],
      cover: cells[7],
      tags: cells[8],
      device_vendors: cells[9],
      devices: cells[10],
      paid_type: cells[11]
    }
  }
  if (cells.length >= 8) {
    // 兼容旧 index.csv 结构: name,icon,cover,restype,tags,devices,path,paid_type
    return {
      id: '',
      name: cells[0],
      restype: cells[3],
      repo_owner: '',
      repo_name: '',
      repo_commit_hash: '',
      icon: cells[1],
      cover: cells[2],
      tags: cells[4],
      device_vendors: '',
      devices: cells[5],
      paid_type: cells[7]
    }
  }
  return null
}

const parseCsvRowsFromText = (text: string): CsvV2Row[] => text
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#') && !line.startsWith('id,'))
  .map(parseCsvV2Row)
  .filter((row): row is CsvV2Row => Boolean(row))

const serializeCsvRow = (row: CsvV2Row): string => [
  row.id,
  row.name,
  row.restype,
  row.repo_owner,
  row.repo_name,
  row.repo_commit_hash,
  row.icon,
  row.cover,
  row.tags,
  row.device_vendors,
  row.devices,
  row.paid_type
].join('||')

const pickBestCsvRow = (rows: CsvV2Row[]): CsvV2Row | null => {
  if (rows.length === 0) return null
  const wantedId = getResourceInfoValue(['资源 id', 'id'])
  const wantedName = getResourceInfoValue(['资源名称', 'name'])
  if (wantedId) {
    const found = rows.find(row => row.id === wantedId)
    if (found) return found
  }
  if (wantedName) {
    const found = rows.find(row => row.name === wantedName)
    if (found) return found
  }
  return rows[rows.length - 1]
}

const fetchTextFileFromRepo = async (
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<string> => {
  const readByGitBlob = async (): Promise<string> => {
    try {
      const cacheKey = `${owner}/${repo}@${ref}`
      let tree = repoTreeCache.get(cacheKey)
      if (!tree) {
        const commit = await githubGet<{ commit?: { tree?: { sha?: string } } }>(
          `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`
        )
        const rootTreeSha = commit.commit?.tree?.sha
        if (!rootTreeSha) return ''
        const treeResp = await githubGet<{ tree?: Array<{ path?: string; type?: string; sha?: string }> }>(
          `/repos/${owner}/${repo}/git/trees/${rootTreeSha}?recursive=1`
        )
        tree = treeResp.tree || []
        repoTreeCache.set(cacheKey, tree)
      }
      const node = tree.find(item => item.path === path && item.type === 'blob')
      if (!node?.sha) return ''
      const blob = await githubGet<{ content?: string; encoding?: string }>(
        `/repos/${owner}/${repo}/git/blobs/${node.sha}`
      )
      if (!blob.content || (blob.encoding && blob.encoding !== 'base64')) return ''
      return decodeBase64Utf8(blob.content.replace(/\n/g, ''))
    } catch {
      return ''
    }
  }

  try {
    const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
    const file = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
    )
    if (!file.content || (file.encoding && file.encoding !== 'base64')) {
      return readByGitBlob()
    }
    return decodeBase64Utf8(file.content.replace(/\n/g, ''))
  } catch {
    return readByGitBlob()
  }
}

const detectCsvAddedRowByRepoDiff = async (pr: PullListItem, baseRef: string): Promise<CsvV2Row | null> => {
  const csvCandidates = prFiles.value.filter(file => /(^|\/)index(_v2)?\.csv$/i.test(file.filename))
  if (csvCandidates.length === 0) return null
  const addedRows: CsvV2Row[] = []
  for (const file of csvCandidates) {
    const path = file.filename
    const baseText = await fetchTextFileFromRepo(props.owner, props.repo, baseRef, path)
    const headText = await fetchTextFileFromRepo(pr.headOwner, pr.headRepo, pr.headRef, path)
    if (!headText) continue
    const baseRows = parseCsvRowsFromText(baseText)
    const headRows = parseCsvRowsFromText(headText)
    const baseSet = new Set(baseRows.map(serializeCsvRow))
    for (const row of headRows) {
      if (!baseSet.has(serializeCsvRow(row))) {
        addedRows.push(row)
      }
    }
  }
  return pickBestCsvRow(addedRows)
}

const addedCsvLines = computed(() => {
  const csvFile = prFiles.value.find(file => /(^|\/)index(_v2)?\.csv$/i.test(file.filename))
  if (!csvFile?.patch) return []
  return csvFile.patch
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1).trim())
    .filter(line => line && !line.startsWith('id,') && line.includes(','))
})

const parsedCsvRow = computed<CsvV2Row | null>(() => {
  const wantedId = getResourceInfoValue(['资源 id', 'id'])
  for (const line of addedCsvLines.value) {
    const row = parseCsvV2Row(line)
    if (!row) continue
    if (wantedId && row.id === wantedId) return row
  }
  for (const line of addedCsvLines.value) {
    const row = parseCsvV2Row(line)
    if (row) return row
  }
  return csvRowFromRepoDiff.value
})

const isPrivateHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true
  return false
}

const checkPublicUrl = (raw: string): { ok: boolean; reason: string } => {
  if (!raw) return { ok: false, reason: '缺少链接' }
  try {
    const url = new URL(raw)
    if (!/^https?:$/.test(url.protocol)) return { ok: false, reason: '链接协议不是 http/https' }
    if (isPrivateHost(url.hostname)) return { ok: false, reason: '链接使用了私有域名/内网地址' }
    return { ok: true, reason: '链接格式正常' }
  } catch {
    return { ok: false, reason: '链接格式无效' }
  }
}

const checkRawGithubUrl = (raw: string): { ok: boolean; reason: string } => {
  const base = checkPublicUrl(raw)
  if (!base.ok) return base
  try {
    const url = new URL(raw)
    if (url.hostname !== 'raw.githubusercontent.com') {
      return { ok: false, reason: '不是 raw.githubusercontent.com 链接' }
    }
    return { ok: true, reason: 'Raw 链接格式正确' }
  } catch {
    return { ok: false, reason: '链接格式无效' }
  }
}

const ruleChecks = computed<RuleCheckItem[]>(() => {
  const checks: RuleCheckItem[] = []
  const csvRow = parsedCsvRow.value
  const resourceName = getResourceInfoValue(['资源名称', 'name'])
  const iconRaw = submissionOverview.value.images.icon?.url || ''
  const coverRaw = submissionOverview.value.images.cover?.url || ''
  const repoExists = !repoFilesError.value && repoFiles.value.length > 0

  checks.push({
    title: 'index.csv / index_v2.csv 已新增资源行',
    status: csvRow ? 'pass' : 'fail',
    detail: csvRow ? `检测到新增行：${csvRow.id}` : '未检测到 CSV 新增资源行（严重）'
  })

  const iconCheck = checkRawGithubUrl(iconRaw)
  checks.push({
    title: 'CSV icon 链接可访问且为 Raw，且非私有域名',
    status: iconCheck.ok ? 'pass' : 'fail',
    detail: iconCheck.reason
  })

  const coverCheck = checkRawGithubUrl(coverRaw)
  checks.push({
    title: 'CSV cover 链接可访问且为 Raw，且非私有域名',
    status: coverCheck.ok ? 'pass' : 'fail',
    detail: coverCheck.reason
  })

  const tagsOk = csvRow ? !(csvRow.tags.includes('，') || csvRow.tags.includes('/') || csvRow.tags.includes('|')) : false
  const devicesOk = csvRow ? !(csvRow.devices.includes('，') || csvRow.devices.includes('/') || csvRow.devices.includes('|')) : false
  checks.push({
    title: 'CSV tags / devices 分隔符检查',
    status: csvRow ? (tagsOk && devicesOk ? 'pass' : 'warn') : 'warn',
    detail: csvRow ? (tagsOk && devicesOk ? '未发现明显分隔符错误' : '建议使用分号 ; 作为分隔符') : '未解析到 CSV 新增行'
  })

  checks.push({
    title: '资源目标仓库真实存在',
    status: repoExists ? 'pass' : 'fail',
    detail: repoExists ? '已可访问并读取仓库文件树' : (repoFilesError.value || '仓库不可访问')
  })

  const manifestExists = repoFiles.value.includes('manifest_v2.json') || repoFiles.value.includes('manifest.json')
  checks.push({
    title: 'manifest 文件存在且 JSON 可解析',
    status: manifestV2Data.value ? 'pass' : (manifestExists ? 'warn' : 'fail'),
    detail: manifestV2Data.value ? 'manifest_v2.json 解析成功' : (manifestLoadError.value || (manifestExists ? '存在 manifest 但未解析成功' : '仓库缺少 manifest_v2.json/manifest.json'))
  })

  const manifestName = String(manifestV2Data.value?.item?.name || '')
  checks.push({
    title: 'manifest 名称与 CSV 名称一致',
    status: manifestName && resourceName ? (manifestName === resourceName ? 'pass' : 'fail') : 'warn',
    detail: manifestName && resourceName ? `manifest: ${manifestName} / csv: ${resourceName}` : '缺少可比对字段'
  })

  const downloads = manifestV2Data.value?.downloads && typeof manifestV2Data.value.downloads === 'object'
    ? Object.entries(manifestV2Data.value.downloads as Record<string, any>)
    : []
  const unknownDeviceIds = downloads
    .map(([device]) => device)
    .filter(device => !knownDeviceIds.has(device))
  checks.push({
    title: 'manifest downloads 设备代号有效性',
    status: downloads.length === 0 ? 'warn' : (unknownDeviceIds.length === 0 ? 'pass' : 'fail'),
    detail: downloads.length === 0 ? '未检测到 downloads 字典' : (unknownDeviceIds.length === 0 ? '设备代号均在白名单内' : `未知设备代号：${unknownDeviceIds.join(', ')}`)
  })

  const missingDownloadFiles = downloads
    .map(([, item]) => String(item?.file_name || item?.file || ''))
    .filter(file => file && !repoFiles.value.includes(file))
  checks.push({
    title: 'manifest downloads 文件存在性',
    status: downloads.length === 0 ? 'warn' : (missingDownloadFiles.length === 0 ? 'pass' : 'fail'),
    detail: downloads.length === 0 ? '未检测到 downloads 字典' : (missingDownloadFiles.length === 0 ? '下载文件均存在' : `缺失文件：${missingDownloadFiles.join(', ')}`)
  })

  const authors = Array.isArray(manifestV2Data.value?.item?.author)
    ? manifestV2Data.value.item.author
    : []
  const badAuthorUrls = authors
    .map((author: any) => String(author?.author_url || '').trim())
    .filter((url: string) => url && !checkPublicUrl(url).ok)
  checks.push({
    title: 'manifest author_url 合规性',
    status: badAuthorUrls.length === 0 ? 'pass' : 'warn',
    detail: badAuthorUrls.length === 0 ? '未发现明显不合规 URL' : `疑似不合规链接：${badAuthorUrls.join(' , ')}`
  })

  checks.push({
    title: '资源内容合规性（人工审核）',
    status: 'manual',
    detail: '色情低俗/政治敏感/盗传/低质量/实际可运行等需人工确认'
  })
  checks.push({
    title: '知名 IP 版权声明图（人工审核）',
    status: 'manual',
    detail: '若使用知名 IP，需在 preview 中包含版权声明图'
  })
  return checks
})

async function githubGet<T>(path: string): Promise<T> {
  try {
    const { rest } = createGitHubClient(resolvedToken.value)
    const response = await rest.request(`GET ${path}`)
    return response.data as T
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw new Error(normalized.message)
  }
}

async function githubPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const { rest } = createGitHubClient(resolvedToken.value)
    const response = await rest.request(`POST ${path}`, { data: body })
    return response.data as T
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw new Error(normalized.message)
  }
}

const fetchRepoJsonFile = async (
  owner: string,
  repo: string,
  ref: string,
  path: string
): Promise<Record<string, any> | null> => {
  try {
    const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/')
    const file = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
    )
    if (!file.content || (file.encoding && file.encoding !== 'base64')) return null
    const text = decodeBase64Utf8(file.content.replace(/\n/g, ''))
    return JSON.parse(text) as Record<string, any>
  } catch {
    return null
  }
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
    if (!canLoad.value) throw new Error('请先配置目标仓库与 GitHub Token（支持 .env.local 的 VITE_GITHUB_TOKEN）')

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
        resourceRepoOwner: headOwner,
        resourceRepoName: headRepo,
        resourceRepoRef: headRef,
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
  csvRowFromRepoDiff.value = null
  try {
    const [pullDetail, comments, files] = await Promise.all([
      githubGet<{ body?: string; base?: { ref?: string } }>(
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
    const baseRef = pullDetail.base?.ref || 'main'
    csvRowFromRepoDiff.value = await detectCsvAddedRowByRepoDiff(pr, baseRef)
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
  manifestV2Data.value = null
  manifestLoadError.value = ''
  try {
    if (!pr.headOwner || !pr.headRepo) {
      repoFiles.value = []
      repoFilesError.value = 'PR 头分支仓库信息缺失，无法加载文件'
      return
    }
    const repoBranch = pr.headRef || 'main'
    pr.resourceRepoOwner = pr.headOwner
    pr.resourceRepoName = pr.headRepo
    pr.resourceRepoRef = repoBranch
    const commit = await githubGet<{ commit?: { tree?: { sha?: string } } }>(
      `/repos/${pr.headOwner}/${pr.headRepo}/commits/${encodeURIComponent(repoBranch)}`
    )
    const treeSha = commit.commit?.tree?.sha
    if (!treeSha) {
      repoFiles.value = []
      return
    }
    const tree = await githubGet<{ tree?: Array<{ path?: string; type?: string }> }>(
      `/repos/${pr.headOwner}/${pr.headRepo}/git/trees/${treeSha}?recursive=1`
    )
    repoFiles.value = (tree.tree || [])
      .filter(item => item.type === 'blob' && item.path)
      .map(item => item.path as string)
      .slice(0, 3000)

    const manifestCandidates = [
      ...prFiles.value
        .map(file => file.filename)
        .filter(path => /(^|\/)manifest_v2\.json$/i.test(path)),
      ...prFiles.value
        .map(file => file.filename)
        .filter(path => /(^|\/)manifest\.json$/i.test(path)),
      'manifest_v2.json',
      'manifest.json'
    ]
    const dedupedManifestCandidates = Array.from(new Set(manifestCandidates))

    for (const path of dedupedManifestCandidates) {
      manifestV2Data.value = await fetchRepoJsonFile(
        pr.headOwner,
        pr.headRepo,
        repoBranch,
        path
      )
      if (manifestV2Data.value) break
    }
    if (!manifestV2Data.value) {
      manifestLoadError.value = 'manifest 文件不存在或不是有效 JSON'
    }
  } catch (error: unknown) {
    repoFilesError.value = error instanceof Error ? error.message : '仓库文件加载失败'
    repoFiles.value = []
    manifestV2Data.value = null
    manifestLoadError.value = ''
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

const refreshPrCommentsAndStatus = async (pr: PullListItem): Promise<void> => {
  const comments = await githubGet<IssueCommentItem[]>(
    `/repos/${props.owner}/${props.repo}/issues/${pr.number}/comments?per_page=100`
  )
  prComments.value = comments
  const review = deriveReviewStatus(comments)
  pr.review = review
  pr.status = review.state
  const idx = pullRequests.value.findIndex(item => item.number === pr.number)
  if (idx >= 0) {
    pullRequests.value[idx].review = review
    pullRequests.value[idx].status = review.state
  }
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

const scrollToCommentById = async (commentId: number): Promise<void> => {
  const selector = `[data-review-comment-id="${commentId}"]`
  for (let i = 0; i < 8; i += 1) {
    await nextTick()
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    await new Promise(resolve => setTimeout(resolve, 80))
  }
}

const submitPresetComment = async (): Promise<void> => {
  if (!selectedPr.value) return
  const body = submitCommentBody.value
  if (!body) {
    openCommentResultDialog('发送失败', '评论 ID 不能为空')
    return
  }
  commentSubmitting.value = true
  try {
    const created = await githubPost<{ id: number }>(
      `/repos/${props.owner}/${props.repo}/issues/${selectedPr.value.number}/comments`,
      { body }
    )
    commentMessage.value = ''
    commentEditorTab.value = 'edit'
    await refreshPrCommentsAndStatus(selectedPr.value)
    await scrollToCommentById(created.id)
    openCommentResultDialog('发送成功', '评论已发送并立即刷新评论列表。')
  } catch (error: unknown) {
    openCommentResultDialog('发送失败', error instanceof Error ? error.message : '评论发送失败')
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
