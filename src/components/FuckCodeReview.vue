<template>
  <div class="code-review-container">
    <Dialog :open="showFeatureNotice" @update:open="showFeatureNotice = $event">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader class="gap-3">
          <div class="flex items-start gap-3">
            <Info :size="36" weight="duotone" class="mt-0.5 text-foreground" />
            <div>
              <DialogTitle>功能说明</DialogTitle>
              <DialogDescription class="mt-2 text-sm leading-6">
                目前版本为基础版本，更方便的功能还在更新。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul class="notice-list">
          <li>手机端响应有问题</li>
          <li>自动检验 PR 数据未做</li>
          <li>若添加多个 CSV 会导致 manifest 错误，刷新有概率成功，以后会修</li>
          <li>后续会持续更新优化</li>
        </ul>
        <p class="hint-text">如有建议或发现问题，欢迎提交 Issue 或直接联系作者</p>

        <DialogFooter class="gap-2 sm:justify-between">
          <Button @click="closeFeatureNotice">
            <Check :size="16" weight="bold" />
            我知道了
          </Button>
          <Button as="a" href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" variant="outline">
            <GithubLogo :size="16" weight="duotone" />
            提交反馈
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 使用侧栏组件 -->
    <Sidebar
      :pull-requests="pullRequests"
      :selected-pr="selectedPR"
      :loading="loadingPRs"
      :is-collapsed="isSidebarCollapsed"
      @select="selectPR"
      @toggle="toggleSidebar"
      @refresh="fetchPullRequests"
    />

    <!-- 主内容区 -->
    <div class="main-content">
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>

      <div v-if="!selectedPR" class="empty-state">
        <h3>请从左侧选择一个Pull Request进行审查</h3>
      </div>

      <div v-else>
        <!-- 使用PR头部组件 -->
        <PRHeader 
          :pr="selectedPR"
          @refresh="fetchPRDetails"
        />

        <div v-if="loadingDetails" class="loading">加载PR详情中...</div>

        <div v-else>
          <!-- 使用PR标签导航组件 -->
          <PRTabs
            v-model:active-tab="activeTab"
            :analyzed-data="analyzedData"
            :changed-files="changedFiles"
          />

          <!-- 文件变更内容 -->
          <FilesTabContent
            v-show="activeTab === 'files'"
            :changed-files="changedFiles"
          />

          <!-- 数据分析内容 -->
          <AnalysisTabContent
            v-show="activeTab === 'analysis'"
            :analyzed-data="analyzedData"
            :repo-data="repoData"
            :manifest-data="manifestData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  PhCheck as Check,
  PhGithubLogo as GithubLogo,
  PhInfo as Info
} from '@phosphor-icons/vue'
import axios, { type AxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Sidebar from '@/components/CodeReview/Sidebar.vue'
import PRHeader from '@/components/CodeReview/PRHeader.vue'
import PRTabs from '@/components/CodeReview/PRTabs.vue'
import FilesTabContent from '@/components/CodeReview/PRTabs/FilesTabContent.vue'
import AnalysisTabContent from '@/components/CodeReview/PRTabs/AnalysisTabContent.vue'
import { api, githubTokenSetupHint, hasGithubToken } from '../utils/githubClient'
import type { 
  PullRequest, 
  FileChange, 
  AnalyzedData,
  RepoData,
  ManifestData,
  CSVChange,
  ResourceChange
} from '@/type/codeReview'
// 常量定义
const REPO_OWNER = 'AstralSightStudios'
const REPO_NAME = 'AstroBox-Repo'

// 响应式状态
const pullRequests = ref<PullRequest[]>([])
const selectedPR = ref<PullRequest | null>(null)
const changedFiles = ref<FileChange[]>([])
const analyzedData = ref<AnalyzedData | null>(null)
const repoData = ref<RepoData | null>(null)
const manifestData = ref<ManifestData | null>(null)
const loadingPRs = ref(false)
const loadingDetails = ref(false)
const errorMessage = ref('')
const isSidebarCollapsed = ref(false)
const isFirstSelection = ref(true)
const showFeatureNotice = ref(true)
const activeTab = ref<'files' | 'analysis'>('analysis')

// 关闭功能通知
const closeFeatureNotice = () => {
  showFeatureNotice.value = false
}

// 错误处理工具函数
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '未知错误'
}

// 添加 AxiosError 类型检查函数
const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError === true
}

onMounted(() => {
  if (!hasGithubToken) {
    errorMessage.value = githubTokenSetupHint
  }
  fetchPullRequests()
})

const fetchPullRequests = async () => {
  loadingPRs.value = true
  errorMessage.value = hasGithubToken ? '' : githubTokenSetupHint
  
  try {
    console.log('开始获取PR列表...')
    const { data } = await api.get(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
      params: {
        state: 'open',
        sort: 'created',
        direction: 'desc',
        per_page: 100
      }
    })
    
    console.log('获取到的PR数据:', data)
    
    if (!Array.isArray(data)) {
      throw new Error('返回的PR数据格式不正确')
    }
    
    pullRequests.value = data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      user: {
        login: pr.user?.login || '未知用户',
        avatar_url: pr.user?.avatar_url || '',
        html_url: pr.user?.html_url || ''
      },
      created_at: pr.created_at,
      html_url: pr.html_url,
      head: {
        sha: pr.head?.sha || '',
        label: pr.head?.label || 'main'
      },
      base: {
        label: pr.base?.label || 'main'
      },
      commits: pr.commits,
      state: pr.state || 'open'
    }))
  } catch (error: unknown) {
    console.error('获取PR列表失败:', error)
    
    if (isAxiosError(error)) {
      const errorData = error.response?.data as { message?: string } || {}
      if (error.response?.status === 401) {
        errorMessage.value = hasGithubToken
          ? 'GitHub认证失败，请检查Token是否有效'
          : `${githubTokenSetupHint} 当前请求返回 401，请先配置可用 token。`
      } else if (error.response?.status === 404) {
        errorMessage.value = `仓库不存在: ${REPO_OWNER}/${REPO_NAME}`
      } else {
        const detail = `获取PR列表失败: ${errorData.message || error.message}`
        errorMessage.value = hasGithubToken ? detail : `${githubTokenSetupHint} ${detail}`
      }
    } else if (error instanceof Error) {
      const detail = `获取PR列表失败: ${error.message}`
      errorMessage.value = hasGithubToken ? detail : `${githubTokenSetupHint} ${detail}`
    } else {
      const detail = '获取PR列表失败: 未知错误'
      errorMessage.value = hasGithubToken ? detail : `${githubTokenSetupHint} ${detail}`
    }
  } finally {
    loadingPRs.value = false
  }
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const selectPR = async (pr: PullRequest) => {
  if (isFirstSelection.value) {
    isSidebarCollapsed.value = true
    isFirstSelection.value = false
  }
  selectedPR.value = pr
  analyzedData.value = null
  repoData.value = null
  manifestData.value = null
  errorMessage.value = ''
  await fetchPRDetails()
}

const fetchPRDetails = async () => {
  if (!selectedPR.value) return
  
  loadingDetails.value = true
  try {
    console.log(`获取PR #${selectedPR.value.number} 的详情...`)
    const { data } = await api.get(
      `/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${selectedPR.value.number}/files`
    )
    
    console.log('获取到的文件变更:', data)
    changedFiles.value = data
    
    if (hasDataFiles.value) {
      await Promise.all(
        changedFiles.value
          .filter(file => isDataFile(file.filename))
          .map(file => analyzeFile(file))
      )
    }
  } catch (error: unknown) {
    console.error('获取PR详情失败:', error)
    errorMessage.value = `获取PR详情失败: ${getErrorMessage(error)}`
  } finally {
    loadingDetails.value = false
  }
}

const hasDataFiles = computed(() => 
  changedFiles.value.some(file => isDataFile(file.filename))
)

const isDataFile = (filename: string): boolean => {
  return filename.endsWith('.csv') || 
    (filename.includes('resources/') && filename.endsWith('.json'))
}

const analyzeFile = async (file: FileChange) => {
  errorMessage.value = ''
  try {
    console.log(`分析文件: ${file.filename}`)
    const { data } = await api.get(file.contents_url)
    let content = ''
    if (data.content) {
      content = atob(data.content.replace(/\n/g, ''))
    } else if (data) {
      content = typeof data === 'string' ? data : JSON.stringify(data)
    }
    
    if (file.filename.endsWith('.csv')) {
      const csvChange = await analyzeCSVFile(file, content)
      if (csvChange) {
        analyzedData.value = {
          ...analyzedData.value,
          csvChange
        }
      }
    } else if (file.filename.includes('resources/') && file.filename.endsWith('.json')) {
      const resourceChange = await analyzeResourceFile(content)
      if (resourceChange) {
        analyzedData.value = {
          ...analyzedData.value,
          resourceChange
        }
        repoData.value = resourceChange
        
        if (resourceChange.repo_url) {
          await fetchRepoManifest(resourceChange.repo_url)
        }
      }
    }
  } catch (error: unknown) {
    console.error('分析文件失败:', error)
    errorMessage.value = `分析文件失败: ${getErrorMessage(error)}`
  }
}

const analyzeCSVFile = async (file: FileChange, content: string): Promise<CSVChange | null> => {
  try {
    if (file.status === 'added') {
      const lines = content.split('\n')
      if (lines.length > 1) {
        const line = lines[1].trim()
        if (line) {
          const [name, icon, cover, restype, tags, devices, path, paid_type] = line.split(',')
          return {
            appName: name || '',
            iconUrl: icon || '',
            previewUrl: cover || '',
            type: restype || '',
            tags: tags || '',
            supportedDevices: devices || '',
            resourceFile: path || '',
            paidType: paid_type || ''
          }
        }
      }
    } else if (file.patch) {
      const patchLines = file.patch.split('\n')
      const addedLines = []
      let lineNumber = 0
      let startLine = 0
      
      // 解析patch头部获取修改位置
      for (const line of patchLines) {
        if (line.startsWith('@@')) {
          const match = line.match(/@@ -\d+,?\d* \+(\d+),?(\d*) @@/)
          if (match) {
            startLine = parseInt(match[1]) - 1
          }
          break
        }
      }
      
      // 收集所有新增行
      for (const line of patchLines) {
        if (line.startsWith('+') && !line.startsWith('+++') && line.includes(',')) {
          addedLines.push({
            line: line.substring(1),
            originalLineNumber: startLine + lineNumber
          })
        }
        if (!line.startsWith('+') && !line.startsWith('-')) {
          lineNumber++
        }
      }
      
      // 找出真正新增的行
      const contentLines = content.split('\n')
      const trulyAddedLines = addedLines.filter(added => 
        !contentLines[added.originalLineNumber] || 
        contentLines[added.originalLineNumber].trim() !== added.line.trim()
      )
      
      // 取最后真正新增的行
      if (trulyAddedLines.length > 0) {
        const addedLine = trulyAddedLines[trulyAddedLines.length - 1].line
        const [name, icon, cover, restype, tags, devices, path, paid_type] = addedLine.split(',')
        return {
          appName: name || '',
          iconUrl: icon || '',
          previewUrl: cover || '',
          type: restype || '',
          tags: tags || '',
          supportedDevices: devices || '',
          resourceFile: path || '',
          paidType: paid_type || ''
        }
      }
    }
  } catch (error: unknown) {
    console.error('解析CSV失败:', error)
    errorMessage.value = `解析CSV失败: ${getErrorMessage(error)}`
  }
  return null
}

const analyzeResourceFile = async (content: string): Promise<ResourceChange | null> => {
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content
    return {
      manifest_ver: json.manifest_ver || 1,
      repo_url: json.repo_url || '',
      ...json
    }
  } catch (error: unknown) {
    console.error('JSON解析失败:', error)
    errorMessage.value = `JSON解析失败: ${getErrorMessage(error)}`
    return null
  }
}

const fetchRepoManifest = async (repoUrl: string) => {
  try {
    const repoPath = repoUrl.replace('https://github.com/', '')
    const [owner, repo] = repoPath.split('/')
    
    console.log(`获取仓库manifest: ${owner}/${repo}`)
    
    // 尝试多种获取方式
    const attempts = [
      fetchViaGitHubAPI(owner, repo),
      fetchViaRaw(owner, repo, 'main'),
      fetchViaRaw(owner, repo, 'master'),
      fetchViaRaw(owner, repo, 'HEAD')
    ]

    for (const attempt of attempts) {
      try {
        manifestData.value = await attempt
        if (manifestData.value) return
      } catch (error) {
        console.warn(`获取manifest方式失败: ${getErrorMessage(error)}`)
      }
    }

    throw new Error('所有获取manifest的方案都失败了')
  } catch (error: unknown) {
    console.error('获取manifest.json失败:', error)
    errorMessage.value = `获取manifest.json失败: ${getErrorMessage(error)}`
    manifestData.value = createDefaultManifest()
  }
}

const fetchViaGitHubAPI = async (owner: string, repo: string): Promise<ManifestData> => {
  try {
    const { data } = await api.get(`/repos/${owner}/${repo}/contents/manifest.json`, {
      headers: {
        Accept: 'application/vnd.github.v3.raw'
      }
    })
    
    let manifestContent
    if (typeof data === 'string') {
      manifestContent = JSON.parse(data)
    } else if (data.content) {
      manifestContent = JSON.parse(atob(data.content.replace(/\n/g, '')))
    } else {
      manifestContent = data
    }
    
    return processManifestData(manifestContent)
  } catch (error: unknown) {
    throw new Error(`GitHub API方式失败: ${getErrorMessage(error)}`)
  }
}

const fetchViaRaw = async (owner: string, repo: string, branch: string): Promise<ManifestData> => {
  try {
    const { data } = await axios.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/manifest.json`,
      { timeout: 10000 }
    )
    return processManifestData(data)
  } catch (error: unknown) {
    throw new Error(`raw ${branch}方式失败: ${getErrorMessage(error)}`)
  }
}

const processManifestData = (manifest: any): ManifestData => {
  try {
    return {
      item: {
        name: safeDecode(manifest?.item?.name || ''),
        description: safeDecode(manifest?.item?.description || ''),
        preview: manifest?.item?.preview || [],
        icon: manifest?.item?.icon || '',
        source_url: manifest?.item?.source_url || '',
        author: (manifest?.item?.author || []).map((a: any) => ({
          name: safeDecode(a.name || ''),
          author_url: a.author_url || ''
        }))
      },
      downloads: manifest?.downloads || {}
    }
  } catch (error: unknown) {
    console.error('处理manifest数据失败:', error)
    throw error
  }
}

const createDefaultManifest = (): ManifestData => ({
  item: {
    name: '获取失败',
    description: '无法加载manifest.json',
    preview: [],
    icon: '',
    source_url: '',
    author: []
  },
  downloads: {}
})

const safeDecode = (str: string): string => {
  try {
    return decodeURIComponent(escape(str))
  } catch {
    return str
  }
}

const getFullImageUrl = (relativePath: string): string => {
  if (!repoData.value?.repo_url || !relativePath) return ''
  const repoPath = repoData.value.repo_url.replace('https://github.com/', '')
  return `https://raw.githubusercontent.com/${repoPath}/main/${relativePath}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

defineEmits(['refresh'])
</script>

<style scoped>
.code-review-container {
  display: flex;
  height: 100vh;
  position: relative;
  overflow: auto;
}

.notice-list {
  text-align: left;
  margin: 0;
  padding-left: 1.5rem;
  color: hsl(var(--muted-foreground));
}

.notice-list li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.hint-text {
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
  font-weight: normal;
  margin: 0;
}

.main-content {
  margin-left: 320px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
  transition: margin-left 0.3s ease;
}

.sidebar-collapsed ~ .main-content {
  margin-left: 100px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: hsl(var(--muted-foreground));
  gap: 1rem;
}

.empty-state h3 {
  margin: 0;
  font-weight: 500;
  text-align: center;
}

.loading {
  padding: 16px;
  text-align: center;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

.error-banner {
  padding: 0.85rem 1rem;
  background: color-mix(in srgb, var(--destructive) 12%, var(--card));
  color: var(--foreground);
  border: 1px solid color-mix(in srgb, var(--destructive) 35%, var(--border));
  border-radius: 0.7rem;
  margin-bottom: 1rem;
  line-height: 1.5;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 280px;
  }
  
  .sidebar-collapsed ~ .main-content {
    margin-left: 80px;
  }
}
</style>
