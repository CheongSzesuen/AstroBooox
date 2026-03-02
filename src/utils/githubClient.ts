import { createGitHubClient as createOctokitClient } from '@/utils/githubOctokitClient'

// 浏览器端仅从 Vite 环境变量读取 token，避免混用 Node 侧变量
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.trim() ?? ''

export const hasGithubToken = GITHUB_TOKEN.length > 0

export const githubTokenSetupHint =
  '未检测到 VITE_GITHUB_TOKEN。请在项目根目录创建 .env.local 并添加 VITE_GITHUB_TOKEN=你的token，然后重启 npm run dev。'

export const createGitHubClient = () => createOctokitClient(GITHUB_TOKEN)

// 保留历史导出名，避免旧代码引用时报错
export const api = createGitHubClient().rest
