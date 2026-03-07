import { Code, Compass, GithubLogo, Info, List, Moon, Star, Sun, X } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '@/react/hooks/useTheme'
import { Button } from '@/react/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Sheet, SheetClose, SheetContent } from '@/react/components/ui/sheet'

const repoUrl = 'https://github.com/CheongSzesuen/AstroBooox'
const starsUrl = `${repoUrl}/stargazers`

const navItems = [
  { to: '/manifest', label: 'manifest内容' },
  { to: '/csv', label: 'CSV 生成' },
  { to: '/res-link', label: '资源链接生成' },
  { to: '/code-review', label: '代码审查' }
]

function Footer() {
  const [showTerms, setShowTerms] = useState(false)
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

          <Button
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowTerms(true)}
          >
            <Info size={16} weight="duotone" />
            使用须知
          </Button>
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

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>使用须知</DialogTitle>
            <DialogDescription className="leading-6">
              AstroBooox 与 AstroBox 无所属关系，仅作为提交资源信息的效率工具。如有问题请在 GitHub 提交 issue。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button asChild variant="outline">
              <a href="https://github.com/CheongSzesuen/AstroBooox/issues" target="_blank" rel="noopener noreferrer">
                提交 Issue
              </a>
            </Button>
            <Button onClick={() => setShowTerms(false)}>我知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  )
}

export function MainLayout() {
  const { theme, toggleTheme } = useTheme()
  const [showMobileNavSheet, setShowMobileNavSheet] = useState(false)

  const mainSiteIcon = useMemo(
    () => (theme === 'dark' ? '/icon-candidates/astrobox-website-favicon.svg' : '/icon-candidates/astrobox-ng-web-favicon.svg'),
    [theme]
  )

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2 sm:hidden">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="打开导航菜单"
              onClick={() => setShowMobileNavSheet(true)}
            >
              <List size={16} weight="duotone" />
            </Button>
            <a
              href="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card"
              aria-label="返回主页"
            >
              <img src={mainSiteIcon} alt="AstroBooox" className="h-5 w-5" />
            </a>
          </div>

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

        <Sheet open={showMobileNavSheet} onOpenChange={setShowMobileNavSheet}>
          <SheetContent side="left" hideClose className="!w-[max(61.8vw,max-content)] max-w-[calc(100vw-1.5rem)] p-0 sm:hidden">
            <div className="relative border-b border-border px-3 py-3.5">
              <img src={mainSiteIcon} alt="AstroBooox" className="h-6 w-6" />
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2"
                  aria-label="关闭导航菜单"
                >
                  <X size={18} weight="bold" />
                </Button>
              </SheetClose>
            </div>

            <nav className="w-full space-y-1 px-3 py-3">
              {navItems.map((item) => (
                <NavLink key={`mobile-${item.to}`} to={item.to} onClick={() => setShowMobileNavSheet(false)}>
                  {({ isActive }) => (
                    <Button className="h-9 w-full justify-start whitespace-nowrap" variant={isActive ? 'default' : 'ghost'}>
                      {item.label}
                    </Button>
                  )}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
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
