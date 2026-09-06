import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'
import {
  buildClientInfo,
  buildCreateSubmissionRequest,
  buildEditSubmissionRequest,
  buildSubmissionCsv,
  buildSubmissionPath,
  buildSubmissionRequest,
  canonicalCatalogEntryDigest,
  isSubmissionCsvFilePath,
  isSubmissionFilePath,
  parseSubmissionRequestJson,
  parseSubmissionCsv,
  submissionCsvPath,
  submissionRequestPath,
  type CatalogWriteIntent,
  type SubmissionRequest
} from '@/cc/submission-protocol'

export type ReviewState = 'waiting_review' | 'changes_requested' | 'fixed_waiting'

export interface CatalogEntry {
  id: string
  name: string
  restype: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  icon: string
  cover: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
}

export interface PublishingResource {
  id: string
  name: string
  restype: string
  status: ReviewState
  unresolvedTagCount: number
  unresolvedTagIds: string[]
  createdAt: string
  prNumber: number
  prTitle: string
  prUrl: string
  prAuthor?: string
  prAuthorAvatar?: string
}

export interface PullRequestIssueComment {
  id: number
  body: string
  html_url: string
  created_at: string
  user?: {
    login?: string
    avatar_url?: string
    html_url?: string
  }
}

export interface CollaboratorPermissionRequest {
  requestId: string
  prNumber: number
  prTitle: string
  prUrl: string
  requester: string
  targetUser: string
  repoOwner: string
  repoName: string
  resourceName: string
  resourceId: string
  commentId: number
  commentHtmlUrl: string
  createdAt: string
}

export interface RepoFileData {
  sha: string
  content?: string
}

export interface OwnedResourceEntry {
  source: 'v1' | 'v2'
  key: string
  catalogId: string
  name: string
  restype: string
  icon: string
  cover: string
  repo_owner: string
  repo_name: string
  repo_commit_hash: string
  description: string
  tags: string
  device_vendors: string
  devices: string
  paid_type: string
  commitDate: string
  v2NeedsFollowUp: boolean
}

export interface OwnedResourceDetail {
  owner: string
  repo: string
  v1Ref: string
  v2Ref: string
  v1ManifestPath: string
  v2ManifestPath: string
  v1ManifestText: string
  v2ManifestText: string
  defaultBranch: string
  latestCommitSha: string
  latestCommitDate: string
  isV2HashLatest: boolean | null
}

export interface RepoTreeItem {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

interface GitHubApiError extends Error {
  status?: number
}

const CATALOG_CSV_HEADER =
  'id,name,restype,repo_owner,repo_name,repo_commit_hash,icon,cover,tags,device_vendors,devices,paid_type'

const makeError = (status: number, message: string): GitHubApiError => {
  const error = new Error(message) as GitHubApiError
  error.status = status
  return error
}

const githubFetch = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const { rest } = createGitHubClient(token)
  const method = (init?.method || 'GET').toUpperCase()
  let data: unknown = undefined
  if (typeof init?.body === 'string') {
    try {
      data = JSON.parse(init.body)
    } catch {
      data = init.body
    }
  } else if (init?.body !== undefined) {
    data = init.body
  }

  try {
    const response = await rest.request(`${method} ${path}`, {
      ...(data !== undefined ? { data } : {})
    })
    return response.data as T
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw makeError(normalized.status || 500, normalized.message)
  }
}

const encodePath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')

const buildFlatTreeFromFilePaths = (filePaths: string[]): RepoTreeItem[] => {
  type FolderNode = {
    folders: Map<string, FolderNode>
    files: Set<string>
  }

  const root: FolderNode = {
    folders: new Map(),
    files: new Set()
  }

  for (const path of filePaths) {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) continue

    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i]
      if (!current.folders.has(segment)) {
        current.folders.set(segment, { folders: new Map(), files: new Set() })
      }
      current = current.folders.get(segment) as FolderNode
    }
    current.files.add(parts[parts.length - 1])
  }

  const output: RepoTreeItem[] = []
  const walk = (node: FolderNode, depth: number, prefix: string): void => {
    const folderNames = [...node.folders.keys()].sort((a, b) => a.localeCompare(b, 'zh-CN'))
    const fileNames = [...node.files].sort((a, b) => a.localeCompare(b, 'zh-CN'))

    for (const folderName of folderNames) {
      const path = prefix ? `${prefix}/${folderName}` : folderName
      output.push({
        type: 'folder',
        path,
        label: folderName,
        depth
      })
      walk(node.folders.get(folderName) as FolderNode, depth + 1, path)
    }

    for (const fileName of fileNames) {
      const path = prefix ? `${prefix}/${fileName}` : fileName
      output.push({
        type: 'file',
        path,
        label: fileName,
        depth
      })
    }
  }

  walk(root, 0, '')
  return output
}

export const textToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export const base64ToText = (base64Text: string): string => {
  const normalized = base64Text.replace(/\n/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

export const parseCatalogCsv = (csv: string): CatalogEntry[] => {
  const rows = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  if (rows.length === 0) return []

  const body = rows.slice(1)
  const entries: CatalogEntry[] = []

  for (const row of body) {
    const cols = splitCsvLine(row)
    if (cols.length < 12) continue

    entries.push({
      id: cols[0],
      name: cols[1],
      restype: cols[2],
      repo_owner: cols[3],
      repo_name: cols[4],
      repo_commit_hash: cols[5],
      icon: cols[6],
      cover: cols[7],
      tags: cols[8],
      device_vendors: cols[9],
      devices: cols[10],
      paid_type: cols[11] ?? ''
    })
  }

  return entries
}

const parseCatalogRow = (row: string): CatalogEntry | null => {
  const parsed = parseCatalogCsv(`${CATALOG_CSV_HEADER}\n${row}`)
  return parsed[0] || null
}

const getResourceDescriptionFromManifestText = (text: string): string => {
  try {
    const parsed = JSON.parse(text) as {
      description?: unknown
      item?: {
        description?: unknown
      }
    }
    const byItem = typeof parsed?.item?.description === 'string' ? parsed.item.description.trim() : ''
    if (byItem) return byItem
    const byRoot = typeof parsed?.description === 'string' ? parsed.description.trim() : ''
    return byRoot
  } catch {
    return ''
  }
}

const loadRepoDescription = async (params: {
  token: string
  owner: string
  repo: string
  ref: string
}): Promise<string> => {
  const { token, owner, repo, ref } = params
  const candidates = ['manifest_v2.json', 'manifest.json']
  for (const filePath of candidates) {
    const file = await fetchRepoFileOrNull(token, owner, repo, filePath, ref)
    if (!file?.content) continue
    const text = base64ToText(file.content)
    const description = getResourceDescriptionFromManifestText(text)
    if (description) return description
  }
  return ''
}

const normalizeVersionToNumbers = (raw: string): number[] => {
  const cleaned = raw.trim().replace(/^[^0-9]*/, '')
  if (!cleaned) return [0]
  return cleaned
    .split('.')
    .map(part => {
      const matched = part.match(/\d+/)
      return matched ? Number(matched[0]) : 0
    })
}

const compareVersion = (a: string, b: string): number => {
  const left = normalizeVersionToNumbers(a)
  const right = normalizeVersionToNumbers(b)
  const maxLength = Math.max(left.length, right.length)
  for (let i = 0; i < maxLength; i++) {
    const l = left[i] ?? 0
    const r = right[i] ?? 0
    if (l > r) return 1
    if (l < r) return -1
  }
  return 0
}

const getMaxVersion = (downloads: Array<{ version: string }>): string =>
  downloads.reduce((max, item) => (compareVersion(item.version, max) > 0 ? item.version : max), '0')

const parseManifestDownloads = (text: string): Array<{ version: string; file_name: string }> => {
  try {
    const parsed = JSON.parse(text) as {
      downloads?: Record<string, { version?: unknown; file_name?: unknown }>
      ext?: {
        downloads?: Record<string, { version?: unknown; file_name?: unknown }>
      }
    }
    const downloads = Object.keys(parsed.downloads || {}).length > 0 ? parsed.downloads || {} : (parsed.ext?.downloads || {})
    return Object.values(downloads).map(item => ({
      version: typeof item?.version === 'string' ? item.version.trim() : '',
      file_name: typeof item?.file_name === 'string' ? item.file_name.trim() : ''
    }))
  } catch {
    return []
  }
}

const detectV2NeedsFollowUp = (manifestV2Text: string, manifestV1Text: string): boolean => {
  const v2Downloads = parseManifestDownloads(manifestV2Text)
  const v1Downloads = parseManifestDownloads(manifestV1Text)
  if (v1Downloads.length === 0) return false
  if (v2Downloads.length === 0) return true

  const v2PairSet = new Set(v2Downloads.map(item => `${item.file_name}|${item.version}`))
  const hasMissingPair = v1Downloads.some(item => !v2PairSet.has(`${item.file_name}|${item.version}`))
  if (hasMissingPair) return true

  const maxV1 = getMaxVersion(v1Downloads)
  const maxV2 = getMaxVersion(v2Downloads)
  return compareVersion(maxV1, maxV2) > 0
}

const loadV2FollowUpStatus = async (params: {
  token: string
  owner: string
  repo: string
  ref: string
}): Promise<boolean> => {
  const { token, owner, repo, ref } = params
  const [manifestV2File, manifestV1File] = await Promise.all([
    fetchRepoFileOrNull(token, owner, repo, 'manifest_v2.json', ref),
    fetchRepoFileOrNull(token, owner, repo, 'manifest.json', ref)
  ])
  const manifestV2Text = manifestV2File?.content ? base64ToText(manifestV2File.content) : ''
  const manifestV1Text = manifestV1File?.content ? base64ToText(manifestV1File.content) : ''
  if (!manifestV1Text) return false
  return detectV2NeedsFollowUp(manifestV2Text, manifestV1Text)
}

const loadCommitDate = async (params: {
  token: string
  owner: string
  repo: string
  ref: string
}): Promise<string> => {
  const { token, owner, repo, ref } = params
  try {
    const data = await githubFetch<{
      commit?: {
        committer?: { date?: string }
        author?: { date?: string }
      }
    }>(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`, token)
    return data.commit?.committer?.date || data.commit?.author?.date || ''
  } catch {
    return ''
  }
}

export const fetchRepoFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<RepoFileData> => {
  const encoded = encodePath(path)
  return githubFetch<RepoFileData & { content?: string }>(
    `/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,
    token
  )
}

export const fetchRepoFileOrNull = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<RepoFileData | null> => {
  try {
    return await fetchRepoFile(token, owner, repo, path, ref)
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status === 404) {
      return null
    }
    throw error
  }
}

export const repoPathExists = async (params: {
  token: string
  owner: string
  repo: string
  path: string
  ref: string
}): Promise<boolean> => {
  const { token, owner, repo, path, ref } = params
  try {
    await githubFetch<unknown>(
      `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
      token
    )
    return true
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status === 404) return false
    throw error
  }
}

export const putRepoFile = async (params: {
  token: string
  owner: string
  repo: string
  path: string
  branch: string
  message: string
  contentBase64: string
  sha?: string
}): Promise<{ commit: { sha: string; html_url: string } }> => {
  const { token, owner, repo, path, branch, message, contentBase64, sha } = params

  return githubFetch<{ commit: { sha: string; html_url: string } }>(
    `/repos/${owner}/${repo}/contents/${encodePath(path)}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch,
        ...(sha ? { sha } : {})
      })
    }
  )
}

export const ensureUserRepository = async (params: {
  token: string
  owner: string
  repoName: string
  description: string
}): Promise<{ owner: string; name: string; defaultBranch: string; htmlUrl: string }> => {
  const { token, owner, repoName, description } = params

  try {
    const created = await githubFetch<{
      name: string
      html_url: string
      default_branch: string
      owner: { login: string }
    }>('/user/repos', token, {
      method: 'POST',
      body: JSON.stringify({
        name: repoName,
        description,
        private: false,
        auto_init: true
      })
    })

    return {
      owner: created.owner.login,
      name: created.name,
      defaultBranch: created.default_branch || 'main',
      htmlUrl: created.html_url
    }
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status !== 422) {
      throw error
    }
  }

  const existing = await githubFetch<{
    name: string
    html_url: string
    default_branch: string
    owner: { login: string }
  }>(`/repos/${owner}/${repoName}`, token)

  return {
    owner: existing.owner.login,
    name: existing.name,
    defaultBranch: existing.default_branch || 'main',
    htmlUrl: existing.html_url
  }
}

export const getRefSha = async (
  token: string,
  owner: string,
  repo: string,
  ref: string
): Promise<string> => {
  const data = await githubFetch<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/${ref}`,
    token
  )
  return data.object.sha
}

export const loadRepositoryTree = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
}): Promise<RepoTreeItem[]> => {
  const { token, owner, repo, branch } = params
  const refSha = await getRefSha(token, owner, repo, `heads/${branch}`)
  const data = await githubFetch<{
    tree: Array<{ path: string; type: 'blob' | 'tree' }>
  }>(`/repos/${owner}/${repo}/git/trees/${refSha}?recursive=1`, token)

  const filePaths = data.tree
    .filter(entry => entry.type === 'blob' && Boolean(entry.path))
    .map(entry => entry.path)

  return buildFlatTreeFromFilePaths(filePaths)
}

// ===== Git Data API 批量提交 =====

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export const getBranchHead = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
}): Promise<{ commitSha: string; treeSha: string }> => {
  const { token, owner, repo, branch } = params
  const refSha = await getRefSha(token, owner, repo, `heads/${branch}`)
  const commit = await githubFetch<{ tree: { sha: string } }>(
    `/repos/${owner}/${repo}/git/commits/${refSha}`,
    token
  )
  return { commitSha: refSha, treeSha: commit.tree.sha }
}

export const createForkAndWaitReady = async (params: {
  token: string
  upstreamOwner: string
  upstreamRepo: string
}): Promise<{ owner: string; repo: string; defaultBranch: string }> => {
  const { token, upstreamOwner, upstreamRepo } = params

  const fork = await githubFetch<{
    owner: { login: string }
    name: string
    default_branch?: string
  }>(`/repos/${upstreamOwner}/${upstreamRepo}/forks`, token, {
    method: 'POST'
  })
  const forkOwner = fork.owner.login
  const forkRepo = fork.name
  const defaultBranch = fork.default_branch?.trim() || 'main'

  // POST /forks 返回 202 时 fork 是异步创建的，轮询默认分支 ref 直到真正可用。
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await getRefSha(token, forkOwner, forkRepo, `heads/${defaultBranch}`)
      return { owner: forkOwner, repo: forkRepo, defaultBranch }
    } catch (error: unknown) {
      const status = (error as GitHubApiError)?.status
      if (status !== 404 && status !== 409) throw error
    }
    await sleep(1500)
  }
  throw new Error(`Fork ${forkOwner}/${forkRepo} 创建后迟迟未就绪，请稍后重试。`)
}

/**
 * 让用户 fork 的默认分支与上游 HEAD 完全对齐（等同于 GitHub「Sync fork → discard commits」）。
 * 策略：先 merge-upstream fast-forward；没追平则 force 对齐。任何一步失败都不抛出。
 */
export const syncForkDefaultBranch = async (params: {
  token: string
  forkOwner: string
  forkRepo: string
  branch: string
  upstreamOwner: string
  upstreamRepo: string
}): Promise<void> => {
  const { token, forkOwner, forkRepo, branch, upstreamOwner, upstreamRepo } = params

  try {
    await githubFetch<unknown>(`/repos/${forkOwner}/${forkRepo}/merge-upstream`, token, {
      method: 'POST',
      body: JSON.stringify({ branch })
    })
  } catch {
    // merge-upstream 失败（可能已分叉），继续尝试强制对齐
  }

  try {
    const [upstreamSha, forkSha] = await Promise.all([
      getRefSha(token, upstreamOwner, upstreamRepo, `heads/${branch}`),
      getRefSha(token, forkOwner, forkRepo, `heads/${branch}`)
    ])
    if (forkSha === upstreamSha) return

    await githubFetch<unknown>(
      `/repos/${forkOwner}/${forkRepo}/git/refs/heads/${encodeURIComponent(branch)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ sha: upstreamSha, force: true })
      }
    )
  } catch {
    // 强制对齐失败时使用 fork 当前状态继续
  }
}

export const commitFilesToBranch = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
  files: Array<{ path: string; contentBase64: string }>
  message: string
}): Promise<string> => {
  const { token, owner, repo, branch, files, message } = params
  const head = await getBranchHead({ token, owner, repo, branch })

  const treeEntries: Array<{ path: string; sha: string; mode: '100644'; type: 'blob' }> = []
  for (const file of files) {
    const blob = await githubFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: 'POST',
      body: JSON.stringify({ content: file.contentBase64, encoding: 'base64' })
    })
    treeEntries.push({ path: file.path, sha: blob.sha, mode: '100644', type: 'blob' })
  }

  const tree = await githubFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.treeSha, tree: treeEntries })
  })

  const commit = await githubFetch<{ sha: string }>(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head.commitSha] })
  })

  await githubFetch<unknown>(
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha, force: false })
    }
  )
  return commit.sha
}

/**
 * 批量上传资源仓库文件（Git Data API 单 commit）。
 * 空仓库（无默认分支）兜底：首个文件走 Contents API 初始化，其余走批量提交。
 */
export const batchUploadResourceFiles = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
  files: Array<{ path: string; contentBase64: string }>
  message: string
}): Promise<{ commitSha: string }> => {
  const { token, owner, repo, branch, files, message } = params

  try {
    const commitSha = await commitFilesToBranch({ token, owner, repo, branch, files, message })
    return { commitSha }
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status !== 404) throw error
  }

  const [first, ...rest] = files
  if (!first) throw new Error('没有可上传文件')

  const initialized = await putRepoFile({
    token,
    owner,
    repo,
    path: first.path,
    branch,
    message: `初始化仓库：添加 ${first.path}`,
    contentBase64: first.contentBase64
  })

  let commitSha = initialized.commit.sha
  if (rest.length > 0) {
    commitSha = await commitFilesToBranch({ token, owner, repo, branch, files: rest, message })
  }
  return { commitSha }
}

// ===== Staging 提发协议提交 =====

export interface PendingSubmissionConflict {
  prNumber: number
  prTitle: string
  samePath: boolean
}

const sameResourceId = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase()

export const listOpenPullRequests = async (params: {
  token: string
  owner: string
  repo: string
}): Promise<Array<{ number: number; title: string }>> => {
  const { token, owner, repo } = params
  const pulls = await githubFetch<Array<{ number: number; title?: string }>>(
    `/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
    token
  )
  return pulls.map(pull => ({ number: pull.number, title: pull.title ?? '' }))
}

/** 经 Git Blobs API 读取文件内容（pull files 端点对大文件只给 sha，不给 patch）。 */
export const fetchPullRequestBlobText = async (params: {
  token: string
  owner: string
  repo: string
  sha: string
}): Promise<string> => {
  const { token, owner, repo, sha } = params
  const blob = await githubFetch<{ content?: string; encoding?: string }>(
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
    token
  )
  if (blob.encoding !== 'base64' || !blob.content) return ''
  return base64ToText(blob.content)
}

/**
 * 扫描所有开放 PR，检测与本次提交的冲突：
 * - 同路径：同一 tmp/{login}/{repo} 路径已有未处理请求（含解析失败兜底）；
 * - 跨用户：任何开放 PR 的提交明细指向同一资源 ID（edit 的 original_id 或 csv 行 id）。
 */
const findPendingSubmissionConflicts = async (params: {
  token: string
  targetOwner: string
  targetRepo: string
  submissionPath: string
  entry: CatalogEntry
}): Promise<PendingSubmissionConflict | null> => {
  const { token, targetOwner, targetRepo, submissionPath, entry } = params
  const pulls = await listOpenPullRequests({ token, owner: targetOwner, repo: targetRepo })

  for (const pull of pulls) {
    const files = await githubFetch<Array<{ filename?: string; sha?: string }>>(
      `/repos/${targetOwner}/${targetRepo}/pulls/${pull.number}/files?per_page=100`,
      token
    )

    let samePath = false
    let idConflict = false
    for (const file of files) {
      const filePath = file.filename ?? ''
      if (!isSubmissionFilePath(filePath)) continue
      if (filePath.startsWith(`${submissionPath}/`)) {
        samePath = true
      }
      if (!file.sha) continue
      try {
        const text = await fetchPullRequestBlobText({ token, owner: targetOwner, repo: targetRepo, sha: file.sha })
        if (!text) continue
        if (filePath.endsWith('.json')) {
          const request = parseSubmissionRequestJson(text)
          if (
            request.mode === 'edit' &&
            typeof request.original_id === 'string' &&
            sameResourceId(request.original_id, entry.id)
          ) {
            idConflict = true
          }
        } else {
          const parsed = parseSubmissionCsv(text)
          if (sameResourceId(parsed.id, entry.id)) {
            idConflict = true
          }
        }
      } catch {
        // 历史/脏数据解析失败：跳过该文件，不中断提交流程
        continue
      }
    }

    // 内容确认不了但同路径已存在 → 保守视为待处理请求
    if (idConflict || samePath) {
      return { prNumber: pull.number, prTitle: pull.title, samePath }
    }
  }
  return null
}

/**
 * 扫描所有开放 PR，返回第一个已引用该资源 ID 的提交。
 * 供编辑入口预检：已有进行中 PR 时提示用户直接在原 PR 上继续。
 */
export const findOpenSubmissionForResourceId = async (params: {
  token: string
  targetOwner: string
  targetRepo: string
  resourceId: string
}): Promise<{ prNumber: number; prTitle: string } | null> => {
  const { token, targetOwner, targetRepo, resourceId } = params
  const pulls = await listOpenPullRequests({ token, owner: targetOwner, repo: targetRepo })

  for (const pull of pulls) {
    const files = await githubFetch<Array<{ filename?: string; sha?: string }>>(
      `/repos/${targetOwner}/${targetRepo}/pulls/${pull.number}/files?per_page=100`,
      token
    )
    for (const file of files) {
      const filePath = file.filename ?? ''
      if (!isSubmissionFilePath(filePath)) continue
      if (!file.sha) continue
      try {
        const text = await fetchPullRequestBlobText({ token, owner: targetOwner, repo: targetRepo, sha: file.sha })
        if (!text) continue
        if (filePath.endsWith('.json')) {
          const request = parseSubmissionRequestJson(text)
          if (
            request.mode === 'edit' &&
            typeof request.original_id === 'string' &&
            sameResourceId(request.original_id, resourceId)
          ) {
            return { prNumber: pull.number, prTitle: pull.title }
          }
        } else {
          const parsed = parseSubmissionCsv(text)
          if (sameResourceId(parsed.id, resourceId)) {
            return { prNumber: pull.number, prTitle: pull.title }
          }
        }
      } catch {
        // 历史/脏数据解析失败：跳过该文件，不误判为冲突
        continue
      }
    }
  }
  return null
}

export const createStagingSubmissionBranch = async (params: {
  token: string
  currentUser: string
  upstreamOwner: string
  upstreamRepo: string
  upstreamBranch: string
  catalogPath: string
  entry: CatalogEntry
  intent: CatalogWriteIntent
}): Promise<{ forkOwner: string; forkRepo: string; branch: string; submissionPath: string }> => {
  const {
    token,
    currentUser,
    upstreamOwner,
    upstreamRepo,
    upstreamBranch,
    catalogPath,
    entry,
    intent
  } = params

  const catalogFile = await fetchRepoFileOrNull(token, upstreamOwner, upstreamRepo, catalogPath, upstreamBranch)
  const catalogEntries = catalogFile?.content
    ? parseCatalogCsv(base64ToText(catalogFile.content))
    : []

  const upstreamCommit = await getRefSha(token, upstreamOwner, upstreamRepo, `heads/${upstreamBranch}`)

  if (intent.mode === 'create') {
    const duplicateId = catalogEntries.find(item => item.id.trim() === entry.id.trim())
    if (duplicateId) {
      throw new Error(`资源 ID "${entry.id}" 已被「${duplicateId.name || duplicateId.id}」占用。`)
    }
    const duplicateRepo = catalogEntries.find(
      item =>
        item.repo_owner.toLowerCase() === entry.repo_owner.toLowerCase() &&
        item.repo_name.toLowerCase() === entry.repo_name.toLowerCase()
    )
    if (duplicateRepo) {
      throw new Error(
        `仓库 ${entry.repo_owner}/${entry.repo_name} 已经在 AstroBox 的软件索引里，被资源「${duplicateRepo.name || duplicateRepo.id}」占用，请更换仓库名。`
      )
    }
  } else {
    const originalId = intent.originalId.trim()
    const original = catalogEntries.find(item => item.id.trim() === originalId)
    if (!original) {
      throw new Error(`未在目录中找到原资源 ID "${originalId}"。`)
    }
  }

  const submissionPath = buildSubmissionPath(currentUser, entry.repo_name)

  // 重复提交守卫：create/edit 都要查。同路径 = 同用户重复开 PR；跨用户 = 别人正开着另一个 PR 改同一资源。
  const conflict = await findPendingSubmissionConflicts({
    token,
    targetOwner: upstreamOwner,
    targetRepo: upstreamRepo,
    submissionPath,
    entry
  })
  if (conflict) {
    if (conflict.samePath) {
      throw new Error(
        `路径 ${submissionPath} 已有未处理请求（PR #${conflict.prNumber}），请等待处理或继续编辑原 PR。`
      )
    }
    throw new Error(
      `资源 "${entry.id}" 已有进行中的提交 PR #${conflict.prNumber}《${conflict.prTitle}》，请等待其处理完成。`
    )
  }

  const fork = await createForkAndWaitReady({ token, upstreamOwner, upstreamRepo })
  await syncForkDefaultBranch({
    token,
    forkOwner: fork.owner,
    forkRepo: fork.repo,
    branch: fork.defaultBranch,
    upstreamOwner,
    upstreamRepo
  })
  const forkHeadSha = await getRefSha(token, fork.owner, fork.repo, `heads/${fork.defaultBranch}`)
  const branchName = `astrobox-submit-${Date.now()}`

  await githubFetch<unknown>(`/repos/${fork.owner}/${fork.repo}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: forkHeadSha })
  })

  let request: SubmissionRequest
  if (intent.mode === 'create') {
    request = await buildCreateSubmissionRequest(upstreamCommit)
  } else {
    const original = catalogEntries.find(item => item.id.trim() === intent.originalId.trim())
    if (!original) throw new Error(`未在目录中找到原资源 ID "${intent.originalId}"。`)
    request = await buildEditSubmissionRequest({
      originalId: intent.originalId.trim(),
      baseEntryDigest: await canonicalCatalogEntryDigest(original),
      baseCatalogCommit: upstreamCommit
    })
  }

  await commitFilesToBranch({
    token,
    owner: fork.owner,
    repo: fork.repo,
    branch: branchName,
    message: `Submit resource ${entry.id}`,
    files: [
      { path: submissionCsvPath(submissionPath), contentBase64: textToBase64(buildSubmissionCsv(entry)) },
      {
        path: submissionRequestPath(submissionPath),
        contentBase64: textToBase64(buildSubmissionRequest(request))
      }
    ]
  })

  return { forkOwner: fork.owner, forkRepo: fork.repo, branch: branchName, submissionPath }
}

/** 在已有提交分支上更新提发明细（每次写入都刷新 client 信息）。 */
export const updateSubmissionEntryOnBranch = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
  entry: CatalogEntry
  request: SubmissionRequest
  submissionPath: string
}): Promise<void> => {
  const { token, owner, repo, branch, entry, request, submissionPath } = params
  const refreshed: SubmissionRequest = { ...request, client: buildClientInfo() }
  await commitFilesToBranch({
    token,
    owner,
    repo,
    branch,
    message: `Update resource submission ${entry.id}`,
    files: [
      { path: submissionCsvPath(submissionPath), contentBase64: textToBase64(buildSubmissionCsv(entry)) },
      {
        path: submissionRequestPath(submissionPath),
        contentBase64: textToBase64(buildSubmissionRequest(refreshed))
      }
    ]
  })
}

export const createPullRequestWithHead = async (params: {
  token: string
  baseOwner: string
  baseRepo: string
  baseBranch: string
  headOwner: string
  headBranch: string
  title: string
  body?: string
}): Promise<{ number: number; htmlUrl: string }> => {
  const { token, baseOwner, baseRepo, baseBranch, headOwner, headBranch, title, body } = params

  const response = await githubFetch<{ number: number; html_url: string }>(
    `/repos/${baseOwner}/${baseRepo}/pulls`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        base: baseBranch,
        head: `${headOwner}:${headBranch}`
      })
    }
  )

  return {
    number: response.number,
    htmlUrl: response.html_url
  }
}

const isCatalogFile = (filename: string | undefined, catalogPath: string): boolean => {
  if (!filename) return false
  return (
    filename === catalogPath ||
    filename.endsWith(`/${catalogPath}`) ||
    isSubmissionCsvFilePath(filename)
  )
}

const ABCC_TAG_PATTERN = /\[ABCC_(NEEDFIX|FIXED)_([^\]]+)\]/ig
const COLLAB_REQUEST_TAG_PATTERN = /\[ABCC_COLLAB_REQ_([^\]]+)\]/i
const COLLAB_APPROVED_TAG_PATTERN = /\[ABCC_COLLAB_APPROVED_([^\]]+)\]/i
const COLLAB_REJECTED_TAG_PATTERN = /\[ABCC_COLLAB_REJECTED_([^\]]+)\]/i

const parseCollabRequestMeta = (body: string): {
  requestId: string
  requester: string
  targetUser: string
  repoOwner: string
  repoName: string
  resourceName: string
  resourceId: string
} | null => {
  const matched = body.match(COLLAB_REQUEST_TAG_PATTERN)
  const requestId = (matched?.[1] || '').trim()
  if (!requestId) return null

  const readLine = (key: string): string => {
    const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, 'im')
    const line = body.match(pattern)?.[1] || ''
    return line.trim()
  }

  return {
    requestId,
    requester: readLine('requester').toLowerCase(),
    targetUser: readLine('target_user').toLowerCase(),
    repoOwner: readLine('repo_owner').toLowerCase(),
    repoName: readLine('repo_name').toLowerCase(),
    resourceName: readLine('resource_name'),
    resourceId: readLine('resource_id')
  }
}

const deriveAbccTagSummary = (comments: Array<{ body?: string }>): {
  unresolvedTagIds: string[]
  hasNeedFixTag: boolean
  hasFixedTag: boolean
} => {
  const unresolved = new Set<string>()
  let hasNeedFixTag = false
  let hasFixedTag = false

  for (const comment of comments) {
    const body = comment.body || ''
    let matched: RegExpExecArray | null
    ABCC_TAG_PATTERN.lastIndex = 0
    while ((matched = ABCC_TAG_PATTERN.exec(body)) !== null) {
      const kind = matched[1]?.toUpperCase()
      const id = (matched[2] || '').trim()
      if (!id) continue
      if (kind === 'NEEDFIX') {
        hasNeedFixTag = true
        unresolved.add(id)
      } else if (kind === 'FIXED') {
        hasFixedTag = true
        unresolved.delete(id)
      }
    }
  }

  return {
    unresolvedTagIds: Array.from(unresolved),
    hasNeedFixTag,
    hasFixedTag
  }
}

const deriveReviewState = (comments: Array<{ body?: string }>): ReviewState => {
  const abcc = deriveAbccTagSummary(comments)
  if (abcc.unresolvedTagIds.length > 0) {
    return 'changes_requested'
  }
  if (abcc.hasFixedTag) {
    return 'fixed_waiting'
  }

  const content = comments.map(item => item.body || '').join('\n').toLowerCase()
  if (/(change request|changes requested|需要修改|请修改|不通过)/.test(content)) {
    return 'changes_requested'
  }
  if (/(已修复|fixed|updated|重新提交)/.test(content)) {
    return 'fixed_waiting'
  }
  return 'waiting_review'
}

const extractCatalogEntriesFromPatch = (patch: string | undefined): CatalogEntry[] => {
  if (!patch) return []

  const map = new Map<string, CatalogEntry>()
  const lines = patch.split(/\r?\n/)

  for (const line of lines) {
    if (!line.startsWith('+') || line.startsWith('+++')) continue
    const row = line.slice(1).trim()
    if (!row || row === CATALOG_CSV_HEADER) continue

    const parsed = parseCatalogRow(row)
    if (parsed) {
      map.set(parsed.id, parsed)
    }
  }

  return Array.from(map.values())
}

export const loadInProgressResources = async (params: {
  token: string
  username: string
  targetOwner: string
  targetRepo: string
  catalogPath: string
}): Promise<PublishingResource[]> => {
  const { token, username, targetOwner, targetRepo, catalogPath } = params

  const pulls = await githubFetch<
    Array<{
      number: number
      title: string
      html_url: string
      created_at: string
      user?: { login?: string; avatar_url?: string }
    }>
  >(`/repos/${targetOwner}/${targetRepo}/pulls?state=open&per_page=50`, token)

  const resources: PublishingResource[] = []

  for (const pr of pulls) {
    if (pr.user?.login !== username) continue

    try {
      const [comments, files] = await Promise.all([
        githubFetch<Array<{ body?: string }>>(
          `/repos/${targetOwner}/${targetRepo}/issues/${pr.number}/comments?per_page=100`,
          token
        ),
        githubFetch<Array<{ filename?: string; patch?: string }>>(
          `/repos/${targetOwner}/${targetRepo}/pulls/${pr.number}/files?per_page=100`,
          token
        )
      ])

      const review = deriveReviewState(comments)
      const abccSummary = deriveAbccTagSummary(comments)
      const entries = files
        .filter(file => isCatalogFile(file.filename, catalogPath))
        .flatMap(file => extractCatalogEntriesFromPatch(file.patch))

      for (const entry of entries) {
          resources.push({
            id: entry.id,
            name: entry.name,
            restype: entry.restype,
            status: review,
            unresolvedTagCount: abccSummary.unresolvedTagIds.length,
            unresolvedTagIds: abccSummary.unresolvedTagIds,
            createdAt: pr.created_at,
            prNumber: pr.number,
            prTitle: pr.title,
            prUrl: pr.html_url,
            prAuthor: pr.user?.login || '',
            prAuthorAvatar: pr.user?.avatar_url || ''
          })
      }
    } catch (cause) {
      console.warn(`[resourcePublishApi] 加载 PR #${pr.number} 数据失败，已跳过:`, cause)
      continue
    }
  }

  return resources.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const loadPullRequestIssueComments = async (params: {
  token: string
  owner: string
  repo: string
  prNumber: number
}): Promise<PullRequestIssueComment[]> => {
  const { token, owner, repo, prNumber } = params
  return githubFetch<PullRequestIssueComment[]>(
    `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
    token
  )
}

export const loadPendingCollaboratorPermissionRequests = async (params: {
  token: string
  targetOwner: string
  targetRepo: string
  currentUser: string
}): Promise<CollaboratorPermissionRequest[]> => {
  const { token, targetOwner, targetRepo, currentUser } = params
  const normalizedCurrentUser = currentUser.trim().toLowerCase()
  if (!normalizedCurrentUser) return []

  const pulls = await githubFetch<
    Array<{
      number: number
      title: string
      html_url: string
    }>
  >(`/repos/${targetOwner}/${targetRepo}/pulls?state=open&per_page=50`, token)

  const approvedOrRejectedIds = new Set<string>()
  const pendingItems = new Map<string, CollaboratorPermissionRequest>()

  for (const pr of pulls) {
    let comments: PullRequestIssueComment[] = []
    try {
      comments = await loadPullRequestIssueComments({
        token,
        owner: targetOwner,
        repo: targetRepo,
        prNumber: pr.number
      })
    } catch (cause) {
      console.warn(`[resourcePublishApi] 加载 PR #${pr.number} 协作者请求评论失败，已跳过:`, cause)
      continue
    }

    const sorted = [...comments].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    for (const comment of sorted) {
      const body = comment.body || ''
      const approvedMatch = body.match(COLLAB_APPROVED_TAG_PATTERN)
      if (approvedMatch?.[1]) {
        approvedOrRejectedIds.add(approvedMatch[1].trim())
        pendingItems.delete(approvedMatch[1].trim())
        continue
      }
      const rejectedMatch = body.match(COLLAB_REJECTED_TAG_PATTERN)
      if (rejectedMatch?.[1]) {
        approvedOrRejectedIds.add(rejectedMatch[1].trim())
        pendingItems.delete(rejectedMatch[1].trim())
        continue
      }

      const parsed = parseCollabRequestMeta(body)
      if (!parsed) continue
      if (approvedOrRejectedIds.has(parsed.requestId)) continue
      if (parsed.targetUser !== normalizedCurrentUser) continue
      if (!parsed.repoOwner || !parsed.repoName || !parsed.requester) continue

      pendingItems.set(parsed.requestId, {
        requestId: parsed.requestId,
        prNumber: pr.number,
        prTitle: pr.title || '',
        prUrl: pr.html_url || '',
        requester: parsed.requester,
        targetUser: parsed.targetUser,
        repoOwner: parsed.repoOwner,
        repoName: parsed.repoName,
        resourceName: parsed.resourceName,
        resourceId: parsed.resourceId,
        commentId: comment.id,
        commentHtmlUrl: comment.html_url || '',
        createdAt: comment.created_at || ''
      })
    }
  }

  return Array.from(pendingItems.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export const createPullRequestIssueComment = async (params: {
  token: string
  owner: string
  repo: string
  prNumber: number
  body: string
}): Promise<{ id: number }> => {
  const { token, owner, repo, prNumber, body } = params
  const payload = await githubFetch<{ id: number }>(
    `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ body })
    }
  )
  return { id: payload.id }
}

export const updatePullRequestIssueComment = async (params: {
  token: string
  owner: string
  repo: string
  commentId: number
  body: string
}): Promise<{ id: number }> => {
  const { token, owner, repo, commentId, body } = params
  const payload = await githubFetch<{ id: number }>(
    `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ body })
    }
  )
  return { id: payload.id }
}

export const deletePullRequestIssueComment = async (params: {
  token: string
  owner: string
  repo: string
  commentId: number
}): Promise<void> => {
  const { token, owner, repo, commentId } = params
  await githubFetch<unknown>(
    `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    token,
    {
      method: 'DELETE'
    }
  )
}

export const loadOwnedResources = async (params: {
  token: string
  username: string
  upstreamOwner: string
  upstreamRepo: string
  upstreamBranch: string
  catalogPath: string
  legacyCatalogPath?: string
}): Promise<OwnedResourceEntry[]> => {
  const { token, username, upstreamOwner, upstreamRepo, upstreamBranch, catalogPath } = params
  const items: OwnedResourceEntry[] = []
  const repoDescriptionCache = new Map<string, string>()
  const commitDateCache = new Map<string, string>()
  const v2FollowUpCache = new Map<string, boolean>()

  const getCachedRepoDescription = async (owner: string, repo: string, ref: string): Promise<string> => {
    const cacheKey = `${owner}/${repo}@${ref}`
    const cached = repoDescriptionCache.get(cacheKey)
    if (cached !== undefined) return cached
    const loaded = await loadRepoDescription({ token, owner, repo, ref })
    repoDescriptionCache.set(cacheKey, loaded)
    return loaded
  }

  const getCachedCommitDate = async (owner: string, repo: string, ref: string): Promise<string> => {
    const cacheKey = `${owner}/${repo}@${ref}`
    const cached = commitDateCache.get(cacheKey)
    if (cached !== undefined) return cached
    const loaded = await loadCommitDate({ token, owner, repo, ref })
    commitDateCache.set(cacheKey, loaded)
    return loaded
  }

  const getCachedV2FollowUp = async (owner: string, repo: string, ref: string): Promise<boolean> => {
    const cacheKey = `${owner}/${repo}@${ref}`
    const cached = v2FollowUpCache.get(cacheKey)
    if (cached !== undefined) return cached
    const loaded = await loadV2FollowUpStatus({ token, owner, repo, ref })
    v2FollowUpCache.set(cacheKey, loaded)
    return loaded
  }

  const v2CatalogFile = await fetchRepoFileOrNull(token, upstreamOwner, upstreamRepo, catalogPath, upstreamBranch)

  const v2Entries = v2CatalogFile?.content
    ? parseCatalogCsv(base64ToText(v2CatalogFile.content)).filter(entry => entry.repo_owner === username)
    : []

  const v2Items = await Promise.all(
    v2Entries.map(async entry => {
      const ref = entry.repo_commit_hash || 'main'
      const [description, commitDate] = await Promise.all([
        getCachedRepoDescription(entry.repo_owner, entry.repo_name, ref),
        getCachedCommitDate(entry.repo_owner, entry.repo_name, ref)
      ])
      const v2NeedsFollowUp = await getCachedV2FollowUp(entry.repo_owner, entry.repo_name, ref)

      return {
        source: 'v2' as const,
        key: `v2:${entry.id}:${entry.repo_owner}/${entry.repo_name}`,
        catalogId: entry.id,
        name: entry.name,
        restype: entry.restype,
        icon: entry.icon,
        cover: entry.cover,
        repo_owner: entry.repo_owner,
        repo_name: entry.repo_name,
        repo_commit_hash: entry.repo_commit_hash,
        description,
        tags: entry.tags || '',
        device_vendors: entry.device_vendors || '',
        devices: entry.devices || '',
        paid_type: entry.paid_type || '',
        commitDate,
        v2NeedsFollowUp
      }
    })
  )
  items.push(...v2Items)

  return items
}

const isSameCommitHash = (indexHash: string, latestHash: string): boolean => {
  const left = indexHash.trim().toLowerCase()
  const right = latestHash.trim().toLowerCase()
  if (!left || !right) return false
  return left === right || left.startsWith(right) || right.startsWith(left)
}

export const loadOwnedResourceDetail = async (params: {
  token: string
  owner: string
  repo: string
  v1Ref?: string
  v2Ref?: string
}): Promise<OwnedResourceDetail> => {
  const { token, owner, repo } = params
  const shouldLoadV1 = params.v1Ref !== undefined
  const v1Ref = params.v1Ref?.trim() || ''
  const v2Ref = params.v2Ref?.trim() || ''

  const repoInfo = await githubFetch<{ default_branch?: string }>(
    `/repos/${owner}/${repo}`,
    token
  )
  const defaultBranch = repoInfo.default_branch?.trim() || 'main'
  const latestCommit = await githubFetch<{
    sha?: string
    commit?: {
      committer?: { date?: string }
      author?: { date?: string }
    }
  }>(`/repos/${owner}/${repo}/commits/${encodeURIComponent(defaultBranch)}`, token)
  const latestCommitSha = latestCommit.sha?.trim() || ''
  const latestCommitDate =
    latestCommit.commit?.committer?.date?.trim() ||
    latestCommit.commit?.author?.date?.trim() ||
    ''

  const v1ManifestRef = v1Ref || defaultBranch
  const [v1ManifestFile, v2ManifestFile] = await Promise.all([
    shouldLoadV1 ? fetchRepoFileOrNull(token, owner, repo, 'manifest.json', v1ManifestRef) : Promise.resolve(null),
    v2Ref ? fetchRepoFileOrNull(token, owner, repo, 'manifest_v2.json', v2Ref) : Promise.resolve(null)
  ])

  const isV2HashLatest = v2Ref && latestCommitSha
    ? isSameCommitHash(v2Ref, latestCommitSha)
    : null

  return {
    owner,
    repo,
    v1Ref,
    v2Ref,
    v1ManifestPath: 'manifest.json',
    v2ManifestPath: 'manifest_v2.json',
    v1ManifestText: v1ManifestFile?.content ? base64ToText(v1ManifestFile.content) : '',
    v2ManifestText: v2ManifestFile?.content ? base64ToText(v2ManifestFile.content) : '',
    defaultBranch,
    latestCommitSha,
    latestCommitDate,
    isV2HashLatest
  }
}
