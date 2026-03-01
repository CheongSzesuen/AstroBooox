// src/utils/githubClient.ts
import axios, { 
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError
} from 'axios'

// 浏览器端仅从 Vite 环境变量读取 token，避免混用 Node 侧变量
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''
const GITHUB_API_URL = 'https://api.github.com'
export const hasGithubToken = GITHUB_TOKEN.length > 0

export const githubTokenSetupHint =
  '未检测到 VITE_GITHUB_TOKEN。请在项目根目录创建 .env.local 并添加 VITE_GITHUB_TOKEN=你的token，然后重启 npm run dev。'

const createGitHubClient = (): AxiosInstance => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  if (hasGithubToken) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`
  }

  const client = axios.create({
    baseURL: GITHUB_API_URL,
    timeout: 15000,
    headers
  })

  // 添加请求拦截器
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    console.log('请求GitHub API:', config.url) // 调试日志
    return config
  })

  // 添加响应拦截器
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      console.log('GitHub API响应:', response.status, response.config.url) // 调试日志
      return response
    },
    (error: AxiosError) => {
      console.error('GitHub API错误:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message
      })
      throw error
    }
  )

  return client
}

export const api = createGitHubClient()
