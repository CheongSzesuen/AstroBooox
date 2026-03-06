<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle class="text-base">资源更新</CardTitle>
            <CardDescription>修改资源信息并通过 PR 提交到目标 catalog。</CardDescription>
          </div>
          <Button variant="outline" @click="emit('back')">返回资源管理</Button>
        </div>
      </CardHeader>

      <CardContent v-if="!draft" class="pt-0">
        <div class="rounded-md border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
          暂无更新上下文，请先从“资源管理”里选择资源并点击更新。
        </div>
      </CardContent>

      <CardContent v-else class="space-y-4 pt-0">
        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="update-name">资源名</Label>
            <Input id="update-name" v-model="form.name" placeholder="资源名" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-restype">资源类型</Label>
            <Select v-model="form.restype">
              <SelectTrigger id="update-restype">
                <SelectValue placeholder="选择资源类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quickapp">快应用</SelectItem>
                <SelectItem value="watchface">表盘</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-1.5">
          <Label for="update-description">描述</Label>
          <Textarea id="update-description" v-model="form.description" rows="4" />
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="update-tags">标签（分号分隔）</Label>
            <Input id="update-tags" v-model="form.tags" placeholder="工具;效率;实用" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-paid-type">付费类型</Label>
            <Input id="update-paid-type" v-model="form.paidType" placeholder="free / paid / force_paid" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-device-vendors">设备厂商（分号分隔）</Label>
            <Input id="update-device-vendors" v-model="form.deviceVendors" placeholder="huawei;xiaomi" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-devices">设备列表（分号分隔）</Label>
            <Input id="update-devices" v-model="form.devices" placeholder="watch4;watch5" />
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="update-icon">icon</Label>
            <Input id="update-icon" v-model="form.icon" placeholder="images/icon.png" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-cover">cover</Label>
            <Input id="update-cover" v-model="form.cover" placeholder="images/cover.png" />
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="update-catalog-id">Catalog ID</Label>
            <Input id="update-catalog-id" v-model="form.catalogId" placeholder="资源 id" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-commit-hash">repo_commit_hash</Label>
            <Input id="update-commit-hash" v-model="form.repoCommitHash" placeholder="main 或 commit hash" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-repo-owner">repo_owner</Label>
            <Input id="update-repo-owner" v-model="form.repoOwner" placeholder="owner" />
          </div>
          <div class="space-y-1.5">
            <Label for="update-repo-name">repo_name</Label>
            <Input id="update-repo-name" v-model="form.repoName" placeholder="repo" />
          </div>
        </div>

        <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground break-all">
          提交目标：{{ defaultTargetOwner }}/{{ defaultTargetRepo }} · {{ defaultCatalogPath }}
        </div>

        <div v-if="submitError" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {{ submitError }}
        </div>
        <div
          v-if="submitSuccess"
          class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          更新 PR 已创建：
          <a :href="submitPrUrl" target="_blank" rel="noopener noreferrer" class="break-all underline underline-offset-2">
            {{ submitPrUrl }}
          </a>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <Button variant="outline" :disabled="submitting" @click="emit('back')">取消</Button>
          <Button :disabled="!canSubmit || submitting" @click="submitUpdate">
            {{ submitting ? '提交中...' : '提交更新' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCcResourceEdit } from '@/composables/useCcResourceEdit'
import { useCcSession } from '@/composables/useCcSession'
import { useCcSettings } from '@/composables/useCcSettings'
import {
  createPullRequestWithHead,
  updateCatalogInForkBranch
} from '@/utils/resourcePublishApi'

const MAIN_BRANCH = 'main'

type UpdateForm = {
  catalogId: string
  repoOwner: string
  repoName: string
  repoCommitHash: string
  name: string
  restype: string
  description: string
  tags: string
  deviceVendors: string
  devices: string
  paidType: string
  icon: string
  cover: string
}

const emit = defineEmits<{
  (event: 'back'): void
}>()

const { draft } = useCcResourceEdit()
const { token, currentUser } = useCcSession()
const { defaultTargetOwner, defaultTargetRepo, defaultCatalogPath } = useCcSettings()

const form = ref<UpdateForm>({
  catalogId: '',
  repoOwner: '',
  repoName: '',
  repoCommitHash: '',
  name: '',
  restype: 'quickapp',
  description: '',
  tags: '',
  deviceVendors: '',
  devices: '',
  paidType: '',
  icon: '',
  cover: ''
})
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref(false)
const submitPrUrl = ref('')

const normalizeRestype = (value: string): 'quickapp' | 'watchface' =>
  value.trim().toLowerCase() === 'watchface' || value.trim().toLowerCase() === 'watch_face'
    ? 'watchface'
    : 'quickapp'

const formatCatalogRestype = (value: string): string =>
  normalizeRestype(value) === 'watchface' ? 'watchface' : 'quick_app'

const canSubmit = computed(() =>
  Boolean(
    draft.value &&
    token.value.trim() &&
    currentUser.value.trim() &&
    defaultTargetOwner.value.trim() &&
    defaultTargetRepo.value.trim() &&
    defaultCatalogPath.value.trim() &&
    form.value.catalogId.trim() &&
    form.value.repoOwner.trim() &&
    form.value.repoName.trim() &&
    form.value.repoCommitHash.trim() &&
    form.value.name.trim()
  )
)

watch(
  () => draft.value,
  (next) => {
    if (!next) return
    form.value = {
      catalogId: next.catalogId || '',
      repoOwner: next.repoOwner || '',
      repoName: next.repoName || '',
      repoCommitHash: next.repoCommitHash || '',
      name: next.name || '',
      restype: normalizeRestype(next.restype),
      description: next.description || '',
      tags: (next.tags || []).join(';'),
      deviceVendors: next.deviceVendors || '',
      devices: next.devices || '',
      paidType: next.paidType || '',
      icon: next.icon || '',
      cover: next.cover || ''
    }
    submitError.value = ''
    submitSuccess.value = false
    submitPrUrl.value = ''
  },
  { immediate: true }
)

const submitUpdate = async (): Promise<void> => {
  if (!draft.value || !canSubmit.value) return

  try {
    submitting.value = true
    submitError.value = ''
    submitSuccess.value = false
    submitPrUrl.value = ''

    const branchName = `astrobooox-update-${Date.now()}`
    const fork = await updateCatalogInForkBranch({
      token: token.value.trim(),
      upstreamOwner: defaultTargetOwner.value.trim(),
      upstreamRepo: defaultTargetRepo.value.trim(),
      upstreamBranch: MAIN_BRANCH,
      catalogPath: defaultCatalogPath.value.trim(),
      currentUser: currentUser.value.trim(),
      branchName,
      entry: {
        id: form.value.catalogId.trim(),
        name: form.value.name.trim(),
        restype: formatCatalogRestype(form.value.restype),
        repo_owner: form.value.repoOwner.trim(),
        repo_name: form.value.repoName.trim(),
        repo_commit_hash: form.value.repoCommitHash.trim(),
        icon: form.value.icon.trim(),
        cover: form.value.cover.trim(),
        tags: form.value.tags.trim(),
        device_vendors: form.value.deviceVendors.trim(),
        devices: form.value.devices.trim(),
        paid_type: form.value.paidType.trim()
      }
    })

    const pr = await createPullRequestWithHead({
      token: token.value.trim(),
      baseOwner: defaultTargetOwner.value.trim(),
      baseRepo: defaultTargetRepo.value.trim(),
      baseBranch: MAIN_BRANCH,
      headOwner: fork.forkOwner,
      headBranch: fork.branch,
      title: `[ABoooxCC]更新 ${form.value.name.trim()}`,
      body: [
        '## 更新内容',
        `- 资源名：${form.value.name.trim()}`,
        `- 资源类型：${form.value.restype}`,
        `- repo：${form.value.repoOwner.trim()}/${form.value.repoName.trim()}`,
        `- repo_commit_hash：${form.value.repoCommitHash.trim()}`
      ].join('\n')
    })

    submitPrUrl.value = pr.htmlUrl
    submitSuccess.value = true
  } catch (error: unknown) {
    submitError.value = error instanceof Error ? error.message : '提交更新失败'
  } finally {
    submitting.value = false
  }
}
</script>
