import { Eye, GithubLogo, SignIn } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'
import { verifyToken } from '@/utils/githubGitApi'
import { CcInteractiveGrid } from '@/react/cc/CcInteractiveGrid'
import { useCcSession } from '@/react/hooks/useCcSession'
import '@/react/cc/cc-token-gate.css'

export function CcTokenGate({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { token, setToken, setSessionUser } = useCcSession()
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSignIn = async (): Promise<void> => {
    try {
      setErrorMessage('')
      setLoading(true)
      const user = await verifyToken(token.trim())
      setSessionUser(user)
      onAuthenticated?.()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Token 校验失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background lg:grid lg:min-h-[100dvh] lg:grid-cols-[1.28fr_0.72fr]">
      <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex lg:min-h-[100dvh]">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-bold">
          <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="mr-2 h-6 w-6" />
          AstroBooox Creator Console
        </div>

        <CcInteractiveGrid className="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(460px_circle_at_center,white,transparent)]" />

        <div className="relative z-20 mt-auto space-y-4">
          <blockquote className="space-y-2">
            <p className="cc-login-hero-line">基于浏览器的AstroBooox Creator Console 需要GitHub API提供接口</p>
            <p className="cc-login-hero-line">所有填入的Token不会被上传，也不会被保存到浏览器本地，只用于当前会话</p>
            <footer className="text-sm text-zinc-300">Token Session Gate</footer>
          </blockquote>
        </div>
      </div>

      <div className="relative min-h-screen overflow-hidden p-6 text-white sm:p-8 lg:hidden">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-bold">
          <img src="/icon-candidates/secret-icon.png" alt="AstroBooox" className="mr-2 h-6 w-6" />
          AstroBooox Creator Console
        </div>
        <CcInteractiveGrid cellSize={48} className="absolute inset-x-0 inset-y-0 h-full w-full skew-y-12 [mask-image:radial-gradient(420px_circle_at_center,white,transparent)]" />
      </div>

      <div className="cc-login-panel absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-black/15 via-black/30 to-black/45 p-4 backdrop-blur-[1px] sm:p-6 lg:static lg:z-auto lg:h-full lg:min-h-[100dvh] lg:bg-zinc-900 lg:p-8 lg:backdrop-blur-none">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="cc-login-title text-2xl font-semibold tracking-tight text-white">Token 登录</h2>
            <p className="cc-login-desc text-sm text-zinc-100/90">输入 GitHub Token 后进入 Creator Console。</p>
          </div>

          <Card className="cc-login-card cc-login-light border-zinc-200 bg-white/95 text-zinc-900 shadow-xl backdrop-blur">
            <CardContent className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                <GithubLogo size={18} weight="duotone" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold leading-5">AstroBox 提交资源必须使用 GitHub 帐号</p>
                <p className="text-xs leading-5 text-muted-foreground">如果你还没有 GitHub 帐号，请先创建，再回到当前页面使用 Token 登录。</p>
                <Button asChild size="sm" className="h-8">
                  <a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">
                    前往 GitHub 创建账号
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="cc-login-card cc-login-light border-zinc-200 bg-white/95 text-zinc-900 shadow-xl backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">GitHub Token</CardTitle>
              <CardDescription>务必使用自己的GitHub Token</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Input
                id="cc-token"
                value={token}
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxx / github_pat_xxx"
                autoComplete="off"
                onChange={(event) => setToken(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSignIn()
                  }
                }}
              />

              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9" onClick={() => setShowToken((prev) => !prev)}>
                  <Eye size={16} weight="duotone" />
                  {showToken ? '隐藏' : '显示'}
                </Button>
                <Button className="h-9 flex-1" disabled={loading || !token.trim()} onClick={() => void handleSignIn()}>
                  <SignIn size={16} weight="duotone" />
                  {loading ? '校验中...' : '验证并进入'}
                </Button>
              </div>

              {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

              <p className="text-center text-xs text-muted-foreground">
                不会创建 Token？{' '}
                <Link to="/help" className="text-primary underline underline-offset-4 hover:opacity-85">
                  查看帮助
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
