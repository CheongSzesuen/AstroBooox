export type CcTab = 'publish' | 'pullrequest' | 'published' | 'resource_edit' | 'review' | 'settings'
export type CcSettingsSection = 'defaults' | 'account' | 'about'

export type CcRouteState = {
  tab: CcTab
  settingsSection: CcSettingsSection
  resourceDetailKey?: string
  pullRequestNumber?: number
  pullRequestTargetRepo?: string
  requireGhUser?: boolean
  editResourceId?: string
  editTargetRepo?: string
  editUser?: string
}

export const CC_PATHS = {
  root: '/cc',
  login: '/cc/login',
  publish: '/cc/publish',
  pullRequest: '/cc/pullrequest',
  review: '/cc/review',
  published: '/cc/resource',
  resourceEdit: '/cc/resource/edit',
  settings: '/cc/settings',
  settingsAccount: '/cc/settings/account',
  settingsAbout: '/cc/settings/about'
} as const

export const CC_DEFAULT_ROUTE: CcRouteState = {
  tab: 'publish',
  settingsSection: 'defaults',
  resourceDetailKey: '',
  pullRequestNumber: 0,
  pullRequestTargetRepo: '',
  requireGhUser: false,
  editResourceId: '',
  editTargetRepo: '',
  editUser: ''
}

export const normalizeCcPath = (path?: string): string => {
  if (!path) return CC_PATHS.root
  const value = path.trim()
  if (!value || value === '/') return CC_PATHS.root
  const leading = value.startsWith('/') ? value : `/${value}`
  const normalized = leading.replace(/\/+$/, '')
  return normalized || CC_PATHS.root
}

export const buildCcPath = (state: CcRouteState): string => {
  if (state.tab === 'settings') {
    if (state.settingsSection === 'account') return CC_PATHS.settingsAccount
    if (state.settingsSection === 'about') return CC_PATHS.settingsAbout
    return CC_PATHS.settings
  }
  if (state.tab === 'published') {
    const key = (state.resourceDetailKey || '').trim()
    if (key) return `${CC_PATHS.published}/${encodeURIComponent(key)}`
    return CC_PATHS.published
  }
  if (state.tab === 'publish') return CC_PATHS.publish
  if (state.tab === 'pullrequest') {
    const prNumber = Number(state.pullRequestNumber || 0)
    if (Number.isInteger(prNumber) && prNumber > 0) {
      return `${CC_PATHS.pullRequest}/${prNumber}`
    }
    return CC_PATHS.pullRequest
  }
  if (state.tab === 'resource_edit') return CC_PATHS.resourceEdit
  return CC_PATHS.review
}

export const resolveCcRouteFromPath = (pathname: string): CcRouteState => {
  const normalized = normalizeCcPath(pathname)
  const segments = normalized.split('/').filter(Boolean)
  if (segments[0] !== 'cc') return CC_DEFAULT_ROUTE
  const section = segments[1] || 'publish'
  if (section === 'publish') return { tab: 'publish', settingsSection: 'defaults', resourceDetailKey: '', pullRequestNumber: 0, pullRequestTargetRepo: '', requireGhUser: false }
  if (section === 'pullrequest') {
    const rawPrNumber = Number(segments[2] || 0)
    return {
      tab: 'pullrequest',
      settingsSection: 'defaults',
      resourceDetailKey: '',
      pullRequestNumber: Number.isInteger(rawPrNumber) && rawPrNumber > 0 ? rawPrNumber : 0,
      pullRequestTargetRepo: '',
      requireGhUser: false
    }
  }
  if (section === 'review') return { tab: 'review', settingsSection: 'defaults', resourceDetailKey: '', pullRequestNumber: 0, pullRequestTargetRepo: '', requireGhUser: false }
  if (section === 'resource' && segments[2] === 'edit') return { tab: 'resource_edit', settingsSection: 'defaults', resourceDetailKey: '', pullRequestNumber: 0, pullRequestTargetRepo: '', requireGhUser: false }
  if (section === 'resource') {
    const detailKey = segments[2] ? decodeURIComponent(segments[2]) : ''
    return { tab: 'published', settingsSection: 'defaults', resourceDetailKey: detailKey, pullRequestNumber: 0, pullRequestTargetRepo: '', requireGhUser: false }
  }
  if (section === 'published') return { tab: 'published', settingsSection: 'defaults', resourceDetailKey: '', pullRequestNumber: 0, pullRequestTargetRepo: '', requireGhUser: false }
  if (section === 'settings') {
    const settingsSegment = segments[2]
    return {
      tab: 'settings',
      settingsSection: settingsSegment === 'account' ? 'account' : settingsSegment === 'about' ? 'about' : 'defaults',
      resourceDetailKey: '',
      pullRequestNumber: 0,
      pullRequestTargetRepo: '',
      requireGhUser: false
    }
  }
  return CC_DEFAULT_ROUTE
}

export const isCcLoginPath = (pathname: string): boolean =>
  normalizeCcPath(pathname) === CC_PATHS.login
