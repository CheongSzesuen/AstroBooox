<template>
  <div class="code-review-container">
    <!-- 功能说明弹窗 -->
    <div v-if="showFeatureNotice" class="feature-notice">
      <div class="notice-content">
        <div class="notice-header">
          <svg width="48" height="48" viewBox="0 0 24 24" class="info-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#3b82f6"/>
          </svg>
          <h3>功能说明</h3>
        </div>
        <div class="notice-body">
          <p>目前版本为基础版本，更方便的功能还在更新</p>
          <ul class="notice-list">
            <li>手机端响应有问题</li>
            <li>自动检验pr数据未做</li>
            <li>后续会持续更新优化</li>
          </ul>
          <p class="hint-text">如有任何建议或发现问题，欢迎提交Issue或直接联系我</p>
        </div>
        <div class="notice-actions">
          <button class="confirm-button" @click="closeFeatureNotice">
            <svg width="20" height="20" viewBox="0 0 24 24" class="check-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
            我知道了
          </button>
          <a href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" class="issue-link">
            <svg width="20" height="20" viewBox="0 0 24 24" class="github-icon">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.09.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.091-.644.349-1.085.635-1.334-2.214-.253-4.542-1.11-4.542-4.937 0-1.091.39-1.984 1.029-2.683-.103-.254-.447-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.837-2.332 4.682-4.552 4.93.359.309.678.917.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48A10.017 10.017 0 0022 12c0-5.523-4.477-10-10-10z" fill="currentColor"/>
            </svg>
            提交反馈
          </a>
        </div>
      </div>
    </div>

    <!-- 悬浮卡片式侧边栏 -->
    <div class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <div class="sidebar-header">
        <h2 v-if="!isSidebarCollapsed">PR列表</h2>
      </div>
      
      <div v-if="loadingPRs" class="loading">加载PR列表中...</div>
      <div v-else-if="pullRequests.length === 0" class="empty-state">
        <p>没有找到Pull Request</p>
        <button @click="fetchPullRequests" class="refresh-btn">重试</button>
      </div>
      <div v-else class="pr-list">
        <div 
          v-for="pr in pullRequests" 
          :key="pr.id"
          class="pr-item"
          :class="{ active: selectedPR && pr.id === selectedPR.id }"
          @click="selectPR(pr)"
        >
          <div class="avatar-container">
            <img :src="pr.user.avatar_url" class="pr-avatar" />
          </div>
          <div class="pr-info" v-if="!isSidebarCollapsed">
            <div class="pr-title">#{{ pr.number }} {{ pr.title }}</div>
            <div class="pr-meta">
              <span class="pr-author">by {{ pr.user.login }}</span>
              <span class="pr-date">{{ formatDate(pr.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 底部切换按钮区域 -->
      <div class="sidebar-footer" @click="toggleSidebar">
        <div class="toggle-area">
          <svg class="arrow-icon" viewBox="0 0 24 24">
            <path 
              :d="isSidebarCollapsed ? 'M9 18L15 12L9 6' : 'M15 18L9 12L15 6'" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <div v-if="!selectedPR" class="empty-state">
        <h3>请从左侧选择一个Pull Request进行审查</h3>
      </div>

      <div v-else>
        <div class="pr-header">
          <h2>#{{ selectedPR.number }} {{ selectedPR.title }}</h2>
          <div class="pr-actions">
            <button @click="fetchPRDetails" class="refresh-btn">
              刷新数据
            </button>
          </div>
        </div>

        <div v-if="loadingDetails" class="loading">加载PR详情中...</div>

        <div v-else>
          <div class="section">
            <h3>变更的文件</h3>
            <div class="file-changes">
              <div v-for="file in changedFiles" :key="file.filename" class="file-item">
                <div class="file-name">{{ file.filename }}</div>
                <div class="file-status">{{ file.status }} ({{ file.changes }} changes)</div>
              </div>
            </div>
          </div>

          <div v-if="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div v-if="analyzedData" class="analysis-results">
            <div class="analysis-section">
              <h3>PR变更分析</h3>
              
              <div v-if="analyzedData.csvChange" class="csv-analysis">
                <h4>CSV变更</h4>
                <div class="form-layout">
                  <div class="form-row">
                    <div class="form-label">资源名:</div>
                    <div class="form-value">{{ analyzedData.csvChange.appName || '未提供' }}</div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">图标:</div>
                    <div class="form-value">
                      <a v-if="analyzedData.csvChange.iconUrl" :href="analyzedData.csvChange.iconUrl" target="_blank" class="resource-link">
                        {{ analyzedData.csvChange.iconUrl }}
                      </a>
                      <span v-else>未提供</span>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">头图:</div>
                    <div class="form-value">
                      <a v-if="analyzedData.csvChange.previewUrl" :href="analyzedData.csvChange.previewUrl" target="_blank" class="resource-link">
                        {{ analyzedData.csvChange.previewUrl }}
                      </a>
                      <span v-else>未提供</span>
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">类型:</div>
                    <div class="form-value">{{ analyzedData.csvChange.type || '未提供' }}</div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">标签:</div>
                    <div class="form-value">{{ analyzedData.csvChange.tags || '未提供' }}</div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">支持设备:</div>
                    <div class="form-value">{{ analyzedData.csvChange.supportedDevices || '未提供' }}</div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">JSON路径:</div>
                    <div class="form-value">{{ analyzedData.csvChange.resourceFile || '未提供' }}</div>
                  </div>
                  <div class="form-row">
                    <div class="form-label">付费类型:</div>
                    <div class="form-value">{{ analyzedData.csvChange.paidType || '未提供' }}</div>
                  </div>
                </div>
              </div>

              <div v-if="analyzedData.resourceChange" class="resource-analysis">
                <h4>资源文件变更</h4>
                <div class="json-viewer">
                  <pre>{{ JSON.stringify(analyzedData.resourceChange, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <div v-if="repoData" class="analysis-section">
              <h3>仓库信息分析</h3>
              <div class="repo-info">
                <div class="form-row">
                  <div class="form-label">仓库URL:</div>
                  <div class="form-value">
                    <a v-if="repoData.repo_url" :href="repoData.repo_url" target="_blank" class="resource-link">
                      {{ repoData.repo_url }}
                    </a>
                    <span v-else>未提供</span>
                  </div>
                </div>
                
                <div v-if="manifestData" class="manifest-info">
                  <h4>Manifest 内容</h4>
                  <div class="form-layout">
                    <div class="form-row">
                      <div class="form-label">应用名称:</div>
                      <div class="form-value">{{ manifestData.item.name || '未提供' }}</div>
                    </div>
                    <div class="form-row">
                      <div class="form-label">描述:</div>
                      <div class="form-value">{{ manifestData.item.description || '未提供' }}</div>
                    </div>
                    <div class="form-row">
                      <div class="form-label">作者:</div>
                      <div class="form-value">
                        <template v-if="manifestData.item.author?.length">
                          <a v-for="author in manifestData.item.author" 
                            :key="author.name"
                            :href="author.author_url" 
                            target="_blank"
                            class="author-link">
                            {{ author.name || '匿名作者' }}
                          </a>
                        </template>
                        <span v-else>未提供</span>
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-label">支持的设备:</div>
                      <div class="form-value">
                        <template v-if="manifestData.downloads && Object.keys(manifestData.downloads).length">
                          <span v-for="(device, index) in Object.keys(manifestData.downloads)" :key="device">
                            {{ device }}{{ index < Object.keys(manifestData.downloads).length - 1 ? ', ' : '' }}
                          </span>
                        </template>
                        <span v-else>未提供</span>
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-label">图标:</div>
                      <div class="form-value">
                        <a v-if="manifestData.item.icon" :href="getFullImageUrl(manifestData.item.icon)" target="_blank" class="resource-link">
                          {{ manifestData.item.icon }}
                        </a>
                        <span v-else>未提供</span>
                      </div>
                    </div>
                    <div class="form-row">
                      <div class="form-label">预览图:</div>
                      <div class="form-value">
                        <template v-if="manifestData.item.preview?.length">
                          <div v-for="preview in manifestData.item.preview" :key="preview">
                            <a :href="getFullImageUrl(preview)" target="_blank" class="resource-link">
                              {{ preview }}
                            </a>
                          </div>
                        </template>
                        <span v-else>未提供</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="error">
                  无法获取或解析manifest.json文件
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios, { 
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError,
  AxiosHeaders
} from 'axios'
import { api } from '../utils/githubClient'

// 类型定义
interface GitHubUser {
  login: string
  avatar_url: string
}

interface PullRequest {
  id: number
  number: number
  title: string
  user: GitHubUser
  created_at: string
  html_url: string
  head: {
    sha: string
  }
}

interface FileChange {
  filename: string
  status: string
  changes: number
  patch?: string
  contents_url: string
}

interface CSVChange {
  appName: string
  iconUrl: string
  previewUrl: string
  type: string
  tags: string
  supportedDevices: string
  resourceFile: string
  paidType: string
}

interface ResourceChange {
  manifest_ver: number
  repo_url: string
}

interface AnalyzedData {
  csvChange?: CSVChange
  resourceChange?: ResourceChange
}

interface ManifestAuthor {
  name: string
  author_url: string
}

interface ManifestItem {
  name: string
  description: string
  preview: string[]
  icon: string
  source_url: string
  author: ManifestAuthor[]
}

interface ManifestDownload {
  version: string
  file_name: string
}

interface ManifestData {
  item: ManifestItem
  downloads: Record<string, ManifestDownload>
}

// 常量定义
const REPO_OWNER = 'AstralSightStudios'
const REPO_NAME = 'AstroBox-Repo'
const DEFAULT_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// 响应式状态
const pullRequests = ref<PullRequest[]>([])
const selectedPR = ref<PullRequest | null>(null)
const changedFiles = ref<FileChange[]>([])
const analyzedData = ref<AnalyzedData | null>(null)
const repoData = ref<ResourceChange | null>(null)
const manifestData = ref<ManifestData | null>(null)
const loadingPRs = ref(false)
const loadingDetails = ref(false)
const errorMessage = ref('')
const isSidebarCollapsed = ref(false)
const isFirstSelection = ref(true)
const showFeatureNotice = ref(true)

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

// 监控速率限制状态
const monitorRateLimit = (rateLimit: {limit: number, remaining: number, reset: number}) => {
  const { remaining, limit, reset } = rateLimit
  const resetTime = new Date(reset * 1000).toLocaleTimeString()
  
  if (remaining < 100) {
    console.warn(`Rate limit warning: ${remaining}/${limit} remaining (resets at ${resetTime})`)
  }
  
  if (remaining === 0) {
    throw new Error(`Rate limit reached (resets at ${resetTime})`)
  }
}

onMounted(() => {
  fetchPullRequests()
})

const fetchPullRequests = async () => {
  loadingPRs.value = true
  errorMessage.value = ''
  
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
        avatar_url: pr.user?.avatar_url || ''
      },
      created_at: pr.created_at,
      html_url: pr.html_url,
      head: {
        sha: pr.head?.sha || ''
      }
    }))
  } catch (error: unknown) {
    console.error('获取PR列表失败:', error)
    
    // 修复类型错误
    if (isAxiosError(error)) {
      const errorData = error.response?.data as { message?: string } || {}
      if (error.response?.status === 401) {
        errorMessage.value = 'GitHub认证失败，请检查Token是否有效'
      } else if (error.response?.status === 404) {
        errorMessage.value = `仓库不存在: ${REPO_OWNER}/${REPO_NAME}`
      } else {
        errorMessage.value = `获取PR列表失败: ${errorData.message || error.message}`
      }
    } else if (error instanceof Error) {
      errorMessage.value = `获取PR列表失败: ${error.message}`
    } else {
      errorMessage.value = '获取PR列表失败: 未知错误'
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
</script>

<style scoped>
/* 基础布局 */
.code-review-container {
  display: flex;
  height: 100vh;
  position: relative;
  overflow: auto;
}

/* 功能通知弹窗样式 */
.feature-notice {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 900;
  padding: 1rem;
}

.notice-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: calc(100% - 2rem);
  max-width: 500px;
  overflow: hidden;
}

.notice-header {
  background: #f8fafc;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.info-icon {
  background: #e0e7ff;
  padding: 0.75rem;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}

.notice-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}

.notice-body {
  padding: 1.5rem;
  text-align: center;
}

.notice-body p {
  margin: 0 0 1rem;
  color: #475569;
  line-height: 1.5;
}

.notice-list {
  text-align: left;
  margin: 1rem auto;
  padding-left: 1.5rem;
  color: #475569;
}

.notice-list li {
  margin-bottom: 0.5rem;
}

.hint-text {
  color: #64748b;
  font-size: 0.875rem;
}

.notice-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.confirm-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-button:hover {
  background: #2563eb;
}

.issue-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  background: #f3f4f6;
  color: #1f2937;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.issue-link:hover {
  background: #e5e7eb;
}

.github-icon {
  width: 20px;
  height: 20px;
}

/* 悬浮卡片式侧边栏 */
.sidebar {
  position: fixed;
  top: 60px;
  bottom: 20px;
  left: 20px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 12px;
  z-index: 100;
  transition: all 0.3s ease;
  overflow-x: hidden;
  overflow-y: overlay;
}

/* 自定义滚动条样式 */
.sidebar::-webkit-scrollbar {
  width: 8px;
  background-color: transparent;
}

.sidebar::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.sidebar-collapsed {
  width: 60px;
}

/* 侧边栏头部 */
.sidebar-header {
  padding: 8px 12px;
  margin-bottom: 12px;
}

.sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* PR列表 */
.pr-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  margin-right: -8px;
}

/* PR项 */
.pr-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.pr-item:hover {
  background-color: #f3f4f6;
}

.pr-item.active {
  background-color: #dbeafe;
  border-left: 3px solid #3b82f6;
}

/* 头像容器 */
.avatar-container {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 头像样式 */
.pr-avatar {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  transition: all 0.3s ease;
}

.sidebar-collapsed .pr-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

/* PR信息 */
.pr-info {
  margin-left: 12px;
  flex: 1;
  min-width: 0;
}

.pr-title {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.pr-meta {
  display: flex;
  font-size: 14px;
  color: #6b7280;
}

.pr-author {
  margin-right: 8px;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 12px 0;
  border-top: 1px solid #f3f4f6;
  cursor: pointer;
}

.toggle-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.toggle-area:hover {
  background-color: #f3f4f6;
}

/* 箭头图标 */
.arrow-icon {
  width: 24px;
  height: 24px;
}

/* 主内容区 */
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

/* 加载状态 */
.loading {
  padding: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #6b7280;
  gap: 1rem;
}

/* PR头部 */
.pr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

/* 文件变更 */
.file-changes {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  flex: 1;
  font-family: 'Courier New', monospace;
}

.file-status {
  margin: 0 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

/* 分析结果 */
.analysis-results {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.analysis-section {
  flex: 1;
  min-width: 400px;
}

/* 表单布局 */
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.form-row {
  display: flex;
  align-items: flex-start;
}

.form-label {
  font-weight: 500;
  min-width: 120px;
  padding-right: 1rem;
}

.form-value {
  flex: 1;
}

/* 链接样式 */
.resource-link {
  color: #3b82f6;
  text-decoration: none;
  word-break: break-all;
}

.resource-link:hover {
  text-decoration: underline;
}

.author-link {
  color: #3b82f6;
  text-decoration: none;
  margin-right: 0.5rem;
}

.author-link:hover {
  text-decoration: underline;
}

/* JSON查看器 */
.json-viewer {
  background-color: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
  overflow-x: auto;
}

/* 错误信息 */
.error-message {
  padding: 1rem;
  background-color: #fee2e2;
  color: #dc2626;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* 刷新按钮 */
.refresh-btn {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #2563eb;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .sidebar {
    width: 260px;
    left: 10px;
  }
  
  .main-content {
    margin-left: 280px;
  }
  
  .sidebar-collapsed ~ .main-content {
    margin-left: 80px;
  }
  
  .analysis-section {
    min-width: 100%;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .form-label {
    min-width: auto;
  }
}

@media (max-width: 640px) {
  .notice-content {
    width: calc(100% - 1rem);
  }
  
  .notice-header {
    padding: 1rem;
  }
  
  .notice-body {
    padding: 1rem;
  }
  
  .notice-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .confirm-button,
  .issue-link {
    width: 100%;
    justify-content: center;
  }
}
</style>