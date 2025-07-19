<!-- src/components/Footer.vue -->
<template>
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
        © 2025 <a href="https://github.com/CheongSzesuen" target="_blank" rel="noopener noreferrer">WaiJade</a> Open Source On GitHub
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showTerms = ref(false)

const toggleTerms = () => {
  showTerms.value = !showTerms.value
}
</script>

<style scoped>
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

:root {
  --color-primary: #2563eb;
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-bg-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>