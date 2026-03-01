<template>
  <footer class="mt-auto border-t border-border/80 bg-card/70" role="contentinfo">
    <div class="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-3 px-4 py-6">
      <div class="flex flex-wrap items-center justify-center gap-4">
        <a
          href="https://github.com/CheongSzesuen/AstroBooox"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubLogo :size="16" weight="duotone" />
          AstroBooox
        </a>

        <div class="flex flex-col items-center gap-2">
          <button
            class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            @click="toggleTerms"
          >
            <Info :size="16" weight="duotone" />
            使用须知
          </button>
          <p v-if="showTerms" class="m-0 max-w-[620px] text-center text-[13px] leading-6 text-muted-foreground">
            AstroBooox 与 AstroBox 无所属关系，仅作为提交资源信息的效率工具。 如有问题请在 GitHub 提交 issue。
          </p>
        </div>
      </div>

      <p class="m-0 text-[13px] text-muted-foreground">
        © 2025
        <a
          class="text-primary hover:underline"
          href="https://github.com/CheongSzesuen"
          target="_blank"
          rel="noopener noreferrer"
        >
          WaiJade
        </a>
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
