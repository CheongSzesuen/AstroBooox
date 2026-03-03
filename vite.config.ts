import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const commitSha =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CI_COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  'local'
const buildTimestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const buildVersion = `${commitSha.slice(0, 12)}-${buildTimestamp}`

export default defineConfig({
  plugins: [vue()],
  base: '/',
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion)
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
