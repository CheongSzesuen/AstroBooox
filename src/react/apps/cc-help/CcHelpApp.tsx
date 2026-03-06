import { ArrowSquareOut, CheckCircle } from '@phosphor-icons/react'
import { Badge } from '@/react/components/ui/badge'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import '@/react/apps/cc-help/cc-help.css'

const flowSteps = [
  {
    title: '打开创建页（直达）',
    description: '进入后就是新建 classic token 表单。',
    extra: (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[11px]">
          https://github.com/settings/tokens/new
        </Badge>
        <Button asChild size="sm" className="h-8">
          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">
            <ArrowSquareOut size={15} weight="duotone" />
            打开页面
          </a>
        </Button>
      </div>
    )
  },
  {
    title: '填写 Note',
    description: '`Note` 填用途，例如：`AstroBooox CC`。'
  },
  {
    title: '设置 Expiration',
    description: '建议选 30 天或 90 天，不建议 No expiration。'
  },
  {
    title: '勾选 Scopes',
    description: '',
    extra: (
      <div className="mt-2 space-y-1.5 text-sm">
        <p className="inline-flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-500" weight="fill" />
          <span>
            <strong>repo</strong>（必选）
          </span>
        </p>
        <p className="inline-flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-500" weight="fill" />
          <span>
            <strong>read:user</strong>（建议）
          </span>
        </p>
      </div>
    )
  },
  {
    title: '生成并复制 Token',
    description: '点击 `Generate token`，复制后立刻回 `/cc` 粘贴登录。',
    extra: (
      <>
        <div className="mt-3 flex items-center gap-2">
          <Badge>Generate token</Badge>
        </div>
        <div className="mt-3">
          <Button asChild size="sm" variant="outline" className="h-8">
            <a href="/cc/">回到 /cc</a>
          </Button>
        </div>
      </>
    )
  }
]

export function CcHelpApp() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center gap-2 px-4 md:px-6">
          <a href="/cc/" className="text-sm text-muted-foreground hover:text-foreground">
            返回 /cc
          </a>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold text-foreground md:text-base">Token 创建教程</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] p-3 sm:p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-[250px_minmax(0,1fr)] md:gap-6">
          <aside className="hidden rounded-xl border border-border bg-card p-3 md:block">
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Developer Settings</p>
            <ul className="space-y-1">
              <li className="cc-side-item">GitHub Apps</li>
              <li className="cc-side-item">OAuth Apps</li>
              <li className="cc-side-item cc-side-item-parent">Personal access tokens</li>
              <li className="cc-side-item cc-side-item-active">Tokens (classic)</li>
            </ul>
          </aside>

          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 md:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tokens (classic)</p>
              <h1 className="mt-1 text-xl font-semibold leading-tight text-foreground md:text-2xl">New personal access token (classic)</h1>
              <p className="mt-2 text-sm text-muted-foreground">按照下方流程创建Token，不要分享给任何人。</p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">流程图</CardTitle>
                <CardDescription>完成 5 步即可生成可用的 classic token。</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="cc-flow">
                  {flowSteps.map((step, index) => (
                    <li key={step.title} className="cc-flow-item">
                      <span className="cc-flow-index">{index + 1}</span>
                      <div className="cc-flow-card">
                        <p className="text-sm font-semibold">{step.title}</p>
                        {step.description ? <p className="mt-1 text-sm text-muted-foreground">{step.description}</p> : null}
                        {step.extra}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">按钮速查</CardTitle>
                <CardDescription>这个页面里只需要关注这 4 项。</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
                  <li className="cc-quick-row">
                    <span className="cc-quick-label">入口</span>
                    <span className="cc-quick-value">/settings/tokens/new</span>
                  </li>
                  <li className="cc-quick-row">
                    <span className="cc-quick-label">表单</span>
                    <span className="cc-quick-value">Note、Expiration、Select scopes</span>
                  </li>
                  <li className="cc-quick-row">
                    <span className="cc-quick-label">权限</span>
                    <span className="cc-quick-value">repo、read:user</span>
                  </li>
                  <li className="cc-quick-row">
                    <span className="cc-quick-label">提交</span>
                    <span className="cc-quick-value">Generate token</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
