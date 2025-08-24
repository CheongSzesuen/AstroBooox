// src/utils/githubClient.ts
import axios, { 
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError,
  AxiosHeaders
} from 'axios'

// 类型定义
interface GitHubApiError {
  status?: number
  message?: string
  documentation_url?: string
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}

// 扩展 Axios 类型 - 统一声明为必选属性
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retryCount: number
  }
}

const GITHUB_API_URL = 'https://api.github.com'
const DEFAULT_TIMEOUT = 15000
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

/**
 * 监控速率限制状态
 */
const monitorRateLimit = (rateLimit: RateLimitInfo): void => {
  const { remaining, limit, reset } = rateLimit
  const resetTime = new Date(reset * 1000).toLocaleTimeString()
  
  if (remaining < 100) {
    console.warn(`GitHub API rate limit warning: ${remaining}/${limit} remaining (resets at ${resetTime})`)
  }
  
  if (remaining === 0) {
    throw new Error(`GitHub API rate limit reached (resets at ${resetTime})`)
  }
}

/**
 * 创建安全的 GitHub API 客户端
 */
export const createGitHubClient = (token: string): AxiosInstance => {
  const client = axios.create({
    baseURL: GITHUB_API_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  // 请求拦截器
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 确保 _retryCount 有默认值
    config._retryCount = config._retryCount ?? 0
    
    // 确保 headers 存在
    config.headers = config.headers || new AxiosHeaders()

    // 注入Token
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    return config
  })

  // 响应拦截器
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // 记录速率限制状态
      if (response.headers['x-ratelimit-limit']) {
        monitorRateLimit({
          limit: parseInt(response.headers['x-ratelimit-limit']),
          remaining: parseInt(response.headers['x-ratelimit-remaining']),
          reset: parseInt(response.headers['x-ratelimit-reset'])
        })
      }
      return response
    },
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & { _retryCount: number }
      const status = error.response?.status
      const errorData: GitHubApiError = error.response?.data || {}
      
      // 确保 _retryCount 存在
      config._retryCount = config._retryCount ?? 0

      // 认证失败
      if (status === 401) {
        console.error('GitHub authentication failed:', errorData.message)
        throw new Error('Invalid or expired GitHub token')
      }
      
      // 速率限制
      if (status === 403 && errorData.message?.includes('API rate limit exceeded')) {
        if (config._retryCount < MAX_RETRIES) {
          config._retryCount++
          await new Promise(resolve => setTimeout(
            resolve, 
            RETRY_DELAY * config._retryCount
          ))
          return client(config)
        }
        throw new Error(`API rate limit exceeded (after ${MAX_RETRIES} retries)`)
      }
      
      // 资源不存在
      if (status === 404) {
        console.error('Resource not found:', config.url)
        throw new Error(`GitHub resource not found: ${errorData.message || 'Unknown error'}`)
      }
      
      // 其他错误
      console.error('GitHub API request failed:', {
        url: config.url,
        status,
        message: errorData.message,
        documentation: errorData.documentation_url
      })
      
      throw new Error(errorData.message || 'GitHub API request failed')
    }
  )

  return client
}

/**
 * 全局GitHub客户端实例
 */
export const githubClient = createGitHubClient(
  process.env.GITHUB_TOKEN || import.meta.env.VITE_GITHUB_TOKEN || ''
)

// 开发环境安全警告
if (import.meta.env.DEV && !import.meta.env.VITE_GITHUB_TOKEN) {
  console.warn('Development mode: No GitHub token detected, some features may be limited')
}