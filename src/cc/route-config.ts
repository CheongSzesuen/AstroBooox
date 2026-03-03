export type CcTab = 'publish' | 'review' | 'published' | 'audit' | 'settings'
export type CcSettingsSection = 'defaults' | 'account'

export type CcRouteState = {
  tab: CcTab
  settingsSection: CcSettingsSection
}

export const CC_PATHS = {
  root: '/cc',
  login: '/cc/login',
  publish: '/cc/publish',
  pullRequest: '/cc/pullrequest',
  review: '/cc/review',
  published: '/cc/resource',
  auditLegacy: '/cc/audit',
  settings: '/cc/settings',
  settingsAccount: '/cc/settings/account'
} as const

export const CC_DEFAULT_ROUTE: CcRouteState = {
  tab: 'publish',
  settingsSection: 'defaults'
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
    return state.settingsSection === 'account' ? CC_PATHS.settingsAccount : CC_PATHS.settings
  }
  if (state.tab === 'publish') return CC_PATHS.publish
  if (state.tab === 'review') return CC_PATHS.pullRequest
  if (state.tab === 'published') return CC_PATHS.published
  return CC_PATHS.review
}

export const resolveCcRouteFromPath = (pathname: string): CcRouteState => {
  const normalized = normalizeCcPath(pathname)
  const segments = normalized.split('/').filter(Boolean)
  if (segments[0] !== 'cc') return CC_DEFAULT_ROUTE
  const section = segments[1] || 'publish'
  if (section === 'publish') return { tab: 'publish', settingsSection: 'defaults' }
  if (section === 'pullrequest') return { tab: 'review', settingsSection: 'defaults' }
  if (section === 'review') return { tab: 'audit', settingsSection: 'defaults' }
  if (section === 'resource') return { tab: 'published', settingsSection: 'defaults' }
  if (section === 'published') return { tab: 'published', settingsSection: 'defaults' }
  if (section === 'audit') return { tab: 'audit', settingsSection: 'defaults' }
  if (section === 'settings') {
    return {
      tab: 'settings',
      settingsSection: segments[2] === 'account' ? 'account' : 'defaults'
    }
  }
  return CC_DEFAULT_ROUTE
}

export const isCcLoginPath = (pathname: string): boolean =>
  normalizeCcPath(pathname) === CC_PATHS.login
