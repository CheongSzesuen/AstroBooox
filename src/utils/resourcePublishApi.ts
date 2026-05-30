import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'

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

export interface LegacyCatalogEntry {
  name: string
  icon: string
  cover: string
  restype: string
  tags: string
  devices: string
  path: string
  paid_type: string
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

export const parseCatalogCsv = (csv: string): CatalogEntry[] => {
  const rows = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  if (rows.length === 0) return []

  const body = rows.slice(1)
  const entries: CatalogEntry[] = []

  for (const row of body) {
    const cols = row.split(',')
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

const parseLegacyCatalogCsv = (csv: string): LegacyCatalogEntry[] => {
  const rows = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  const entries: LegacyCatalogEntry[] = []

  for (const row of rows) {
    const cols = row.split(',')
    if (cols.length < 7) continue
    entries.push({
      name: cols[0] || '',
      icon: cols[1] || '',
      cover: cols[2] || '',
      restype: cols[3] || '',
      tags: cols[4] || '',
      devices: cols[5] || '',
      path: cols[6] || '',
      paid_type: cols[7] || ''
    })
  }

  return entries
}

const parseGitHubRepoFromUrl = (url: string): { owner: string; repo: string } | null => {
  const trimmed = url.trim()
  if (!trimmed) return null

  const matched = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i)
  if (!matched) return null

  return {
    owner: matched[1],
    repo: matched[2].replace(/\.git$/i, '')
  }
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
        auto_init: false
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

export const createBranchIfMissing = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
  baseSha: string
}): Promise<void> => {
  const { token, owner, repo, branch, baseSha } = params

  try {
    await githubFetch<{ ref: string }>(`/repos/${owner}/${repo}/git/refs`, token, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: baseSha
      })
    })
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status === 422) {
      return
    }
    throw error
  }
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

export const ensureFork = async (params: {
  token: string
  currentUser: string
  upstreamOwner: string
  upstreamRepo: string
}): Promise<{ owner: string; repo: string }> => {
  const { token, currentUser, upstreamOwner, upstreamRepo } = params

  try {
    const ownFork = await githubFetch<{ owner: { login: string }; name: string }>(
      `/repos/${currentUser}/${upstreamRepo}`,
      token
    )
    return {
      owner: ownFork.owner.login,
      repo: ownFork.name
    }
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status !== 404) {
      throw error
    }
  }

  await githubFetch<{ owner: { login: string }; name: string }>(
    `/repos/${upstreamOwner}/${upstreamRepo}/forks`,
    token,
    {
      method: 'POST'
    }
  )

  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 1200))
    try {
      const ownFork = await githubFetch<{ owner: { login: string }; name: string }>(
        `/repos/${currentUser}/${upstreamRepo}`,
        token
      )
      return {
        owner: ownFork.owner.login,
        repo: ownFork.name
      }
    } catch (error: unknown) {
      if ((error as GitHubApiError)?.status === 404) {
        continue
      }
      throw error
    }
  }

  throw new Error('Fork 创建超时，请稍后重试')
}

const appendOrReplaceCatalogRow = (
  existingCsv: string,
  entry: CatalogEntry,
  options?: {
    matchId?: string
    requireExisting?: boolean
  }
): string => {
  const targetId = (options?.matchId || entry.id).trim()
  const nextEntryId = entry.id.trim()
  const rows = existingCsv.split(/\r?\n/).filter(line => line.trim().length > 0)
  const header = rows[0] || CATALOG_CSV_HEADER
  const body = rows.slice(1)

  const rowString = [
    entry.id,
    entry.name,
    entry.restype,
    entry.repo_owner,
    entry.repo_name,
    entry.repo_commit_hash,
    entry.icon,
    entry.cover,
    entry.tags,
    entry.device_vendors,
    entry.devices,
    entry.paid_type
  ].join(',')

  const parsedRows = body
    .map((row, index) => ({
      row,
      index,
      parsed: parseCatalogRow(row)
    }))
    .filter((item): item is { row: string; index: number; parsed: CatalogEntry } => Boolean(item.parsed))

  const targetMatches = parsedRows.filter((item) => item.parsed.id.trim() === targetId)
  const entryMatches = parsedRows.filter((item) => item.parsed.id.trim() === nextEntryId)

  if (options?.requireExisting) {
    if (!targetMatches.length) {
      throw new Error(`未在 catalog 中找到待更新的资源行: ${targetId}`)
    }
    if (targetMatches.length > 1) {
      throw new Error(`index_v2.csv 中资源 ID 存在重复，无法安全更新: ${targetId}`)
    }
    if (nextEntryId !== targetId && entryMatches.length > 0) {
      throw new Error(`index_v2.csv 中已存在重复资源 ID: ${nextEntryId}`)
    }
    body[targetMatches[0].index] = rowString
    return [header, ...body].join('\n')
  }

  if (entryMatches.length > 0) {
    throw new Error(`index_v2.csv 中已存在重复资源 ID: ${nextEntryId}`)
  }

  body.push(rowString)
  return [header, ...body].join('\n')
}

const appendLegacyCatalogRow = (
  existingCsv: string,
  entry: LegacyCatalogEntry,
  options?: {
    matchPath?: string
    requireExisting?: boolean
  }
): string => {
  const targetPath = (options?.matchPath || entry.path || '').trim()
  const rows = existingCsv.split(/\r?\n/).filter(line => line.trim().length > 0)
  const row = [
    entry.name,
    entry.icon,
    entry.cover,
    entry.restype,
    entry.tags,
    entry.devices,
    entry.path,
    entry.paid_type
  ].join(',')

  let replaced = false
  const nextRows = rows.map(line => {
    const parsed = parseLegacyCatalogCsv(line)[0]
    if (!parsed) return line
    if (!targetPath || parsed.path.trim() !== targetPath) return line
    replaced = true
    return row
  })

  if (!replaced) {
    if (options?.requireExisting) {
      throw new Error(`未在 index.csv 中找到待更新的资源行: ${targetPath}`)
    }
    nextRows.push(row)
  }

  const newline = existingCsv.includes('\r\n') ? '\r\n' : '\n'
  return nextRows.join(newline)
}

export const updateCatalogInForkBranch = async (params: {
  token: string
  upstreamOwner: string
  upstreamRepo: string
  upstreamBranch: string
  catalogPath: string
  currentUser: string
  branchName: string
  entry: CatalogEntry
  matchId?: string
  requireExisting?: boolean
}): Promise<{ forkOwner: string; forkRepo: string; branch: string }> => {
  const {
    token,
    upstreamOwner,
    upstreamRepo,
    upstreamBranch,
    catalogPath,
    currentUser,
    branchName,
    entry,
    matchId = '',
    requireExisting = false
  } = params

  const fork = await ensureFork({
    token,
    currentUser,
    upstreamOwner,
    upstreamRepo
  })

  const upstreamSha = await getRefSha(
    token,
    upstreamOwner,
    upstreamRepo,
    `heads/${upstreamBranch}`
  )

  await createBranchIfMissing({
    token,
    owner: fork.owner,
    repo: fork.repo,
    branch: branchName,
    baseSha: upstreamSha
  })

  const fileData = await fetchRepoFile(
    token,
    fork.owner,
    fork.repo,
    catalogPath,
    branchName
  )

  const csvContent = base64ToText(fileData.content || '')
  const updatedCsv = appendOrReplaceCatalogRow(csvContent, entry, {
    matchId,
    requireExisting
  })

  await putRepoFile({
    token,
    owner: fork.owner,
    repo: fork.repo,
    path: catalogPath,
    branch: branchName,
    message: `Update catalog for ${entry.id}`,
    contentBase64: textToBase64(updatedCsv),
    sha: fileData.sha
  })

  return {
    forkOwner: fork.owner,
    forkRepo: fork.repo,
    branch: branchName
  }
}

export const updateLegacyCatalogAndResourceJsonInForkBranch = async (params: {
  token: string
  upstreamOwner: string
  upstreamRepo: string
  upstreamBranch: string
  currentUser: string
  branchName: string
  catalogPath: string
  resourceJsonPath: string
  legacyEntry: LegacyCatalogEntry
  resourceManifestJson: string
  matchPath?: string
  requireExisting?: boolean
}): Promise<{ forkOwner: string; forkRepo: string; branch: string }> => {
  const {
    token,
    upstreamOwner,
    upstreamRepo,
    upstreamBranch,
    currentUser,
    branchName,
    catalogPath,
    resourceJsonPath,
    legacyEntry,
    resourceManifestJson,
    matchPath = '',
    requireExisting = false
  } = params

  const fork = await ensureFork({
    token,
    currentUser,
    upstreamOwner,
    upstreamRepo
  })

  const upstreamSha = await getRefSha(
    token,
    upstreamOwner,
    upstreamRepo,
    `heads/${upstreamBranch}`
  )

  await createBranchIfMissing({
    token,
    owner: fork.owner,
    repo: fork.repo,
    branch: branchName,
    baseSha: upstreamSha
  })

  const legacyFile = await fetchRepoFile(token, fork.owner, fork.repo, catalogPath, branchName)
  const legacyCsvContent = base64ToText(legacyFile.content || '')
  const nextLegacyCsv = appendLegacyCatalogRow(legacyCsvContent, legacyEntry, {
    matchPath,
    requireExisting
  })

  await putRepoFile({
    token,
    owner: fork.owner,
    repo: fork.repo,
    path: catalogPath,
    branch: branchName,
    message: `${requireExisting ? 'Update' : 'Append'} legacy catalog for ${legacyEntry.name}`,
    contentBase64: textToBase64(nextLegacyCsv),
    sha: legacyFile.sha
  })

  const oldResourceJson = await fetchRepoFileOrNull(
    token,
    fork.owner,
    fork.repo,
    resourceJsonPath,
    branchName
  )

  await putRepoFile({
    token,
    owner: fork.owner,
    repo: fork.repo,
    path: resourceJsonPath,
    branch: branchName,
    message: `Add legacy resource manifest for ${legacyEntry.name}`,
    contentBase64: textToBase64(resourceManifestJson),
    sha: oldResourceJson?.sha
  })

  return {
    forkOwner: fork.owner,
    forkRepo: fork.repo,
    branch: branchName
  }
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
  return filename === catalogPath || filename.endsWith(`/${catalogPath}`)
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
  const {
    token,
    username,
    upstreamOwner,
    upstreamRepo,
    upstreamBranch,
    catalogPath,
    legacyCatalogPath = 'index.csv'
  } = params
  const items: OwnedResourceEntry[] = []
  const normalizedUsername = username.trim().toLowerCase()
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

  const [v2CatalogFile, v1CatalogFile] = await Promise.all([
    fetchRepoFileOrNull(token, upstreamOwner, upstreamRepo, catalogPath, upstreamBranch),
    fetchRepoFileOrNull(token, upstreamOwner, upstreamRepo, legacyCatalogPath, upstreamBranch)
  ])

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

  const v1Entries = v1CatalogFile?.content
    ? parseLegacyCatalogCsv(base64ToText(v1CatalogFile.content))
    : []

  const containsCurrentUsername = (value: string): boolean =>
    Boolean(normalizedUsername && value.toLowerCase().includes(normalizedUsername))
  const likelyAuthorFolders = new Set(
    v1Entries
      .filter(entry =>
        containsCurrentUsername(entry.icon) ||
        containsCurrentUsername(entry.cover) ||
        containsCurrentUsername(entry.path)
      )
      .map(entry => entry.path.split('/').filter(Boolean)[0] || '')
      .filter(Boolean)
  )
  const v1CandidateEntries = v1Entries.filter(entry => {
    if (
      containsCurrentUsername(entry.icon) ||
      containsCurrentUsername(entry.cover) ||
      containsCurrentUsername(entry.path)
    ) {
      return true
    }
    const folder = entry.path.split('/').filter(Boolean)[0] || ''
    return Boolean(folder && likelyAuthorFolders.has(folder))
  })

  const v1Items = await Promise.all(
    v1CandidateEntries.map(async (entry, index) => {
      const resourceJsonPath = entry.path ? `resources/${entry.path}` : ''
      if (!resourceJsonPath) return null

      const resourceFile = await fetchRepoFileOrNull(
        token,
        upstreamOwner,
        upstreamRepo,
        resourceJsonPath,
        upstreamBranch
      )
      if (!resourceFile?.content) return null

      let repoOwner = ''
      let repoName = ''
      let repoRef = 'main'
      try {
        const parsed = JSON.parse(base64ToText(resourceFile.content)) as {
          repo_url?: unknown
          repo_commit_hash?: unknown
        }
        const repoUrl = typeof parsed.repo_url === 'string' ? parsed.repo_url.trim() : ''
        const repoInfo = parseGitHubRepoFromUrl(repoUrl)
        repoOwner = repoInfo?.owner || ''
        repoName = repoInfo?.repo || ''
        repoRef = typeof parsed.repo_commit_hash === 'string' && parsed.repo_commit_hash.trim()
          ? parsed.repo_commit_hash.trim()
          : 'main'
      } catch {
        return null
      }

      if (!repoOwner || !repoName) return null
      if (normalizedUsername && repoOwner.trim().toLowerCase() !== normalizedUsername) return null

      const description = await getCachedRepoDescription(repoOwner, repoName, repoRef)

      return {
        source: 'v1' as const,
        key: `v1:${entry.path || entry.name}:${index}`,
        catalogId: '',
        name: entry.name,
        restype: entry.restype,
        icon: entry.icon,
        cover: entry.cover,
        repo_owner: repoOwner,
        repo_name: repoName,
        repo_commit_hash: repoRef,
        description,
        tags: entry.tags || '',
        device_vendors: '',
        devices: entry.devices || '',
        paid_type: entry.paid_type || '',
        commitDate: '',
        v2NeedsFollowUp: false
      }
    })
  )
  for (const entry of v1Items) {
    if (entry) {
      items.push(entry)
    }
  }

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
