import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CcApp } from '@/react/apps/cc/CcApp'
import { RootApp } from '@/react/apps/root/RootApp'
import { CcHelpApp } from '@/react/apps/cc-help/CcHelpApp'

function RouteProgressBar() {
  const location = useLocation()
  const isFirstRender = useRef(true)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let finished = false
    let hideTimer: number | undefined
    setVisible(true)
    setProgress(16)

    const timer = window.setInterval(() => {
      setProgress((prev) => (prev < 86 ? Math.min(86, prev + 7) : prev))
    }, 90)

    const complete = window.setTimeout(() => {
      finished = true
      window.clearInterval(timer)
      setProgress(100)
      hideTimer = window.setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 220)
    }, 240)

    return () => {
      window.clearTimeout(complete)
      window.clearInterval(timer)
      if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer)
      }
      if (!finished) {
        setVisible(false)
        setProgress(0)
      }
    }
  }, [location.pathname, location.search, location.hash])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5">
      <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }} />
    </div>
  )
}

function CcCompatRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const pathname = location.pathname
    const nextPath = pathname === '/cc' || pathname === '/cc/' ? '/' : pathname.replace(/^\/cc/, '') || '/'
    navigate(`${nextPath}${location.search}${location.hash}`, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  return null
}

function CcHelpCompatRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const suffix = location.pathname.replace(/^\/cc\/help/, '')
    navigate(`/help${suffix}${location.search}${location.hash}`, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  return null
}

function LegacyPathRedirect({ to }: { to: string }) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/legacy${to}${location.search}${location.hash}`, { replace: true })
  }, [location.hash, location.search, navigate, to])

  return null
}

export function AppShell() {
  return (
    <>
      <RouteProgressBar />
      <Routes>
        <Route path="/legacy/*" element={<RootApp />} />

        <Route path="/help" element={<CcHelpApp />} />
        <Route path="/help/*" element={<CcHelpApp />} />

        <Route path="/cc/help" element={<CcHelpCompatRedirect />} />
        <Route path="/cc/help/*" element={<CcHelpCompatRedirect />} />
        <Route path="/cc" element={<CcCompatRedirect />} />
        <Route path="/cc/*" element={<CcCompatRedirect />} />

        <Route path="/manifest" element={<LegacyPathRedirect to="/manifest" />} />
        <Route path="/csv" element={<LegacyPathRedirect to="/csv" />} />
        <Route path="/res-link" element={<LegacyPathRedirect to="/res-link" />} />
        <Route path="/code-review" element={<LegacyPathRedirect to="/code-review" />} />

        <Route path="/*" element={<CcApp />} />
      </Routes>
    </>
  )
}
