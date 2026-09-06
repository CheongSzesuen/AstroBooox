import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'node:child_process'

const resolveGitCommitSha = (): string => {
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'local'
  }
}

const resolveGitBranch = (): string => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const formatUtc8DateTime = (date: Date): string => {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

const formatRfc3339Utc8 = (date: Date): string => {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+08:00`
}

const commitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CI_COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  resolveGitCommitSha()
const buildBranch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_REF_NAME ||
  process.env.CI_COMMIT_REF_NAME ||
  resolveGitBranch()
const buildTimestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const buildVersion = `${commitSha.slice(0, 12)}-${buildTimestamp}`
const buildTimeUtc8 = formatUtc8DateTime(new Date())
const appVersion = process.env.npm_package_version || '0.0.0'
const appName = process.env.npm_package_name || 'AstroBooox'

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_NAME__: JSON.stringify(appName),
    __BUILD_COMMIT_SHA__: JSON.stringify(commitSha.slice(0, 12)),
    __BUILD_COMMIT_REF__: JSON.stringify(commitSha),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __BUILD_BRANCH__: JSON.stringify(buildBranch),
    __BUILD_TIME_UTC8__: JSON.stringify(buildTimeUtc8),
    __BUILD_TIME_RFC3339__: JSON.stringify(formatRfc3339Utc8(new Date()))
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
})
