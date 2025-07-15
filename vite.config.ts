// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'types': path.resolve(__dirname, './src/type')
    },
    extensions: ['.js', '.vue', '.json', '.ts']
  },
  // 新增配置确保字体文件正确处理
  build: {
    assetsInlineLimit: 4096, // 4kb以下的文件会被内联
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (/\.(woff|woff2)$/.test(assetInfo.name || '')) {
            return 'fonts/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  server: {
    fs: {
      // 允许访问public目录
      allow: ['..']
    }
  }
})