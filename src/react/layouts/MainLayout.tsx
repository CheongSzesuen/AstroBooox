import { Code, Compass, GithubLogo, Moon, Star, Sun } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '@/react/hooks/useTheme'
import { Button } from '@/react/components/ui/button'

const repoUrl = 'https://github.com/CheongSzesuen/AstroBooox'
const starsUrl = `${repoUrl}/stargazers`

const navItems = [
  { to: '/manifest', label: 'manifest内容' },
  { to: '/csv', label: 'CSV 生成' },
  { to: '/res-link', label: '资源链接生成' },
  { to: '/code-review', label: '代码审查' }
]

function Footer() {
  const buildVersion = __BUILD_VERSION__ || 'unknown'
  const buildVersionDisplay = buildVersion.length > 28 ? `${buildVersion.slice(0, 28)}...` : buildVersion

  return (
    <footer className="mt-auto border-t border-border/80 bg-card/70" role="contentinfo">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-3 px-4 py-6">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubLogo size={16} weight="duotone" />
            AstroBooox
          </a>
        </div>

        <p className="m-0 text-[13px] text-muted-foreground">
          © 2025{' '}
          <a className="text-primary hover:underline" href="https://github.com/CheongSzesuen" target="_blank" rel="noopener noreferrer">
            WaiJade
          </a>{' '}
          Open Source on GitHub
        </p>

        <p className="m-0 text-xs text-muted-foreground/90" title={buildVersion}>
          当前构建：{buildVersionDisplay}
        </p>
      </div>
    </footer>
  )
}

export function MainLayout() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-accent sm:inline-flex"
          >
            <Code size={16} weight="duotone" />
            <span className="hidden sm:inline">AstroBooox</span>
          </a>

          <div className="scrollbar-none hidden min-w-0 flex-1 overflow-x-auto sm:block">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {({ isActive }) => (
                    <Button variant={isActive ? 'default' : 'ghost'} size="sm" className="h-8 shrink-0">
                      {item.label}
                    </Button>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 px-2 sm:px-3" aria-label="进入 CC 页面">
              <a href="/cc/">
                <Compass size={15} weight="duotone" />
                <span>CC</span>
              </a>
            </Button>

            <Button asChild variant="outline" size="sm" className="hidden h-8 gap-1.5 lg:inline-flex">
              <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                <GithubLogo size={15} weight="duotone" />
                GitHub
              </a>
            </Button>

            <Button asChild variant="secondary" size="sm" className="h-8 gap-1.5 px-2 sm:px-3">
              <a href={starsUrl} target="_blank" rel="noopener noreferrer">
                <Star size={15} weight="duotone" />
                <span>Star</span>
              </a>
            </Button>

            <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} weight="duotone" /> : <Sun size={16} weight="duotone" />}
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full max-w-[1320px]">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
