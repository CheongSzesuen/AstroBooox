export interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

export interface PullRequest {
  id: number
  number: number
  title: string
  user: GitHubUser
  created_at: string
  html_url: string
  head: {
    sha: string
    label: string
  }
  base: {
    label: string
  }
  commits?: number
  state: string
}

export interface FileChange {
  filename: string
  status: string
  changes: number
  patch?: string
  contents_url: string
}

export interface CSVChange {
  appName: string
  iconUrl: string
  previewUrl: string
  type: string
  tags: string
  supportedDevices: string
  resourceFile: string
  paidType: string
}

export interface ResourceChange {
  manifest_ver: number
  repo_url: string
}

export interface AnalyzedData {
  csvChange?: CSVChange
  resourceChange?: ResourceChange
}

export interface ManifestAuthor {
  name: string
  author_url: string
}

export interface ManifestItem {
  name: string
  description: string
  preview: string[]
  icon: string
  source_url: string
  author: ManifestAuthor[]
}

export interface ManifestDownload {
  version: string
  file_name: string
}

export interface ManifestData {
  item: ManifestItem
  downloads: Record<string, ManifestDownload>
}

export interface RepoData {
  repo_url: string
}

export type TabType = 'files' | 'analysis'

// 组件 Props 类型
export interface PRTabsProps {
  activeTab: TabType
  analyzedData: AnalyzedData | null
  changedFiles: FileChange[]
}

export interface FilesTabContentProps {
  changedFiles: FileChange[]
}

export interface AnalysisTabContentProps {
  analyzedData: AnalyzedData | null
  repoData: RepoData | null
  manifestData: ManifestData | null
}