// src/utils/githubClient.ts
import axios, { 
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError,
  AxiosHeaders
} from 'axios'

// 浏览器端仅从 Vite 环境变量读取 token，避免混用 Node 侧变量
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GITHUB_API_URL = 'https://api.github.com'

const createGitHubClient = (): AxiosInstance => {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub Token未配置')
  }

  const client = axios.create({
    baseURL: GITHUB_API_URL,
    timeout: 15000,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
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
