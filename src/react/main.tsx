import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from '@/react/AppShell'
import { registerServiceWorker } from '@/utils/registerServiceWorker'
import { syncBuildStorage } from '@/utils/syncBuildStorage'
import '@/style.css'

syncBuildStorage()
void registerServiceWorker()

createRoot(document.getElementById('app') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </StrictMode>
)
