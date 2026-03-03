import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

import { cloudflare } from "@cloudflare/vite-plugin";

const appVersion =
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.CI_COMMIT_SHA ||
  `${Date.now()}`

export default defineConfig({
  plugins: [vue(), cloudflare()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
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