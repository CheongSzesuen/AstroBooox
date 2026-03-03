const BUILD_VERSION_KEY = 'astrobooox.build.version'

// 仅清理缓存项，保留用户设置项，避免每次更新都丢失偏好
const shouldRemoveOnBuildChange = (key: string): boolean => {
  return key.startsWith('avatar_')
}

export const syncBuildStorage = (): void => {
  if (typeof window === 'undefined') return

  const local = window.localStorage
  const previousBuildVersion = local.getItem(BUILD_VERSION_KEY)
  const currentBuildVersion = __BUILD_VERSION__

  if (previousBuildVersion === currentBuildVersion) return

  const keysToRemove: string[] = []
  for (let i = 0; i < local.length; i += 1) {
    const key = local.key(i)
    if (!key) continue
    if (shouldRemoveOnBuildChange(key)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => local.removeItem(key))
  local.setItem(BUILD_VERSION_KEY, currentBuildVersion)
}
