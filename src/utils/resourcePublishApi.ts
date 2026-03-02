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
  createdAt: string
  prNumber: number
  prTitle: string
  prUrl: string
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

export interface RepoTreeItem {
  type: 'folder' | 'file'
  path: string
  label: string
  depth: number
}

interface GitHubApiError extends Error {
  status?: number
}

const API_BASE = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const CATALOG_CSV_HEADER =
  'id,name,restype,repo_owner,repo_name,repo_commit_hash,icon,cover,tags,device_vendors,devices,paid_type'

const buildHeaders = (token: string, contentType?: string): HeadersInit => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': API_VERSION,
  Authorization: `Bearer ${token}`,
  ...(contentType ? { 'Content-Type': contentType } : {})
})

const makeError = (status: number, message: string): GitHubApiError => {
  const error = new Error(message) as GitHubApiError
  error.status = status
  return error
}

const parseError = async (response: Response): Promise<never> => {
  const raw = await response.text()
  const fallback = `GitHub API ${response.status}: ${response.statusText}`

  let message = fallback
  try {
    const data = JSON.parse(raw) as { message?: string }
    message = data.message ? `GitHub API ${response.status}: ${data.message}` : fallback
  } catch {
    message = raw ? `GitHub API ${response.status}: ${raw}` : fallback
  }

  throw makeError(response.status, message)
}

const githubFetch = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...(init?.headers || {})
    }
  })

  if (!response.ok) {
    await parseError(response)
  }

  return (await response.json()) as T
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
  const response = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
    {
      headers: buildHeaders(token)
    }
  )
  if (response.status === 404) return false
  if (!response.ok) {
    await parseError(response)
  }
  return true
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
      headers: buildHeaders(token, 'application/json'),
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
  } catch (error: unknown) {
    if ((error as GitHubApiError)?.status !== 404) {
      throw error
    }
  }

  const created = await githubFetch<{
    name: string
    html_url: string
    default_branch: string
    owner: { login: string }
  }>('/user/repos', token, {
    method: 'POST',
    headers: buildHeaders(token, 'application/json'),
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
      headers: buildHeaders(token, 'application/json'),
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
      method: 'POST',
      headers: buildHeaders(token, 'application/json')
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

const appendOrReplaceCatalogRow = (existingCsv: string, entry: CatalogEntry): string => {
  const rows = existingCsv.split(/\r?\n/).filter(line => line.trim().length > 0)
  const header = rows[0] || CATALOG_CSV_HEADER
  const body = rows.slice(1)
  const filtered = body.filter(line => !line.startsWith(`${entry.id},`))

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

  filtered.push(rowString)
  return [header, ...filtered].join('\n')
}

const appendLegacyCatalogRow = (existingCsv: string, entry: LegacyCatalogEntry): string => {
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
  const newline = existingCsv.includes('\r\n') ? '\r\n' : '\n'
  if (!existingCsv) return row
  if (existingCsv.endsWith('\n') || existingCsv.endsWith('\r\n')) {
    return `${existingCsv}${row}`
  }
  return `${existingCsv}${newline}${row}`
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
}): Promise<{ forkOwner: string; forkRepo: string; branch: string }> => {
  const {
    token,
    upstreamOwner,
    upstreamRepo,
    upstreamBranch,
    catalogPath,
    currentUser,
    branchName,
    entry
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
  const updatedCsv = appendOrReplaceCatalogRow(csvContent, entry)

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
    resourceManifestJson
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
  const nextLegacyCsv = appendLegacyCatalogRow(legacyCsvContent, legacyEntry)

  await putRepoFile({
    token,
    owner: fork.owner,
    repo: fork.repo,
    path: catalogPath,
    branch: branchName,
    message: `Append legacy catalog for ${legacyEntry.name}`,
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
      headers: buildHeaders(token, 'application/json'),
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

const deriveReviewState = (comments: Array<{ body?: string }>): ReviewState => {
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
      user?: { login?: string }
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
      const entries = files
        .filter(file => isCatalogFile(file.filename, catalogPath))
        .flatMap(file => extractCatalogEntriesFromPatch(file.patch))

      for (const entry of entries) {
        resources.push({
          id: entry.id,
          name: entry.name,
          restype: entry.restype,
          status: review,
          createdAt: pr.created_at,
          prNumber: pr.number,
          prTitle: pr.title,
          prUrl: pr.html_url
        })
      }
    } catch {
      continue
    }
  }

  return resources.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const loadOwnedResources = async (params: {
  token: string
  username: string
  upstreamOwner: string
  upstreamRepo: string
  upstreamBranch: string
  catalogPath: string
}): Promise<CatalogEntry[]> => {
  const { token, username, upstreamOwner, upstreamRepo, upstreamBranch, catalogPath } = params
  const file = await fetchRepoFile(token, upstreamOwner, upstreamRepo, catalogPath, upstreamBranch)
  const content = base64ToText(file.content || '')
  return parseCatalogCsv(content).filter(entry => entry.repo_owner === username)
}
