<template>
  <div class="relative min-h-screen lg:grid lg:grid-cols-[1.18fr_0.82fr]">
    <div class="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex">
      <div class="absolute inset-0 bg-zinc-900" />
      <div class="relative z-20 flex items-center text-lg font-medium">
        <Code :size="22" weight="duotone" class="mr-2" />
        AstroBooox Creator Console
      </div>

      <CcInteractiveGrid
        class="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(460px_circle_at_center,white,transparent)]"
      />

      <div class="relative z-20 mt-auto space-y-4">
        <blockquote class="space-y-2">
          <p class="text-lg leading-8">
            “所有操作都由你的 GitHub Token 驱动，进入控制台前先完成一次 Token 验证。”
          </p>
          <footer class="text-sm text-zinc-300">Token Session Gate</footer>
        </blockquote>
      </div>
    </div>

    <div class="relative min-h-screen overflow-hidden p-6 text-white sm:p-8 lg:hidden">
      <div class="absolute inset-0 bg-zinc-900" />
      <div class="relative z-20 flex items-center text-lg font-medium">
        <Code :size="22" weight="duotone" class="mr-2" />
        AstroBooox Creator Console
      </div>

      <CcInteractiveGrid
        class="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(420px_circle_at_center,white,transparent)]"
      />

      <div class="relative z-20 mt-auto space-y-2 pb-2">
        <p class="text-base leading-7">“请先完成 Token 验证后再进入控制台。”</p>
      </div>
    </div>

    <div
      class="cc-login-panel absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-black/15 via-black/30 to-black/45 p-4 backdrop-blur-[1px] sm:p-6 lg:static lg:z-auto lg:min-h-screen lg:bg-none lg:bg-background lg:p-8 lg:backdrop-blur-none"
    >
      <div class="w-full max-w-md space-y-6">
        <div class="space-y-2 text-center lg:text-left">
          <h2 class="cc-login-title text-2xl font-semibold tracking-tight text-white lg:text-foreground">
            Token 登录
          </h2>
          <p class="cc-login-desc text-sm text-zinc-100/90 lg:text-muted-foreground">
            输入 GitHub Token 后进入 Creator Console。
          </p>
        </div>

        <Card class="cc-login-card border-zinc-200 bg-white/95 text-zinc-900 shadow-xl backdrop-blur">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">认证凭据</CardTitle>
            <CardDescription>不会写入 localStorage，仅在当前页面会话中使用。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 pt-0">
            <div class="space-y-1.5">
              <Label for="cc-token">GitHub Token</Label>
              <Input
                id="cc-token"
                v-model="token"
                :type="showToken ? 'text' : 'password'"
                placeholder="ghp_xxx / github_pat_xxx"
                autocomplete="off"
                @keydown.enter="handleSignIn"
              />
            </div>

            <div class="flex items-center gap-2">
              <Button variant="outline" class="h-9" @click="showToken = !showToken">
                <Eye :size="16" weight="duotone" />
                {{ showToken ? '隐藏' : '显示' }}
              </Button>
              <Button class="h-9 flex-1" :disabled="loading || !token.trim()" @click="handleSignIn">
                <SignIn :size="16" weight="duotone" />
                {{ loading ? '校验中...' : '验证并进入' }}
              </Button>
            </div>

            <p v-if="errorMessage" class="text-xs text-destructive">
              {{ errorMessage }}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PhCode as Code, PhEye as Eye, PhSignIn as SignIn } from '@phosphor-icons/vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCcSession } from '@/composables/useCcSession'
import { verifyToken } from '@/utils/githubGitApi'
import CcInteractiveGrid from './CcInteractiveGrid.vue'

const emit = defineEmits<{
  authenticated: []
}>()

const { token, setSessionUser } = useCcSession()
const loading = ref(false)
const showToken = ref(false)
const errorMessage = ref('')

const handleSignIn = async (): Promise<void> => {
  try {
    errorMessage.value = ''
    loading.value = true
    const user = await verifyToken(token.value.trim())
    setSessionUser(user)
    emit('authenticated')
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Token 校验失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@media (min-width: 1024px) and (prefers-color-scheme: dark) {
  .cc-login-panel {
    background: #09090b;
  }

  .cc-login-title {
    color: #f4f4f5;
  }

  .cc-login-desc {
    color: rgba(228, 228, 231, 0.9);
  }

}
</style>
