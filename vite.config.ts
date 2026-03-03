import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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

const commitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CI_COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  resolveGitCommitSha()
const buildTimestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const buildVersion = `${commitSha.slice(0, 12)}-${buildTimestamp}`
const appVersion = process.env.npm_package_version || '0.0.0'
const appName = process.env.npm_package_name || 'AstroBooox'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_NAME__: JSON.stringify(appName),
    __BUILD_COMMIT_SHA__: JSON.stringify(commitSha.slice(0, 12)),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp)
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        cc: path.resolve(__dirname, 'cc/index.html'),
        ccHelp: path.resolve(__dirname, 'cc/help/index.html')
      }
    }
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
