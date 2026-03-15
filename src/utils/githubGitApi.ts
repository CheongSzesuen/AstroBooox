import { createGitHubClient, normalizeGitHubError } from '@/utils/githubOctokitClient'

export interface GitHubUser {
  login: string
  name: string | null
  html_url: string
  avatar_url: string
}

export interface GitHubAuthenticatedProfile extends GitHubUser {
  id?: number
  node_id?: string
  company?: string | null
  blog?: string | null
  location?: string | null
  email?: string | null
  bio?: string | null
  twitter_username?: string | null
  public_repos?: number
  followers?: number
  following?: number
  created_at?: string
  updated_at?: string
}

export interface GitHubRepository {
  name: string
  full_name: string
  default_branch: string
  html_url: string
  description?: string | null
  updated_at?: string
  owner: {
    login: string
    avatar_url?: string
  }
}

export interface GitHubOwnedRepositorySummary {
  name: string
  fullName: string
  owner: string
  htmlUrl: string
  description: string
  defaultBranch: string
  updatedAt: string
}

export interface RepositoryFile {
  path: string
  sha: string
  size: number
  content: string
  htmlUrl: string
  downloadUrl: string | null
}

export interface CommitResult {
  commitSha: string
  commitUrl: string
  branch: string
}

export interface PullRequestResult {
  number: number
  htmlUrl: string
  title: string
}

export type RepositoryCollaboratorPermission = 'pull' | 'push' | 'admin' | 'maintain' | 'triage'

export interface InviteCollaboratorResult {
  status: number
  invitationId: number | null
  invitationUrl: string | null
}

export interface RepositoryCollaborator {
  login: string
  avatarUrl: string
  htmlUrl: string
}

export interface GitHubUserSearchResult {
  login: string
  avatarUrl: string
  htmlUrl: string
}

interface GitHubApiError extends Error {
  status?: number
}

const makeApiError = (status: number, message: string): GitHubApiError => {
  const error = new Error(message) as GitHubApiError
  error.status = status
  return error
}

const requestJson = async <T>(path: string, token: string, init?: RequestInit): Promise<T> => {
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
    throw makeApiError(normalized.status || 500, normalized.message)
  }
}

const encodeContentPath = (path: string): string =>
  path
    .split('/')
    .filter(segment => segment.length > 0)
    .map(segment => encodeURIComponent(segment))
    .join('/')

const toBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

const fromBase64 = (base64Text: string): string => {
  const normalized = base64Text.replace(/\n/g, '')
  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export const verifyToken = async (token: string): Promise<GitHubUser> => {
  if (!token.trim()) {
    throw new Error('Token 不能为空')
  }
  return requestJson<GitHubUser>('/user', token)
}

export const getAuthenticatedProfile = async (token: string): Promise<GitHubAuthenticatedProfile> => {
  if (!token.trim()) {
    throw new Error('Token 不能为空')
  }
  return requestJson<GitHubAuthenticatedProfile>('/user', token)
}

export const getUserByLogin = async (token: string, login: string): Promise<GitHubUser> => {
  const normalizedLogin = login.trim()
  if (!normalizedLogin) {
    throw new Error('Owner 不能为空')
  }
  return requestJson<GitHubUser>(`/users/${encodeURIComponent(normalizedLogin)}`, token)
}

export const createRepository = async (
  token: string,
  name: string,
  description: string
): Promise<GitHubRepository> => {
  if (!name.trim()) {
    throw new Error('仓库名不能为空')
  }

  return requestJson<GitHubRepository>('/user/repos', token, {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      private: false,
      auto_init: true
    })
  })
}

export const listAuthenticatedRepositories = async (params: {
  token: string
  perPage?: number
  maxPages?: number
}): Promise<GitHubOwnedRepositorySummary[]> => {
  const { token, perPage = 100, maxPages = 5 } = params
  if (!token.trim()) throw new Error('Token 不能为空')

  const resolvedPerPage = Math.min(Math.max(perPage, 1), 100)
  const resolvedMaxPages = Math.min(Math.max(maxPages, 1), 10)
  const repositories: GitHubOwnedRepositorySummary[] = []

  for (let page = 1; page <= resolvedMaxPages; page++) {
    const response = await requestJson<GitHubRepository[]>(
      `/user/repos?affiliation=owner&sort=updated&per_page=${resolvedPerPage}&page=${page}`,
      token
    )

    repositories.push(
      ...response
        .map((repo) => ({
          name: repo.name || '',
          fullName: repo.full_name || '',
          owner: repo.owner?.login || '',
          htmlUrl: repo.html_url || '',
          description: repo.description?.trim() || '',
          defaultBranch: repo.default_branch || 'main',
          updatedAt: repo.updated_at || ''
        }))
        .filter((repo) => Boolean(repo.name && repo.owner))
    )

    if (response.length < resolvedPerPage) {
      break
    }
  }

  return repositories
}

export const inviteRepositoryCollaborator = async (params: {
  token: string
  owner: string
  repo: string
  username: string
  permission?: RepositoryCollaboratorPermission
}): Promise<InviteCollaboratorResult> => {
  const { token, owner, repo, username, permission = 'push' } = params
  const resolvedOwner = owner.trim()
  const resolvedRepo = repo.trim()
  const resolvedUsername = username.trim()

  if (!token.trim()) throw new Error('Token 不能为空')
  if (!resolvedOwner) throw new Error('仓库 Owner 不能为空')
  if (!resolvedRepo) throw new Error('仓库名不能为空')
  if (!resolvedUsername) throw new Error('协作者用户名不能为空')

  const { rest } = createGitHubClient(token)
  try {
    const response = await rest.request(
      'PUT /repos/{owner}/{repo}/collaborators/{username}',
      {
        owner: resolvedOwner,
        repo: resolvedRepo,
        username: resolvedUsername,
        permission
      }
    )
    const payload = (response.data && typeof response.data === 'object')
      ? (response.data as { id?: number; html_url?: string })
      : null
    return {
      status: response.status,
      invitationId: payload?.id ?? null,
      invitationUrl: payload?.html_url ?? null
    }
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw makeApiError(normalized.status || 500, normalized.message)
  }
}

export const listRepositoryCollaborators = async (params: {
  token: string
  owner: string
  repo: string
}): Promise<RepositoryCollaborator[]> => {
  const { token, owner, repo } = params
  const resolvedOwner = owner.trim()
  const resolvedRepo = repo.trim()
  if (!token.trim()) throw new Error('Token 不能为空')
  if (!resolvedOwner) throw new Error('仓库 Owner 不能为空')
  if (!resolvedRepo) throw new Error('仓库名不能为空')

  try {
    const response = await requestJson<Array<{
      login?: string
      avatar_url?: string
      html_url?: string
    }>>(
      `/repos/${resolvedOwner}/${resolvedRepo}/collaborators?per_page=100`,
      token
    )
    return response
      .map(item => ({
        login: item.login || '',
        avatarUrl: item.avatar_url || 'https://github.com/ghost.png',
        htmlUrl: item.html_url || (item.login ? `https://github.com/${item.login}` : '')
      }))
      .filter(item => !!item.login)
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw makeApiError(normalized.status || 500, normalized.message)
  }
}

export const searchGitHubUsers = async (params: {
  token: string
  query: string
  perPage?: number
}): Promise<GitHubUserSearchResult[]> => {
  const { token, query, perPage = 8 } = params
  const normalizedQuery = query.trim()
  if (!token.trim()) throw new Error('Token 不能为空')
  if (!normalizedQuery) return []
  const resolvedPerPage = Math.min(Math.max(perPage, 1), 20)

  try {
    const payload = await requestJson<{
      items?: Array<{ login?: string; avatar_url?: string; html_url?: string }>
    }>(
      `/search/users?q=${encodeURIComponent(normalizedQuery)}&per_page=${resolvedPerPage}`,
      token
    )
    return (payload.items || [])
      .map(item => ({
        login: item.login || '',
        avatarUrl: item.avatar_url || 'https://github.com/ghost.png',
        htmlUrl: item.html_url || (item.login ? `https://github.com/${item.login}` : '')
      }))
      .filter(item => !!item.login)
  } catch (error: unknown) {
    const normalized = normalizeGitHubError(error)
    throw makeApiError(normalized.status || 500, normalized.message)
  }
}

export const readRepositoryFile = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<RepositoryFile> => {
  const encodedPath = encodeContentPath(filePath)
  if (!encodedPath) {
    throw new Error('文件路径不能为空')
  }

  const response = await requestJson<{
    type: string
    path: string
    sha: string
    size: number
    content?: string
    html_url?: string
    download_url?: string | null
  }>(
    `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    token
  )

  if (response.type !== 'file') {
    throw new Error('目标路径不是文件')
  }

  if (!response.content) {
    throw new Error('文件内容为空，可能是二进制文件或超大文件')
  }

  return {
    path: response.path,
    sha: response.sha,
    size: response.size,
    content: fromBase64(response.content),
    htmlUrl: response.html_url || '',
    downloadUrl: response.download_url || null
  }
}

export const commitTextFile = async (params: {
  token: string
  owner: string
  repo: string
  branch: string
  filePath: string
  fileContent: string
  commitMessage: string
}): Promise<CommitResult> => {
  const { token, owner, repo, branch, filePath, fileContent, commitMessage } = params
  const encodedPath = encodeContentPath(filePath)

  if (!encodedPath) throw new Error('文件路径不能为空')
  if (!commitMessage.trim()) throw new Error('提交信息不能为空')

  const refData = await requestJson<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    token
  )
  const parentSha = refData.object.sha

  const commitData = await requestJson<{ tree: { sha: string } }>(
    `/repos/${owner}/${repo}/git/commits/${parentSha}`,
    token
  )
  const baseTreeSha = commitData.tree.sha

  const blobData = await requestJson<{ sha: string }>(
    `/repos/${owner}/${repo}/git/blobs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        content: toBase64(fileContent),
        encoding: 'base64'
      })
    }
  )

  const treeData = await requestJson<{ sha: string }>(
    `/repos/${owner}/${repo}/git/trees`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          }
        ]
      })
    }
  )

  const newCommit = await requestJson<{ sha: string; html_url?: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage.trim(),
        tree: treeData.sha,
        parents: [parentSha]
      })
    }
  )

  await requestJson<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false
      })
    }
  )

  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url || `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    branch
  }
}

export const createPullRequest = async (params: {
  token: string
  baseOwner: string
  baseRepo: string
  baseBranch: string
  headOwner: string
  headBranch: string
  title: string
  body?: string
}): Promise<PullRequestResult> => {
  const { token, baseOwner, baseRepo, baseBranch, headOwner, headBranch, title, body } = params
  if (!title.trim()) throw new Error('PR 标题不能为空')

  const response = await requestJson<{
    number: number
    html_url: string
    title: string
  }>(`/repos/${baseOwner}/${baseRepo}/pulls`, token, {
    method: 'POST',
    body: JSON.stringify({
      title: title.trim(),
      body: body?.trim() || undefined,
      base: baseBranch,
      head: `${headOwner}:${headBranch}`
    })
  })

  return {
    number: response.number,
    htmlUrl: response.html_url,
    title: response.title
  }
}
