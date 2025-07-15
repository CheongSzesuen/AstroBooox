<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="navbar" role="navigation" aria-label="主菜单">
      <div class="nav-buttons">
        <button 
          @click="setMode('manifest')" 
          :class="{ active: mode === 'manifest' }"
          :aria-pressed="mode === 'manifest' ? 'true' : 'false'"
        >
          <svg width="18" height="18" viewBox="0 0 1024 1024" class="nav-icon">
            <path d="M213.333333 128h85.333334v85.333333H213.333333v213.333334a85.333333 85.333333 0 0 1-85.333333 85.333333 85.333333 85.333333 0 0 1 85.333333 85.333333v213.333334h85.333334v85.333333H213.333333c-45.653333-11.52-85.333333-38.4-85.333333-85.333333v-170.666667a85.333333 85.333333 0 0 0-85.333333-85.333333H0v-85.333334h42.666667a85.333333 85.333333 0 0 0 85.333333-85.333333V213.333333a85.333333 85.333333 0 0 1 85.333333-85.333333m597.333334 0a85.333333 85.333333 0 0 1 85.333333 85.333333v170.666667a85.333333 85.333333 0 0 0 85.333333 85.333333h42.666667v85.333334h-42.666667a85.333333 85.333333 0 0 0-85.333333 85.333333v170.666667a85.333333 85.333333 0 0 1-85.333333 85.333333h-85.333334v-85.333333h85.333334v-213.333334a85.333333 85.333333 0 0 1 85.333333-85.333333 85.333333 85.333333 0 0 1-85.333333-85.333333V213.333333h-85.333334V128h85.333334m-298.666667 512a42.666667 42.666667 0 0 1 42.666667 42.666667 42.666667 42.666667 0 0 1-42.666667 42.666666 42.666667 42.666667 0 0 1-42.666667-42.666666 42.666667 42.666667 0 0 1 42.666667-42.666667m-170.666667 0a42.666667 42.666667 0 0 1 42.666667 42.666667 42.666667 42.666667 0 0 1-42.666667 42.666666 42.666667 42.666667 0 0 1-42.666666-42.666666 42.666667 42.666667 0 0 1 42.666666-42.666667m341.333334 0a42.666667 42.666667 0 0 1 42.666666 42.666667 42.666667 42.666667 0 0 1-42.666666 42.666666 42.666667 42.666667 0 0 1-42.666667-42.666666 42.666667 42.666667 0 0 1 42.666667-42.666667z" fill="currentColor"/>
          </svg>
          <span>manifest内容</span>
        </button>
        <button 
          @click="setMode('csv')" 
          :class="{ active: mode === 'csv' }"
          :aria-pressed="mode === 'csv' ? 'true' : 'false'"
        >
          <svg width="18" height="18" viewBox="0 0 1024 1024" class="nav-icon">
            <path d="M392.4992 61.44a30.72 30.72 0 1 0-61.44 0h61.44zM331.0592 962.56a30.72 30.72 0 1 0 61.44 0h-61.44zM962.56 392.5504a30.72 30.72 0 1 0 0-61.44v61.44zM61.44 331.1104a30.72 30.72 0 0 0 0 61.44v-61.44z m901.0176 361.7792a30.72 30.72 0 1 0 0-61.44v61.44zM61.44 631.4496a30.72 30.72 0 1 0 0 61.44v-61.44zM331.0592 61.4912v901.0176h61.44V61.4912h-61.44zM962.56 331.1104H61.44v61.44h901.0176v-61.44z m0 300.3392H61.44v61.44h901.0176v-61.44zM887.3984 30.7712H136.5504v61.44h750.848V30.72zM136.5504 30.72A105.8304 105.8304 0 0 0 30.7712 136.5504h61.44c0-24.4736 19.8656-44.3392 44.3392-44.3392V30.72zM30.7712 136.5504v750.8992h61.44V136.5504H30.72z m0 750.8992c0 58.368 47.36 105.7792 105.7792 105.7792v-61.44a44.3392 44.3392 0 0 1-44.3392-44.3392H30.72z m105.7792 105.7792h750.848v-61.44H136.5504v61.44z m750.848 0a105.7792 105.7792 0 0 0 105.8304-105.7792h-61.44a44.3392 44.3392 0 0 1-44.3904 44.3392v61.44z m105.8304-105.7792V136.5504h-61.44v750.8992h61.44z m0-750.8992A105.7792 105.7792 0 0 0 887.3984 30.7712v61.44c24.5248 0 44.3904 19.8656 44.3904 44.3392h61.44z" fill="currentColor"/>
          </svg>
          <span>CSV 生成</span>
        </button>
      </div>
    </nav>

    <!-- 内容区域 -->
    <main class="content">
      <component :is="currentComponent" />
    </main>

    <!-- 页脚 -->
    <footer class="app-footer" role="contentinfo">
      <div class="footer-content">
        <div class="footer-links">
          <a href="https://github.com/CheongSzesuen/AstroBooox" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M12 2C6.475 2 2 6.475 2 12a9.994 9.994 0 0 0 6.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.338 1.087 2.912.825.088-.65.35-1.087.638-1.337-2.225-.25-4.55-1.113-4.55-4.938 0-1.088.387-1.987 1.025-2.688-.1-.25-.45-1.275.1-2.65 0 0 .837-.262 2.75 1.026a9.28 9.28 0 0 1 2.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.016 10.016 0 0 0 22 12c0-5.525-4.475-10-10-10z" fill="currentColor"/>
            </svg>
            AstroBooox
          </a>
          <div class="terms-container">
            <button @click="toggleTerms" class="terms-button">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M12 1l9.5 5.5v11L12 23l-9.5-5.5v-11L12 1zm0 2.311L4.5 7.653v8.694l7.5 4.342 7.5-4.342V7.653L12 3.311zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>
              </svg>
              使用须知
            </button>
            <div class="terms-content" :class="{ active: showTerms }">
              <p>AstroBooox与AstroBox无所属关系，只是为AstroBox提交更新时的编辑信息提供方便的工具箱。如有BUG请在GitHub提issue。感谢AstroBox开发者的辛勤付出！</p>
            </div>
          </div>
        </div>
        <p class="copyright">
          © 2025 <a href="https://github.com/WaiJade" target="_blank" rel="noopener noreferrer">WaiJade</a> Open Source On GitHub
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ManifestEditor from '../components/ManifestEditor.vue'
import CSVEGenerator from '../components/CSVEGenerator.vue'
import type { AppMode } from '../type/manifest'

const mode = ref<AppMode>('manifest')
const setMode = (newMode: AppMode) => {
  mode.value = newMode
}

const currentComponent = computed(() => {
  return mode.value === 'manifest' ? ManifestEditor : CSVEGenerator
})

// 使用须知展开状态
const showTerms = ref(false)
const toggleTerms = () => {
  showTerms.value = !showTerms.value
}
</script>

<style scoped>
/* 基础样式变量 */
:root {
  --color-primary: #2563eb;
  --color-primary-light: rgba(37, 99, 235, 0.1);
  --color-primary-hover: #1d4ed8;
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --color-hover-border: #d1d5db;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

/* 导航栏样式 - 磨砂玻璃效果 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff80;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 0 1rem;
  z-index: 1000;
  font-family: "MiSans", system-ui, sans-serif;
  height: 48px;
  width: 100vw;
  user-select: none;
  transition: background 0.25s ease-in-out, border-color 0.25s ease-in-out;
}

.nav-buttons {
  display: flex;
  gap: 1rem;
}

/* 导航按钮样式 */
.navbar button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid transparent;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 30px;
  transition: var(--transition);
}

.navbar button:hover {
  color: var(--color-text);
  border-color: var(--color-hover-border);
  background: rgba(0, 0, 0, 0.02);
}

.navbar button.active {
  color: var(--color-primary);
  border-color: var(--color-primary-light);
  background: var(--color-primary-light);
}

.navbar button.active:hover {
  border-color: var(--color-primary-hover);
}

/* 移除所有紫色焦点效果 */
button:focus,
button:focus-visible {
  outline: none;
}

.nav-icon {
  flex-shrink: 0;
  transition: var(--transition);
}

/* 内容区域 */
.content {
  flex: 1;
  padding: 1rem 2rem;
  width: 100%;
  box-sizing: border-box;
  margin-top: 48px;
  min-height: calc(100vh - 48px - 80px);
}

/* 页脚样式 */
.app-footer {
  background: var(--color-bg-secondary);
  padding: 1.5rem 0;
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
}

.footer-links a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-light);
  text-decoration: none;
  transition: var(--transition);
  font-size: 0.9375rem;
}

.footer-links a:hover {
  color: var(--color-primary);
}

/* 使用须知样式 */
.terms-container {
  position: relative;
}

.terms-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 0.9375rem;
  padding: 0;
  transition: var(--transition);
}

.terms-button:hover {
  color: var(--color-primary);
}

.terms-content {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
  background: white;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-md);
  padding: 1rem;
  margin-bottom: 0.5rem;
  opacity: 0;
  visibility: hidden;
  transition: var(--transition);
  z-index: 10;
}

.terms-content.active {
  opacity: 1;
  visibility: visible;
}

.terms-content p {
  margin: 0;
  color: var(--color-text);
  font-size: 0.875rem;
  line-height: 1.5;
}

.copyright {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-light);
  font-size: 0.875rem;
  margin: 0;
}

.copyright a {
  color: var(--color-primary);
  text-decoration: none;
  transition: var(--transition);
}

.copyright a:hover {
  text-decoration: underline;
}
</style>