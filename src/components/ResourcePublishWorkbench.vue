<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <template v-if="mode === 'publish'">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-base">步骤导航</CardTitle>
        </CardHeader>
        <CardContent class="pt-0">
          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <button
              v-for="(step, index) in stepList"
              :key="step.label"
              type="button"
              class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition"
              :class="[
                activeStep === index
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/30',
                step.done ? '!text-foreground' : ''
              ]"
              @click="activeStep = index"
            >
              <span
                class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold"
                :class="
                  step.done
                    ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-600'
                    : activeStep === index
                      ? 'border-primary/60 bg-primary/10 text-foreground'
                      : 'border-border text-muted-foreground'
                "
              >
                <span>{{ index + 1 }}</span>
              </span>
              <span>{{ step.label }}</span>
            </button>
          </div>
        </CardContent>
      </Card>

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

      <div class="space-y-4">
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
                <Button :disabled="!stepList[0].done" @click="activeStep = 1">下一步</Button>
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
                      <Button variant="outline" @click="addTag">添加标签</Button>
                    </div>
                  </div>

                  <div class="grid gap-3 md:grid-cols-2">
                    <div class="space-y-1.5">
                      <Label for="icon-path">icon 文件</Label>
                      <div class="flex gap-2 max-sm:flex-col">
                        <Input id="icon-path" v-model="iconPath" readonly placeholder="点击右侧按钮从工作区选择文件" />
                        <Button variant="outline" @click="selectIconFile">选择文件</Button>
                      </div>
                    </div>
                    <div class="space-y-1.5">
                      <Label for="cover-path">cover 文件</Label>
                      <div class="flex gap-2 max-sm:flex-col">
                        <Input id="cover-path" v-model="coverPath" readonly placeholder="点击右侧按钮从工作区选择文件" />
                        <Button variant="outline" @click="selectCoverFile">选择文件</Button>
                      </div>
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
                    <Button variant="outline" @click="selectMultiplePreviewFiles">+ 添加预览图</Button>
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
                  <Button variant="outline" @click="addAuthor">+ 添加作者</Button>
                </CardContent>
              </Card>

              <Card class="border-border/70 shadow-none">
                <CardHeader class="pb-3">
                  <CardTitle class="text-base">下载资源</CardTitle>
                </CardHeader>
                <CardContent class="space-y-3 pt-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <Button variant="outline" @click="showDeviceSelector = true">+ 选择支持设备</Button>
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
                <Button variant="outline" @click="activeStep = 0">上一步</Button>
                <Button :disabled="!stepList[1].done" @click="activeStep = 2">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 2">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 3：上传资源仓库</CardTitle>
              <CardDescription>创建或复用仓库，并上传 manifest 与已选择的资源文件。</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="repo-name">资源仓库名（可选）</Label>
                  <Input id="repo-name" v-model="repoName" placeholder="留空时按 ID 自动生成" />
                </div>
                <div class="space-y-1.5">
                  <Label for="repo-desc">仓库描述（可选）</Label>
                  <Input id="repo-desc" v-model="repoDescription" placeholder="resource repository" />
                </div>
              </div>

              <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                上传目标仓库: {{ currentUser || '--' }}/{{ resolvedRepoName || '--' }}
              </div>

              <div class="grid gap-2 md:grid-cols-3">
                <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                  仓库: {{ currentUser || '--' }}/{{ resolvedRepoName || '--' }}
                </div>
                <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                  待上传文件: {{ uploadQueueCount }}
                </div>
                <div class="rounded-lg border border-border bg-muted/25 px-3 py-2 text-sm">
                  分支: {{ MAIN_BRANCH }}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <Button :disabled="uploading || !canUpload" @click="handleUploadResources">
                  <UploadSimple :size="16" weight="duotone" />
                  {{ uploading ? '上传中...' : '创建仓库并上传' }}
                </Button>
                <span v-if="uploadedCommitSha" class="text-sm text-muted-foreground">
                  最新 Commit: {{ uploadedCommitSha.slice(0, 10) }}
                </span>
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
                <Button variant="outline" @click="activeStep = 1">上一步</Button>
                <Button :disabled="!stepList[2].done" @click="activeStep = 3">下一步</Button>
              </div>
            </CardContent>
          </Card>

          <Card v-if="activeStep === 3">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">步骤 4：Catalog 与 Pull Request</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="upstream-owner">目录仓库 Owner</Label>
                  <Input id="upstream-owner" v-model="upstreamOwner" />
                </div>
                <div class="space-y-1.5">
                  <Label for="upstream-repo">目录仓库名</Label>
                  <Input id="upstream-repo" v-model="upstreamRepo" />
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="target-owner">PR 目标 Owner</Label>
                  <Input id="target-owner" v-model="targetOwner" />
                </div>
                <div class="space-y-1.5">
                  <Label for="target-repo">PR 目标仓库</Label>
                  <Input id="target-repo" v-model="targetRepo" />
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1.5">
                  <Label for="catalog-path">Catalog 文件路径</Label>
                  <Input id="catalog-path" v-model="catalogPath" placeholder="index_v2.csv" />
                </div>
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
                  {{ creatingPr ? '创建中...' : '更新 Catalog 并创建 PR' }}
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
                <Button variant="outline" @click="activeStep = 2">上一步</Button>
              </div>
            </CardContent>
          </Card>
      </div>

      <Dialog :open="showDeviceSelector" @update:open="showDeviceSelector = $event">
        <DialogContent class="max-w-[820px]">
          <DialogHeader>
            <DialogTitle>选择支持设备</DialogTitle>
            <DialogDescription>设备会自动映射为 v2 设备 ID，并同步到 downloads。</DialogDescription>
          </DialogHeader>
          <div class="my-2 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 max-[640px]:grid-cols-1">
            <div
              v-for="entry in deviceSelectorEntries"
              :key="`device-option-${entry.key}`"
              class="cursor-pointer rounded-lg border p-3 transition-colors"
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
import { computed, nextTick, ref, watch } from 'vue'
import {
  PhArrowsClockwise as ArrowsClockwise,
  PhDotsSixVertical as DragDots,
  PhFolderOpen as FolderOpen,
  PhGitPullRequest as GitPullRequest,
  PhMinus as MinusIcon,
  PhUploadSimple as UploadSimple
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
import { Textarea } from '@/components/ui/textarea'
import { useCcPublishLogs } from '@/composables/useCcPublishLogs'
import { useCcSession } from '@/composables/useCcSession'
import { type WorkspaceTreeItem, useCcWorkspace } from '@/composables/useCcWorkspace'
import {
  type CatalogEntry,
  type PublishingResource,
  arrayBufferToBase64,
  createPullRequestWithHead,
  ensureUserRepository,
  fetchRepoFileOrNull,
  loadInProgressResources,
  loadOwnedResources,
  putRepoFile,
  textToBase64,
  updateCatalogInForkBranch
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

const MAIN_BRANCH = 'main'
const MANIFEST_FILE = 'manifest_v2.json'

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
const { workspacePath, setWorkspace, clearWorkspace } = useCcWorkspace()
const { appendPublishLog: appendLog } = useCcPublishLogs()
const workspaceBusy = ref(false)
const newWorkspaceName = ref('')
const workspaceDisplayPath = ref('')
const activeStep = ref(0)

const workspaceHandle = ref<WorkspaceDirectoryHandle | null>(null)
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
const authors = ref<Array<{ name: string; bindABAccount: boolean }>>([
  { name: '', bindABAccount: true }
])
const showDeviceSelector = ref(false)
const showResourceIdGuide = ref(false)
const showOutOfWorkspaceFileDialog = ref(false)
const iconPath = ref('')
const coverPath = ref('')
const previewItems = ref<Array<{ id: string; path: string }>>([])

const upstreamOwner = ref('AstralSightStudios')
const upstreamRepo = ref('ABRepo-TestEnv')
const targetOwner = ref('AstralSightStudios')
const targetRepo = ref('ABRepo-TestEnv')
const catalogPath = ref('index_v2.csv')

const prTitle = ref('[ABCC] Add new resource')
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

const resolvedRepoName = computed(() => {
  const manual = repoName.value.trim()
  if (manual) return manual

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

const uploadQueueCount = computed(() => 1 + selectedUploadPaths.value.length)

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
        targetOwner.value.trim() &&
        targetRepo.value.trim() &&
        catalogPath.value.trim() &&
        prTitle.value.trim()
    )
)

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
    label: '创建 PR',
    done: Boolean(latestPrUrl.value)
  }
])

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
  authors.value.push({ name: '', bindABAccount: true })
}

const removeAuthor = (index: number): void => {
  authors.value.splice(index, 1)
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

const pickFilePathFromWorkspace = async (): Promise<string | null> => {
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
        return relativeParts.join('/')
      }

      showOutOfWorkspaceFileDialog.value = true
      return null
    }

    return fileHandle.name || null
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return null
    appendLog(`选择文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  }
}

const selectIconFile = async (): Promise<void> => {
  const path = await pickFilePathFromWorkspace()
  if (path) iconPath.value = path
}

const selectCoverFile = async (): Promise<void> => {
  const path = await pickFilePathFromWorkspace()
  if (path) coverPath.value = path
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
  const path = await pickFilePathFromWorkspace()
  if (path) {
    ensureDownload(deviceId)
    downloads.value[deviceId].file_name = path
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

    workspaceHandle.value = handle
    workspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    if (!newWorkspaceName.value.trim()) {
      newWorkspaceName.value = handle.name
    }

    appendLog(`已重新授权工作区: ${handle.name}`)
    await scanWorkspace()
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
    workspaceHandle.value = handle
    workspaceName.value = handle.name
    newWorkspaceName.value = handle.name
    workspaceDisplayPath.value = handle.name
    appendLog(`已选择工作区: ${handle.name}`)
    await scanWorkspace()
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
      throw new Error(`文件夹名不符合 GitHub 仓库命名要求：${validationError}`)
    }
    const handle = await parent.getDirectoryHandle(folderName, { create: true })
    workspaceHandle.value = handle
    workspaceName.value = handle.name
    workspaceDisplayPath.value = `${parent.name}/${folderName}`
    newWorkspaceName.value = folderName
    appendLog(`已创建并切换目录: ${folderName}`)
    await scanWorkspace()
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

const scanWorkspace = async (): Promise<void> => {
  if (!workspaceHandle.value) return

  try {
    const manifest = await readFileTextByPath(workspaceHandle.value, MANIFEST_FILE)
    manifestText.value = manifest || ''

    const tree = await collectWorkspaceTree(workspaceHandle.value)
    setWorkspace(workspaceDisplayPath.value || workspaceName.value, tree)

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
            author?: Array<{ name?: string; bindABAccount?: boolean }>
          }
          downloads?: Record<string, { version?: string; file_name?: string }>
        }
        itemId.value = itemId.value || parsed.item?.id || ''
        itemName.value = itemName.value || parsed.item?.name || ''
        const parsedRestype = parsed.item?.restype === 'quick_app' ? 'quickapp' : parsed.item?.restype
        restype.value = restype.value || parsedRestype || 'quickapp'
        itemDescription.value = itemDescription.value || parsed.item?.description || ''
        iconPath.value = iconPath.value || parsed.item?.icon || ''
        coverPath.value = coverPath.value || parsed.item?.cover || ''
        if (previewItems.value.length === 0 && Array.isArray(parsed.item?.preview)) {
          previewItems.value = parsed.item.preview
            .filter(Boolean)
            .map(path => ({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              path
            }))
        }

        if (!authors.value.some(author => author.name.trim()) && parsed.item?.author?.length) {
          authors.value = parsed.item.author.map(author => ({
            name: author.name || '',
            bindABAccount: Boolean(author.bindABAccount)
          }))
        }

        if (parsed.downloads && selectedDeviceIds.value.length === 0) {
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
        }
      } catch {
        appendLog('manifest_v2.json 不是合法 JSON，将按原文上传')
      }
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

const refreshWorkspaceFileTree = async (): Promise<void> => {
  if (!workspaceHandle.value) {
    appendLog('当前会话没有目录访问权限，请点击“选择已有文件夹”重新授权后再刷新。')
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

  const manifestObject = {
    item: {
      id: itemId.value.trim(),
      restype: restype.value.trim(),
      name: itemName.value.trim(),
      description: itemDescription.value.trim(),
      preview,
      icon: iconPath.value.trim(),
      cover: coverPath.value.trim(),
      author: normalizedAuthors
    },
    links: [],
    downloads: normalizedDownloads,
    ext: {}
  }

  return JSON.stringify(manifestObject, null, 2)
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

    const generatedManifestText = buildManifestV2Text()
    manifestText.value = generatedManifestText

    const uploadQueue: Array<{ path: string; file?: File; text?: string }> = []
    uploadQueue.push({
      path: MANIFEST_FILE,
      text: generatedManifestText
    })

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
    appendLog(`上传步骤完成，commit: ${latestCommitSha.slice(0, 10)}`)
  } catch (error: unknown) {
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

    const branchName = `astrobooox-submit-${Date.now()}`
    const forkResult = await updateCatalogInForkBranch({
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
        restype: restype.value.trim(),
        repo_owner: uploadedRepoOwner.value,
        repo_name: uploadedRepoName.value,
        repo_commit_hash: uploadedCommitSha.value,
        icon: iconPath.value.trim(),
        cover: coverPath.value.trim(),
        tags: normalizedTagsText.value,
        device_vendors: normalizedDeviceVendorsText.value,
        devices: normalizedDevicesText.value,
        paid_type: paidType.value.trim()
      }
    })

    appendLog(`Catalog 更新完成: ${forkResult.forkOwner}/${forkResult.forkRepo}@${forkResult.branch}`)

    const pr = await createPullRequestWithHead({
      token: accessToken,
      baseOwner: targetOwner.value.trim(),
      baseRepo: targetRepo.value.trim(),
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
      targetOwner: targetOwner.value.trim(),
      targetRepo: targetRepo.value.trim(),
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
