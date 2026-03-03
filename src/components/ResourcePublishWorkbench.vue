<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <template v-if="mode === 'publish'">
      <div class="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div class="space-y-4 xl:sticky xl:top-[72px] xl:self-start">
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤导航</CardTitle>
            </CardHeader>
            <CardContent class="pt-0">
              <ol class="space-y-2">
                <li
                  v-for="(step, index) in stepList"
                  :key="step.label"
                  class="relative pl-10"
                >
                  <div
                    v-if="index < stepList.length - 1"
                    class="absolute left-4 top-8 h-[calc(100%-4px)] w-px bg-border"
                  />
                  <span
                    class="absolute left-0 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold"
                    :class="
                      step.done
                        ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-600'
                        : activeStep === step.targetStep
                          ? 'border-primary/60 bg-primary/10 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    "
                  >
                    {{ index + 1 }}
                  </span>
                  <button
                    type="button"
                    class="w-full rounded-xl border px-3 py-2 text-left text-sm transition"
                    :class="[
                      activeStep === step.targetStep
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/30',
                      step.done ? '!text-foreground' : ''
                    ]"
                    @click="goToStep(step.targetStep)"
                  >
                    <p class="font-medium">{{ step.label }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ step.done ? '已完成' : activeStep === step.targetStep ? '进行中' : '待完成' }}
                    </p>
                  </button>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card
            v-if="isResourceUpdateMode || workspacePath || workspaceTree.length || remoteWorkspacePath || remoteWorkspaceTree.length"
            class="border-border bg-card"
          >
            <CardHeader class="pb-2">
              <CardTitle class="text-xs font-medium uppercase tracking-wide text-muted-foreground">文件树</CardTitle>
            </CardHeader>
            <CardContent class="pt-0">
              <div v-if="isResourceUpdateMode" class="space-y-2">
                <p class="truncate px-1 text-[11px] text-muted-foreground">{{ remoteWorkspacePath || '未同步远程仓库' }}</p>
                <nav class="max-h-56 overflow-y-auto" aria-label="Remote File Tree">
                  <div
                    v-if="remoteWorkspaceTree.length === 0"
                    class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
                  >
                    当前 GitHub 仓库暂无可识别文件
                  </div>
                  <ul v-else class="space-y-1" role="tree" aria-label="Remote Tree">
                    <li
                      v-for="item in visibleRemoteItems"
                      :key="item.path"
                      role="treeitem"
                      :aria-level="item.depth + 1"
                    >
                      <button
                        v-if="item.type === 'folder'"
                        type="button"
                        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                        :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                        :title="item.path"
                        @click="toggleRemoteFolder(item.path)"
                      >
                        <CaretRight
                          v-if="item.collapsed"
                          :size="12"
                          weight="bold"
                          class="shrink-0 text-muted-foreground"
                        />
                        <CaretDown
                          v-else
                          :size="12"
                          weight="bold"
                          class="shrink-0 text-muted-foreground"
                        />
                        <FolderIcon :size="14" weight="fill" class="shrink-0 text-muted-foreground" />
                        <span class="truncate">{{ item.label }}</span>
                      </button>
                      <div
                        v-else
                        class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                        :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                        :title="item.path"
                      >
                        <span class="w-3 shrink-0" />
                        <FileIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                        <span class="truncate">{{ item.label }}</span>
                      </div>
                    </li>
                  </ul>
                </nav>
              </div>
              <Tabs v-else v-model="fileTreeTab" class="space-y-2">
                <TabsList class="grid w-full grid-cols-2">
                  <TabsTrigger value="workspace">本地文件</TabsTrigger>
                  <TabsTrigger value="remote">GitHub仓库文件</TabsTrigger>
                </TabsList>

                <TabsContent value="workspace" class="mt-0">
                  <p class="truncate px-1 text-[11px] text-muted-foreground">{{ workspacePath || '未选择文件夹' }}</p>
                  <nav class="mt-2 max-h-56 overflow-y-auto" aria-label="Workspace File Tree">
                    <div
                      v-if="workspaceTree.length === 0"
                      class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
                    >
                      当前文件夹暂无可识别文件
                    </div>
                    <ul v-else class="space-y-1" role="tree" aria-label="Workspace Tree">
                      <li
                        v-for="item in visibleWorkspaceItems"
                        :key="item.path"
                        role="treeitem"
                        :aria-level="item.depth + 1"
                      >
                        <button
                          v-if="item.type === 'folder'"
                          type="button"
                          class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                          :title="item.path"
                          @click="toggleWorkspaceFolder(item.path)"
                        >
                          <CaretRight
                            v-if="item.collapsed"
                            :size="12"
                            weight="bold"
                            class="shrink-0 text-muted-foreground"
                          />
                          <CaretDown
                            v-else
                            :size="12"
                            weight="bold"
                            class="shrink-0 text-muted-foreground"
                          />
                          <FolderIcon :size="14" weight="fill" class="shrink-0 text-muted-foreground" />
                          <span class="truncate">{{ item.label }}</span>
                        </button>
                        <div
                          v-else
                          class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                          :title="item.path"
                        >
                          <span class="w-3 shrink-0" />
                          <FileIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <span class="truncate">{{ item.label }}</span>
                        </div>
                      </li>
                    </ul>
                  </nav>
                </TabsContent>

                <TabsContent value="remote" class="mt-0">
                  <p class="truncate px-1 text-[11px] text-muted-foreground">{{ remoteWorkspacePath || '未同步远程仓库' }}</p>
                  <nav class="mt-2 max-h-56 overflow-y-auto" aria-label="Remote File Tree">
                    <div
                      v-if="remoteWorkspaceTree.length === 0"
                      class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
                    >
                      当前 GitHub 仓库暂无可识别文件
                    </div>
                    <ul v-else class="space-y-1" role="tree" aria-label="Remote Tree">
                      <li
                        v-for="item in visibleRemoteItems"
                        :key="item.path"
                        role="treeitem"
                        :aria-level="item.depth + 1"
                      >
                        <button
                          v-if="item.type === 'folder'"
                          type="button"
                          class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                          :title="item.path"
                          @click="toggleRemoteFolder(item.path)"
                        >
                          <CaretRight
                            v-if="item.collapsed"
                            :size="12"
                            weight="bold"
                            class="shrink-0 text-muted-foreground"
                          />
                          <CaretDown
                            v-else
                            :size="12"
                            weight="bold"
                            class="shrink-0 text-muted-foreground"
                          />
                          <FolderIcon :size="14" weight="fill" class="shrink-0 text-muted-foreground" />
                          <span class="truncate">{{ item.label }}</span>
                        </button>
                        <div
                          v-else
                          class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                          :title="item.path"
                        >
                          <span class="w-3 shrink-0" />
                          <FileIcon :size="14" weight="duotone" class="shrink-0 text-muted-foreground" />
                          <span class="truncate">{{ item.label }}</span>
                        </div>
                      </li>
                    </ul>
                  </nav>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card class="hidden border-border bg-card xl:block">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between gap-2">
                <CardTitle class="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="clearPublishLogs">清空</Button>
              </div>
            </CardHeader>
            <CardContent class="pt-0">
              <div class="scrollbar-none max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
                <pre class="m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">{{ publishLogsText }}</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="space-y-4">
          <Card v-if="!isResourceUpdateMode">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">当前文件夹路径</CardTitle>
            </CardHeader>
            <CardContent class="pt-0">
              <div class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                {{ workspacePath || '未选择文件夹' }}
              </div>
              <p class="mt-2 text-xs text-muted-foreground">
                浏览器环境受安全限制，显示的是可用路径标识，不是系统绝对路径。
              </p>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 0">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 1：创建文件夹</CardTitle>
              <CardDescription>创建或选择资源目录。Token 将直接使用当前登录会话。</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <div class="space-y-3 rounded-lg border border-border bg-muted/25 p-3">
                <div class="space-y-3">
                  <div class="space-y-1.5">
                    <Label for="workspace-folder-name">新文件夹名称</Label>
                    <div class="flex items-center gap-2">
                      <Input
                        id="workspace-folder-name"
                        v-model="workspaceFolderPrefixInput"
                        placeholder="例如：MyApp"
                      />
                      <span class="text-xs text-muted-foreground">_AstroBox_Release</span>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <Button :disabled="isBusy" @click="createWorkspaceFolder">
                      创建文件夹
                    </Button>
                    <Button variant="outline" :disabled="isBusy" @click="selectWorkspace">
                      <FolderOpen :size="16" weight="duotone" />
                      选择已有文件夹
                    </Button>
                    <Button variant="outline" :disabled="isBusy" @click="refreshWorkspaceFileTree">
                      刷新文件树
                    </Button>
                  </div>
                </div>

              </div>

              <div class="flex justify-end">
                <Button :disabled="!isWorkspaceStepDone" @click="goToStep(1)">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 1">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 2：资源信息</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">应用信息</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4 pt-0">
                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="space-y-1.5">
                      <div class="flex items-center gap-2">
                        <Label for="item-id">资源 ID</Label>
                        <Button variant="outline" size="sm" class="h-7 px-2 text-xs" @click="showResourceIdGuide = true">这是什么？</Button>
                      </div>
                      <Input id="item-id" v-model="itemId" placeholder="com.example.app / 9798xxxxxx" />
                    </div>
                    <div class="space-y-1.5">
                      <Label for="item-name">资源名称</Label>
                      <Input id="item-name" v-model="itemName" placeholder="My Resource" />
                    </div>
                  </div>

                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="space-y-1.5">
                      <Label for="restype">资源类型</Label>
                      <Select v-model="restype">
                        <SelectTrigger id="restype">
                          <SelectValue placeholder="请选择资源类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quickapp">快应用 (quickapp)</SelectItem>
                          <SelectItem value="watchface">表盘 (watchface)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div class="space-y-1.5">
                      <Label for="paid-type">付费类型</Label>
                      <Select v-model="paidTypeSelectValue">
                        <SelectTrigger id="paid-type">
                          <SelectValue placeholder="免费（留空）" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">免费(感谢你作出的贡献)</SelectItem>
                          <SelectItem value="paid">应用内付费(paid，体验版请选择此项)</SelectItem>
                          <SelectItem value="force_paid">强制付费(force_paid)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <Label for="item-description">资源描述</Label>
                    <Textarea
                      id="item-description"
                      v-model="itemDescription"
                      class="min-h-[90px] resize-y overflow-auto"
                      placeholder="填写资源描述（manifest_v2.item.description）"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">资源属性</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4 pt-0">
                  <div class="space-y-2">
                    <Label>标签</Label>
                    <div class="flex flex-wrap gap-2">
                      <Badge v-for="(tag, index) in tags" :key="`${tag}-${index}`" variant="outline" class="gap-1">
                        {{ tag }}
                        <button
                          type="button"
                          class="text-muted-foreground hover:text-foreground"
                          @click="removeTag(index)"
                        >
                          ×
                        </button>
                      </Badge>
                      <span v-if="tags.length === 0" class="text-xs text-muted-foreground">暂无标签</span>
                    </div>
                    <div class="flex gap-2 max-sm:flex-col">
                      <Input
                        v-model="tagInput"
                        placeholder="输入标签后回车或点击添加"
                        @keydown.enter.prevent="addTag"
                      />
                      <Button variant="default" class="font-semibold" @click="addTag">添加标签</Button>
                    </div>
                  </div>

                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="space-y-1.5">
                      <Label for="icon-path">图标</Label>
                      <div class="flex gap-2 max-sm:flex-col">
                        <Input id="icon-path" v-model="iconPath" readonly placeholder="点击右侧按钮从工作区选择文件" />
                        <Button
                          variant="outline"
                          @click="isResourceUpdateMode ? openRemoteFilePicker('icon') : selectIconFile()"
                        >
                          选择文件
                        </Button>
                      </div>
                      <p class="text-xs text-muted-foreground">宽高比 1:1，大小不超过 200px × 200px</p>
                    </div>
                    <div class="space-y-1.5">
                      <Label for="cover-path">封面</Label>
                      <div class="flex gap-2 max-sm:flex-col">
                        <Input id="cover-path" v-model="coverPath" readonly placeholder="点击右侧按钮从工作区选择文件" />
                        <Button
                          variant="outline"
                          @click="isResourceUpdateMode ? openRemoteFilePicker('cover') : selectCoverFile()"
                        >
                          选择文件
                        </Button>
                      </div>
                      <p class="text-xs text-muted-foreground">宽高比 1.5，宽度不宜超过 2000px</p>
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <Label>预览图（支持多选）</Label>
                    <draggable
                      v-model="previewItems"
                      item-key="id"
                      handle=".preview-drag-handle"
                      class="space-y-2"
                    >
                      <template #item="{ element, index }">
                        <div class="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background p-2">
                          <div class="preview-drag-handle flex h-8 w-6 cursor-move items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <DragDots :size="16" weight="bold" />
                          </div>
                          <Input :model-value="element.path" readonly class="min-w-0 flex-1" />
                          <Button
                            variant="outline"
                            size="icon"
                            class="h-8 w-8 rounded-full"
                            @click="removePreview(index)"
                          >
                            <MinusIcon :size="16" weight="bold" />
                          </Button>
                        </div>
                      </template>
                    </draggable>
                    <Button
                      variant="default"
                      class="font-semibold"
                      @click="isResourceUpdateMode ? openRemoteFilePicker('preview') : selectMultiplePreviewFiles()"
                    >
                      + 添加预览图
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">作者信息</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3 pt-0">
                  <div
                    v-for="(author, index) in authors"
                    :key="`author-${index}`"
                    class="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div class="space-y-1.5">
                        <Label :for="`author-name-${index}`">作者名称</Label>
                        <Input :id="`author-name-${index}`" v-model="author.name" placeholder="作者名" />
                      </div>
                      <Button variant="outline" @click="removeAuthor(index)">删除作者</Button>
                    </div>
                    <div class="space-y-1.5">
                      <Label :for="`author-url-${index}`">作者链接（仅 v1）</Label>
                      <Input :id="`author-url-${index}`" v-model="author.authorUrl" placeholder="https://github.com/yourname" />
                      <p class="text-xs text-muted-foreground">该字段仅用于生成 v1 的 `manifest.json`（author_url）。</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <Button
                        :variant="author.bindABAccount ? 'default' : 'outline'"
                        size="sm"
                        @click="author.bindABAccount = true"
                      >
                        绑定 AB 账号
                      </Button>
                      <Button
                        :variant="!author.bindABAccount ? 'default' : 'outline'"
                        size="sm"
                        @click="author.bindABAccount = false"
                      >
                        不绑定
                      </Button>
                    </div>
                  </div>
                  <Button variant="default" class="font-semibold" @click="addAuthor">+ 添加作者</Button>
                </CardContent>
              </Card>

              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">相关链接（links）</CardTitle>
                  <CardDescription>icon 请填写 phosphor 图标名，可点击搜索按钮选择。</CardDescription>
                </CardHeader>
                <CardContent class="space-y-3 pt-0">
                  <div
                    v-for="(link, index) in links"
                    :key="`link-${index}`"
                    class="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                      <div class="space-y-1.5">
                        <Label :for="`link-icon-${index}`">图标名（icon）</Label>
                        <div class="flex gap-2">
                          <Input
                            :id="`link-icon-${index}`"
                            v-model="link.icon"
                            placeholder="github-logo / house / globe"
                          />
                          <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                            <component
                              :is="getLinkIconPreviewComponent(link.icon)"
                              v-if="getLinkIconPreviewComponent(link.icon)"
                              :size="18"
                              weight="duotone"
                              class="text-foreground"
                            />
                            <WarningCircle
                              v-else
                              :size="16"
                              weight="duotone"
                              class="text-muted-foreground"
                            />
                          </div>
                          <Button variant="outline" @click="openLinkIconPicker(index)">搜索图标</Button>
                        </div>
                      </div>
                      <div class="space-y-1.5">
                        <Label :for="`link-title-${index}`">标题（title）</Label>
                        <Input :id="`link-title-${index}`" v-model="link.title" placeholder="开源地址" />
                      </div>
                      <Button variant="outline" @click="removeLink(index)">删除链接</Button>
                    </div>
                    <div class="space-y-1.5">
                      <Label :for="`link-url-${index}`">URL</Label>
                      <Input :id="`link-url-${index}`" v-model="link.url" placeholder="https://github.com/xxx/yyy" />
                    </div>
                  </div>
                  <Button variant="default" class="font-semibold" @click="addLink">+ 添加链接</Button>
                  <p v-if="linksValidationMessage" class="text-xs text-destructive">
                    {{ linksValidationMessage }}
                  </p>
                </CardContent>
              </Card>

              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">下载资源</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3 pt-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <Button variant="default" class="font-semibold" @click="showDeviceSelector = true">+ 选择支持设备</Button>
                    <span v-if="selectedDeviceIds.length === 0" class="text-xs text-muted-foreground">尚未选择设备</span>
                  </div>

                  <div
                    v-for="deviceId in selectedDeviceIds"
                    :key="`download-${deviceId}`"
                    class="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="text-sm font-semibold text-foreground">{{ getDeviceLabel(deviceId) }}</div>
                      <Button variant="outline" size="sm" @click="removeDevice(deviceId)">移除设备</Button>
                    </div>
                    <div class="grid gap-3 md:grid-cols-2">
                      <div class="space-y-1.5">
                        <Label :for="`download-version-${deviceId}`">版本号</Label>
                        <Input :id="`download-version-${deviceId}`" v-model="downloads[deviceId].version" placeholder="1.0.0" />
                      </div>
                      <div class="space-y-1.5">
                        <Label :for="`download-file-${deviceId}`">文件路径</Label>
                        <div class="flex gap-2 max-sm:flex-col">
                          <Input
                            :id="`download-file-${deviceId}`"
                            v-model="downloads[deviceId].file_name"
                            readonly
                            placeholder="点击右侧按钮从工作区选择文件"
                          />
                          <Button
                            variant="outline"
                            @click="isResourceUpdateMode ? openRemoteFilePicker('download', deviceId) : selectDownloadFile(deviceId)"
                          >
                            选择文件
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div class="flex justify-between gap-2">
                <Button variant="outline" @click="goToStep(0)">上一步</Button>
                <Button :disabled="!isResourceInfoStepDone" @click="openSubmitVersionDialog">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 2">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 3：上传资源仓库</CardTitle>
              <CardDescription>创建或复用仓库，并上传所选版本需要的 manifest 与资源文件。</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <div class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                当前提交流程：
                <span class="font-semibold">{{ submitModeLabel }}</span>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="repo-name">资源仓库名（可选）</Label>
                  <Input id="repo-name" v-model="repoName" placeholder="留空时默认使用当前文件夹名" />
                </div>
                <div class="space-y-1.5">
                  <Label for="repo-desc">仓库描述（可选）</Label>
                  <Input id="repo-desc" v-model="repoDescription" placeholder="resource repository" />
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <Button :disabled="uploading || !canUpload" @click="handleUploadResources">
                  <UploadSimple :size="16" weight="duotone" />
                  {{ uploading ? '上传中...' : '创建仓库并上传' }}
                </Button>
              </div>

              <div v-if="uploadedRepoUrl" class="rounded-lg border border-border bg-muted/25 p-3 text-sm">
                <p class="mb-1 font-medium text-foreground">仓库已就绪</p>
                <a
                  :href="uploadedRepoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="break-all text-primary hover:underline"
                >
                  {{ uploadedRepoUrl }}
                </a>
              </div>

              <div class="flex justify-between gap-2">
                <Button variant="outline" @click="goToStep(1)">上一步</Button>
                <Button :disabled="!isUploadStepDone" @click="goToStep(3)">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 3">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 4：提交 Pull Request</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="upstream-owner">目标仓库 Owner</Label>
                  <Input id="upstream-owner" v-model="upstreamOwner" />
                </div>
                <div class="space-y-1.5">
                  <Label for="upstream-repo">目标仓库名</Label>
                  <Input id="upstream-repo" v-model="upstreamRepo" />
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-1">
                <div class="space-y-1.5">
                  <Label for="pr-title">PR 标题</Label>
                  <Input id="pr-title" v-model="prTitle" placeholder="[ABCC] Add new resource" />
                </div>
              </div>

              <div class="space-y-1.5">
                <Label for="pr-body">PR 描述（可选）</Label>
                <Textarea id="pr-body" v-model="prBody" class="min-h-[110px]" />
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2">
                <Button variant="outline" @click="goToStep(2)">上一步</Button>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <a
                    v-if="latestPrUrl"
                    :href="latestPrUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-primary hover:underline"
                  >
                    查看最新 PR
                  </a>
                  <Button :disabled="creatingPr || !canSubmitPr" @click="handleCreateCatalogPr">
                    <GitPullRequest :size="16" weight="duotone" />
                    {{ creatingPr ? '创建中...' : '提交 Pull Request' }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card class="border-border bg-card xl:hidden">
            <CardHeader class="pb-2">
              <div class="flex items-center justify-between gap-2">
                <CardTitle class="text-xs font-medium uppercase tracking-wide text-muted-foreground">日志</CardTitle>
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="clearPublishLogs">清空</Button>
              </div>
            </CardHeader>
            <CardContent class="pt-0">
              <div class="scrollbar-none max-h-56 overflow-y-auto rounded-md border border-border bg-muted/25 p-2.5">
                <pre class="m-0 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">{{ publishLogsText }}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog :open="showUploadCompleteDialog" @update:open="showUploadCompleteDialog = $event">
        <DialogContent class="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>上传已完成</DialogTitle>
            <DialogDescription>资源仓库已创建并上传完成，你可以继续下一步创建 PR。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button @click="showUploadCompleteDialog = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showSubmitVersionDialog" @update:open="showSubmitVersionDialog = $event">
        <DialogContent class="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>选择提交版本</DialogTitle>
            <DialogDescription>请选择本次要提交到 v1、v2，或同时提交。</DialogDescription>
          </DialogHeader>
          <div class="grid gap-2">
            <Button class="justify-start" @click="confirmSubmitMode('both')">同时提交 v1 + v2（推荐）</Button>
            <Button variant="outline" class="justify-start" @click="confirmSubmitMode('v2')">仅提交 v2</Button>
            <Button variant="outline" class="justify-start" @click="confirmSubmitMode('v1')">仅提交 v1</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showSubmitVersionDialog = false">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showDeviceSelector" @update:open="showDeviceSelector = $event">
        <DialogContent class="w-[95vw] !max-w-[1120px]">
          <DialogHeader>
            <DialogTitle>选择支持设备</DialogTitle>
            <DialogDescription>设备会自动映射为 v2 设备 ID，并同步到 downloads。</DialogDescription>
          </DialogHeader>
          <div class="my-2 max-h-[68vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 max-[420px]:grid-cols-1">
            <div
              v-for="entry in deviceSelectorEntries"
              :key="`device-option-${entry.key}`"
              class="h-full min-h-[92px] cursor-pointer rounded-lg border p-3 transition-colors"
              :class="
                isDeviceSelected(entry.id)
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-background hover:bg-accent'
              "
              @click="toggleDeviceSelection(entry.id)"
            >
              <div class="text-sm font-semibold text-foreground">{{ entry.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ entry.model }} · {{ entry.id }} / {{ entry.codename }}
              </div>
            </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showDeviceSelector = false">完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showResourceIdGuide" @update:open="showResourceIdGuide = $event">
        <DialogContent class="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>资源 ID 说明</DialogTitle>
            <DialogDescription>用于 `index_v2.csv` 的唯一标识，快应用和表盘规则不同。</DialogDescription>
          </DialogHeader>
          <div class="space-y-3 text-sm leading-6 text-foreground">
            <p>1. 快应用：填写应用包名，如 `com.searchstars.hyperbilibili`。</p>
            <p>2. 表盘：使用 `9798` 开头的占位 ID（12 位），例如 `979808741600`。</p>
            <p>3. 资源名、资源类型必须与 `manifest_v2.json` 中保持一致。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showResourceIdGuide = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showOutOfWorkspaceFileDialog" @update:open="showOutOfWorkspaceFileDialog = $event">
        <DialogContent class="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>文件不在当前工作区</DialogTitle>
            <DialogDescription>
              请先将需要的文件放入当前工作区，再重新选择。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showOutOfWorkspaceFileDialog = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showImageValidationDialog" @update:open="showImageValidationDialog = $event">
        <DialogContent class="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>图片规格不符合要求</DialogTitle>
            <DialogDescription>
              {{ imageValidationMessage }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showImageValidationDialog = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showFolderNameValidationDialog" @update:open="showFolderNameValidationDialog = $event">
        <DialogContent class="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>文件夹名称不符合规范</DialogTitle>
            <DialogDescription>
              {{ folderNameValidationMessage }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showFolderNameValidationDialog = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showFileNameConflictDialog" @update:open="showFileNameConflictDialog = $event">
        <DialogContent class="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>文件名冲突</DialogTitle>
            <DialogDescription>
              {{ fileNameConflictMessage }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showFileNameConflictDialog = false">我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showRemoteFilePickerDialog" @update:open="showRemoteFilePickerDialog = $event">
        <DialogContent class="flex h-[78vh] w-[95vw] !max-w-[1120px] flex-col overflow-hidden">
          <DialogHeader class="shrink-0">
            <DialogTitle>{{ remotePickerDialogTitle }}</DialogTitle>
          </DialogHeader>
          <div class="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-[minmax(0,1fr)_360px]">
            <div class="flex min-h-0 flex-col gap-3">
              <div v-if="remotePickerStep === 1" class="flex gap-2 max-sm:flex-col">
                <Button variant="outline" @click="createRemotePickerFolder">
                  <FolderPlus :size="14" weight="duotone" />
                  新建文件夹
                </Button>
              </div>
              <div v-else class="space-y-2">
                <div class="flex gap-2 max-sm:flex-col">
                  <Button variant="outline" @click="openRemotePickerLocalUpload">本地上传</Button>
                  <input
                    ref="remotePickerLocalInputRef"
                    type="file"
                    class="hidden"
                    :multiple="remotePickerMode === 'preview'"
                    @change="handleRemotePickerLocalUpload"
                  >
                </div>
                <Input
                  v-model="remotePickerUploadFileName"
                  placeholder="本地导入文件名（可选，含扩展名）"
                />
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
                <div
                  v-if="remotePickerStep === 1 && remotePickerFolderItems.length === 0"
                  class="px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  暂无可选文件夹
                </div>
                <div
                  v-else-if="remotePickerStep === 2 && remotePickerTreeItems.length === 0 && remotePickerLocalItems.length === 0"
                  class="px-3 py-4 text-center text-xs text-muted-foreground"
                >
                  暂无可选文件
                </div>
                <div v-else class="space-y-0.5 py-1">
                  <template
                    v-for="item in (remotePickerStep === 1 ? remotePickerFolderItems : remotePickerTreeItems)"
                    :key="`picker-${item.path}`"
                  >
                    <ContextMenuRoot v-if="item.type === 'folder'">
                      <ContextMenuTrigger as-child>
                        <div
                          class="flex w-full items-center gap-1 pr-1"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                        >
                          <button
                            type="button"
                            class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/30"
                            :class="remotePickerTargetFolder === item.path ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'"
                            @click="selectRemotePickerFolder(item.path)"
                            @dblclick="toggleRemoteFolder(item.path)"
                          >
                            <CaretRight
                              v-if="item.collapsed"
                              :size="12"
                              weight="bold"
                              class="shrink-0"
                            />
                            <CaretDown
                              v-else
                              :size="12"
                              weight="bold"
                              class="shrink-0"
                            />
                            <FolderIcon :size="14" weight="fill" class="shrink-0" />
                            <Input
                              v-if="remotePickerStep === 1 && remotePickerRenamingPath === item.path"
                              ref="remotePickerRenameInputRef"
                              v-model="remotePickerRenamingName"
                              class="h-6 min-w-0 flex-1 px-1 text-xs"
                              @click.stop
                              @keydown.enter.prevent="commitRenameDraftFolder"
                              @keydown.esc.prevent="cancelRenameDraftFolder"
                              @blur="commitRenameDraftFolder"
                            />
                            <span v-else class="truncate">{{ item.label }}</span>
                            <span
                              v-if="remotePickerTargetFolder === item.path"
                              class="ml-auto rounded border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary"
                            >
                              目标文件夹
                            </span>
                          </button>
                          <DropdownMenuRoot v-if="remotePickerStep === 1">
                            <DropdownMenuTrigger as-child>
                              <button
                                type="button"
                                class="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background hover:bg-accent"
                              >
                                <DotsThreeVertical :size="12" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuContent
                                side="right"
                                align="start"
                                :side-offset="6"
                                class="z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                              >
                                <DropdownMenuItem
                                  class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                  @select="createRemotePickerFolder(item.path)"
                                >
                                  <FolderPlus :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                                  新建子文件夹
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                                  :disabled="!isDraftFolder(item.path)"
                                  @select="startRenameDraftFolder(item.path)"
                                >
                                  <NotePencil :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                                  重命名
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                                  :disabled="!isDraftFolder(item.path)"
                                  @select="deleteDraftFolder(item.path)"
                                >
                                  <TrashIcon :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenuPortal>
                          </DropdownMenuRoot>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuPortal>
                        <ContextMenuContent
                          class="z-50 min-w-[150px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                        >
                          <ContextMenuItem
                            class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                            @select="selectRemotePickerFolder(item.path)"
                          >
                            <CheckCircle :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                            设为目标文件夹
                          </ContextMenuItem>
                          <ContextMenuItem
                            class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                            @select="createRemotePickerFolder(item.path)"
                          >
                            <FolderPlus :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                            新建子文件夹
                          </ContextMenuItem>
                          <ContextMenuItem
                            class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                            :disabled="!isDraftFolder(item.path)"
                            @select="startRenameDraftFolder(item.path)"
                          >
                            <NotePencil :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                            重命名
                          </ContextMenuItem>
                          <ContextMenuItem
                            class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm text-destructive outline-none hover:bg-accent"
                            :disabled="!isDraftFolder(item.path)"
                            @select="deleteDraftFolder(item.path)"
                          >
                            <TrashIcon :size="14" weight="duotone" class="mr-1.5 shrink-0" />
                            删除
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenuPortal>
                    </ContextMenuRoot>
                    <ContextMenuRoot v-else-if="remotePickerStep === 2">
                      <ContextMenuTrigger as-child>
                        <button
                          type="button"
                          class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 pr-3 text-left text-xs hover:bg-muted/30"
                          :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                          :class="remotePickerSelectedPaths.includes(item.path) ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'"
                          @click="toggleRemotePickerPath(item.path)"
                        >
                          <span class="w-3 shrink-0" />
                          <FileIcon :size="14" weight="duotone" class="shrink-0" />
                          <span class="truncate">{{ item.label }}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuPortal>
                        <ContextMenuContent
                          class="z-50 min-w-[150px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                        >
                          <ContextMenuItem
                            class="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none hover:bg-accent"
                            @select="toggleRemotePickerPath(item.path)"
                          >
                            <component
                              :is="remotePickerSelectedPaths.includes(item.path) ? MinusIcon : CheckCircle"
                              :size="14"
                              weight="duotone"
                              class="mr-1.5 shrink-0"
                            />
                            {{ remotePickerSelectedPaths.includes(item.path) ? '取消选择' : '选择文件' }}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenuPortal>
                    </ContextMenuRoot>
                  </template>
                </div>
                <div v-if="remotePickerStep === 2 && remotePickerLocalItems.length > 0" class="space-y-1 border-t border-border bg-muted/20 p-2">
                  <p class="px-1 text-[11px] text-muted-foreground">本地上传（OPFS）</p>
                  <button
                    v-for="path in remotePickerLocalItems"
                    :key="`local-picker-${path}`"
                    type="button"
                    class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/30"
                    :class="remotePickerSelectedPaths.includes(path) ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'"
                    @click="toggleRemotePickerPath(path)"
                  >
                    <FileIcon :size="14" weight="duotone" class="shrink-0" />
                    <span class="truncate">{{ path }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="shrink-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div class="text-xs text-muted-foreground">图片预览</div>
              <a
                v-if="remotePickerPreviewPath && isImageSelectablePath(remotePickerPreviewPath)"
                :href="getPickerPreviewUrl(remotePickerPreviewPath)"
                target="_blank"
                rel="noopener noreferrer"
                class="block overflow-hidden rounded-md border border-border bg-background"
              >
                <img
                  :src="getPickerPreviewUrl(remotePickerPreviewPath)"
                  :alt="remotePickerPreviewPath"
                  class="h-64 w-full object-contain"
                >
              </a>
              <div
                v-else
                class="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground"
              >
                选中文件后可预览图片
              </div>
              <p class="break-all text-[11px] text-muted-foreground">{{ remotePickerPreviewPath || '未选择文件' }}</p>
            </div>
          </div>
          <DialogFooter class="mt-3 shrink-0 border-t border-border pt-3">
            <Button variant="outline" @click="showRemoteFilePickerDialog = false">取消</Button>
            <Button v-if="remotePickerStep === 1" @click="remotePickerStep = 2">下一步</Button>
            <Button v-else variant="outline" @click="remotePickerStep = 1">上一步</Button>
            <Button v-if="remotePickerStep === 2" @click="applyRemotePickerSelection">确认选择</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkIconPickerDialog
        :open="showLinkIconPicker"
        :initial-query="linkPickerInitialQuery"
        @update:open="showLinkIconPicker = $event"
        @select="selectLinkIcon"
      />
    </template>

    <template v-else-if="mode === 'review'">
      <div v-if="!selectedReviewItem">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">进行中审核</CardTitle>
              <Button :disabled="reviewLoading || !canLoadList" @click="loadReviewList">
                <ArrowsClockwise :size="16" weight="duotone" />
                {{ reviewLoading ? '加载中...' : '刷新' }}
              </Button>
            </div>
            <CardDescription>查看你提交后处于审核中的资源。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-2 pt-0">
            <div
              v-if="reviewItems.length === 0"
              class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
            >
              暂无数据
            </div>
            <button
              v-for="item in reviewItems"
              :key="`${item.prNumber}-${item.id}`"
              type="button"
              class="w-full rounded-lg border px-3 py-3 text-left transition-colors"
              :class="['border-border bg-card hover:bg-accent/30', item.unresolvedTagCount > 0 ? 'ring-1 ring-red-500/60' : '']"
              @click="openReviewItem(item)"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="text-sm font-semibold text-foreground">{{ item.id }} · {{ item.name }}</div>
                <div class="inline-flex items-center gap-1.5">
                  <Badge variant="outline">{{ reviewStateText(item.status) }}</Badge>
                  <Badge v-if="item.unresolvedTagCount > 0" variant="destructive">待修复 {{ item.unresolvedTagCount }}</Badge>
                </div>
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ item.restype }} · PR #{{ item.prNumber }} · {{ formatDate(item.createdAt) }}
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      <div v-else class="space-y-4">
        <ReviewDetailHeader
          :title="selectedReviewItem.prTitle"
          :number="selectedReviewItem.prNumber"
          show-back
          @back="closeReviewDetail"
        >
          <template #meta>
            <Badge variant="secondary" class="h-6 gap-1.5 rounded-full px-2.5 text-xs">
              <GitPullRequest :size="14" weight="duotone" class="shrink-0" />
              Open
            </Badge>
            <span class="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <img
                v-if="selectedReviewItem.prAuthorAvatar"
                :src="selectedReviewItem.prAuthorAvatar"
                class="h-6 w-6 shrink-0 rounded-full object-cover"
                loading="lazy"
              />
              <span class="truncate font-medium text-foreground">{{ selectedReviewItem.prAuthor || 'unknown' }}</span>
              <span class="shrink-0">opened {{ formatDate(selectedReviewItem.createdAt) }}</span>
            </span>
          </template>
          <template #actions>
            <Button
              :disabled="reviewCommentsLoading"
              variant="outline"
              size="sm"
              class="h-9 gap-1.5 px-3"
              @click="loadReviewComments(selectedReviewItem.prNumber)"
            >
              <ArrowsClockwise :size="14" weight="duotone" />
              刷新评论
            </Button>
            <Button
              as="a"
              :href="selectedReviewItem.prUrl"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              class="h-9 gap-1.5 px-3"
            >
              <GitPullRequest :size="14" weight="duotone" />
              打开 GitHub
            </Button>
          </template>
        </ReviewDetailHeader>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">审核评论</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-0">
            <div
              v-if="reviewUnresolvedNeedfixAnchors.length > 0"
              class="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5"
            >
              <div class="text-xs font-medium text-red-700">
                需要修复的标签（点击可快速定位评论）
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="anchor in reviewUnresolvedNeedfixAnchors"
                  :key="anchor.tagId"
                  type="button"
                  class="inline-flex items-center rounded-md border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-500/20"
                  @click="scrollToReviewCommentById(anchor.commentId)"
                >
                  {{ anchor.tagId }}
                </button>
              </div>
            </div>
            <div v-if="reviewCommentsError" class="text-xs text-destructive">{{ reviewCommentsError }}</div>
            <ReviewCommentComposer
              :avatar-url="selectedReviewItem?.prAuthorAvatar || ''"
              :tag-enabled="reviewCommentTagEnabled"
              :comment-id="reviewCommentId"
              :comment-message="reviewCommentMessage"
              :editor-tab="reviewCommentEditorTab"
              :preview-html="reviewRenderedCommentPreviewHtml"
              :can-submit="canSubmitReviewComment"
              :submitting="reviewCommentSubmitting"
              :submit-button-title="reviewSubmitButtonTitle"
              :submit-text="reviewEditingCommentTarget ? '更新评论' : '发送评论'"
              id-placeholder="自定义 ID，例如 icon_png_check"
              message-placeholder="评论说明（文件引用请用上方按钮插入）"
              textarea-class="min-h-[140px]"
              @update:comment-id="reviewCommentId = $event"
              @update:comment-message="reviewCommentMessage = $event"
              @update:tag-enabled="reviewCommentTagEnabled = $event"
              @update:editor-tab="reviewCommentEditorTab = $event"
              @submit="submitReviewComment"
            />
            <div
              v-if="reviewEditingCommentTarget"
              class="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground"
            >
              <span class="truncate">
                正在编辑评论 #{{ reviewEditingCommentTarget.id }}
              </span>
              <Button size="sm" variant="ghost" class="h-6 px-2 text-xs" @click="clearReviewEditingTarget">
                取消编辑
              </Button>
            </div>
            <div
              v-if="reviewReplyTargetComment"
              class="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
            >
              <span class="truncate">
                正在回复 #{{ reviewReplyTargetComment.id }} · @{{ reviewReplyTargetComment.user?.login || 'unknown' }}
              </span>
              <Button size="sm" variant="ghost" class="h-6 px-2 text-xs" @click="clearReviewReplyTarget">
                取消回复
              </Button>
            </div>
            <ReviewCommentTimeline
              v-if="!reviewCommentsLoading"
              :comments="selectedReviewComments"
              :line-left="54"
              show-open-link
              show-reply-action
              show-edit-action
              show-delete-action
              avatar-rounded="full"
              :avatar-border="true"
              @reply="onReviewReplyComment"
              @edit="onReviewEditComment"
              @delete="onReviewDeleteComment"
            />
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-else>
      <div v-if="!selectedOwnedItem">
        <Card>
          <CardHeader class="pb-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <CardTitle class="text-base">资源管理</CardTitle>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <Select v-model="ownedTypeFilter">
                  <SelectTrigger class="h-8 w-[120px]">
                    <SelectValue placeholder="资源类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="quickapp">快应用</SelectItem>
                    <SelectItem value="watchface">表盘</SelectItem>
                  </SelectContent>
                </Select>
                <Select v-model="ownedSupportFilter">
                  <SelectTrigger class="h-8 w-[140px]">
                    <SelectValue placeholder="支持版本" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部版本</SelectItem>
                    <SelectItem value="v1_only">仅 V1</SelectItem>
                    <SelectItem value="v2_only">仅 V2</SelectItem>
                    <SelectItem value="both">V1 + V2</SelectItem>
                  </SelectContent>
                </Select>
                <Button :disabled="ownedLoading || !canLoadList" @click="loadOwnedList">
                  <ArrowsClockwise :size="16" weight="duotone" />
                  {{ ownedLoading ? '加载中...' : '刷新' }}
                </Button>
              </div>
            </div>
            <CardDescription>查看当前账号已发布到目录的资源并统一管理。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-2 pt-0">
            <div
              v-if="filteredOwnedItems.length === 0"
              class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
            >
              暂无数据
            </div>
            <div
              v-for="item in filteredOwnedItems"
              :key="item.key"
              role="button"
              tabindex="0"
              class="rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-accent/30"
              @click="openOwnedItemDetail(item)"
              @keydown.enter.prevent="openOwnedItemDetail(item)"
              @keydown.space.prevent="openOwnedItemDetail(item)"
            >
              <div class="flex items-start gap-3">
                <img
                  :src="getOwnedItemIconUrl(item)"
                  :alt="`${item.name} icon`"
                  class="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-border bg-muted/50 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <div class="truncate text-sm font-semibold text-foreground">{{ item.name }}</div>
                        <Badge variant="secondary">{{ formatOwnedRestype(item.restype) }}</Badge>
                        <Badge v-if="item.sources.includes('v1')" variant="outline">V1</Badge>
                        <Badge v-if="item.sources.includes('v2')" variant="outline">V2</Badge>
                        <Badge v-if="showV2FollowUpTag && item.v2NeedsFollowUp" variant="destructive">v2需要跟进</Badge>
                      </div>
                    </div>
                    <a
                      :href="getOwnedItemRepoUrl(item)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="打开仓库"
                      title="打开仓库"
                      @click.stop
                    >
                      <GithubLogo :size="16" weight="duotone" />
                    </a>
                  </div>
                  <div class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {{ item.description || '暂无描述' }}
                  </div>
                  <div v-if="item.commitDate" class="mt-1 text-xs text-muted-foreground">
                    上次更新时间: {{ formatDate(item.commitDate) }}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div v-else class="space-y-4">
        <ReviewDetailHeader
          :title="selectedOwnedItem.name"
          :leading-image-url="getOwnedItemIconUrl(selectedOwnedItem)"
          :leading-image-alt="`${selectedOwnedItem.name} icon`"
          show-back
          @back="closeOwnedDetail"
        >
          <template #meta>
            <Badge variant="secondary">{{ formatOwnedRestype(selectedOwnedItem.restype) }}</Badge>
            <Badge v-if="selectedOwnedItem.sources.includes('v1')" variant="outline">V1</Badge>
            <Badge v-if="selectedOwnedItem.sources.includes('v2')" variant="outline">V2</Badge>
            <Badge v-if="showV2FollowUpTag && selectedOwnedItem.v2NeedsFollowUp" variant="destructive">v2需要跟进</Badge>
          </template>
          <template #actions>
            <Button
              variant="outline"
              size="sm"
              class="h-9 gap-1.5 px-3"
              :disabled="ownedDetailLoading"
              @click="startEditOwnedResource"
            >
              <NotePencil :size="14" weight="duotone" />
              更新
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9"
              :disabled="ownedDetailLoading"
              title="刷新详情"
              aria-label="刷新详情"
              @click="loadOwnedItemDetail"
            >
              <ArrowsClockwise :size="14" weight="duotone" />
            </Button>
            <Button
              as="a"
              :href="getOwnedItemRepoUrl(selectedOwnedItem)"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="icon"
              class="h-9 w-9"
              title="打开仓库"
              aria-label="打开仓库"
            >
              <GithubLogo :size="14" weight="duotone" />
            </Button>
          </template>
        </ReviewDetailHeader>

        <Card v-if="ownedSubmissionOverview.images.cover">
          <CardContent class="flex flex-wrap items-start gap-4 pt-4">
            <a
              v-if="ownedSubmissionOverview.images.cover"
              :href="ownedSubmissionOverview.images.cover.url"
              target="_blank"
              rel="noopener noreferrer"
              class="group min-w-0 w-full"
            >
              <div class="text-xs text-muted-foreground">Cover</div>
              <img
                :src="ownedSubmissionOverview.images.cover.url"
                alt="Cover 预览"
                class="mt-1 max-h-24 w-full rounded-md border border-border object-contain transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">资源提交信息</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-0 text-sm">
            <div v-if="ownedDetailError" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {{ ownedDetailError }}
            </div>
            <div v-else-if="ownedDetailLoading" class="text-xs text-muted-foreground">
              正在加载文件变更...
            </div>
            <div
              v-else-if="!hasOwnedSubmissionOverview"
              class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground"
            >
              未识别到结构化资源信息
            </div>
            <div v-else class="space-y-3">
              <div class="grid gap-3 xl:grid-cols-2">
                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <NotePencil :size="14" weight="duotone" />
                    资源信息
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="item in ownedSubmissionOverview.resourceInfo"
                      :key="item.key"
                      class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between"
                    >
                      <span class="text-xs text-muted-foreground">{{ item.key }}</span>
                      <span class="text-sm font-medium text-foreground">{{ item.value || '-' }}</span>
                    </div>
                    <div class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2 md:flex-row md:items-center md:justify-between">
                      <span class="text-xs text-muted-foreground">仓库信息</span>
                      <a
                        :href="getOwnedItemRepoUrl(selectedOwnedItem)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="break-all text-sm font-medium text-primary hover:underline"
                      >
                        {{ getOwnedItemRepoUrl(selectedOwnedItem) }}
                      </a>
                    </div>
                    <div class="flex flex-col gap-1 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
                      <span class="text-xs text-muted-foreground">链接（manifest_v2.links）</span>
                      <div v-if="ownedSubmissionOverview.links.length > 0" class="space-y-1 text-sm font-medium text-foreground">
                        <a
                          v-for="link in ownedSubmissionOverview.links"
                          :key="`owned-links-${link.title}-${link.url}`"
                          :href="link.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex w-full min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-primary hover:underline"
                        >
                          <component
                            :is="FileIcon"
                            :size="14"
                            weight="duotone"
                            class="shrink-0 text-muted-foreground"
                          />
                          <span class="shrink-0 text-foreground">{{ link.title || '-' }}</span>
                          <span v-if="link.type" class="shrink-0 text-muted-foreground">{{ link.type }}</span>
                          <span class="truncate">{{ link.url }}</span>
                        </a>
                      </div>
                      <span v-else class="text-sm font-medium text-foreground">-</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-border p-3">
                  <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <GlobeHemisphereWest :size="14" weight="duotone" />
                    支持设备
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="group in ownedGroupedDownloads"
                      :key="`${group.file}-${group.version}-${group.devices.join('/')}`"
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
                      v-if="ownedGroupedDownloads.length === 0"
                      class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-foreground"
                    >
                      {{ ownedSubmissionOverview.supportedDevices.join(' / ') || '-' }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-md border border-border p-3">
                <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ImageSquare :size="14" weight="duotone" />
                  图片资源（Raw）
                </div>
                <div v-if="ownedSubmissionOverview.images.previews.length === 0" class="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  未检测到图片资源
                </div>
                <div v-else class="space-y-3">
                  <div v-if="ownedSubmissionOverview.images.previews.length > 0" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-xs text-muted-foreground">
                        Preview · {{ ownedSubmissionOverview.images.previews.length }} 张
                      </div>
                      <div class="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          class="h-7 w-7"
                          :disabled="!canOwnedPreviewPrev"
                          @click="scrollOwnedPreviewPrev"
                        >
                          <CaretRight :size="14" weight="bold" class="rotate-180" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          class="h-7 w-7"
                          :disabled="!canOwnedPreviewNext"
                          @click="scrollOwnedPreviewNext"
                        >
                          <CaretRight :size="14" weight="bold" />
                        </Button>
                      </div>
                    </div>
                    <div
                      ref="ownedPreviewScrollerRef"
                      class="scrollbar-none flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory touch-pan-x"
                      @scroll="syncOwnedPreviewScrollState"
                      @wheel="onOwnedPreviewWheel"
                    >
                      <div
                        v-for="preview in ownedSubmissionOverview.images.previews"
                        :key="preview.url"
                        data-owned-preview-slide="1"
                        class="w-[260px] shrink-0 snap-start rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm sm:w-[320px]"
                      >
                        <a
                          :href="preview.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="block overflow-hidden rounded-md border border-border/60 bg-background/70"
                        >
                          <img
                            :src="preview.url"
                            :alt="`${preview.file} 预览`"
                            class="h-40 w-full object-contain sm:h-52"
                            loading="lazy"
                          />
                        </a>
                        <div class="mt-2 truncate text-xs text-muted-foreground">Preview · {{ preview.file }}</div>
                      </div>
                    </div>
                    <div v-if="ownedPreviewSnapCount > 1" class="flex items-center justify-center gap-1.5">
                      <button
                        v-for="index in ownedPreviewSnapCount"
                        :key="`owned-preview-dot-${index}`"
                        type="button"
                        class="h-1.5 rounded-full transition-all"
                        :class="index - 1 === ownedPreviewActiveIndex ? 'w-5 bg-foreground/80' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'"
                        :aria-label="`跳转到第 ${index} 张预览图`"
                        @click="scrollOwnedPreviewTo(index - 1)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-md border border-border p-3">
                <div class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CheckCircle :size="14" weight="duotone" />
                  规范自动检查
                </div>
                <div class="space-y-2">
                  <div
                    v-for="item in ownedRuleChecks"
                    :key="item.title"
                    class="rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                  >
                    <div class="flex items-start gap-2">
                      <component
                        :is="item.status === 'pass' ? CheckCircle : WarningCircle"
                        :size="14"
                        weight="fill"
                        :class="item.status === 'pass' ? 'text-emerald-600' : item.status === 'fail' ? 'text-red-600' : 'text-amber-500'"
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
      </div>
    </template>

    <Dialog :open="reviewCommentResultDialogOpen" @update:open="reviewCommentResultDialogOpen = $event">
      <DialogContent class="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{{ reviewCommentResultDialogTitle }}</DialogTitle>
          <DialogDescription>{{ reviewCommentResultDialogMessage }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button @click="reviewCommentResultDialogOpen = false">我知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="reviewDeleteCommentDialogOpen" @update:open="reviewDeleteCommentDialogOpen = $event">
      <DialogContent class="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>确认删除评论</DialogTitle>
          <DialogDescription>
            删除后不可恢复，请确认是否继续。
          </DialogDescription>
          <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {{ reviewDeleteCommentPreviewText }}
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="reviewDeleteCommentDialogOpen = false">取消</Button>
          <Button variant="destructive" @click="confirmReviewDeleteComment">删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch, type Component } from 'vue'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretDown as CaretDown,
  PhCaretRight as CaretRight,
  PhCheckCircle as CheckCircle,
  PhDotsThreeVertical as DotsThreeVertical,
  PhDotsSixVertical as DragDots,
  PhFile as FileIcon,
  PhFolderPlus as FolderPlus,
  PhFolderOpen as FolderOpen,
  PhFolder as FolderIcon,
  PhGlobeHemisphereWest as GlobeHemisphereWest,
  PhGithubLogo as GithubLogo,
  PhGitPullRequest as GitPullRequest,
  PhImageSquare as ImageSquare,
  PhMinus as MinusIcon,
  PhNotePencil as NotePencil,
  PhTrash as TrashIcon,
  PhUploadSimple as UploadSimple,
  PhWarningCircle as WarningCircle
} from '@phosphor-icons/vue'
import draggable from 'vuedraggable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import ReviewCommentComposer from '@/components/review/ReviewCommentComposer.vue'
import ReviewCommentTimeline from '@/components/review/ReviewCommentTimeline.vue'
import ReviewDetailHeader from '@/components/review/ReviewDetailHeader.vue'
import { parseReviewCommentBody, renderCommentMarkdownHtml, renderCommentMarkdownInlineHtml, escapeHtml } from '@/utils/reviewComment'
import { useCcPublishLogs } from '@/composables/useCcPublishLogs'
import { useCcResourceEdit } from '@/composables/useCcResourceEdit'
import { useCcSettings } from '@/composables/useCcSettings'
import { useCcSession } from '@/composables/useCcSession'
import type { CcRouteState } from '@/cc/route-config'
import { type WorkspaceTreeItem, useCcWorkspace } from '@/composables/useCcWorkspace'
import {
  type DeviceOption,
  deviceOptions,
  deviceSelectorEntries,
  normalizeDeviceToken
} from '@/components/resourcePublishWorkbenchDeviceCatalog'
import {
  createPullRequestIssueComment,
  type LegacyCatalogEntry,
  type OwnedResourceDetail,
  type OwnedResourceEntry,
  type PullRequestIssueComment,
  type PublishingResource,
  arrayBufferToBase64,
  base64ToText,
  createPullRequestWithHead,
  deletePullRequestIssueComment,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadRepositoryTree,
  loadInProgressResources,
  loadPullRequestIssueComments,
  loadOwnedResourceDetail,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch,
  updatePullRequestIssueComment,
  updateLegacyCatalogAndResourceJsonInForkBranch
} from '@/utils/resourcePublishApi'

interface WorkspaceFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
}

interface WorkspaceDirectoryHandle {
  kind: 'directory'
  name: string
  getFileHandle(name: string): Promise<WorkspaceFileHandle>
  getDirectoryHandle(
    name: string,
    options?: {
      create?: boolean
    }
  ): Promise<WorkspaceDirectoryHandle>
  resolve?(possibleDescendant: WorkspaceFileHandle): Promise<string[] | null>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, WorkspaceFileHandle | WorkspaceDirectoryHandle]>
}

interface PickedWorkspaceFile {
  path: string
  file: File
}

const MAIN_BRANCH = 'main'
const MANIFEST_FILE = 'manifest_v2.json'
const LEGACY_MANIFEST_FILE = 'manifest.json'
const LEGACY_CATALOG_PATH = 'index.csv'
const LEGACY_RESOURCES_DIR = 'resources'

type SubmitMode = 'v2' | 'v1' | 'both'

const LinkIconPickerDialog = defineAsyncComponent(() => import('@/components/LinkIconPickerDialog.vue'))
const phosphorIconModules = import.meta.glob('/node_modules/@phosphor-icons/vue/dist/icons/*.vue.mjs', { eager: true })


type WorkbenchMode = 'publish' | 'review' | 'published'
const props = withDefaults(defineProps<{
  mode?: WorkbenchMode
  resourceDetailKey?: string
  pullRequestNumber?: number
  pullRequestTargetRepo?: string
}>(), {
  mode: 'publish'
})
const emit = defineEmits<{
  (event: 'request-tab', tab: WorkbenchMode | 'resource_edit' | 'settings' | 'review' | 'pullrequest'): void
  (event: 'request-route', state: CcRouteState): void
}>()
const mode = computed<WorkbenchMode>(() => props.mode)
const {
  draft: resourceEditDraft,
  setDraft: setResourceEditDraft,
  clearDraft: clearResourceEditDraft
} = useCcResourceEdit()

const { token, currentUser } = useCcSession()
const {
  workspacePath,
  workspaceTree,
  workspaceHandle: persistedWorkspaceHandle,
  remoteWorkspacePath,
  remoteWorkspaceTree,
  setRemoteWorkspace,
  setWorkspace,
  setWorkspaceHandle,
  clearWorkspace,
  clearRemoteWorkspace
} = useCcWorkspace()
const { appendPublishLog: appendLog, publishLogsText, clearPublishLogs } = useCcPublishLogs()
const { defaultTargetOwner, defaultTargetRepo, defaultCatalogPath, ownedDisplayPriority, showV2FollowUpTag } = useCcSettings()
const workspaceBusy = ref(false)
const newWorkspaceName = ref('')
const RELEASE_FOLDER_SUFFIX = '_AstroBox_Release'
const workspaceDisplayPath = ref('')
const activeStep = ref(0)
const fileTreeTab = ref<'workspace' | 'remote'>('workspace')
const collapsedWorkspaceFolders = ref<string[]>([])
const collapsedRemoteFolders = ref<string[]>([])
const submitMode = ref<SubmitMode>('v2')
const isResourceUpdateMode = ref(false)
const showSubmitVersionDialog = ref(false)

const workspaceHandle = computed<WorkspaceDirectoryHandle | null>(
  () => (persistedWorkspaceHandle.value as WorkspaceDirectoryHandle | null) ?? null
)
const workspaceName = ref('')
const manifestText = ref('')

const repoName = ref('')
const repoDescription = ref('')
const itemId = ref('')
const itemName = ref('')
const restype = ref('quickapp')
const paidType = ref('')
const itemDescription = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const selectedDeviceIds = ref<string[]>([])
const downloads = ref<Record<string, { version: string; file_name: string }>>({})
const authors = ref<Array<{ name: string; authorUrl: string; bindABAccount: boolean }>>([
  { name: '', authorUrl: '', bindABAccount: true }
])
const links = ref<Array<{ icon: string; title: string; url: string }>>([])
const showDeviceSelector = ref(false)
const showResourceIdGuide = ref(false)
const showOutOfWorkspaceFileDialog = ref(false)
const showImageValidationDialog = ref(false)
const imageValidationMessage = ref('')
const showFolderNameValidationDialog = ref(false)
const folderNameValidationMessage = ref('')
const showFileNameConflictDialog = ref(false)
const fileNameConflictMessage = ref('')
const showUploadCompleteDialog = ref(false)
const showRemoteFilePickerDialog = ref(false)
const showLinkIconPicker = ref(false)
const remotePickerLocalInputRef = ref<HTMLInputElement | null>(null)
const linkIconPickerIndex = ref<number | null>(null)
const linkPickerInitialQuery = ref('')
const iconPath = ref('')
const coverPath = ref('')
const previewItems = ref<Array<{ id: string; path: string }>>([])
type RemotePickerMode = 'icon' | 'cover' | 'preview' | 'download'
const remotePickerMode = ref<RemotePickerMode>('preview')
const remotePickerDeviceId = ref('')
const remotePickerSelectedPaths = ref<string[]>([])
const remotePickerTargetFolder = ref('')
const remotePickerUploadFileName = ref('')
const remotePickerStep = ref<1 | 2>(1)
const remotePickerDraftFolders = ref<string[]>([])
const remotePickerRenamingPath = ref('')
const remotePickerRenamingName = ref('')
const remotePickerRenameInputRef = ref<HTMLInputElement | null>(null)
const opfsLocalPathSet = ref<Record<string, true>>({})
const opfsLocalPreviewUrlMap = ref<Record<string, string>>({})

const upstreamOwner = ref(defaultTargetOwner.value)
const upstreamRepo = ref(defaultTargetRepo.value)
const catalogPath = ref(defaultCatalogPath.value)

const prTitle = ref('')
const prBody = ref('')
const latestPrUrl = ref('')

const uploading = ref(false)
const creatingPr = ref(false)
const hasUploadedInCurrentFlow = ref(false)

const uploadedRepoOwner = ref('')
const uploadedRepoName = ref('')
const uploadedRepoUrl = ref('')
const uploadedCommitSha = ref('')

const reviewLoading = ref(false)
const reviewItems = ref<PublishingResource[]>([])
const selectedReviewItem = ref<PublishingResource | null>(null)
const reviewCommentsLoading = ref(false)
const reviewCommentsError = ref('')
const selectedReviewComments = ref<PullRequestIssueComment[]>([])
const reviewCommentId = ref('')
const reviewCommentMessage = ref('')
const reviewCommentTagEnabled = ref(true)
const reviewCommentEditorTab = ref<'edit' | 'preview'>('edit')
const reviewCommentSubmitting = ref(false)
const reviewCommentResultDialogOpen = ref(false)
const reviewCommentResultDialogTitle = ref('')
const reviewCommentResultDialogMessage = ref('')
const reviewDeleteCommentDialogOpen = ref(false)
const reviewDeleteCommentTarget = ref<{
  id: number
  body?: string
  user?: { login?: string }
} | null>(null)
const reviewDeleteCommentPreviewText = computed(() => {
  const raw = reviewDeleteCommentTarget.value?.body || ''
  const parsed = parseReviewCommentBody(raw)
  const text = (parsed.content || raw).replace(/\s+/g, ' ').trim()
  return text || '（空内容）'
})
const reviewEditingCommentTarget = ref<{
  id: number
  body?: string
  user?: { login?: string }
} | null>(null)
const reviewReplyTargetComment = ref<{
  id: number
  body?: string
  user?: { login?: string }
} | null>(null)

const ownedLoading = ref(false)
const ownedItems = ref<OwnedResourceEntry[]>([])
const ownedTypeFilter = ref<'all' | 'quickapp' | 'watchface'>('all')
const ownedSupportFilter = ref<'all' | 'v1_only' | 'v2_only' | 'both'>('all')

interface OwnedMergedItem {
  key: string
  catalogId: string
  name: string
  restype: string
  icon: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  description: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
  commitDate: string
  sources: Array<'v1' | 'v2'>
  v1RepoCommitHash: string
  v2RepoCommitHash: string
  v2NeedsFollowUp: boolean
}

const ownedMergedItems = computed<OwnedMergedItem[]>(() => {
  const grouped = new Map<string, OwnedMergedItem>()
  const preferredSource = ownedDisplayPriority.value === 'v1' ? 'v1' : 'v2'
  const isNewerDate = (current: string, previous: string): boolean => {
    if (!current) return false
    if (!previous) return true
    return current > previous
  }
  for (const item of ownedItems.value) {
    const key = [
      item.repo_owner.trim().toLowerCase(),
      item.repo_name.trim().toLowerCase()
    ].join('|')
    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        key,
        catalogId: item.catalogId,
        name: item.name,
        restype: item.restype,
        icon: item.icon,
        repo_owner: item.repo_owner,
        repo_name: item.repo_name,
        repo_commit_hash: item.repo_commit_hash,
        description: item.description,
        tags: item.tags,
        device_vendors: item.device_vendors,
        devices: item.devices,
        paid_type: item.paid_type,
        commitDate: item.commitDate,
        sources: [item.source],
        v1RepoCommitHash: item.source === 'v1' ? item.repo_commit_hash : '',
        v2RepoCommitHash: item.source === 'v2' ? item.repo_commit_hash : '',
        v2NeedsFollowUp: item.v2NeedsFollowUp
      })
      continue
    }

    if (!existing.sources.includes(item.source)) {
      existing.sources.push(item.source)
    }
    if (item.source === 'v1' && item.repo_commit_hash) {
      existing.v1RepoCommitHash = item.repo_commit_hash
    }
    if (item.source === 'v2' && item.repo_commit_hash) {
      existing.v2RepoCommitHash = item.repo_commit_hash
    }
    const shouldUseCurrent = item.source === preferredSource
    if (shouldUseCurrent) {
      const shouldReplacePreferred =
        !existing.repo_commit_hash ||
        isNewerDate(item.commitDate || '', existing.commitDate || '')
      if (shouldReplacePreferred) {
        existing.name = item.name || existing.name
        existing.restype = item.restype || existing.restype
        existing.icon = item.icon || existing.icon
        existing.repo_owner = item.repo_owner || existing.repo_owner
        existing.repo_name = item.repo_name || existing.repo_name
        existing.repo_commit_hash = item.repo_commit_hash || existing.repo_commit_hash
        existing.description = item.description || existing.description
        existing.tags = item.tags || existing.tags
        existing.device_vendors = item.device_vendors || existing.device_vendors
        existing.devices = item.devices || existing.devices
        existing.paid_type = item.paid_type || existing.paid_type
        existing.catalogId = item.catalogId || existing.catalogId
        existing.commitDate = item.commitDate || existing.commitDate
      }
    } else {
      if (!existing.icon && item.icon) {
        existing.icon = item.icon
      }
      if (!existing.commitDate && item.commitDate) {
        existing.commitDate = item.commitDate
      }
      if (!existing.tags && item.tags) {
        existing.tags = item.tags
      }
      if (!existing.device_vendors && item.device_vendors) {
        existing.device_vendors = item.device_vendors
      }
      if (!existing.devices && item.devices) {
        existing.devices = item.devices
      }
      if (!existing.paid_type && item.paid_type) {
        existing.paid_type = item.paid_type
      }
      if (!existing.catalogId && item.catalogId) {
        existing.catalogId = item.catalogId
      }
    }
    if (item.source === 'v2' && item.v2NeedsFollowUp) {
      existing.v2NeedsFollowUp = true
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const at = a.commitDate || ''
    const bt = b.commitDate || ''
    return bt.localeCompare(at)
  })
})

const buildOwnedDetailRouteKey = (item: Pick<OwnedMergedItem, 'repo_name'>): string =>
  item.repo_name.trim().toLowerCase()

const filteredOwnedItems = computed<OwnedMergedItem[]>(() =>
  ownedMergedItems.value.filter(item => {
    const restypeKey = normalizeOwnedRestype(item.restype)
    const typeOk =
      ownedTypeFilter.value === 'all' ||
      (ownedTypeFilter.value === 'quickapp' && restypeKey === 'quickapp') ||
      (ownedTypeFilter.value === 'watchface' && restypeKey === 'watchface')

    let supportOk = true
    if (ownedSupportFilter.value === 'v1_only') {
      supportOk = item.sources.length === 1 && item.sources.includes('v1')
    } else if (ownedSupportFilter.value === 'v2_only') {
      supportOk = item.sources.length === 1 && item.sources.includes('v2')
    } else if (ownedSupportFilter.value === 'both') {
      supportOk = item.sources.includes('v1') && item.sources.includes('v2')
    }

    return typeOk && supportOk
  })
)

const selectedOwnedItem = ref<OwnedMergedItem | null>(null)
const ownedDetailLoading = ref(false)
const ownedDetailError = ref('')
const ownedDetail = ref<OwnedResourceDetail | null>(null)

type OwnedManifestLink = { title: string; url: string; type: string }
type OwnedManifestImageAsset = { file: string; url: string }
type OwnedSubmissionOverview = {
  resourceInfo: Array<{ key: string; value: string }>
  links: OwnedManifestLink[]
  supportedDevices: string[]
  downloads: Array<{ device: string; version: string; file: string; raw: string }>
  images: {
    icon: OwnedManifestImageAsset | null
    cover: OwnedManifestImageAsset | null
    previews: OwnedManifestImageAsset[]
  }
}

const ownedManifestObject = computed<Record<string, any>>(() => {
  const detail = ownedDetail.value
  if (!detail) return {}
  const sourceText = detail.v2ManifestText.trim() || detail.v1ManifestText.trim()
  if (!sourceText) return {}
  try {
    return JSON.parse(sourceText) as Record<string, any>
  } catch {
    return {}
  }
})

const buildOwnedAssetRawUrl = (relativePath: string): string => {
  const item = selectedOwnedItem.value
  if (!item) return ''
  const raw = relativePath.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const ref = item.v2RepoCommitHash || item.v1RepoCommitHash || item.repo_commit_hash
  const normalizedPath = raw.replace(/^\/+/, '')
  return `https://raw.githubusercontent.com/${item.repo_owner}/${item.repo_name}/${ref}/${normalizedPath}`
}

const ownedSubmissionOverview = computed<OwnedSubmissionOverview>(() => {
  const manifest = ownedManifestObject.value
  const item = (manifest.item && typeof manifest.item === 'object') ? manifest.item as Record<string, any> : {}
  const downloads = (manifest.downloads && typeof manifest.downloads === 'object') ? manifest.downloads as Record<string, any> : {}
  const linksInput = Array.isArray(manifest.links) ? manifest.links as Array<Record<string, any>> : []

  const links = linksInput
    .map(link => ({
      title: typeof link.title === 'string' ? link.title.trim() : '',
      url: typeof link.url === 'string' ? link.url.trim() : '',
      type: typeof link.icon === 'string' ? link.icon.trim() : ''
    }))
    .filter(link => Boolean(link.url))

  const resourceInfo = [
    { key: '资源名称', value: String(item.name || selectedOwnedItem.value?.name || '').trim() },
    { key: '资源类型', value: formatOwnedRestype(String(item.restype || selectedOwnedItem.value?.restype || '').trim()) },
    { key: '资源描述', value: String(item.description || selectedOwnedItem.value?.description || '').trim() },
    { key: 'V2 Hash', value: ownedDetail.value?.v2Ref || '-' }
  ]

  const downloadList = Object.entries(downloads).map(([device, meta]) => {
    const mapped = meta && typeof meta === 'object' ? meta as Record<string, any> : {}
    const file = String(mapped.file_name || '').trim()
    return {
      device,
      version: String(mapped.version || '').trim(),
      file,
      raw: file ? buildOwnedAssetRawUrl(file) : ''
    }
  })

  const iconPath = String(item.icon || '').trim()
  const coverPath = String(item.cover || '').trim()
  const previewList = Array.isArray(item.preview) ? item.preview : []

  return {
    resourceInfo,
    links,
    supportedDevices: Object.keys(downloads),
    downloads: downloadList,
    images: {
      icon: iconPath ? { file: iconPath, url: buildOwnedAssetRawUrl(iconPath) } : null,
      cover: coverPath ? { file: coverPath, url: buildOwnedAssetRawUrl(coverPath) } : null,
      previews: previewList
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .map(file => ({ file, url: buildOwnedAssetRawUrl(file) }))
    }
  }
})

const ownedGroupedDownloads = computed(() =>
  ownedSubmissionOverview.value.downloads.map(item => ({
    devices: [item.device],
    version: item.version,
    file: item.file,
    raw: item.raw
  }))
)

const hasOwnedSubmissionOverview = computed(() =>
  ownedSubmissionOverview.value.resourceInfo.some(item => Boolean(item.value && item.value !== '-')) ||
  ownedSubmissionOverview.value.supportedDevices.length > 0 ||
  ownedSubmissionOverview.value.downloads.length > 0 ||
  ownedSubmissionOverview.value.links.length > 0 ||
  Boolean(ownedSubmissionOverview.value.images.icon) ||
  Boolean(ownedSubmissionOverview.value.images.cover) ||
  ownedSubmissionOverview.value.images.previews.length > 0
)

const ownedRuleChecks = computed<Array<{ title: string; status: 'pass' | 'warn' | 'fail'; detail: string }>>(() => {
  const detail = ownedDetail.value
  const manifest = ownedManifestObject.value
  const checks: Array<{ title: string; status: 'pass' | 'warn' | 'fail'; detail: string }> = []
  const hasManifest = Object.keys(manifest).length > 0
  checks.push({
    title: 'manifest 文件存在且 JSON 可解析',
    status: hasManifest ? 'pass' : 'fail',
    detail: hasManifest ? 'manifest 解析成功' : 'manifest 文件不存在或解析失败'
  })

  if (!detail?.v2Ref) {
    checks.push({
      title: 'index_v2 hash 最新性',
      status: 'warn',
      detail: '未检测到 v2 hash'
    })
  } else if (detail.isV2HashLatest) {
    checks.push({
      title: 'index_v2 hash 最新性',
      status: 'pass',
      detail: `当前 hash（${detail.v2Ref}）已是默认分支最新提交`
    })
  } else {
    checks.push({
      title: 'index_v2 hash 最新性',
      status: 'fail',
      detail: `当前 hash（${detail.v2Ref}）落后于最新提交（${detail.latestCommitSha || '-'})`
    })
  }

  const hasDownloads = ownedSubmissionOverview.value.downloads.length > 0
  checks.push({
    title: 'manifest downloads 完整性',
    status: hasDownloads ? 'pass' : 'warn',
    detail: hasDownloads ? `已识别 ${ownedSubmissionOverview.value.downloads.length} 条下载配置` : '未识别到 downloads'
  })
  return checks
})

const ownedPreviewScrollerRef = ref<HTMLElement | null>(null)
const ownedPreviewCanPrev = ref(false)
const ownedPreviewCanNext = ref(false)
const ownedPreviewActiveIndex = ref(0)
const ownedPreviewSnapCount = ref(0)
const OWNED_PREVIEW_SCROLL_DISTANCE = 320

const syncOwnedPreviewScrollState = (): void => {
  const el = ownedPreviewScrollerRef.value
  if (!el) {
    ownedPreviewCanPrev.value = false
    ownedPreviewCanNext.value = false
    ownedPreviewActiveIndex.value = 0
    ownedPreviewSnapCount.value = ownedSubmissionOverview.value.images.previews.length
    return
  }
  ownedPreviewCanPrev.value = el.scrollLeft > 4
  ownedPreviewCanNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
  ownedPreviewSnapCount.value = ownedSubmissionOverview.value.images.previews.length

  const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-owned-preview-slide="1"]'))
  if (slides.length === 0) {
    ownedPreviewActiveIndex.value = 0
    return
  }
  const viewportCenter = el.scrollLeft + el.clientWidth / 2
  let matchedIndex = 0
  let minDistance = Number.POSITIVE_INFINITY
  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
    const distance = Math.abs(slideCenter - viewportCenter)
    if (distance < minDistance) {
      minDistance = distance
      matchedIndex = index
    }
  })
  ownedPreviewActiveIndex.value = matchedIndex
}

const canOwnedPreviewPrev = computed(() =>
  ownedSubmissionOverview.value.images.previews.length > 0 && ownedPreviewCanPrev.value
)
const canOwnedPreviewNext = computed(() =>
  ownedSubmissionOverview.value.images.previews.length > 0 && ownedPreviewCanNext.value
)

const scrollOwnedPreviewPrev = (): void => {
  const el = ownedPreviewScrollerRef.value
  if (!el) return
  el.scrollBy({
    left: -Math.max(el.clientWidth * 0.82, OWNED_PREVIEW_SCROLL_DISTANCE),
    behavior: 'smooth'
  })
}

const scrollOwnedPreviewNext = (): void => {
  const el = ownedPreviewScrollerRef.value
  if (!el) return
  el.scrollBy({
    left: Math.max(el.clientWidth * 0.82, OWNED_PREVIEW_SCROLL_DISTANCE),
    behavior: 'smooth'
  })
}

const scrollOwnedPreviewTo = (index: number): void => {
  const el = ownedPreviewScrollerRef.value
  if (!el) return
  const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-owned-preview-slide="1"]'))
  const target = slides[index]
  if (!target) return
  el.scrollTo({ left: Math.max(target.offsetLeft - 8, 0), behavior: 'smooth' })
}

const onOwnedPreviewWheel = (event: WheelEvent): void => {
  const el = ownedPreviewScrollerRef.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth + 1) return

  const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY

  if (Math.abs(horizontalDelta) < 0.5) return
  event.preventDefault()
  el.scrollBy({ left: horizontalDelta, behavior: 'auto' })
}

const isBusy = computed(() => workspaceBusy.value || uploading.value || creatingPr.value)
const canLoadList = computed(() => Boolean(token.value.trim() && currentUser.value))
const normalizeReviewCommentId = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '')
const normalizedReviewCommentId = computed(() => normalizeReviewCommentId(reviewCommentId.value))
const buildReviewReplyContextBlock = (comment: {
  id: number
  body?: string
  user?: { login?: string }
} | null): string => {
  if (!comment) return ''
  const login = comment.user?.login || 'unknown'
  const excerpt = (comment.body || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
  return [
    `> Reply-To: #${comment.id} @${login}`,
    excerpt ? `> ${excerpt}` : ''
  ].filter(Boolean).join('\n')
}
const reviewCommentBodyPreview = computed(() => {
  const bodyParts = [
    reviewCommentMessage.value.trim(),
    buildReviewReplyContextBlock(reviewReplyTargetComment.value)
  ].filter(Boolean)
  const plainBody = bodyParts.join('\n').trim()
  if (!reviewCommentTagEnabled.value) return plainBody
  const prefixId = normalizedReviewCommentId.value || '<填写ID>'
  return `[ABCC_NEEDFIX_${prefixId}] ${plainBody}`.trim()
})
const reviewSubmitCommentBody = computed(() => {
  const bodyParts = [
    reviewCommentMessage.value.trim(),
    buildReviewReplyContextBlock(reviewReplyTargetComment.value)
  ].filter(Boolean)
  const plainBody = bodyParts.join('\n').trim()
  if (!reviewCommentTagEnabled.value) return plainBody
  if (!normalizedReviewCommentId.value) return ''
  return `[ABCC_NEEDFIX_${normalizedReviewCommentId.value}] ${plainBody}`.trim()
})
const reviewRenderedCommentPreviewHtml = computed(() => {
  if (!reviewCommentBodyPreview.value) return '<span class="text-muted-foreground">（这里显示评论内容）</span>'
  return buildReviewCommentPreviewCardHtml(reviewCommentBodyPreview.value)
})
const canSubmitReviewComment = computed(() => {
  if (!selectedReviewItem.value) return false
  if (reviewCommentTagEnabled.value) return Boolean(normalizedReviewCommentId.value)
  return Boolean(reviewSubmitCommentBody.value)
})
const reviewSubmitButtonTitle = computed(() => {
  if (!canSubmitReviewComment.value) return reviewCommentTagEnabled.value ? '请填写id' : '请输入评论内容'
  return reviewEditingCommentTarget.value ? '更新现有评论' : ''
})
const reviewUnresolvedNeedfixAnchors = computed<Array<{ tagId: string; commentId: number }>>(() => {
  const unresolved = new Map<string, number>()
  for (const comment of selectedReviewComments.value) {
    const parsed = parseReviewCommentBody(comment.body || '')
    const tagId = parsed.tagId.trim()
    if (!tagId) continue
    if (parsed.tagType === 'NEEDFIX') {
      unresolved.set(tagId, comment.id)
      continue
    }
    if (parsed.tagType === 'FIXED') {
      unresolved.delete(tagId)
    }
  }
  return Array.from(unresolved.entries()).map(([tagId, commentId]) => ({
    tagId,
    commentId
  }))
})
const paidTypeSelectValue = computed({
  get: () => paidType.value || 'free',
  set: value => {
    paidType.value = value === 'free' ? '' : value
  }
})

const stripReleaseFolderSuffix = (raw: string): string =>
  raw
    .trim()
    .replace(/_AstroBox_Release$/i, '')
    .replace(/_+$/g, '')

const buildReviewCommentPreviewCardHtml = (body: string): string => {
  const parsed = parseReviewCommentBody(body)
  const tagClass =
    parsed.tagType === 'NEEDFIX'
      ? 'border-red-500/40 bg-red-500/15 text-red-700'
      : parsed.tagType === 'FIXED'
        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700'
        : 'border-border bg-muted/30 text-muted-foreground'
  const tag = parsed.tagId
    ? `<span class="mr-1 inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${tagClass}">${escapeHtml(parsed.tagType || 'COMMENT')} · ${escapeHtml(parsed.tagId)}</span>`
    : ''
  const reply = parsed.replyTarget
    ? `<div class="mb-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"><div class="font-medium text-foreground">回复 ${escapeHtml(parsed.replyTarget)}</div>${parsed.replyExcerpt ? `<div class="mt-1">${renderCommentMarkdownHtml(parsed.replyExcerpt)}</div>` : ''}</div>`
    : ''
  const content = `<div class="pt-1 break-words text-foreground">${tag}<span class="align-middle">${renderCommentMarkdownInlineHtml(parsed.content)}</span></div>`
  return `${reply}${content}`
}

const workspaceFolderPrefixInput = computed({
  get: () => stripReleaseFolderSuffix(newWorkspaceName.value),
  set: (value: string) => {
    const prefix = stripReleaseFolderSuffix(value)
    newWorkspaceName.value = prefix ? `${prefix}${RELEASE_FOLDER_SUFFIX}` : ''
  }
})

type VisibleTreeItem = WorkspaceTreeItem & { collapsed: boolean }

const getVisibleTreeItems = (
  tree: WorkspaceTreeItem[],
  collapsedPaths: string[]
): VisibleTreeItem[] => {
  const collapsedSet = new Set(collapsedPaths)
  const stack: string[] = []
  const visible: VisibleTreeItem[] = []

  for (const item of tree) {
    while (stack.length > item.depth) {
      stack.pop()
    }

    const hidden = stack.some(path => collapsedSet.has(path))
    if (!hidden) {
      visible.push({
        ...item,
        collapsed: item.type === 'folder' && collapsedSet.has(item.path)
      })
    }

    if (item.type === 'folder') {
      stack.push(item.path)
    }
  }

  return visible
}

const visibleWorkspaceItems = computed(() =>
  getVisibleTreeItems(workspaceTree.value, collapsedWorkspaceFolders.value)
)

const visibleRemoteItems = computed(() =>
  getVisibleTreeItems(remoteWorkspaceTree.value, collapsedRemoteFolders.value)
)

const IMAGE_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif']

const isImagePath = (path: string): boolean => {
  const normalized = path.trim().toLowerCase()
  return IMAGE_FILE_EXTENSIONS.some(ext => normalized.endsWith(ext))
}

const isImageSelectablePath = (path: string): boolean =>
  isImagePath(path) || Boolean(opfsLocalPreviewUrlMap.value[path])

const remotePickerDialogTitle = computed(() =>
  remotePickerStep.value === 1
    ? '步骤 1/2：选择或新建文件夹'
    : '步骤 2/2：本地导入并选择文件'
)

const remotePickerFolderItems = computed(() => {
  const fromRemote = remoteWorkspaceTree.value.filter(item => item.type === 'folder')
  const fromDraft = remotePickerDraftFolders.value.map(path => {
    const segments = path.split('/').filter(Boolean)
    return {
      type: 'folder' as const,
      path,
      label: segments[segments.length - 1] || path,
      depth: Math.max(0, segments.length - 1)
    }
  })
  const merged = [...fromRemote, ...fromDraft]
  const dedup = new Map<string, WorkspaceTreeItem>()
  for (const item of merged) {
    if (!dedup.has(item.path)) dedup.set(item.path, item)
  }
  const folderTree = [...dedup.values()]
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
  return getVisibleTreeItems(folderTree, collapsedRemoteFolders.value)
})

const remotePickerTreeItems = computed(() => {
  return visibleRemoteItems.value.filter(item => {
    if (item.type === 'folder') return true
    if (
      (remotePickerMode.value === 'icon' || remotePickerMode.value === 'cover' || remotePickerMode.value === 'preview') &&
      !isImageSelectablePath(item.path)
    ) return false
    return true
  })
})

const remotePickerPreviewPath = computed(() => remotePickerSelectedPaths.value[0] || '')
const remotePickerLocalItems = computed(() => {
  const all = Object.keys(opfsLocalPathSet.value)
  return all
    .filter(path => {
      if (
        (remotePickerMode.value === 'icon' || remotePickerMode.value === 'cover' || remotePickerMode.value === 'preview') &&
        !isImageSelectablePath(path)
      ) return false
      return true
    })
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const openFileNameConflictDialog = (repoPath: string): void => {
  fileNameConflictMessage.value = `路径 "${repoPath}" 已存在同名文件，请修改文件名或目标文件夹后重试。`
  showFileNameConflictDialog.value = true
}

const createRemotePickerFolder = (parentPath?: string): void => {
  const folderNameBase = '新建文件夹'
  const parent = sanitizeRepoFolderPath(parentPath ?? remotePickerTargetFolder.value)

  const taken = new Set([
    ...remoteWorkspaceTree.value.filter(item => item.type === 'folder').map(item => item.path),
    ...remotePickerDraftFolders.value
  ])

  let suffix = 0
  let candidate = folderNameBase
  while (taken.has(parent ? `${parent}/${candidate}` : candidate)) {
    suffix += 1
    candidate = `${folderNameBase} ${suffix + 1}`
  }
  const fullPath = parent ? `${parent}/${candidate}` : candidate
  remotePickerDraftFolders.value = [...remotePickerDraftFolders.value, fullPath]
  const nextCollapsed = new Set(collapsedRemoteFolders.value)
  if (parent) nextCollapsed.delete(parent)
  nextCollapsed.delete(fullPath)
  collapsedRemoteFolders.value = [...nextCollapsed]
  remotePickerTargetFolder.value = fullPath
  startRenameDraftFolder(fullPath)
}

const isDraftFolder = (path: string): boolean =>
  remotePickerDraftFolders.value.includes(path)

const startRenameDraftFolder = (path: string): void => {
  if (!isDraftFolder(path)) return
  const segments = path.split('/').filter(Boolean)
  const name = segments[segments.length - 1] || path
  remotePickerRenamingPath.value = path
  remotePickerRenamingName.value = name
  void nextTick(() => {
    const input = remotePickerRenameInputRef.value
    if (!input) return
    input.focus()
    input.select()
  })
}

const cancelRenameDraftFolder = (): void => {
  remotePickerRenamingPath.value = ''
  remotePickerRenamingName.value = ''
}

const commitRenameDraftFolder = (): void => {
  const oldPath = remotePickerRenamingPath.value
  if (!oldPath || !isDraftFolder(oldPath)) {
    cancelRenameDraftFolder()
    return
  }

  const newName = sanitizeRepoFileName(remotePickerRenamingName.value)
  if (!newName) {
    appendLog('文件夹名称不合法')
    return
  }

  const parts = oldPath.split('/').filter(Boolean)
  const parent = parts.slice(0, -1).join('/')
  const newPath = parent ? `${parent}/${newName}` : newName
  if (newPath === oldPath) {
    cancelRenameDraftFolder()
    return
  }

  const existsInRemote = remoteWorkspaceTree.value.some(item => item.type === 'folder' && item.path === newPath)
  const existsInDraft = remotePickerDraftFolders.value.some(path => path === newPath && path !== oldPath)
  if (existsInRemote || existsInDraft) {
    appendLog('该文件夹名称已存在')
    return
  }

  const prefix = `${oldPath}/`
  remotePickerDraftFolders.value = remotePickerDraftFolders.value.map(path => {
    if (path === oldPath) return newPath
    if (path.startsWith(prefix)) return `${newPath}/${path.slice(prefix.length)}`
    return path
  })
  if (remotePickerTargetFolder.value === oldPath || remotePickerTargetFolder.value.startsWith(prefix)) {
    remotePickerTargetFolder.value = `${newPath}${remotePickerTargetFolder.value.slice(oldPath.length)}`
  }
  cancelRenameDraftFolder()
}

const deleteDraftFolder = (path: string): void => {
  if (!isDraftFolder(path)) return
  const prefix = `${path}/`
  remotePickerDraftFolders.value = remotePickerDraftFolders.value.filter(item => item !== path && !item.startsWith(prefix))
  if (remotePickerTargetFolder.value === path || remotePickerTargetFolder.value.startsWith(prefix)) {
    remotePickerTargetFolder.value = ''
  }
  if (remotePickerRenamingPath.value === path || remotePickerRenamingPath.value.startsWith(prefix)) {
    cancelRenameDraftFolder()
  }
}

const toggleWorkspaceFolder = (path: string): void => {
  if (collapsedWorkspaceFolders.value.includes(path)) {
    collapsedWorkspaceFolders.value = collapsedWorkspaceFolders.value.filter(item => item !== path)
    return
  }
  collapsedWorkspaceFolders.value = [...collapsedWorkspaceFolders.value, path]
}

const toggleRemoteFolder = (path: string): void => {
  if (collapsedRemoteFolders.value.includes(path)) {
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(item => item !== path)
    return
  }
  collapsedRemoteFolders.value = [...collapsedRemoteFolders.value, path]
}

const resolvedRepoName = computed(() => {
  const manual = repoName.value.trim()
  if (manual) return manual

  const folderCandidate =
    newWorkspaceName.value.trim() ||
    workspaceName.value.trim() ||
    getWorkspaceFolderNameFromPath(workspacePath.value || '')

  const sanitizedFolderName = folderCandidate
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)

  if (sanitizedFolderName) return sanitizedFolderName

  const slug = itemId.value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug ? `ab-resource-${slug}` : ''
})

const selectedUploadPaths = computed(() => {
  const paths = new Set<string>()
  const push = (value: string): void => {
    const normalized = value.trim()
    if (normalized) paths.add(normalized)
  }

  push(iconPath.value)
  push(coverPath.value)

  for (const item of previewItems.value) {
    push(item.path)
  }

  for (const deviceId of selectedDeviceIds.value) {
    push(downloads.value[deviceId]?.file_name || '')
  }

  return [...paths].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const normalizedTagsText = computed(() =>
  tags.value
    .map(tag => tag.trim())
    .filter(Boolean)
    .join(';')
)

const normalizedDevicesText = computed(() => selectedDeviceIds.value.join(';'))

const normalizedDeviceVendorsText = computed(() => {
  const vendors = selectedDeviceIds.value
    .map(id => deviceOptions.find(device => device.id === id)?.vendor || '')
    .filter(Boolean)
  return [...new Set(vendors)].join(';')
})

const areDownloadsComplete = computed(
  () =>
    selectedDeviceIds.value.length > 0 &&
    selectedDeviceIds.value.every(deviceId => {
      const entry = downloads.value[deviceId]
      return Boolean(entry && entry.version.trim() && entry.file_name.trim())
    })
)

const validateLinkUrl = (raw: string): string | null => {
  const value = raw.trim()
  if (!value) return 'URL 不能为空'
  if (!/^https:\/\//i.test(value)) return 'URL 必须以 https:// 开头'
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return 'URL 必须使用 https 协议'
  } catch {
    return 'URL 格式不合法'
  }
  return null
}

const linksValidationMessage = computed(() => {
  for (let i = 0; i < links.value.length; i++) {
    const link = links.value[i]
    const hasValue = Boolean(link.icon.trim() || link.title.trim() || link.url.trim())
    if (!hasValue) continue
    const error = validateLinkUrl(link.url)
    if (error) return `第 ${i + 1} 个相关链接：${error}`
  }
  return ''
})

const isResourceInfoValid = computed(
  () =>
    Boolean(
      itemId.value.trim() &&
        itemName.value.trim() &&
        restype.value.trim() &&
        iconPath.value.trim() &&
        coverPath.value.trim() &&
        normalizedTagsText.value &&
        areDownloadsComplete.value &&
        !linksValidationMessage.value
    )
)

const canUpload = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        (workspaceHandle.value || isResourceUpdateMode.value) &&
        isResourceInfoValid.value &&
        resolvedRepoName.value
    )
)

const canSubmitPr = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        uploadedCommitSha.value &&
        uploadedRepoOwner.value &&
        uploadedRepoName.value &&
        upstreamOwner.value.trim() &&
        upstreamRepo.value.trim() &&
        (submitMode.value === 'v1' || catalogPath.value.trim()) &&
        prTitle.value.trim()
    )
)

const submitModeLabel = computed(() => {
  if (submitMode.value === 'both') return 'v1 + v2'
  if (submitMode.value === 'v1') return '仅 v1'
  return '仅 v2'
})

const formatResourceTypeForCatalog = (value: string): string =>
  value.trim() === 'quickapp' ? 'quick_app' : 'watchface'

const formatResourceTypeForLegacy = (value: string): string =>
  value.trim() === 'quickapp' ? 'quickapp' : 'watchface'

const formatResourceTypeForTitle = (value: string): string =>
  value.trim() === 'quickapp' ? '快应用' : '表盘'

const formatPaidTypeLabel = (value: string): string => {
  const normalized = value.trim()
  if (!normalized) return '免费'
  if (normalized === 'paid') return '应用内付费（paid）'
  if (normalized === 'force_paid') return '强制付费（force_paid）'
  return normalized
}

const encodeUrlPath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')

const getRawUrl = (path: string): string => {
  const owner = uploadedRepoOwner.value || currentUser.value || ''
  const repo = uploadedRepoName.value || resolveRepoNameForSubmit()
  const encodedPath = encodeUrlPath(path)
  return `https://raw.githubusercontent.com/${owner}/${repo}/${MAIN_BRANCH}/${encodedPath}`
}

const getPickerPreviewUrl = (path: string): string =>
  opfsLocalPreviewUrlMap.value[path] || getRawUrl(path)

const getLegacyDeviceCode = (deviceId: string): string => {
  const device = getDeviceById(deviceId)
  if (!device) return deviceId
  const preferred = device.aliases.find(alias => /^[a-z]\d+([a-z]+)?$/i.test(alias))
  return preferred || device.id
}

const normalizedLegacyDevicesText = computed(() =>
  selectedDeviceIds.value
    .map(getLegacyDeviceCode)
    .filter(Boolean)
    .join(';')
)

const buildAutoPrTitle = (): string => {
  const name = itemName.value.trim() || '未命名资源'
  if (isResourceUpdateMode.value) {
    return `[ABoooxCC]更新 ${name} ${formatResourceTypeForTitle(restype.value)}`
  }
  return `[ABoooxCC]添加 ${name} ${formatResourceTypeForTitle(restype.value)}`
}

const buildAutoPrBody = (): string => {
  const normalizedTagText = tags.value
    .map(tag => tag.trim())
    .filter(Boolean)
    .join(' / ') || '无'

  const supportDevices = selectedDeviceIds.value
    .map(id => `- ${id}（${getDeviceLabel(id)}）`)
    .join('\n') || '- 无'

  const repoUrl = uploadedRepoUrl.value || `https://github.com/${uploadedRepoOwner.value || currentUser.value || '--'}/${uploadedRepoName.value || resolvedRepoName.value || '--'}`
  const shortHash = uploadedCommitSha.value ? uploadedCommitSha.value.slice(0, 7) : '--'
  const iconFile = iconPath.value.trim()
  const coverFile = coverPath.value.trim()

  const previewSection = previewItems.value.length
    ? previewItems.value
        .map(item => `- \`${item.path}\`\n  ${getRawUrl(item.path)}`)
        .join('\n')
    : '- 无'

  const downloadsSection = selectedDeviceIds.value.length
    ? selectedDeviceIds.value
        .map(deviceId => {
          const entry = downloads.value[deviceId]
          if (!entry) return `- \`${deviceId}\`\n  - version: \`--\`\n  - file: \`--\`\n  - raw: --`
          const filePath = entry.file_name.trim()
          return [
            `- \`${deviceId}\``,
            `  - version: \`${entry.version.trim() || '--'}\``,
            `  - file: \`${filePath || '--'}\``,
            `  - raw: ${filePath ? getRawUrl(filePath) : '--'}`
          ].join('\n')
        })
        .join('\n')
    : '- 无'

  const linksSection = links.value.length
    ? links.value
        .filter(link => link.icon.trim() || link.title.trim() || link.url.trim())
        .map(link => `- ${link.title.trim() || '未命名链接'}（${link.icon.trim() || '无图标'}）：${link.url.trim() || '--'}`)
        .join('\n') || '- 无'
    : '- 无'

  return [
    '## 资源信息',
    '',
    `- 资源名称：${itemName.value.trim() || '--'}`,
    `- 资源 ID：${itemId.value.trim() || '--'}`,
    `- 资源类型：${formatResourceTypeForTitle(restype.value)}（${formatResourceTypeForCatalog(restype.value)}）`,
    `- 提交版本：${submitModeLabel.value}`,
    `- 付费类型：${formatPaidTypeLabel(paidType.value)}`,
    `- 标签：${normalizedTagText}`,
    '',
    '## 支持设备',
    '',
    supportDevices,
    '',
    '## 仓库信息',
    '',
    `- 资源仓库：${repoUrl}`,
    `- 提交短哈希：\`${shortHash}\``,
    '',
    '## 图片资源（Raw）',
    '',
    `- Icon：\`${iconFile || '--'}\`  `,
    iconFile ? getRawUrl(iconFile) : '--',
    `- Cover：\`${coverFile || '--'}\`  `,
    coverFile ? getRawUrl(coverFile) : '--',
    '- Preview：',
    previewSection,
    '',
    '## 下载资源（downloads）',
    '',
    downloadsSection,
    '',
    '## 链接（manifest_v2.links）',
    '',
    linksSection,
    '',
    '---',
    '此 PR 由 AstroBooox Cretor Console（https://astrobooox-ng.waijade.cn/cc/）生成，如有问题前往 https://github.com/CheongSzesuen/AstroBooox/issues 提交 issue。'
  ].join('\n')
}

const isWorkspaceStepDone = computed(() => Boolean(workspaceHandle.value || workspacePath.value))
const isResourceInfoStepDone = computed(() => isResourceInfoValid.value)
const isUploadStepDone = computed(() =>
  isResourceUpdateMode.value ? hasUploadedInCurrentFlow.value : Boolean(uploadedCommitSha.value)
)
const isPrStepDone = computed(() => Boolean(latestPrUrl.value))

const stepList = computed(() => {
  if (isResourceUpdateMode.value) {
    return [
      { label: '更新资源', done: isResourceInfoStepDone.value, targetStep: 1 },
      { label: '上传仓库', done: isUploadStepDone.value, targetStep: 2 },
      { label: '提交 Pull Request', done: isPrStepDone.value, targetStep: 3 }
    ]
  }

  return [
    { label: '创建文件夹', done: isWorkspaceStepDone.value, targetStep: 0 },
    { label: '资源信息', done: isResourceInfoStepDone.value, targetStep: 1 },
    { label: '上传仓库', done: isUploadStepDone.value, targetStep: 2 },
    { label: '提交 Pull Request', done: isPrStepDone.value, targetStep: 3 }
  ]
})

const canAccessStep = (index: number): boolean => {
  if (isResourceUpdateMode.value) {
    if (index <= 1) return true
    if (index === 2) return isResourceInfoStepDone.value
    if (index === 3) return isUploadStepDone.value
    return false
  }

  if (index <= 0) return true
  if (index === 1) return isWorkspaceStepDone.value
  if (index === 2) return isResourceInfoStepDone.value
  if (index === 3) return isUploadStepDone.value
  return false
}

const openSubmitVersionDialog = (): void => {
  if (!isResourceInfoStepDone.value) {
    appendLog('请先完成资源信息后再继续')
    return
  }
  showSubmitVersionDialog.value = true
}

const confirmSubmitMode = (mode: SubmitMode): void => {
  submitMode.value = mode
  showSubmitVersionDialog.value = false
  goToStep(2)
}

const goToStep = (index: number): void => {
  if (canAccessStep(index)) {
    if (index === 3) {
      prTitle.value = buildAutoPrTitle()
      prBody.value = buildAutoPrBody()
    }
    activeStep.value = index
    return
  }
  appendLog('请先完成前一步后再继续')
}

const getDeviceById = (id: string): DeviceOption | undefined =>
  deviceOptions.find(device => device.id === id)

const getDeviceLabel = (id: string): string => {
  const device = getDeviceById(id)
  if (!device) return id
  return `${device.name} (${device.id})`
}

const ensureDownload = (deviceId: string): void => {
  if (!downloads.value[deviceId]) {
    downloads.value[deviceId] = {
      version: '1.0.0',
      file_name: ''
    }
  }
}

const isDeviceSelected = (deviceId: string): boolean => selectedDeviceIds.value.includes(deviceId)

const toggleDeviceSelection = (deviceId: string): void => {
  if (isDeviceSelected(deviceId)) {
    selectedDeviceIds.value = selectedDeviceIds.value.filter(id => id !== deviceId)
    delete downloads.value[deviceId]
    return
  }
  selectedDeviceIds.value = [...selectedDeviceIds.value, deviceId]
  ensureDownload(deviceId)
}

const removeDevice = (deviceId: string): void => {
  selectedDeviceIds.value = selectedDeviceIds.value.filter(id => id !== deviceId)
  delete downloads.value[deviceId]
}

const addAuthor = (): void => {
  authors.value.push({ name: '', authorUrl: '', bindABAccount: true })
}

const removeAuthor = (index: number): void => {
  authors.value.splice(index, 1)
}

const addLink = (): void => {
  links.value.push({
    icon: '',
    title: '',
    url: ''
  })
}

const removeLink = (index: number): void => {
  links.value.splice(index, 1)
}

const openLinkIconPicker = (index: number): void => {
  linkIconPickerIndex.value = index
  linkPickerInitialQuery.value = links.value[index]?.icon || ''
  showLinkIconPicker.value = true
}

const selectLinkIcon = (iconName: string): void => {
  const index = linkIconPickerIndex.value
  if (index === null || !links.value[index]) return
  links.value[index].icon = iconName
  showLinkIconPicker.value = false
}

const addTag = (): void => {
  const value = tagInput.value.trim()
  if (!value) return
  if (!tags.value.includes(value)) {
    tags.value.push(value)
  }
  tagInput.value = ''
}

const removeTag = (index: number): void => {
  tags.value.splice(index, 1)
}

const applyResourceEditDraft = (): void => {
  const draft = resourceEditDraft.value
  if (!draft) return

  resetResourceInfoFields()
  isResourceUpdateMode.value = true
  submitMode.value = 'v2'
  fileTreeTab.value = 'remote'
  clearWorkspace()
  workspaceDisplayPath.value = ''
  workspaceName.value = ''
  hasUploadedInCurrentFlow.value = false

  itemId.value = draft.catalogId.trim()
  itemName.value = draft.name.trim()
  restype.value = normalizeOwnedRestype(draft.restype) === 'watchface' ? 'watchface' : 'quickapp'
  paidType.value = draft.paidType.trim()
  itemDescription.value = draft.description.trim()
  tags.value = draft.tags.map(tag => tag.trim()).filter(Boolean)
  iconPath.value = draft.icon.trim()
  coverPath.value = draft.cover.trim()
  previewItems.value = draft.previews
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      path
    }))

  const draftAuthors = Array.isArray(draft.authors) ? draft.authors : []
  authors.value = draftAuthors.length
    ? draftAuthors.map(author => ({
      name: author.name.trim(),
      authorUrl: author.authorUrl.trim(),
      bindABAccount: Boolean(author.bindABAccount)
    }))
    : [{ name: '', authorUrl: '', bindABAccount: true }]

  const draftLinks = Array.isArray(draft.links) ? draft.links : []
  links.value = draftLinks.map(link => ({
    icon: link.icon.trim(),
    title: link.title.trim(),
    url: link.url.trim()
  }))

  const nextDownloads: Record<string, { version: string; file_name: string }> = {}
  for (const [rawDeviceId, entry] of Object.entries(draft.downloads || {})) {
    const deviceId = normalizeDeviceToken(rawDeviceId)
    if (!deviceId) continue
    nextDownloads[deviceId] = {
      version: String(entry?.version || '').trim() || '1.0.0',
      file_name: String(entry?.file_name || '').trim()
    }
  }
  downloads.value = nextDownloads
  const draftDeviceIds = Object.keys(nextDownloads)
  const fallbackDeviceIds = draft.devices
    .split(/[;；,，]/)
    .map(token => normalizeDeviceToken(token))
    .filter(Boolean)
  selectedDeviceIds.value = [...new Set(draftDeviceIds.length > 0 ? draftDeviceIds : fallbackDeviceIds)]
  selectedDeviceIds.value.forEach(deviceId => ensureDownload(deviceId))

  upstreamOwner.value = defaultTargetOwner.value.trim()
  upstreamRepo.value = defaultTargetRepo.value.trim()
  catalogPath.value = defaultCatalogPath.value.trim()
  repoName.value = draft.repoName.trim()
  uploadedRepoOwner.value = draft.repoOwner.trim()
  uploadedRepoName.value = draft.repoName.trim()
  uploadedRepoUrl.value = `https://github.com/${draft.repoOwner.trim()}/${draft.repoName.trim()}`
  uploadedCommitSha.value = draft.repoCommitHash.trim()
  latestPrUrl.value = ''

  activeStep.value = 1
  appendLog(`已载入资源更新草稿：资源=${draft.catalogId}，仓库=${draft.repoOwner}/${draft.repoName}，用户=${currentUser.value || 'unknown'}`)
  void syncRemoteWorkspaceForUpdate(draft.repoOwner, draft.repoName)
}

const pickFileFromWorkspace = async (): Promise<PickedWorkspaceFile | null> => {
  const handle = await ensureWorkspaceHandle()
  if (!handle) {
    return null
  }

  const picker = (window as unknown as { showOpenFilePicker?: Function }).showOpenFilePicker
  if (typeof picker !== 'function') {
    appendLog('当前浏览器不支持文件选择器 API')
    return null
  }

  try {
    const handles = (await picker({
      multiple: false,
      startIn: handle
    })) as WorkspaceFileHandle[]

    const fileHandle = handles?.[0]
    if (!fileHandle) return null

    if (typeof handle.resolve === 'function') {
      const relativeParts = await handle.resolve(fileHandle)
      if (relativeParts && relativeParts.length > 0) {
        const file = await fileHandle.getFile()
        return {
          path: relativeParts.join('/'),
          file
        }
      }

      showOutOfWorkspaceFileDialog.value = true
      return null
    }

    const file = await fileHandle.getFile()
    return {
      path: fileHandle.name || file.name,
      file
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null
    appendLog(`选择文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  }
}

const getImageSize = async (file: File): Promise<{ width: number; height: number }> => {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

const showInvalidImageDialog = (message: string): void => {
  imageValidationMessage.value = message
  showImageValidationDialog.value = true
}

const validateIconImage = async (file: File): Promise<boolean> => {
  try {
    const { width, height } = await getImageSize(file)
    if (width !== height) {
      showInvalidImageDialog(`icon 必须为 1:1 比例。当前为 ${width}×${height}。`)
      return false
    }
    if (width > 500 || height > 500) {
      showInvalidImageDialog(`icon 尺寸必须小于等于 500×500。当前为 ${width}×${height}。`)
      return false
    }
    return true
  } catch {
    showInvalidImageDialog('icon 文件无法解析为图片，请重新选择。')
    return false
  }
}

const validateCoverImage = async (file: File): Promise<boolean> => {
  try {
    const { width, height } = await getImageSize(file)
    const ratio = width / height
    if (Math.abs(ratio - 1.5) > 0.02) {
      showInvalidImageDialog(`cover 宽高比必须为 1.5。当前为 ${width}×${height}（${ratio.toFixed(3)}）。`)
      return false
    }
    return true
  } catch {
    showInvalidImageDialog('cover 文件无法解析为图片，请重新选择。')
    return false
  }
}

const selectIconFile = async (): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (!picked) return
  if (!(await validateIconImage(picked.file))) return
  iconPath.value = picked.path
}

const selectCoverFile = async (): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (!picked) return
  if (!(await validateCoverImage(picked.file))) return
  coverPath.value = picked.path
}

const createPreviewItemFromPath = (path: string): { id: string; path: string } => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  path
})

const getLinkIconPreviewComponent = (iconName: string): Component | null => {
  const normalized = iconName.trim().toLowerCase()
  if (!normalized) return null
  const pascalName = normalized
    .split('-')
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join('')
  if (!pascalName) return null
  const modulePath = `/node_modules/@phosphor-icons/vue/dist/icons/Ph${pascalName}.vue.mjs`
  const iconModule = phosphorIconModules[modulePath] as { default?: Component } | undefined
  return iconModule?.default || null
}

const sanitizeRepoFileName = (name: string, fallback = ''): string => {
  const normalized = name
    .trim()
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001F]+/g, '')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
  return normalized || fallback
}

const sanitizeRepoFolderPath = (folderPath: string): string =>
  folderPath
    .split('/')
    .map(segment => sanitizeRepoFileName(segment))
    .filter(Boolean)
    .join('/')

const buildUploadedFileName = (originalName: string, index: number, total: number): string => {
  const customRaw = remotePickerUploadFileName.value.trim()
  const custom = sanitizeRepoFileName(customRaw)
  if (!customRaw) return sanitizeRepoFileName(originalName, `upload_${index + 1}`)
  if (!custom) return sanitizeRepoFileName(originalName, `upload_${index + 1}`)
  const base = custom.replace(/\.[^.]+$/, '')
  const originDot = originalName.lastIndexOf('.')
  const originExt = originDot > 0 && originDot < originalName.length - 1 ? originalName.slice(originDot) : ''
  return `${base}${originExt}`
}

const getDefaultUploadFolder = (mode: RemotePickerMode): string => {
  return ''
}

const buildOpfsRepoPath = (mode: RemotePickerMode, fileName: string, folderPath: string, index = 0): string => {
  const safeName = sanitizeRepoFileName(fileName, mode === 'preview' ? `preview_${index + 1}` : `upload_${index + 1}`)
  const safeFolder = sanitizeRepoFolderPath(folderPath)
  return safeFolder ? `${safeFolder}/${safeName}` : safeName
}

const writeFileToOpfs = async (repoPath: string, file: File): Promise<void> => {
  const root = await navigator.storage.getDirectory()
  const parts = ['astrobooox-local', ...repoPath.split('/').filter(Boolean)]
  let dir = root
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true })
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file)
  await writable.close()
}

const readFileFromOpfs = async (repoPath: string): Promise<File | null> => {
  try {
    const root = await navigator.storage.getDirectory()
    const parts = ['astrobooox-local', ...repoPath.split('/').filter(Boolean)]
    let dir = root
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i])
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1])
    return await fileHandle.getFile()
  } catch {
    return null
  }
}

const removeFileFromOpfs = async (repoPath: string): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory()
    const parts = ['astrobooox-local', ...repoPath.split('/').filter(Boolean)]
    let dir = root
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i])
    }
    await dir.removeEntry(parts[parts.length - 1])
  } catch {
    // ignore remove errors to avoid blocking UI flow
  }
}

const openRemotePickerLocalUpload = (): void => {
  const input = remotePickerLocalInputRef.value
  if (!input) return
  input.value = ''
  input.click()
}

const handleRemotePickerLocalUpload = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement | null
  const files = input?.files
  if (!files || files.length === 0) return

  if (!navigator.storage?.getDirectory) {
    appendLog('当前浏览器不支持 OPFS，无法使用本地上传')
    return
  }

  const fileList = Array.from(files)
  if (remotePickerUploadFileName.value.trim() && fileList.length > 1) {
    appendLog('已填写本地导入文件名时，一次只能选择一个文件')
    return
  }
  const targetFolder = sanitizeRepoFolderPath(remotePickerTargetFolder.value)
  remotePickerTargetFolder.value = targetFolder
  const nextSelected: string[] = []
  const pendingUploads: Array<{ file: File; repoPath: string }> = []
  const existingPaths = new Set<string>([
    ...remoteWorkspaceTree.value.filter(item => item.type === 'file').map(item => item.path),
    ...Object.keys(opfsLocalPathSet.value)
  ])

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    const targetName = buildUploadedFileName(file.name, i, fileList.length)
    const repoPath = buildOpfsRepoPath(remotePickerMode.value, targetName, targetFolder, i)
    if (existingPaths.has(repoPath)) {
      openFileNameConflictDialog(repoPath)
      return
    }
    existingPaths.add(repoPath)
    pendingUploads.push({ file, repoPath })
  }

  for (const pending of pendingUploads) {
    await writeFileToOpfs(pending.repoPath, pending.file)
    opfsLocalPathSet.value[pending.repoPath] = true
    if (isImagePath(pending.repoPath)) {
      const previousUrl = opfsLocalPreviewUrlMap.value[pending.repoPath]
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      opfsLocalPreviewUrlMap.value[pending.repoPath] = URL.createObjectURL(pending.file)
    }
    nextSelected.push(pending.repoPath)
  }

  if (remotePickerMode.value === 'preview') {
    const merged = new Set([...remotePickerSelectedPaths.value, ...nextSelected])
    remotePickerSelectedPaths.value = [...merged]
  } else {
    remotePickerSelectedPaths.value = [nextSelected[nextSelected.length - 1]]
  }
}

const selectMultiplePreviewFiles = async (): Promise<void> => {
  const workspace = await ensureWorkspaceHandle()
  if (!workspace) {
    return
  }

  const picker = (window as unknown as { showOpenFilePicker?: Function }).showOpenFilePicker
  if (typeof picker !== 'function') {
    appendLog('当前浏览器不支持文件选择器 API')
    return
  }

  try {
    const handles = (await picker({
      multiple: true,
      startIn: workspace
    })) as WorkspaceFileHandle[]

    if (!handles?.length) return

    const pickedPaths: string[] = []

    for (const handle of handles) {
      if (typeof workspace.resolve === 'function') {
        const relativeParts = await workspace.resolve(handle)
        if (!relativeParts || relativeParts.length === 0) {
          showOutOfWorkspaceFileDialog.value = true
          return
        }
        pickedPaths.push(relativeParts.join('/'))
      } else {
        pickedPaths.push(handle.name)
      }
    }

    const existing = new Set(previewItems.value.map(item => item.path))
    const uniqueNewPaths = pickedPaths.filter(path => !existing.has(path))
    previewItems.value = [
      ...previewItems.value,
      ...uniqueNewPaths.map(path => createPreviewItemFromPath(path))
    ]
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择预览图失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const selectRemotePickerFolder = (path: string): void => {
  remotePickerTargetFolder.value = remotePickerTargetFolder.value === path ? '' : path
}

const openRemoteFilePicker = (mode: RemotePickerMode, deviceId = ''): void => {
  if (remoteWorkspaceTree.value.length === 0) {
    appendLog('远程仓库文件树为空，请先同步远程仓库')
    return
  }

  remotePickerMode.value = mode
  remotePickerDeviceId.value = deviceId
  remotePickerSelectedPaths.value = []
  remotePickerUploadFileName.value = ''
  remotePickerStep.value = 1
  remotePickerDraftFolders.value = []
  cancelRenameDraftFolder()
  collapsedRemoteFolders.value = []
  remotePickerTargetFolder.value = getDefaultUploadFolder(mode)
  showRemoteFilePickerDialog.value = true
}

const toggleRemotePickerPath = (path: string): void => {
  const normalizedPath = path.trim().replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalizedPath) return

  if (remotePickerMode.value === 'preview') {
    const exists = remotePickerSelectedPaths.value.includes(normalizedPath)
    remotePickerSelectedPaths.value = exists
      ? remotePickerSelectedPaths.value.filter(item => item !== normalizedPath)
      : [...remotePickerSelectedPaths.value, normalizedPath]
    return
  }

  remotePickerSelectedPaths.value = [normalizedPath]
}

const applyRemotePickerSelection = (): void => {
  if (remotePickerSelectedPaths.value.length === 0) {
    appendLog('请先选择文件')
    return
  }

  if (remotePickerMode.value === 'icon') {
    iconPath.value = remotePickerSelectedPaths.value[0]
  } else if (remotePickerMode.value === 'cover') {
    coverPath.value = remotePickerSelectedPaths.value[0]
  } else if (remotePickerMode.value === 'download') {
    const deviceId = remotePickerDeviceId.value.trim()
    if (!deviceId) {
      appendLog('下载文件选择失败：缺少设备标识')
      return
    }
    ensureDownload(deviceId)
    downloads.value[deviceId].file_name = remotePickerSelectedPaths.value[0]
  } else {
    const existing = new Set(previewItems.value.map(item => item.path))
    const nextPaths = remotePickerSelectedPaths.value.filter(path => !existing.has(path))
    previewItems.value = [
      ...previewItems.value,
      ...nextPaths.map(path => createPreviewItemFromPath(path))
    ]
  }

  showRemoteFilePickerDialog.value = false
}

const removePreview = async (index: number): Promise<void> => {
  const target = previewItems.value[index]
  if (!target) return
  previewItems.value.splice(index, 1)

  if (!opfsLocalPathSet.value[target.path]) return
  await removeFileFromOpfs(target.path)
  delete opfsLocalPathSet.value[target.path]
  const previewUrl = opfsLocalPreviewUrlMap.value[target.path]
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl)
    delete opfsLocalPreviewUrlMap.value[target.path]
  }
}

const getWorkspaceFolderNameFromPath = (path: string): string => {
  const normalized = path.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  if (!normalized) return ''
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] || ''
}

const selectDownloadFile = async (deviceId: string): Promise<void> => {
  const picked = await pickFileFromWorkspace()
  if (picked) {
    ensureDownload(deviceId)
    downloads.value[deviceId].file_name = picked.path
  }
}

watch(
  () => selectedDeviceIds.value,
  ids => {
    for (const id of ids) {
      ensureDownload(id)
    }
  },
  { immediate: true, deep: true }
)

watch(
  workspacePath,
  path => {
    if (newWorkspaceName.value.trim()) return
    const fallbackName = getWorkspaceFolderNameFromPath(path || '')
    if (fallbackName) {
      newWorkspaceName.value = fallbackName
    }
  },
  { immediate: true }
)

watch(
  () => [workspaceTree.value.length, remoteWorkspaceTree.value.length] as const,
  ([workspaceCount, remoteCount]) => {
    if (fileTreeTab.value === 'workspace' && workspaceCount === 0 && remoteCount > 0) {
      fileTreeTab.value = 'remote'
      return
    }
    if (fileTreeTab.value === 'remote' && remoteCount === 0 && workspaceCount > 0) {
      fileTreeTab.value = 'workspace'
    }
  },
  { immediate: true }
)

watch(
  () => [defaultTargetOwner.value, defaultTargetRepo.value, defaultCatalogPath.value] as const,
  ([owner, repo, catalog]) => {
    upstreamOwner.value = owner
    upstreamRepo.value = repo
    catalogPath.value = catalog
  }
)

watch(
  () => workspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedWorkspaceFolders.value = collapsedWorkspaceFolders.value.filter(path =>
      validFolderPaths.has(path)
    )
  },
  { deep: true }
)

watch(
  () => remoteWorkspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(path =>
      validFolderPaths.has(path)
    )
  },
  { deep: true }
)

const toReleaseFolderName = (raw: string): string => {
  const normalized = stripReleaseFolderSuffix(raw)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  const prefix = normalized || `Resource_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  return `${prefix}${RELEASE_FOLDER_SUFFIX}`
}

const validateGitHubRepoName = (name: string): string | null => {
  if (!name) return '名称不能为空'
  if (name.length > 100) return '长度不能超过 100 个字符'
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return '仅允许英文、数字、点号(.)、下划线(_)和连字符(-)'
  if (!/^[A-Za-z0-9]/.test(name) || !/[A-Za-z0-9]$/.test(name)) return '必须以英文或数字开头和结尾'
  if (name.includes('..')) return '不能包含连续点号(..)'
  if (/\.git$/i.test(name)) return '不能以 .git 结尾'
  return null
}

const requireToken = (): string => {
  const value = token.value.trim()
  if (!value) throw new Error('请先输入 GitHub Token')
  return value
}

const ensureWorkspaceHandle = async (): Promise<WorkspaceDirectoryHandle | null> => {
  if (workspaceHandle.value) return workspaceHandle.value

  if (!window.showDirectoryPicker) {
    appendLog('当前浏览器不支持 FSA API')
    return null
  }

  try {
    const handle = (await window.showDirectoryPicker({
      id: 'resource-workspace',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle

    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    if (!newWorkspaceName.value.trim()) {
      newWorkspaceName.value = handle.name
    }

    appendLog(`已重新授权工作区: ${handle.name}`)
    await scanWorkspace({ forceSync: true })
    return handle
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null
    appendLog(`重新授权工作区失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  }
}

const selectWorkspace = async (): Promise<void> => {
  try {
    workspaceBusy.value = true
    if (!window.showDirectoryPicker) {
      throw new Error('当前浏览器不支持 FSA API')
    }
    const handle = (await window.showDirectoryPicker({
      id: 'resource-workspace',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle
    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    newWorkspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    appendLog(`已选择工作区: ${handle.name}`)
    await scanWorkspace({ forceSync: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择工作区失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    workspaceBusy.value = false
  }
}

const createWorkspaceFolder = async (): Promise<void> => {
  try {
    workspaceBusy.value = true
    if (!window.showDirectoryPicker) {
      throw new Error('当前浏览器不支持 FSA API')
    }

    const parent = (await window.showDirectoryPicker({
      id: 'resource-workspace-parent',
      mode: 'readwrite'
    })) as unknown as WorkspaceDirectoryHandle

    const folderName = toReleaseFolderName(newWorkspaceName.value)
    const validationError = validateGitHubRepoName(folderName)
    if (validationError) {
      folderNameValidationMessage.value = `文件夹名不符合 GitHub 仓库命名要求：${validationError}`
      showFolderNameValidationDialog.value = true
      return
    }
    const handle = await parent.getDirectoryHandle(folderName, { create: true })
    setWorkspaceHandle(handle)
    workspaceName.value = handle.name
    workspaceDisplayPath.value = `${parent.name}/${folderName}`
    newWorkspaceName.value = folderName
    appendLog(`已创建并切换目录: ${folderName}`)
    await scanWorkspace({ forceSync: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`创建文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    workspaceBusy.value = false
  }
}

const readFileTextByPath = async (
  root: WorkspaceDirectoryHandle,
  relativePath: string
): Promise<string | null> => {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts.length === 0) return null

  let current = root
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      current = await current.getDirectoryHandle(parts[i])
    } catch {
      return null
    }
  }

  try {
    const fileHandle = await current.getFileHandle(parts[parts.length - 1])
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

const readFileByPath = async (
  root: WorkspaceDirectoryHandle,
  relativePath: string
): Promise<File | null> => {
  const parts = relativePath.split('/').filter(Boolean)
  if (parts.length === 0) return null

  let current = root
  for (let i = 0; i < parts.length - 1; i++) {
    try {
      current = await current.getDirectoryHandle(parts[i])
    } catch {
      return null
    }
  }

  try {
    const fileHandle = await current.getFileHandle(parts[parts.length - 1])
    return await fileHandle.getFile()
  } catch {
    return null
  }
}

const collectWorkspaceTree = async (
  dir: WorkspaceDirectoryHandle,
  depth = 0,
  prefix = ''
): Promise<WorkspaceTreeItem[]> => {
  const folders: Array<{ name: string; handle: WorkspaceDirectoryHandle }> = []
  const files: string[] = []

  for await (const [name, handle] of dir) {
    if (name.startsWith('.')) continue

    if (handle.kind === 'directory') {
      folders.push({ name, handle: handle as WorkspaceDirectoryHandle })
    } else {
      files.push(name)
    }
  }

  folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  files.sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const items: WorkspaceTreeItem[] = []

  for (const folder of folders) {
    const folderPath = prefix ? `${prefix}/${folder.name}` : folder.name
    items.push({
      type: 'folder',
      label: folder.name,
      path: folderPath,
      depth
    })
    const children = await collectWorkspaceTree(folder.handle, depth + 1, folderPath)
    items.push(...children)
  }

  for (const fileName of files) {
    const filePath = prefix ? `${prefix}/${fileName}` : fileName
    items.push({
      type: 'file',
      label: fileName,
      path: filePath,
      depth
    })
  }

  return items
}

const loadRemoteRepoTree = async (
  tokenValue: string,
  owner: string,
  repo: string
): Promise<WorkspaceTreeItem[]> =>
  loadRepositoryTree({
    token: tokenValue,
    owner,
    repo,
    branch: MAIN_BRANCH
  })

const syncRemoteWorkspaceForUpdate = async (repoOwner: string, repoName: string): Promise<void> => {
  clearRemoteWorkspace()
  const owner = repoOwner.trim()
  const repo = repoName.trim()
  if (!owner || !repo) return

  const accessToken = token.value.trim()
  if (!accessToken) {
    appendLog('未检测到 Token，暂不加载远程仓库文件树')
    return
  }

  try {
    const remoteTree = await loadRemoteRepoTree(accessToken, owner, repo)
    setRemoteWorkspace(`${owner}/${repo}@${MAIN_BRANCH}`, remoteTree)
    appendLog('已同步远程仓库文件树')
  } catch (error: unknown) {
    appendLog(`远程文件树同步失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const resetResourceInfoFields = (): void => {
  isResourceUpdateMode.value = false
  hasUploadedInCurrentFlow.value = false
  itemId.value = ''
  itemName.value = ''
  restype.value = 'quickapp'
  paidType.value = ''
  itemDescription.value = ''
  tags.value = []
  tagInput.value = ''
  iconPath.value = ''
  coverPath.value = ''
  previewItems.value = []
  selectedDeviceIds.value = []
  downloads.value = {}
  authors.value = [{ name: '', authorUrl: '', bindABAccount: true }]
  links.value = []
}

const scanWorkspace = async (options: { forceSync?: boolean } = {}): Promise<void> => {
  if (!workspaceHandle.value) return
  const { forceSync = false } = options

  try {
    const manifest = await readFileTextByPath(workspaceHandle.value, MANIFEST_FILE)
    manifestText.value = manifest || ''

    const tree = await collectWorkspaceTree(workspaceHandle.value)
    setWorkspace(workspaceDisplayPath.value || workspaceName.value, tree, workspaceHandle.value)

    if (manifest) {
      try {
        const parsed = JSON.parse(manifest) as {
          item?: {
            id?: string
            name?: string
            restype?: string
            description?: string
            preview?: string[]
            icon?: string
            cover?: string
            author?: Array<{ name?: string; author_url?: string; bindABAccount?: boolean }>
          }
          links?: Array<{ icon?: string; title?: string; url?: string }>
          downloads?: Record<string, { version?: string; file_name?: string }>
        }
        if (forceSync) {
          resetResourceInfoFields()
        }

        itemId.value = forceSync ? parsed.item?.id || '' : itemId.value || parsed.item?.id || ''
        itemName.value = forceSync ? parsed.item?.name || '' : itemName.value || parsed.item?.name || ''
        const parsedRestype = parsed.item?.restype === 'quick_app' ? 'quickapp' : parsed.item?.restype
        restype.value = forceSync ? parsedRestype || 'quickapp' : restype.value || parsedRestype || 'quickapp'
        itemDescription.value = forceSync
          ? parsed.item?.description || ''
          : itemDescription.value || parsed.item?.description || ''
        iconPath.value = forceSync ? parsed.item?.icon || '' : iconPath.value || parsed.item?.icon || ''
        coverPath.value = forceSync ? parsed.item?.cover || '' : coverPath.value || parsed.item?.cover || ''
        if ((forceSync || previewItems.value.length === 0) && Array.isArray(parsed.item?.preview)) {
          previewItems.value = parsed.item.preview
            .filter(Boolean)
            .map(path => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              path
            }))
        }

        if ((forceSync || !authors.value.some(author => author.name.trim())) && parsed.item?.author?.length) {
          authors.value = parsed.item.author.map(author => ({
            name: author.name || '',
            authorUrl: author.author_url || '',
            bindABAccount: Boolean(author.bindABAccount)
          }))
        }

        if (forceSync || links.value.length === 0) {
          links.value = (parsed.links || []).map(link => ({
            icon: link.icon || '',
            title: link.title || '',
            url: link.url || ''
          }))
        }

        if (parsed.downloads && (forceSync || selectedDeviceIds.value.length === 0)) {
          const nextDownloads: Record<string, { version: string; file_name: string }> = {}
          const nextDeviceIds: string[] = []

          for (const [rawId, download] of Object.entries(parsed.downloads)) {
            const normalizedId = normalizeDeviceToken(rawId)
            if (!deviceOptions.some(device => device.id === normalizedId)) continue

            nextDeviceIds.push(normalizedId)
            nextDownloads[normalizedId] = {
              version: download?.version || '1.0.0',
              file_name: download?.file_name || ''
            }
          }

          selectedDeviceIds.value = [...new Set(nextDeviceIds)]
          downloads.value = nextDownloads
        } else if (forceSync && !parsed.downloads) {
          selectedDeviceIds.value = []
          downloads.value = {}
        }
      } catch {
        appendLog('manifest_v2.json 不是合法 JSON，将按原文上传')
      }
    } else if (forceSync) {
      resetResourceInfoFields()
    }

    uploadedRepoOwner.value = ''
    uploadedRepoName.value = ''
    uploadedRepoUrl.value = ''
    uploadedCommitSha.value = ''
    hasUploadedInCurrentFlow.value = false
    latestPrUrl.value = ''

    appendLog('目录扫描完成')
  } catch (error: unknown) {
    clearWorkspace()
    appendLog(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const refreshWorkspaceFileTree = async (): Promise<void> => {
  if (!workspaceHandle.value) {
    clearWorkspace()
    workspaceName.value = ''
    workspaceDisplayPath.value = ''
    newWorkspaceName.value = ''
    appendLog('目录访问权限已失效，已清空当前路径。请点击“选择已有文件夹”重新授权。')
    return
  }
  await scanWorkspace()
}

const buildManifestV2Text = (): string => {
  const normalizedAuthors = authors.value
    .map(author => ({
      name: author.name.trim(),
      bindABAccount: Boolean(author.bindABAccount)
    }))
    .filter(author => author.name)

  const normalizedDownloads = selectedDeviceIds.value.reduce<Record<string, { version: string; file_name: string }>>(
    (acc, deviceId) => {
      const entry = downloads.value[deviceId]
      if (!entry) return acc

      acc[deviceId] = {
        version: entry.version.trim(),
        file_name: entry.file_name.trim()
      }
      return acc
    },
    {}
  )

  const preview = previewItems.value
    .map(item => item.path.trim())
    .filter(Boolean)

  const normalizedLinks = links.value
    .map(link => ({
      icon: link.icon.trim(),
      title: link.title.trim(),
      url: link.url.trim()
    }))
    .filter(link => link.title || link.url || link.icon)

  const manifestObject = {
    item: {
      id: itemId.value.trim(),
      restype: formatResourceTypeForCatalog(restype.value),
      name: itemName.value.trim(),
      description: itemDescription.value.trim(),
      preview,
      icon: iconPath.value.trim(),
      cover: coverPath.value.trim(),
      author: normalizedAuthors
    },
    links: normalizedLinks,
    downloads: normalizedDownloads,
    ext: {}
  }

  return JSON.stringify(manifestObject, null, 2)
}

const buildManifestV1Text = (repoUrl: string): string => {
  const normalizedAuthors = authors.value
    .map(author => {
      const name = author.name.trim()
      const authorUrl = author.authorUrl.trim()
      return {
        name,
        ...(authorUrl ? { author_url: authorUrl } : {})
      }
    })
    .filter(author => author.name)

  const normalizedDownloads = selectedDeviceIds.value.reduce<Record<string, { version: string; file_name: string }>>(
    (acc, deviceId) => {
      const entry = downloads.value[deviceId]
      if (!entry) return acc
      const legacyCode = getLegacyDeviceCode(deviceId)
      acc[legacyCode] = {
        version: entry.version.trim(),
        file_name: entry.file_name.trim()
      }
      return acc
    },
    {}
  )

  const manifestObject = {
    item: {
      name: itemName.value.trim(),
      description: itemDescription.value.trim(),
      preview: previewItems.value.map(item => item.path.trim()).filter(Boolean),
      icon: iconPath.value.trim(),
      cover: coverPath.value.trim(),
      source_url: repoUrl,
      author: normalizedAuthors
    },
    downloads: normalizedDownloads
  }

  return JSON.stringify(manifestObject, null, 2)
}

const buildLegacyResourceJsonFileName = (): string => {
  const rawBase = itemId.value.trim() || itemName.value.trim()
  const base = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'resource'}.json`
}

const splitCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
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
  return result.map(item => item.trim())
}

const resolveLegacyAuthorFolder = async (accessToken: string): Promise<string> => {
  const fallback = uploadedRepoOwner.value
  const usernameCandidates = [uploadedRepoOwner.value.trim(), currentUser.value.trim()]
    .map(item => item.toLowerCase())
    .filter(Boolean)

  if (!usernameCandidates.length) return fallback

  try {
    const legacyCsvFile = await fetchRepoFileOrNull(
      accessToken,
      upstreamOwner.value.trim(),
      upstreamRepo.value.trim(),
      LEGACY_CATALOG_PATH,
      MAIN_BRANCH
    )
    if (!legacyCsvFile?.content) return fallback

    const csvText = base64ToText(legacyCsvFile.content || '')
    const rows = csvText
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean)

    for (let i = rows.length - 1; i >= 1; i--) {
      const cols = splitCsvLine(rows[i])
      if (cols.length < 7) continue

      const icon = (cols[1] || '').toLowerCase()
      const cover = (cols[2] || '').toLowerCase()
      const matched = usernameCandidates.some(username => icon.includes(username) || cover.includes(username))
      if (!matched) continue

      const resourcePath = (cols[6] || '').replace(/^"+|"+$/g, '').trim()
      const pathSegments = resourcePath.split('/').filter(Boolean)
      if (pathSegments.length < 2) continue

      const folder = pathSegments[pathSegments.length - 2]
      if (folder) {
        appendLog(`已按 index.csv 历史记录复用 v1 作者目录: ${folder}`)
        return folder
      }
    }
  } catch (error: unknown) {
    appendLog(`读取 index.csv 复用目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }

  return fallback
}

const resolveRepoNameForSubmit = (): string => {
  const name = resolvedRepoName.value.trim()
  if (!name) {
    throw new Error('无法生成仓库名，请填写资源 ID 或手动输入仓库名')
  }
  return name
}

const handleUploadResources = async (): Promise<void> => {
  try {
    uploading.value = true
    latestPrUrl.value = ''
    showUploadCompleteDialog.value = false

    if (linksValidationMessage.value) {
      throw new Error(linksValidationMessage.value)
    }

    const workspace = workspaceHandle.value || (isResourceUpdateMode.value ? null : await ensureWorkspaceHandle())
    if (!workspace && !isResourceUpdateMode.value) {
      throw new Error('请先选择并授权工作区文件夹')
    }

    const accessToken = requireToken()
    const username = currentUser.value
    if (!username) {
      throw new Error('请先校验 Token')
    }

    const repo = await ensureUserRepository({
      token: accessToken,
      owner: username,
      repoName: resolveRepoNameForSubmit(),
      description: repoDescription.value.trim()
    })

    appendLog(`资源仓库就绪: ${repo.owner}/${repo.name}`)

    const uploadQueue: Array<{ path: string; file?: File; text?: string }> = []
    const repoUrl = repo.htmlUrl
    if (submitMode.value === 'v2' || submitMode.value === 'both') {
      const generatedManifestV2Text = buildManifestV2Text()
      manifestText.value = generatedManifestV2Text
      uploadQueue.push({
        path: MANIFEST_FILE,
        text: generatedManifestV2Text
      })
    }
    if (submitMode.value === 'v1' || submitMode.value === 'both') {
      const generatedManifestV1Text = buildManifestV1Text(repoUrl)
      uploadQueue.push({
        path: LEGACY_MANIFEST_FILE,
        text: generatedManifestV1Text
      })
    }

    for (const path of selectedUploadPaths.value) {
      if (opfsLocalPathSet.value[path]) {
        const localFile = await readFileFromOpfs(path)
        if (!localFile) {
          throw new Error(`OPFS 文件读取失败: ${path}`)
        }
        uploadQueue.push({ path, file: localFile })
        continue
      }

      if (workspace) {
        const file = await readFileByPath(workspace, path)
        if (file) {
          uploadQueue.push({ path, file })
          continue
        }
      }

      if (isResourceUpdateMode.value) {
        appendLog(`复用远程已存在文件: ${path}`)
        continue
      }

      throw new Error(`工作区中未找到文件: ${path}`)
    }

    if (uploadQueue.length === 0) {
      throw new Error('没有可上传文件，请先选择资源文件')
    }

    let latestCommitSha = ''

    for (const item of uploadQueue) {
      const contentBase64 = item.file
        ? arrayBufferToBase64(await item.file.arrayBuffer())
        : textToBase64(item.text || '')

      let result: { commit: { sha: string; html_url: string } }
      try {
        result = await putRepoFile({
          token: accessToken,
          owner: repo.owner,
          repo: repo.name,
          path: item.path,
          branch: MAIN_BRANCH,
          message: `sync: ${item.path}`,
          contentBase64
        })
      } catch (error: unknown) {
        const githubError = error as { status?: number; message?: string }
        const message = githubError.message || ''
        const shouldRetryWithSha =
          githubError.status === 422 &&
          (message.includes('sha') || message.includes('does not match') || message.includes('already exists'))
        if (!shouldRetryWithSha) {
          throw error
        }
        const oldFile = await fetchRepoFileOrNull(
          accessToken,
          repo.owner,
          repo.name,
          item.path,
          MAIN_BRANCH
        )
        if (!oldFile?.sha) {
          throw error
        }
        result = await putRepoFile({
          token: accessToken,
          owner: repo.owner,
          repo: repo.name,
          path: item.path,
          branch: MAIN_BRANCH,
          message: `sync: ${item.path}`,
          contentBase64,
          sha: oldFile.sha
        })
      }

      latestCommitSha = result.commit.sha
      appendLog(`上传完成: ${item.path}`)
    }

    if (!latestCommitSha) {
      throw new Error('未获取到 commit sha')
    }

    uploadedRepoOwner.value = repo.owner
    uploadedRepoName.value = repo.name
    uploadedRepoUrl.value = repo.htmlUrl
    uploadedCommitSha.value = latestCommitSha
    hasUploadedInCurrentFlow.value = true
    appendLog('上传步骤完成')
    showUploadCompleteDialog.value = true

    try {
      const remoteTree = await loadRemoteRepoTree(accessToken, repo.owner, repo.name)
      setRemoteWorkspace(`${repo.owner}/${repo.name}@${MAIN_BRANCH}`, remoteTree)
      appendLog('已同步远程仓库文件树')
    } catch (remoteError: unknown) {
      appendLog(`远程文件树同步失败: ${remoteError instanceof Error ? remoteError.message : '未知错误'}`)
    }
  } catch (error: unknown) {
    hasUploadedInCurrentFlow.value = false
    clearRemoteWorkspace()
    appendLog(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    uploading.value = false
  }
}

const handleCreateCatalogPr = async (): Promise<void> => {
  try {
    creatingPr.value = true

    const accessToken = requireToken()
    const username = currentUser.value
    if (!username) {
      throw new Error('请先校验 Token')
    }

    if (!uploadedCommitSha.value || !uploadedRepoOwner.value || !uploadedRepoName.value) {
      throw new Error('请先完成资源仓库上传')
    }

    prTitle.value = buildAutoPrTitle()
    prBody.value = buildAutoPrBody()

    const branchName = `astrobooox-submit-${Date.now()}`
    let forkResult: { forkOwner: string; forkRepo: string; branch: string } | null = null

    if (submitMode.value === 'v2' || submitMode.value === 'both') {
      forkResult = await updateCatalogInForkBranch({
        token: accessToken,
        upstreamOwner: upstreamOwner.value.trim(),
        upstreamRepo: upstreamRepo.value.trim(),
        upstreamBranch: MAIN_BRANCH,
        catalogPath: catalogPath.value.trim(),
        currentUser: username,
        branchName,
        entry: {
          id: itemId.value.trim(),
          name: itemName.value.trim(),
          restype: formatResourceTypeForCatalog(restype.value),
          repo_owner: uploadedRepoOwner.value,
          repo_name: uploadedRepoName.value,
          repo_commit_hash: uploadedCommitSha.value.slice(0, 7),
          icon: iconPath.value.trim(),
          cover: coverPath.value.trim(),
          tags: normalizedTagsText.value,
          device_vendors: normalizedDeviceVendorsText.value,
          devices: normalizedDevicesText.value,
          paid_type: paidType.value.trim()
        }
      })
      appendLog(`v2 Catalog 更新完成: ${forkResult.forkOwner}/${forkResult.forkRepo}@${forkResult.branch}`)
    }

    if (submitMode.value === 'v1' || submitMode.value === 'both') {
      const legacyFileName = buildLegacyResourceJsonFileName()
      const legacyAuthorFolder = await resolveLegacyAuthorFolder(accessToken)
      const legacyEntry: LegacyCatalogEntry = {
        name: itemName.value.trim(),
        icon: getRawUrl(iconPath.value.trim()),
        cover: getRawUrl(coverPath.value.trim()),
        restype: formatResourceTypeForLegacy(restype.value),
        tags: normalizedTagsText.value,
        devices: normalizedLegacyDevicesText.value,
        path: `${legacyAuthorFolder}/${legacyFileName}`,
        paid_type: paidType.value.trim()
      }
      const legacyManifestRef = JSON.stringify(
        {
          manifest_ver: 1,
          repo_url: uploadedRepoUrl.value
        },
        null,
        2
      )
      const v1Result = await updateLegacyCatalogAndResourceJsonInForkBranch({
        token: accessToken,
        upstreamOwner: upstreamOwner.value.trim(),
        upstreamRepo: upstreamRepo.value.trim(),
        upstreamBranch: MAIN_BRANCH,
        currentUser: username,
        branchName,
        catalogPath: LEGACY_CATALOG_PATH,
        resourceJsonPath: `${LEGACY_RESOURCES_DIR}/${legacyAuthorFolder}/${legacyFileName}`,
        legacyEntry,
        resourceManifestJson: legacyManifestRef
      })
      forkResult = v1Result
      appendLog(`v1 Catalog 更新完成: ${v1Result.forkOwner}/${v1Result.forkRepo}@${v1Result.branch}`)
    }

    if (!forkResult) {
      throw new Error('未选择提交流程（v1/v2）')
    }

    const pr = await createPullRequestWithHead({
      token: accessToken,
      baseOwner: upstreamOwner.value.trim(),
      baseRepo: upstreamRepo.value.trim(),
      baseBranch: MAIN_BRANCH,
      headOwner: forkResult.forkOwner,
      headBranch: forkResult.branch,
      title: prTitle.value.trim(),
      body: prBody.value.trim() || undefined
    })

    latestPrUrl.value = pr.htmlUrl
    appendLog(`PR 创建成功: #${pr.number}`)
  } catch (error: unknown) {
    appendLog(`创建 PR 失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    creatingPr.value = false
  }
}

const loadReviewList = async (): Promise<void> => {
  try {
    reviewLoading.value = true
    const items = await loadInProgressResources({
      token: requireToken(),
      username: currentUser.value,
      targetOwner: upstreamOwner.value.trim(),
      targetRepo: upstreamRepo.value.trim(),
      catalogPath: catalogPath.value.trim()
    })
    reviewItems.value = items
    if (selectedReviewItem.value) {
      const matched = items.find(
        item => item.prNumber === selectedReviewItem.value?.prNumber && item.id === selectedReviewItem.value?.id
      )
      if (matched) {
        selectedReviewItem.value = matched
      }
    }
  } catch (error: unknown) {
    appendLog(`加载审核列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    reviewLoading.value = false
  }
}

const loadReviewComments = async (prNumber: number): Promise<void> => {
  try {
    reviewCommentsLoading.value = true
    reviewCommentsError.value = ''
    selectedReviewComments.value = await loadPullRequestIssueComments({
      token: requireToken(),
      owner: upstreamOwner.value.trim(),
      repo: upstreamRepo.value.trim(),
      prNumber
    })
  } catch (error: unknown) {
    reviewCommentsError.value = `加载评论失败：${error instanceof Error ? error.message : '未知错误'}`
    selectedReviewComments.value = []
  } finally {
    reviewCommentsLoading.value = false
  }
}

const openReviewCommentResultDialog = (title: string, message: string): void => {
  reviewCommentResultDialogTitle.value = title
  reviewCommentResultDialogMessage.value = message
  reviewCommentResultDialogOpen.value = true
}

const highlightReviewCommentElement = (element: HTMLElement): void => {
  element.classList.add('rounded-md', 'bg-primary/10', 'transition-colors')
  setTimeout(() => {
    element.classList.remove('rounded-md', 'bg-primary/10', 'transition-colors')
  }, 1500)
}

const scrollToReviewCommentById = async (commentId: number): Promise<void> => {
  const selector = `[data-review-comment-content-id="${commentId}"]`
  for (let i = 0; i < 8; i += 1) {
    await nextTick()
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightReviewCommentElement(element)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 80))
  }
}

const onReviewReplyComment = (comment: {
  id: number
  body?: string
  user?: { login?: string }
}): void => {
  reviewReplyTargetComment.value = comment
  reviewEditingCommentTarget.value = null
  reviewCommentEditorTab.value = 'edit'
}

const clearReviewReplyTarget = (): void => {
  reviewReplyTargetComment.value = null
}

const onReviewEditComment = (comment: {
  id: number
  body?: string
  user?: { login?: string }
}): void => {
  const parsed = parseReviewCommentBody(comment.body || '')
  reviewCommentTagEnabled.value = Boolean(parsed.tagId)
  reviewCommentId.value = parsed.tagId || `comment_${comment.id}`
  reviewCommentMessage.value = parsed.content
  reviewEditingCommentTarget.value = comment
  clearReviewReplyTarget()
  reviewCommentEditorTab.value = 'edit'
}

const clearReviewEditingTarget = (): void => {
  reviewEditingCommentTarget.value = null
}

const onReviewDeleteComment = async (comment: {
  id: number
  body?: string
  user?: { login?: string }
}): Promise<void> => {
  reviewDeleteCommentTarget.value = comment
  reviewDeleteCommentDialogOpen.value = true
}

const confirmReviewDeleteComment = async (): Promise<void> => {
  if (!selectedReviewItem.value || !reviewDeleteCommentTarget.value) return
  const target = reviewDeleteCommentTarget.value
  try {
    await deletePullRequestIssueComment({
      token: requireToken(),
      owner: upstreamOwner.value.trim(),
      repo: upstreamRepo.value.trim(),
      commentId: target.id
    })
    if (reviewEditingCommentTarget.value?.id === target.id) clearReviewEditingTarget()
    if (reviewReplyTargetComment.value?.id === target.id) clearReviewReplyTarget()
    reviewDeleteCommentDialogOpen.value = false
    reviewDeleteCommentTarget.value = null
    selectedReviewComments.value = selectedReviewComments.value.filter(item => item.id !== target.id)
    await loadReviewComments(selectedReviewItem.value.prNumber)
    openReviewCommentResultDialog('删除成功', `评论 #${target.id} 已删除。`)
  } catch (error: unknown) {
    openReviewCommentResultDialog('删除失败', error instanceof Error ? error.message : '评论删除失败')
  }
}

const submitReviewComment = async (): Promise<void> => {
  if (!selectedReviewItem.value) return
  const body = reviewSubmitCommentBody.value
  if (!body) {
    openReviewCommentResultDialog('发送失败', reviewCommentTagEnabled.value ? '评论 ID 不能为空' : '评论内容不能为空')
    return
  }

  reviewCommentSubmitting.value = true
  try {
    if (reviewEditingCommentTarget.value) {
      const updated = await updatePullRequestIssueComment({
        token: requireToken(),
        owner: upstreamOwner.value.trim(),
        repo: upstreamRepo.value.trim(),
        commentId: reviewEditingCommentTarget.value.id,
        body
      })
      await loadReviewComments(selectedReviewItem.value.prNumber)
      await scrollToReviewCommentById(updated.id)
      reviewCommentMessage.value = ''
      reviewCommentEditorTab.value = 'edit'
      clearReviewReplyTarget()
      clearReviewEditingTarget()
      openReviewCommentResultDialog('更新成功', '评论已更新。')
    } else {
      const created = await createPullRequestIssueComment({
        token: requireToken(),
        owner: upstreamOwner.value.trim(),
        repo: upstreamRepo.value.trim(),
        prNumber: selectedReviewItem.value.prNumber,
        body
      })
      await loadReviewComments(selectedReviewItem.value.prNumber)
      await scrollToReviewCommentById(created.id)
      reviewCommentMessage.value = ''
      reviewCommentEditorTab.value = 'edit'
      clearReviewReplyTarget()
      openReviewCommentResultDialog('发送成功', '评论已发送并立即刷新评论列表。')
    }
  } catch (error: unknown) {
    openReviewCommentResultDialog('发送失败', error instanceof Error ? error.message : '评论发送失败')
  } finally {
    reviewCommentSubmitting.value = false
  }
}

const normalizeRepoRef = (value: string): string => value.trim().replace(/^\/+|\/+$/g, '').toLowerCase()

const currentReviewTargetRepo = computed(() => {
  const repo = upstreamRepo.value.trim()
  if (!repo) return ''
  return normalizeRepoRef(repo)
})

const parseReviewTargetRepo = (value: string): { repo: string } | null => {
  const normalized = normalizeRepoRef(value)
  if (!normalized || normalized.includes('/')) return null
  return { repo: normalized }
}

const applyReviewTargetRepoFromRoute = (): void => {
  const parsed = parseReviewTargetRepo(props.pullRequestTargetRepo || '')
  if (!parsed) return
  if (normalizeRepoRef(upstreamRepo.value) !== parsed.repo) {
    upstreamRepo.value = parsed.repo
  }
}

const openReviewItem = (item: PublishingResource, options: { syncRoute?: boolean } = {}): void => {
  const { syncRoute = true } = options
  selectedReviewItem.value = item
  clearReviewEditingTarget()
  clearReviewReplyTarget()
  if (syncRoute) {
    emit('request-route', {
      tab: 'pullrequest',
      settingsSection: 'defaults',
      pullRequestNumber: item.prNumber,
      pullRequestTargetRepo: currentReviewTargetRepo.value,
      requireGhUser: false
    })
  }
  void loadReviewComments(item.prNumber)
}

const closeReviewDetail = (options: { syncRoute?: boolean } = {}): void => {
  const { syncRoute = true } = options
  selectedReviewItem.value = null
  selectedReviewComments.value = []
  reviewCommentsError.value = ''
  reviewCommentId.value = ''
  reviewCommentMessage.value = ''
  reviewCommentEditorTab.value = 'edit'
  clearReviewEditingTarget()
  clearReviewReplyTarget()
  reviewDeleteCommentDialogOpen.value = false
  reviewDeleteCommentTarget.value = null
  if (syncRoute) {
    emit('request-route', {
      tab: 'pullrequest',
      settingsSection: 'defaults',
      pullRequestNumber: 0,
      pullRequestTargetRepo: '',
      requireGhUser: false
    })
  }
}

const loadOwnedList = async (): Promise<void> => {
  try {
    ownedLoading.value = true
    ownedItems.value = await loadOwnedResources({
      token: requireToken(),
      username: currentUser.value,
      upstreamOwner: upstreamOwner.value.trim(),
      upstreamRepo: upstreamRepo.value.trim(),
      upstreamBranch: MAIN_BRANCH,
      catalogPath: catalogPath.value.trim()
    })
  } catch (error: unknown) {
    appendLog(`加载已发布列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    ownedLoading.value = false
  }
}

const openOwnedItemDetail = (item: OwnedMergedItem, options: { syncRoute?: boolean } = {}): void => {
  const { syncRoute = true } = options
  selectedOwnedItem.value = item
  ownedPreviewActiveIndex.value = 0
  ownedPreviewSnapCount.value = 0
  ownedPreviewCanPrev.value = false
  ownedPreviewCanNext.value = false
  if (syncRoute) {
    emit('request-route', {
      tab: 'published',
      settingsSection: 'defaults',
      resourceDetailKey: buildOwnedDetailRouteKey(item),
      requireGhUser: true
    })
  }
  void loadOwnedItemDetail(item)
}

const closeOwnedDetail = (options: { syncRoute?: boolean } = {}): void => {
  const { syncRoute = true } = options
  selectedOwnedItem.value = null
  ownedDetail.value = null
  ownedDetailError.value = ''
  ownedPreviewCanPrev.value = false
  ownedPreviewCanNext.value = false
  ownedPreviewActiveIndex.value = 0
  ownedPreviewSnapCount.value = 0
  if (syncRoute) {
    emit('request-route', {
      tab: 'published',
      settingsSection: 'defaults',
      resourceDetailKey: '',
      requireGhUser: false
    })
  }
}

const loadOwnedItemDetail = async (item?: OwnedMergedItem): Promise<void> => {
  const target = item || selectedOwnedItem.value
  if (!target) return
  try {
    ownedDetailLoading.value = true
    ownedDetailError.value = ''
    ownedDetail.value = await loadOwnedResourceDetail({
      token: requireToken(),
      owner: target.repo_owner,
      repo: target.repo_name,
      v1Ref: target.sources.includes('v1') ? '' : undefined,
      v2Ref: target.v2RepoCommitHash
    })
  } catch (error: unknown) {
    ownedDetailError.value = `加载详情失败：${error instanceof Error ? error.message : '未知错误'}`
  } finally {
    ownedDetailLoading.value = false
    void nextTick(() => {
      const el = ownedPreviewScrollerRef.value
      if (el) el.scrollTo({ left: 0, behavior: 'auto' })
      syncOwnedPreviewScrollState()
    })
  }
}

const extractTagList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[;；,，]/)
      .map(item => item.trim())
      .filter(Boolean)
  }
  return []
}

const normalizeCatalogText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean).join(';')
  }
  return String(value || '').trim()
}

const startEditOwnedResource = (): void => {
  const current = selectedOwnedItem.value
  const detail = ownedDetail.value
  if (!current || !detail) return

  const v2SourceText = detail.v2ManifestText.trim()
  const v1SourceText = detail.v1ManifestText.trim()
  if (!v2SourceText && !v1SourceText) {
    appendLog('编辑失败：未找到可解析的 manifest 内容')
    return
  }

  let v2Manifest: Record<string, any> | null = null
  let v1Manifest: Record<string, any> | null = null
  if (v2SourceText) {
    try {
      v2Manifest = JSON.parse(v2SourceText) as Record<string, any>
    } catch {
      appendLog('编辑提示：manifest_v2.json 解析失败，将回退到 v1 解析')
    }
  }
  if (v1SourceText) {
    try {
      v1Manifest = JSON.parse(v1SourceText) as Record<string, any>
    } catch {
      appendLog('编辑提示：manifest.json 解析失败')
    }
  }

  const manifest = v2Manifest || v1Manifest
  if (!manifest) {
    appendLog('编辑失败：manifest 不是合法 JSON')
    return
  }

  const item = manifest.item && typeof manifest.item === 'object' ? manifest.item as Record<string, any> : {}
  const downloadsInput = manifest.downloads && typeof manifest.downloads === 'object'
    ? manifest.downloads as Record<string, any>
    : {}
  const linksInput = Array.isArray(manifest.links) ? manifest.links as Array<Record<string, any>> : []
  const v2Item = v2Manifest?.item && typeof v2Manifest.item === 'object' ? v2Manifest.item as Record<string, any> : {}
  const v1Item = v1Manifest?.item && typeof v1Manifest.item === 'object' ? v1Manifest.item as Record<string, any> : {}
  const v2AuthorsInput = Array.isArray(v2Item.author) ? v2Item.author as Array<Record<string, any>> : []
  const v1AuthorsInput = Array.isArray(v1Item.author) ? v1Item.author as Array<Record<string, any>> : []

  const previewPaths = (Array.isArray(item.preview) ? item.preview : [])
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const parsedRestype = String(item.restype || current.restype || '').trim()
  const normalizedRestype = normalizeOwnedRestype(parsedRestype)
  const restype = normalizedRestype === 'watchface' ? 'watchface' : 'quickapp'
  const catalogId = String(current.catalogId || item.id || '').trim()
  const authorUrlByName = new Map<string, string>()
  for (const author of v1AuthorsInput) {
    const name = String(author.name || '').trim()
    if (!name) continue
    authorUrlByName.set(name, String(author.author_url || '').trim())
  }

  const parsedAuthorsFromV2 = v2AuthorsInput
    .map(author => {
      const name = String(author.name || '').trim()
      if (!name) return null
      return {
        name,
        authorUrl: authorUrlByName.get(name) || '',
        bindABAccount: author.bindABAccount === true
      }
    })
    .filter((author): author is { name: string; authorUrl: string; bindABAccount: boolean } => Boolean(author))

  const parsedAuthorsFromV1 = v1AuthorsInput
    .map(author => {
      const name = String(author.name || '').trim()
      if (!name) return null
      return {
        name,
        authorUrl: String(author.author_url || '').trim(),
        bindABAccount: false
      }
    })
    .filter((author): author is { name: string; authorUrl: string; bindABAccount: boolean } => Boolean(author))

  const parsedAuthors = (parsedAuthorsFromV2.length > 0 ? parsedAuthorsFromV2 : parsedAuthorsFromV1)
    .filter(author => author.name)

  const parsedLinks = linksInput
    .map(link => ({
      icon: String(link.icon || '').trim(),
      title: String(link.title || '').trim(),
      url: String(link.url || '').trim()
    }))
    .filter(link => link.icon || link.title || link.url)

  const parsedDownloads = Object.entries(downloadsInput).reduce<Record<string, { version: string; file_name: string }>>(
    (acc, [rawDeviceId, meta]) => {
      const deviceId = normalizeDeviceToken(rawDeviceId)
      if (!deviceId) return acc
      const mapped = meta && typeof meta === 'object' ? meta as Record<string, any> : {}
      acc[deviceId] = {
        version: String(mapped.version || '').trim() || '1.0.0',
        file_name: String(mapped.file_name || '').trim()
      }
      return acc
    },
    {}
  )

  setResourceEditDraft({
    key: current.key,
    catalogId,
    repoOwner: current.repo_owner,
    repoName: current.repo_name,
    repoCommitHash: String(current.v2RepoCommitHash || current.repo_commit_hash || '').trim(),
    name: String(item.name || current.name || '').trim(),
    restype,
    description: String(item.description || current.description || '').trim(),
    tags: extractTagList(current.tags || item.tags),
    deviceVendors: normalizeCatalogText(current.device_vendors || item.device_vendors),
    devices: normalizeCatalogText(current.devices || item.devices),
    paidType: normalizeCatalogText(current.paid_type || item.paid_type),
    icon: String(item.icon || current.icon || '').trim(),
    cover: String(item.cover || '').trim(),
    previews: previewPaths,
    authors: parsedAuthors,
    links: parsedLinks,
    downloads: parsedDownloads
  })

  closeOwnedDetail({ syncRoute: false })
  emit('request-route', {
    tab: 'resource_edit',
    settingsSection: 'defaults',
    resourceDetailKey: '',
    pullRequestNumber: 0,
    pullRequestTargetRepo: '',
    requireGhUser: true,
    editResourceId: catalogId,
    editTargetRepo: `${current.repo_owner}/${current.repo_name}`.toLowerCase(),
    editUser: currentUser.value.trim().toLowerCase()
  })
}

const getOwnedItemIconUrl = (item: {
  icon: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
}): string => {
  const value = item.icon?.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (item.repo_owner && item.repo_name && item.repo_commit_hash) {
    const normalized = value.replace(/^\/+/, '')
    return `https://raw.githubusercontent.com/${item.repo_owner}/${item.repo_name}/${item.repo_commit_hash}/${normalized}`
  }
  return value
}

const getOwnedItemRepoUrl = (item: { repo_owner: string; repo_name: string }): string =>
  `https://github.com/${item.repo_owner}/${item.repo_name}`

const normalizeOwnedRestype = (value: string): 'quickapp' | 'watchface' | 'other' => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'watchface' || normalized === 'watch_face') return 'watchface'
  if (normalized === 'quickapp' || normalized === 'quick_app') return 'quickapp'
  return 'other'
}

const formatOwnedRestype = (value: string): string => {
  const normalized = normalizeOwnedRestype(value)
  if (normalized === 'watchface') return '表盘'
  if (normalized === 'quickapp') return '快应用'
  return value
}

watch(
  () => [mode.value, resourceEditDraft.value?.key || ''] as const,
  ([currentMode, draftKey]) => {
    if (currentMode !== 'publish') return
    if (!draftKey) return
    applyResourceEditDraft()
    clearResourceEditDraft()
  },
  { immediate: true }
)

watch(
  () => [mode.value, canLoadList.value] as const,
  ([currentMode, canLoad]) => {
    if (!canLoad) return
    if (currentMode === 'review') {
      applyReviewTargetRepoFromRoute()
      void loadReviewList()
      return
    }
    if (currentMode === 'published') {
      void loadOwnedList()
    }
  },
  { immediate: true }
)

watch(
  () => [mode.value, props.pullRequestTargetRepo || ''] as const,
  ([currentMode]) => {
    if (currentMode !== 'review') return
    applyReviewTargetRepoFromRoute()
  },
  { immediate: true }
)

watch(
  () => [mode.value, props.pullRequestNumber || 0, reviewItems.value.length, reviewLoading.value] as const,
  ([currentMode, routePrNumber, reviewCount, loading]) => {
    if (currentMode !== 'review') return
    if (loading) return
    if (!routePrNumber) {
      if (selectedReviewItem.value) closeReviewDetail({ syncRoute: false })
      return
    }
    if (reviewCount === 0) return
    const matched = reviewItems.value.find(item => item.prNumber === routePrNumber)
    if (!matched) {
      if (selectedReviewItem.value) closeReviewDetail({ syncRoute: false })
      return
    }
    if (selectedReviewItem.value?.prNumber === matched.prNumber && selectedReviewItem.value?.id === matched.id) return
    openReviewItem(matched, { syncRoute: false })
  },
  { immediate: true }
)

watch(
  () => [mode.value, props.resourceDetailKey || '', ownedMergedItems.value.length, ownedLoading.value] as const,
  ([currentMode, detailKey, mergedCount, loading]) => {
    if (currentMode !== 'published') return
    if (loading) return
    if (mergedCount === 0) return
    const normalizedKey = detailKey.trim().toLowerCase()
    if (!normalizedKey) {
      if (selectedOwnedItem.value) closeOwnedDetail({ syncRoute: false })
      return
    }
    const matched = ownedMergedItems.value.find(item => buildOwnedDetailRouteKey(item) === normalizedKey)
    if (!matched) {
      if (selectedOwnedItem.value) closeOwnedDetail({ syncRoute: false })
      return
    }
    if (selectedOwnedItem.value?.key === matched.key) return
    openOwnedItemDetail(matched, { syncRoute: false })
  },
  { immediate: true }
)

watch(
  () => ownedSubmissionOverview.value.images.previews.map(item => item.url).join('|'),
  async () => {
    await nextTick()
    const el = ownedPreviewScrollerRef.value
    if (el) el.scrollTo({ left: 0, behavior: 'auto' })
    syncOwnedPreviewScrollState()
  }
)

const reviewStateText = (state: PublishingResource['status']): string => {
  if (state === 'changes_requested') return '需要修改'
  if (state === 'fixed_waiting') return '已修复待审'
  return '等待审核'
}

const formatDate = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

</script>
