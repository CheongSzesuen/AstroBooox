<template>
  <footer class="app-footer" role="contentinfo">
    <div class="footer-content">
      <div class="footer-links">
        <a href="https://github.com/CheongSzesuen/AstroBooox" target="_blank" rel="noopener noreferrer">
          <GithubLogo :size="16" weight="duotone" />
          AstroBooox
        </a>

        <div class="terms-container">
          <button class="terms-button" @click="toggleTerms">
            <Info :size="16" weight="duotone" />
            使用须知
          </button>
          <p v-if="showTerms" class="terms-content">
            AstroBooox 与 AstroBox 无所属关系，仅作为提交资源信息的效率工具。
            如有问题请在 GitHub 提交 issue。
          </p>
        </div>
      </div>

      <p class="copyright">
        © 2025
        <a href="https://github.com/CheongSzesuen" target="_blank" rel="noopener noreferrer">WaiJade</a>
        Open Source on GitHub
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PhGithubLogo as GithubLogo, PhInfo as Info } from '@phosphor-icons/vue'

const showTerms = ref(false)

const toggleTerms = (): void => {
  showTerms.value = !showTerms.value
}
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--card) 72%, transparent);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.footer-links a,
.terms-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.875rem;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.footer-links a:hover,
.terms-button:hover {
  color: var(--foreground);
}

.terms-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.terms-content {
  margin: 0;
  max-width: 620px;
  text-align: center;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.copyright {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.8125rem;
}

.copyright a {
  color: var(--primary);
}
</style>
