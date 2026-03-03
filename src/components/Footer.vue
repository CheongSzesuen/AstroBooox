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
          <Button
            variant="ghost"
            size="sm"
            class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            @click="showTerms = true"
          >
            <Info :size="16" weight="duotone" />
            使用须知
          </Button>
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

      <p class="m-0 text-xs text-muted-foreground/90" :title="appVersion">
        当前版本：{{ appVersionDisplay }}
      </p>
    </div>

    <Dialog :open="showTerms" @update:open="showTerms = $event">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>使用须知</DialogTitle>
          <DialogDescription class="leading-6">
            AstroBooox 与 AstroBox 无所属关系，仅作为提交资源信息的效率工具。
            如有问题请在 GitHub 提交 issue。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="sm:justify-between">
          <Button variant="outline" as="a" href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank">
            提交 Issue
          </Button>
          <Button @click="showTerms = false">我知道了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </footer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhGithubLogo as GithubLogo, PhInfo as Info } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

const showTerms = ref(false)
const appVersion = __APP_VERSION__
const appVersionDisplay = computed(() => {
  if (!appVersion) return 'unknown'
  return appVersion.length > 12 ? appVersion.slice(0, 12) : appVersion
})
</script>
