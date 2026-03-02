<template>
  <div class="min-h-screen bg-background">
    <header
      class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-2 px-4 md:px-6">
        <a href="/cc/" class="text-sm text-muted-foreground hover:text-foreground">返回 /cc</a>
        <div class="h-4 w-px bg-border" />
        <h1 class="text-sm font-semibold text-foreground md:text-base">Token 创建教程</h1>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1120px] p-4 md:p-6">
      <div class="grid gap-4 md:grid-cols-[250px_minmax(0,1fr)] md:gap-6">
        <aside class="hidden rounded-xl border border-border bg-card p-3 md:block">
          <p class="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Developer Settings
          </p>
          <ul class="space-y-1">
            <li class="cc-side-item">GitHub Apps</li>
            <li class="cc-side-item">OAuth Apps</li>
            <li class="cc-side-item cc-side-item-parent">Personal access tokens</li>
            <li class="cc-side-item cc-side-item-active">Tokens (classic)</li>
          </ul>
        </aside>

        <section class="space-y-4">
          <div class="rounded-xl border border-border bg-card p-4 md:p-5">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tokens (classic)
            </p>
            <h1 class="mt-1 text-xl font-semibold leading-tight text-foreground md:text-2xl">
              New personal access token (classic)
            </h1>
            <p class="mt-2 text-sm text-muted-foreground">
              按照下方流程创建Token，不要分享给任何人。
            </p>
          </div>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">流程图</CardTitle>
              <CardDescription>完成 5 步即可生成可用的 classic token。</CardDescription>
            </CardHeader>
            <CardContent class="pt-0">
              <ol class="cc-flow">
                <li class="cc-flow-item">
                  <span class="cc-flow-index">1</span>
                  <div class="cc-flow-card">
                    <p class="text-sm font-semibold">打开创建页（直达）</p>
                    <p class="mt-1 text-sm text-muted-foreground">进入后就是新建 classic token 表单。</p>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" class="font-mono text-[11px]">
                        https://github.com/settings/tokens/new
                      </Badge>
                      <Button
                        as="a"
                        href="https://github.com/settings/tokens/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        class="h-8"
                      >
                        <ArrowSquareOut :size="15" weight="duotone" />
                        打开页面
                      </Button>
                    </div>
                  </div>
                </li>

                <li class="cc-flow-item">
                  <span class="cc-flow-index">2</span>
                  <div class="cc-flow-card">
                    <p class="text-sm font-semibold">填写 Note</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      `Note` 填用途，例如：`AstroBooox CC`。
                    </p>
                  </div>
                </li>

                <li class="cc-flow-item">
                  <span class="cc-flow-index">3</span>
                  <div class="cc-flow-card">
                    <p class="text-sm font-semibold">设置 Expiration</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      建议选 30 天或 90 天，不建议 No expiration。
                    </p>
                  </div>
                </li>

                <li class="cc-flow-item">
                  <span class="cc-flow-index">4</span>
                  <div class="cc-flow-card">
                    <p class="text-sm font-semibold">勾选 Scopes</p>
                    <div class="mt-2 space-y-1.5 text-sm">
                      <p class="inline-flex items-center gap-2">
                        <CheckCircle :size="15" class="text-emerald-500" weight="fill" />
                        <span><strong>repo</strong>（必选）</span>
                      </p>
                      <p class="inline-flex items-center gap-2">
                        <CheckCircle :size="15" class="text-emerald-500" weight="fill" />
                        <span><strong>read:user</strong>（建议）</span>
                      </p>
                    </div>
                  </div>
                </li>

                <li class="cc-flow-item">
                  <span class="cc-flow-index">5</span>
                  <div class="cc-flow-card">
                    <p class="text-sm font-semibold">生成并复制 Token</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      点击 `Generate token`，复制后立刻回 `/cc` 粘贴登录。
                    </p>
                    <div class="mt-3 flex items-center gap-2">
                      <Badge>Generate token</Badge>
                    </div>
                    <div class="mt-3">
                      <Button as="a" href="/cc/" size="sm" variant="outline" class="h-8">
                        回到 /cc
                      </Button>
                    </div>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">按钮速查</CardTitle>
              <CardDescription>这个页面里只需要关注这 4 项。</CardDescription>
            </CardHeader>
            <CardContent class="pt-0">
              <ul class="divide-y divide-border rounded-lg border border-border bg-muted/20">
                <li class="cc-quick-row">
                  <span class="cc-quick-label">入口</span>
                  <span class="cc-quick-value">/settings/tokens/new</span>
                </li>
                <li class="cc-quick-row">
                  <span class="cc-quick-label">表单</span>
                  <span class="cc-quick-value">Note、Expiration、Select scopes</span>
                </li>
                <li class="cc-quick-row">
                  <span class="cc-quick-label">权限</span>
                  <span class="cc-quick-value">repo、read:user</span>
                </li>
                <li class="cc-quick-row">
                  <span class="cc-quick-label">提交</span>
                  <span class="cc-quick-value">Generate token</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowSquareOut as ArrowSquareOut,
  PhCheckCircle as CheckCircle
} from '@phosphor-icons/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
</script>

<style scoped>
.cc-side-item {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.8125rem;
  color: hsl(var(--muted-foreground));
}

.cc-side-item-parent {
  margin-top: 0.35rem;
  color: hsl(var(--foreground));
  font-weight: 500;
}

.cc-side-item-active {
  margin-left: 0.875rem;
  background: hsl(var(--primary) / 0.1);
  border-color: hsl(var(--primary) / 0.35);
  color: hsl(var(--foreground));
}

.cc-flow {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cc-flow-item {
  position: relative;
  padding-left: 2.5rem;
}

.cc-flow-item:not(:last-child) {
  margin-bottom: 1rem;
}

.cc-flow-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 0.95rem;
  top: 2rem;
  bottom: -1rem;
  width: 2px;
  background: hsl(var(--border));
}

.cc-flow-index {
  position: absolute;
  top: 0.15rem;
  left: 0;
  display: inline-flex;
  height: 1.8rem;
  width: 1.8rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  font-size: 0.75rem;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.cc-flow-card {
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 0.875rem;
  background: hsl(var(--card));
}

.cc-quick-row {
  display: grid;
  grid-template-columns: 4rem 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  font-size: 0.875rem;
}

.cc-quick-label {
  color: hsl(var(--muted-foreground));
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cc-quick-value {
  color: hsl(var(--foreground));
  font-weight: 500;
}

@media (max-width: 767px) {
  .cc-flow-item {
    padding-left: 2.25rem;
  }
}
</style>
