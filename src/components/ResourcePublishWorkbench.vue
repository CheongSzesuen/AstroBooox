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
                        : activeStep === index
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
                      activeStep === index
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/30',
                      step.done ? '!text-foreground' : ''
                    ]"
                    @click="goToStep(index)"
                  >
                    <p class="font-medium">{{ step.label }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ step.done ? '已完成' : activeStep === index ? '进行中' : '待完成' }}
                    </p>
                  </button>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card v-if="workspacePath || workspaceTree.length || remoteWorkspacePath || remoteWorkspaceTree.length" class="border-border bg-card">
            <CardHeader class="pb-2">
              <CardTitle class="text-xs font-medium uppercase tracking-wide text-muted-foreground">文件树</CardTitle>
            </CardHeader>
            <CardContent class="pt-0">
              <Tabs v-model="fileTreeTab" class="space-y-2">
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
          <Card>
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
                    <Input
                      id="workspace-folder-name"
                      v-model="newWorkspaceName"
                      placeholder="MyApp_AstroBox_Release"
                    />
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
                <Button :disabled="!stepList[0].done" @click="goToStep(1)">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 1">
            <CardHeader class="pb-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <CardTitle class="text-base">步骤 2：资源信息</CardTitle>
                <Button variant="outline" size="sm" @click="reloadResourceInfoFromWorkspace">
                  <ArrowsClockwise :size="14" weight="duotone" />
                  从工作区重新加载
                </Button>
              </div>
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
                      ref="descriptionTextareaRef"
                      v-model="itemDescription"
                      class="min-h-[90px] resize-y overflow-auto"
                      placeholder="填写资源描述（manifest_v2.item.description）"
                      @input="autoResizeDescription"
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
                        <Button variant="outline" @click="selectIconFile">选择文件</Button>
                      </div>
                      <p class="text-xs text-muted-foreground">宽高比 1:1，大小不超过 200px × 200px</p>
                    </div>
                    <div class="space-y-1.5">
                      <Label for="cover-path">封面</Label>
                      <div class="flex gap-2 max-sm:flex-col">
                        <Input id="cover-path" v-model="coverPath" readonly placeholder="点击右侧按钮从工作区选择文件" />
                        <Button variant="outline" @click="selectCoverFile">选择文件</Button>
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
                    <Button variant="default" class="font-semibold" @click="selectMultiplePreviewFiles">+ 添加预览图</Button>
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
                          <Button variant="outline" @click="selectDownloadFile(deviceId)">选择文件</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div class="flex justify-between gap-2">
                <Button variant="outline" @click="goToStep(0)">上一步</Button>
                <Button :disabled="!stepList[1].done" @click="openSubmitVersionDialog">下一步</Button>
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
                <Button :disabled="!stepList[2].done" @click="goToStep(3)">下一步</Button>
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

              <div class="flex flex-wrap items-center gap-2">
                <Button :disabled="creatingPr || !canSubmitPr" @click="handleCreateCatalogPr">
                  <GitPullRequest :size="16" weight="duotone" />
                  {{ creatingPr ? '创建中...' : '提交 Pull Request' }}
                </Button>
                <a
                  v-if="latestPrUrl"
                  :href="latestPrUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-primary hover:underline"
                >
                  查看最新 PR
                </a>
              </div>

              <div class="flex justify-start">
                <Button variant="outline" @click="goToStep(2)">上一步</Button>
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

      <Dialog :open="showLinkIconPicker" @update:open="showLinkIconPicker = $event">
        <DialogContent class="w-[95vw] !max-w-[900px]">
          <DialogHeader>
            <DialogTitle>搜索 phosphor 图标</DialogTitle>
            <DialogDescription>选择后会自动填入 links.icon 的图标名。</DialogDescription>
          </DialogHeader>
          <div class="max-h-[64vh] overflow-y-auto rounded-lg border border-border bg-muted/20">
            <div class="sticky top-0 z-10 border-b border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/85">
              <Input v-model="linkIconQuery" placeholder="输入关键词，例如 github / house / chat / code" />
              <div class="mt-2 text-xs text-muted-foreground">
                共 {{ filteredPhosphorIconOptions.length }} 个候选图标
                <template v-if="filteredPhosphorIconOptions.length > displayedPhosphorIconOptions.length">
                  ，当前仅展示前 {{ displayedPhosphorIconOptions.length }} 个，请继续输入关键词缩小范围
                </template>
              </div>
            </div>
            <div class="p-3">
              <div class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
                <button
                  v-for="option in displayedPhosphorIconOptions"
                  :key="option.key"
                  type="button"
                  class="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-center text-xs text-foreground transition hover:bg-accent"
                  @click="selectLinkIcon(option.name)"
                >
                  <component
                    :is="getLinkIconComponent(option.pascalName)"
                    :size="24"
                    class="h-6 w-6 shrink-0 text-foreground"
                  />
                  <span class="line-clamp-2 break-all text-[11px] leading-4">{{ option.name }}</span>
                </button>
              </div>
              <div
                v-if="filteredPhosphorIconOptions.length === 0"
                class="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground"
              >
                没有匹配结果
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showLinkIconPicker = false">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>

    <template v-else-if="mode === 'review'">
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
          <div
            v-for="item in reviewItems"
            :key="`${item.prNumber}-${item.id}`"
            class="rounded-lg border border-border bg-card px-3 py-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="text-sm font-semibold text-foreground">{{ item.id }} · {{ item.name }}</div>
              <Badge variant="outline">{{ reviewStateText(item.status) }}</Badge>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              {{ item.restype }} · PR #{{ item.prNumber }} · {{ formatDate(item.createdAt) }}
            </div>
            <a
              :href="item.prUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 inline-flex text-xs text-primary hover:underline"
            >
              查看 PR
            </a>
          </div>
        </CardContent>
      </Card>
    </template>

    <template v-else>
      <Card>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between gap-2">
            <CardTitle class="text-base">已发布资源</CardTitle>
            <Button :disabled="ownedLoading || !canLoadList" @click="loadOwnedList">
              <ArrowsClockwise :size="16" weight="duotone" />
              {{ ownedLoading ? '加载中...' : '刷新' }}
            </Button>
          </div>
          <CardDescription>查看当前账号已发布到目录的资源。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 pt-0">
          <div
            v-if="ownedItems.length === 0"
            class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground"
          >
            暂无数据
          </div>
          <div
            v-for="item in ownedItems"
            :key="item.id"
            class="rounded-lg border border-border bg-card px-3 py-3"
          >
            <div class="text-sm font-semibold text-foreground">{{ item.id }} · {{ item.name }}</div>
            <div class="mt-1 text-xs text-muted-foreground">
              {{ item.restype }} · {{ item.repo_owner }}/{{ item.repo_name }}
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch, type Component } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhCaretDown as CaretDown,
  PhCaretRight as CaretRight,
  PhDotsSixVertical as DragDots,
  PhFile as FileIcon,
  PhFolderOpen as FolderOpen,
  PhFolder as FolderIcon,
  PhGitPullRequest as GitPullRequest,
  PhMinus as MinusIcon,
  PhUploadSimple as UploadSimple
} from '@phosphor-icons/vue'
import { icons as phosphorCoreIcons } from '@phosphor-icons/core'
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
import { useCcPublishLogs } from '@/composables/useCcPublishLogs'
import { useCcSession } from '@/composables/useCcSession'
import { type WorkspaceTreeItem, useCcWorkspace } from '@/composables/useCcWorkspace'
import {
  type CatalogEntry,
  type LegacyCatalogEntry,
  type PublishingResource,
  arrayBufferToBase64,
  base64ToText,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadRepositoryTree,
  loadInProgressResources,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch,
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

interface DeviceOption {
  id: string
  name: string
  vendor: string
  aliases: string[]
}

interface DeviceSelectorEntry {
  key: string
  model: string
  codename: string
  id: string
  name: string
}

interface LinkIconOption {
  key: string
  name: string
  pascalName: string
  keywords: string
}

const LINK_ICON_MAX_RENDER = 720
const phosphorIconModules = import.meta.glob('/node_modules/@phosphor-icons/vue/dist/icons/*.vue.mjs')
const linkIconComponentCache = new Map<string, Component | null>()

const deviceOptions: DeviceOption[] = [
  { id: 'xmb9', name: 'Xiaomi Smart Band 9', vendor: 'xiaomi', aliases: ['n66', 'M2345B1', 'M2346B1'] },
  { id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro', vendor: 'xiaomi', aliases: ['n67', 'M2401B1', 'M2402B1'] },
  { id: 'xmb10', name: 'Xiaomi Smart Band 10', vendor: 'xiaomi', aliases: ['o66', 'M2457B1'] },
  { id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC', vendor: 'xiaomi', aliases: ['o66nfc', 'M2456B1'] },
  { id: 'xmws3', name: 'Xiaomi Watch S3 系列', vendor: 'xiaomi', aliases: ['n62', 'M2313W1', 'M2311W1', 'M2323W1'] },
  { id: 'xmws4', name: 'Xiaomi Watch S4 系列', vendor: 'xiaomi', aliases: ['o62', 'M2425W1', 'M2424W1', 'M2312W1', 'M2502W1'] },
  { id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版', vendor: 'xiaomi', aliases: ['o62m', 'M2426W1'] },
  { id: 'xmrw5', name: 'REDMI Watch 5', vendor: 'xiaomi', aliases: ['o65', 'M2427W1'] },
  { id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM', vendor: 'xiaomi', aliases: ['o65m', 'M2428W1'] },
  { id: 'xmrw6', name: 'REDMI Watch 6', vendor: 'xiaomi', aliases: ['p65', 'M2523W1'] },
  { id: 'vivowgt2', name: 'vivo WATCH GT 2', vendor: 'vivo', aliases: ['WA2536B'] }
]

const deviceSelectorEntries: DeviceSelectorEntry[] = [
  { key: 'M2345B1', model: 'M2345B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2346B1', model: 'M2346B1', codename: 'n66', id: 'xmb9', name: 'Xiaomi Smart Band 9' },
  { key: 'M2401B1', model: 'M2401B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro' },
  { key: 'M2402B1', model: 'M2402B1', codename: 'n67', id: 'xmb9p', name: 'Xiaomi Smart Band 9 Pro 国际版' },
  { key: 'M2457B1', model: 'M2457B1', codename: 'o66', id: 'xmb10', name: 'Xiaomi Smart Band 10' },
  { key: 'M2456B1', model: 'M2456B1', codename: 'o66nfc', id: 'xmb10nfc', name: 'Xiaomi Smart Band 10 NFC' },
  { key: 'M2313W1', model: 'M2313W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列' },
  { key: 'M2311W1', model: 'M2311W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 eSIM' },
  { key: 'M2323W1', model: 'M2323W1', codename: 'n62', id: 'xmws3', name: 'Xiaomi Watch S3 系列 国际版' },
  { key: 'M2425W1', model: 'M2425W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列' },
  { key: 'M2424W1', model: 'M2424W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 系列 eSIM' },
  { key: 'M2426W1', model: 'M2426W1', codename: 'o62m', id: 'xmws4xring', name: 'Xiaomi Watch S4 15周年纪念版' },
  { key: 'M2312W1', model: 'M2312W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 Sport' },
  { key: 'M2502W1', model: 'M2502W1', codename: 'o62', id: 'xmws4', name: 'Xiaomi Watch S4 41mm' },
  { key: 'M2427W1', model: 'M2427W1', codename: 'o65', id: 'xmrw5', name: 'REDMI Watch 5' },
  { key: 'M2428W1', model: 'M2428W1', codename: 'o65m', id: 'xmrw5xring', name: 'REDMI Watch 5 eSIM' },
  { key: 'M2523W1', model: 'M2523W1', codename: 'p65', id: 'xmrw6', name: 'REDMI Watch 6' },
  { key: 'WA2536B', model: 'WA2536B', codename: 'vivowgt2', id: 'vivowgt2', name: 'vivo WATCH GT 2' }
]

const deviceTokenToId = deviceOptions.reduce<Record<string, string>>((acc, device) => {
  acc[device.id.toLowerCase()] = device.id
  for (const alias of device.aliases) {
    acc[alias.toLowerCase()] = device.id
  }
  return acc
}, {})

const normalizeDeviceToken = (token: string): string => {
  const key = token.trim().toLowerCase()
  return deviceTokenToId[key] || token.trim()
}

type WorkbenchMode = 'publish' | 'review' | 'published'
const props = withDefaults(defineProps<{ mode?: WorkbenchMode }>(), {
  mode: 'publish'
})
const mode = computed<WorkbenchMode>(() => props.mode)

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
const workspaceBusy = ref(false)
const newWorkspaceName = ref('')
const workspaceDisplayPath = ref('')
const activeStep = ref(0)
const fileTreeTab = ref<'workspace' | 'remote'>('workspace')
const collapsedWorkspaceFolders = ref<string[]>([])
const collapsedRemoteFolders = ref<string[]>([])
const submitMode = ref<SubmitMode>('v2')
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
const descriptionTextareaRef = ref<HTMLTextAreaElement | null>(null)
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
const showUploadCompleteDialog = ref(false)
const showLinkIconPicker = ref(false)
const linkIconPickerIndex = ref<number | null>(null)
const linkIconQuery = ref('')
const iconPath = ref('')
const coverPath = ref('')
const previewItems = ref<Array<{ id: string; path: string }>>([])

const upstreamOwner = ref('AstralSightStudios')
const upstreamRepo = ref('AstroBox-Repo')
const catalogPath = ref('index_v2.csv')

const prTitle = ref('')
const prBody = ref('')
const latestPrUrl = ref('')

const uploading = ref(false)
const creatingPr = ref(false)

const uploadedRepoOwner = ref('')
const uploadedRepoName = ref('')
const uploadedRepoUrl = ref('')
const uploadedCommitSha = ref('')

const reviewLoading = ref(false)
const reviewItems = ref<PublishingResource[]>([])

const ownedLoading = ref(false)
const ownedItems = ref<CatalogEntry[]>([])

const isBusy = computed(() => workspaceBusy.value || uploading.value || creatingPr.value)
const canLoadList = computed(() => Boolean(token.value.trim() && currentUser.value))
const paidTypeSelectValue = computed({
  get: () => paidType.value || 'free',
  set: value => {
    paidType.value = value === 'free' ? '' : value
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

const isResourceInfoValid = computed(
  () =>
    Boolean(
      itemId.value.trim() &&
        itemName.value.trim() &&
        restype.value.trim() &&
        iconPath.value.trim() &&
        coverPath.value.trim() &&
        normalizedTagsText.value &&
        areDownloadsComplete.value
    )
)

const canUpload = computed(
  () =>
    Boolean(
      token.value.trim() &&
        currentUser.value &&
        workspaceHandle.value &&
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

const phosphorIconOptions = computed<LinkIconOption[]>(() =>
  phosphorCoreIcons.map(icon => ({
    key: icon.name,
    name: icon.name,
    pascalName: icon.pascal_name,
    keywords: `${icon.name} ${icon.pascal_name} ${icon.tags.join(' ')} ${icon.categories.join(' ')}`.toLowerCase()
  }))
)

const filteredPhosphorIconOptions = computed(() => {
  const raw = linkIconQuery.value.trim().toLowerCase()
  if (!raw) return phosphorIconOptions.value
  const tokens = raw.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return phosphorIconOptions.value
  return phosphorIconOptions.value.filter(option => tokens.every(token => option.keywords.includes(token)))
})

const displayedPhosphorIconOptions = computed(() =>
  filteredPhosphorIconOptions.value.slice(0, LINK_ICON_MAX_RENDER)
)

const getLinkIconComponent = (pascalName: string): Component | null => {
  if (linkIconComponentCache.has(pascalName)) {
    return linkIconComponentCache.get(pascalName) || null
  }
  const modulePath = `/node_modules/@phosphor-icons/vue/dist/icons/Ph${pascalName}.vue.mjs`
  const loader = phosphorIconModules[modulePath] as (() => Promise<unknown>) | undefined
  if (!loader) {
    linkIconComponentCache.set(pascalName, null)
    return null
  }
  const iconComponent = defineAsyncComponent(async () => {
    const module = (await loader()) as { default?: Component } | Component
    return (module as { default?: Component }).default || (module as Component)
  })
  linkIconComponentCache.set(pascalName, iconComponent)
  return iconComponent
}

const stepList = computed(() => [
  {
    label: '创建文件夹',
    done: Boolean(workspaceHandle.value || workspacePath.value)
  },
  {
    label: '资源信息',
    done: isResourceInfoValid.value
  },
  {
    label: '上传仓库',
    done: Boolean(uploadedCommitSha.value)
  },
  {
    label: '提交 Pull Request',
    done: Boolean(latestPrUrl.value)
  }
])

const canAccessStep = (index: number): boolean => {
  if (index <= 0) return true
  if (index === 1) return stepList.value[0].done
  if (index === 2) return stepList.value[1].done
  if (index === 3) return stepList.value[2].done
  return false
}

const openSubmitVersionDialog = (): void => {
  if (!stepList.value[1].done) {
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
  linkIconQuery.value = links.value[index]?.icon || ''
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

const autoResizeDescription = (): void => {
  const el = descriptionTextareaRef.value
  if (!el) return
  const minHeight = 90
  const nextHeight = Math.max(el.scrollHeight, el.offsetHeight, minHeight)
  el.style.height = `${nextHeight}px`
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
      ...uniqueNewPaths.map(path => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        path
      }))
    ]
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return
    appendLog(`选择预览图失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const removePreview = (index: number): void => {
  previewItems.value.splice(index, 1)
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
  itemDescription,
  () => {
    void nextTick(() => autoResizeDescription())
  },
  { immediate: true }
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
  const normalized = raw
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  const prefix = normalized || `Resource_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  return prefix.endsWith('_AstroBox_Release') ? prefix : `${prefix}_AstroBox_Release`
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

const resetResourceInfoFields = (): void => {
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
    latestPrUrl.value = ''

    appendLog('目录扫描完成')
  } catch (error: unknown) {
    clearWorkspace()
    appendLog(`扫描目录失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

const reloadResourceInfoFromWorkspace = async (): Promise<void> => {
  if (!workspaceHandle.value) {
    appendLog('当前会话没有目录访问权限，请先重新授权工作区。')
    return
  }
  await scanWorkspace({ forceSync: true })
  appendLog('已从当前工作区重新加载资源信息')
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

    const workspace = await ensureWorkspaceHandle()
    if (!workspace) {
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
      const file = await readFileByPath(workspace, path)
      if (!file) {
        throw new Error(`工作区中未找到文件: ${path}`)
      }
      uploadQueue.push({ path, file })
    }

    if (uploadQueue.length === 0) {
      throw new Error('没有可上传文件，请先选择资源文件')
    }

    let latestCommitSha = ''

    for (const item of uploadQueue) {
      const oldFile = await fetchRepoFileOrNull(
        accessToken,
        repo.owner,
        repo.name,
        item.path,
        MAIN_BRANCH
      )

      const contentBase64 = item.file
        ? arrayBufferToBase64(await item.file.arrayBuffer())
        : textToBase64(item.text || '')

      const result = await putRepoFile({
        token: accessToken,
        owner: repo.owner,
        repo: repo.name,
        path: item.path,
        branch: MAIN_BRANCH,
        message: `sync: ${item.path}`,
        contentBase64,
        sha: oldFile?.sha
      })

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
    reviewItems.value = await loadInProgressResources({
      token: requireToken(),
      username: currentUser.value,
      targetOwner: upstreamOwner.value.trim(),
      targetRepo: upstreamRepo.value.trim(),
      catalogPath: catalogPath.value.trim()
    })
  } catch (error: unknown) {
    appendLog(`加载审核列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    reviewLoading.value = false
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

watch(
  () => [mode.value, canLoadList.value] as const,
  ([currentMode, canLoad]) => {
    if (!canLoad) return
    if (currentMode === 'review') {
      void loadReviewList()
      return
    }
    if (currentMode === 'published') {
      void loadOwnedList()
    }
  },
  { immediate: true }
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
