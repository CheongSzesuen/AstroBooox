import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/react/layouts/MainLayout'
import { ManifestPage } from '@/react/apps/root/pages/ManifestPage'
import { CsvPage } from '@/react/apps/root/pages/CsvPage'
import { ResLinkPage } from '@/react/apps/root/pages/ResLinkPage'
import { CodeReviewPage } from '@/react/apps/root/pages/CodeReviewPage'
import { Toaster } from '@/react/components/ui/sonner'

export function RootApp() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="manifest" replace />} />
          <Route path="manifest" element={<ManifestPage />} />
          <Route path="csv" element={<CsvPage />} />
          <Route path="res-link" element={<ResLinkPage />} />
          <Route path="code-review" element={<CodeReviewPage />} />
          <Route path="*" element={<Navigate to="manifest" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  )
}
