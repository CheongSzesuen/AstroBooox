import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/react/layouts/MainLayout'
import { ManifestPage } from '@/react/apps/root/pages/ManifestPage'
import { CsvPage } from '@/react/apps/root/pages/CsvPage'
import { ResLinkPage } from '@/react/apps/root/pages/ResLinkPage'
import { CodeReviewPage } from '@/react/apps/root/pages/CodeReviewPage'
import { Toaster } from '@/react/components/ui/sonner'

function CcRedirectGuard() {
  useEffect(() => {
    const { origin, pathname, search, hash } = window.location
    if (!pathname.startsWith('/cc')) return

    if (pathname.startsWith('/cc/help')) {
      window.location.replace(`${origin}/cc/help/${search}${hash}`)
      return
    }

    if (pathname === '/cc' || pathname === '/cc/') {
      window.location.replace(`${origin}/cc/${search}${hash}`)
      return
    }

    const redirectedPath = encodeURIComponent(pathname)
    const queryPrefix = search ? `${search}&` : '?'
    window.location.replace(`${origin}/cc/${queryPrefix}cc_path=${redirectedPath}${hash}`)
  }, [])

  return null
}

export function RootApp() {
  return (
    <>
      <CcRedirectGuard />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/manifest" replace />} />
          <Route path="manifest" element={<ManifestPage />} />
          <Route path="csv" element={<CsvPage />} />
          <Route path="res-link" element={<ResLinkPage />} />
          <Route path="code-review" element={<CodeReviewPage />} />
          <Route path="*" element={<Navigate to="/manifest" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
