<template>
  <div class="mx-auto w-full max-w-[1320px] space-y-4">
    <Card class="border-border/80 bg-card">
      <CardHeader class="pb-3">
        <CardTitle class="inline-flex items-center gap-2 text-base md:text-lg">
          <GitBranch :size="18" weight="duotone" />
          浏览器 Git 提交
        </CardTitle>
        <CardDescription class="text-sm leading-6">
          基于 GitHub API 在浏览器完成仓库创建、读取文件、commit、push 与 PR 创建。
        </CardDescription>
      </CardHeader>
      <CardContent class="pt-0">
        <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
          不会读取站点默认 Token。必须手动输入你自己的细粒度 Token，且禁止使用默认 VITE_GITHUB_TOKEN。
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">1. 认证与仓库</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div class="space-y-1.5">
                <Label for="git-token">GitHub Token</Label>
                <Input
                  id="git-token"
                  v-model="token"
                  :type="isTokenVisible ? 'text' : 'password'"
                  placeholder="ghp_xxx / github_pat_xxx"
                  autocomplete="off"
                />
              </div>
              <div class="flex items-end gap-2">
                <Button variant="outline" class="h-9" @click="isTokenVisible = !isTokenVisible">
                  <Eye :size="16" weight="duotone" />
                  {{ isTokenVisible ? '隐藏' : '显示' }}
                </Button>
                <Button class="h-9" :disabled="loading.verify || !token.trim()" @click="handleVerifyToken">
                  <CheckCircle :size="16" weight="duotone" />
                  {{ loading.verify ? '校验中...' : '校验 Token' }}
                </Button>
              </div>
            </div>

            <div class="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              安全策略：本页不会缓存 Token 到 localStorage，也不会使用站点环境变量中的默认 Token。
            </div>

            <div class="grid gap-3 md:grid-cols-3">
              <div class="space-y-1.5">
                <Label for="repo-owner">仓库 Owner</Label>
                <Input id="repo-owner" v-model="repoOwner" placeholder="your-name" />
              </div>
              <div class="space-y-1.5">
                <Label for="repo-name">仓库名</Label>
                <Input id="repo-name" v-model="repoName" placeholder="repo-name" />
              </div>
              <div class="space-y-1.5">
                <Label for="repo-branch">分支</Label>
                <Input id="repo-branch" v-model="repoBranch" placeholder="main" />
              </div>
            </div>

            <div class="rounded-lg border border-border bg-muted/30 p-3">
              <p class="mb-2 text-sm font-medium text-foreground">快速创建仓库</p>
              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input v-model="newRepoName" placeholder="new-repo-name" />
                <Input v-model="newRepoDescription" placeholder="仓库描述（可选）" />
                <Button :disabled="loading.createRepo || !token.trim() || !newRepoName.trim()" @click="handleCreateRepo">
                  <FolderPlus :size="16" weight="duotone" />
                  {{ loading.createRepo ? '创建中...' : '创建仓库' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">2. 文件读写与 Commit</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div class="space-y-1.5">
                <Label for="file-path">文件路径</Label>
                <Input id="file-path" v-model="filePath" placeholder="resources/yourname/manifest_v2.json" />
              </div>
              <div class="flex items-end">
                <Button variant="outline" :disabled="loading.readFile || !hasRepo || !token.trim() || !filePath.trim()" @click="handleReadFile">
                  <FileMagnifyingGlass :size="16" weight="duotone" />
                  {{ loading.readFile ? '读取中...' : '读取文件' }}
                </Button>
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="file-content">文件内容</Label>
              <Textarea
                id="file-content"
                v-model="fileContent"
                class="min-h-[300px] font-mono text-xs leading-6"
                placeholder="在这里编辑文件内容"
              />
            </div>

            <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div class="space-y-1.5">
                <Label for="commit-message">提交信息</Label>
                <Input
                  id="commit-message"
                  v-model="commitMessage"
                  placeholder="feat(resource): update manifest"
                />
              </div>
              <div class="flex items-end">
                <Button :disabled="loading.commit || !canCommit" @click="handleCommitAndPush">
                  <GitCommit :size="16" weight="duotone" />
                  {{ loading.commit ? '提交中...' : 'Commit 并 Push' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">3. 创建 Pull Request</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-0">
            <div class="grid gap-3 md:grid-cols-3">
              <div class="space-y-1.5">
                <Label for="pr-base-owner">目标 Owner</Label>
                <Input id="pr-base-owner" v-model="prBaseOwner" placeholder="AstralSightStudios" />
              </div>
              <div class="space-y-1.5">
                <Label for="pr-base-repo">目标仓库</Label>
                <Input id="pr-base-repo" v-model="prBaseRepo" placeholder="ABRepo-TestEnv" />
              </div>
              <div class="space-y-1.5">
                <Label for="pr-base-branch">目标分支</Label>
                <Input id="pr-base-branch" v-model="prBaseBranch" placeholder="main" />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="pr-title">PR 标题</Label>
              <Input id="pr-title" v-model="prTitle" placeholder="[ABCC] Add new resource" />
            </div>

            <div class="space-y-1.5">
              <Label for="pr-body">PR 描述（可选）</Label>
              <Textarea id="pr-body" v-model="prBody" class="min-h-[120px]" placeholder="本次改动说明..." />
            </div>

            <div class="flex justify-end">
              <Button
                :disabled="loading.createPr || !hasRepo || !token.trim() || !prTitle.trim()"
                @click="handleCreatePr"
              >
                <GitPullRequest :size="16" weight="duotone" />
                {{ loading.createPr ? '创建中...' : '创建 PR' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-4 xl:sticky xl:top-0 xl:self-start">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base">运行状态</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-0">
            <div class="flex flex-wrap gap-2">
              <Badge variant="outline">
                用户: {{ currentUser || '未校验' }}
              </Badge>
              <Badge variant="outline">
                分支: {{ repoBranch || 'main' }}
              </Badge>
              <Badge variant="outline">
                文件 SHA: {{ fileSha ? fileSha.slice(0, 7) : '--' }}
              </Badge>
            </div>

            <div v-if="lastCommitUrl" class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p class="mb-1 font-medium text-foreground">最近一次 Commit</p>
              <a
                :href="lastCommitUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="break-all text-primary hover:underline"
              >
                {{ lastCommitUrl }}
              </a>
            </div>

            <div v-if="lastPrUrl" class="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p class="mb-1 font-medium text-foreground">最近一次 PR</p>
              <a
                :href="lastPrUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="break-all text-primary hover:underline"
              >
                {{ lastPrUrl }}
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between gap-2">
              <CardTitle class="text-base">操作日志</CardTitle>
              <Button variant="ghost" size="sm" @click="logs = []">清空</Button>
            </div>
          </CardHeader>
          <CardContent class="pt-0">
            <div class="scrollbar-none max-h-[420px] overflow-y-auto rounded-lg border border-border bg-muted/25 p-3">
              <pre class="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-foreground">{{ logsText }}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  PhCheckCircle as CheckCircle,
  PhEye as Eye,
  PhFileMagnifyingGlass as FileMagnifyingGlass,
  PhFolderPlus as FolderPlus,
  PhGitBranch as GitBranch,
  PhGitCommit as GitCommit,
  PhGitPullRequest as GitPullRequest
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  commitTextFile,
  createPullRequest,
  createRepository,
  readRepositoryFile,
  verifyToken
} from '@/utils/githubGitApi'

const SITE_DEFAULT_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''

const token = ref('')
const isTokenVisible = ref(false)

const currentUser = ref('')
const repoOwner = ref('')
const repoName = ref('')
const repoBranch = ref('main')

const newRepoName = ref('')
const newRepoDescription = ref('')

const filePath = ref('README.md')
const fileContent = ref('')
const fileSha = ref('')
const commitMessage = ref('chore(git): update file via AstroBooox browser git')

const prBaseOwner = ref('AstralSightStudios')
const prBaseRepo = ref('ABRepo-TestEnv')
const prBaseBranch = ref('main')
const prTitle = ref('[ABCC] Add new resource')
const prBody = ref('')

const lastCommitUrl = ref('')
const lastPrUrl = ref('')
const logs = ref<string[]>([])

const loading = reactive({
  verify: false,
  createRepo: false,
  readFile: false,
  commit: false,
  createPr: false
})

const hasRepo = computed(
  () => repoOwner.value.trim().length > 0 && repoName.value.trim().length > 0 && repoBranch.value.trim().length > 0
)

const canCommit = computed(
  () =>
    hasRepo.value &&
    token.value.trim().length > 0 &&
    filePath.value.trim().length > 0 &&
    commitMessage.value.trim().length > 0
)

const logsText = computed(() => {
  if (logs.value.length === 0) {
    return '暂无日志'
  }
  return logs.value.join('\n')
})

const appendLog = (message: string): void => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [`[${time}] ${message}`, ...logs.value].slice(0, 120)
}

const requireToken = (): string => {
  const value = token.value.trim()
  if (!value) {
    throw new Error('请先填写 GitHub Token')
  }

  if (SITE_DEFAULT_TOKEN && value === SITE_DEFAULT_TOKEN) {
    throw new Error('安全策略限制：Git 提交页面禁止使用站点默认 Token，请改用你的小号细粒度 Token。')
  }

  return value
}

const withAction = async (
  key: keyof typeof loading,
  action: () => Promise<void>
): Promise<void> => {
  try {
    loading[key] = true
    await action()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误'
    appendLog(`失败: ${message}`)
  } finally {
    loading[key] = false
  }
}

const handleVerifyToken = async (): Promise<void> => {
  await withAction('verify', async () => {
    const user = await verifyToken(requireToken())
    currentUser.value = user.login

    if (!repoOwner.value.trim()) {
      repoOwner.value = user.login
    }

    appendLog(`Token 校验成功: ${user.login}`)
  })
}

const handleCreateRepo = async (): Promise<void> => {
  await withAction('createRepo', async () => {
    const repo = await createRepository(requireToken(), newRepoName.value, newRepoDescription.value)
    repoOwner.value = repo.owner.login
    repoName.value = repo.name
    repoBranch.value = repo.default_branch || 'main'

    appendLog(`仓库创建成功: ${repo.full_name}`)
    appendLog(`仓库地址: ${repo.html_url}`)
  })
}

const handleReadFile = async (): Promise<void> => {
  await withAction('readFile', async () => {
    const file = await readRepositoryFile(
      requireToken(),
      repoOwner.value.trim(),
      repoName.value.trim(),
      repoBranch.value.trim(),
      filePath.value.trim()
    )

    fileContent.value = file.content
    fileSha.value = file.sha
    appendLog(`读取文件成功: ${file.path} (${file.size} bytes)`)
  })
}

const handleCommitAndPush = async (): Promise<void> => {
  await withAction('commit', async () => {
    const result = await commitTextFile({
      token: requireToken(),
      owner: repoOwner.value.trim(),
      repo: repoName.value.trim(),
      branch: repoBranch.value.trim(),
      filePath: filePath.value.trim(),
      fileContent: fileContent.value,
      commitMessage: commitMessage.value
    })

    fileSha.value = result.commitSha
    lastCommitUrl.value = result.commitUrl
    appendLog(`Commit 并 Push 成功: ${result.commitSha.slice(0, 7)} -> ${result.branch}`)
  })
}

const handleCreatePr = async (): Promise<void> => {
  await withAction('createPr', async () => {
    const result = await createPullRequest({
      token: requireToken(),
      baseOwner: prBaseOwner.value.trim(),
      baseRepo: prBaseRepo.value.trim(),
      baseBranch: prBaseBranch.value.trim(),
      headOwner: repoOwner.value.trim(),
      headBranch: repoBranch.value.trim(),
      title: prTitle.value,
      body: prBody.value
    })

    lastPrUrl.value = result.htmlUrl
    appendLog(`PR 创建成功: #${result.number} ${result.title}`)
  })
}
</script>
