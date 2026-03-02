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

<script setup lang="ts" src="./ResourcePublishWorkbench.script.ts"></script>
