<template>
  <div class="relative min-h-screen overflow-hidden bg-background lg:grid lg:min-h-[100dvh] lg:grid-cols-[1.18fr_0.82fr]">
    <div class="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex lg:min-h-[100dvh]">
      <div class="absolute inset-0 bg-zinc-900" />
      <div class="relative z-20 flex items-center text-lg font-bold">
        <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" class="mr-2 h-6 w-6" />
        AstroBooox Creator Console
      </div>

      <CcInteractiveGrid
        class="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(460px_circle_at_center,white,transparent)]"
      />

      <div class="relative z-20 mt-auto space-y-4">
        <blockquote class="space-y-2">
          <p class="text-lg leading-8">
            基于浏览器的AstroBooox Creator Console 需要GitHub API提供接口
          </p>
          <p class="text-lg leading-8">
            所有填入的Token不会被上传，也不会被保存到浏览器本地，只用于当前会话
          </p>
          <footer class="text-sm text-zinc-300">Token Session Gate</footer>
        </blockquote>
      </div>
    </div>

    <div class="relative min-h-screen overflow-hidden p-6 text-white sm:p-8 lg:hidden">
      <div class="absolute inset-0 bg-zinc-900" />
      <div class="relative z-20 flex items-center text-lg font-bold">
        <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" class="mr-2 h-6 w-6" />
        AstroBooox Creator Console
      </div>

      <CcInteractiveGrid
        :cell-size="48"
        class="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(420px_circle_at_center,white,transparent)]"
      />
    </div>

    <div
      class="cc-login-panel absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-black/15 via-black/30 to-black/45 p-4 backdrop-blur-[1px] sm:p-6 lg:static lg:z-auto lg:h-full lg:min-h-[100dvh] lg:bg-none lg:bg-background lg:p-8 lg:backdrop-blur-none"
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

        <Card
          class="cc-login-card cc-login-light border-zinc-200 bg-white/95 text-zinc-900 shadow-xl backdrop-blur lg:border-zinc-700 lg:bg-zinc-900/90 lg:text-zinc-100"
        >
          <CardContent class="cc-signup-card-content flex items-start gap-3">
            <div
              class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50"
            >
              <GithubLogo :size="18" weight="duotone" />
            </div>
            <div class="space-y-1.5">
              <p class="text-sm font-semibold leading-5">AstroBox 提交资源必须使用 GitHub 帐号</p>
              <p class="text-xs leading-5 text-muted-foreground">
                如果你还没有 GitHub 帐号，请先创建，再回到当前页面使用 Token 登录。
              </p>
              <Button
                as="a"
                href="https://github.com/signup"
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                class="h-8"
              >
                前往 GitHub 创建账号
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          class="cc-login-card cc-login-light border-zinc-200 bg-white/95 text-zinc-900 shadow-xl backdrop-blur lg:border-zinc-700 lg:bg-zinc-900/90 lg:text-zinc-100"
        >
          <CardHeader class="pb-3">
            <CardTitle class="text-base">GitHub Token</CardTitle>
            <CardDescription>务必使用自己的GitHub Token</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3 pt-0">
            <div class="space-y-1.5">
              <!-- <Label for="cc-token">GitHub Token</Label> -->
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

            <p class="text-center text-xs text-muted-foreground">
              不会创建 Token？
              <a href="/cc/help/" class="text-primary underline underline-offset-4 hover:opacity-85">
                查看帮助
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  PhEye as Eye,
  PhGithubLogo as GithubLogo,
  PhSignIn as SignIn
} from '@phosphor-icons/vue'
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
.cc-login-light {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
}

@media (min-width: 1024px) {
  .cc-login-light {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 24%;
    --input: 0 0% 20%;
    --ring: 0 0% 83.1%;
  }
}

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

.cc-signup-card-content {
  padding: 1.25rem 1rem 1rem;
}

@media (min-width: 640px) {
  .cc-signup-card-content {
    padding: 1.5rem 1.25rem 1.25rem;
  }
}
</style>
