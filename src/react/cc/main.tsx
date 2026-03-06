import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CcApp } from '@/react/apps/cc/CcApp'
import { registerServiceWorker } from '@/utils/registerServiceWorker'
import '@/style.css'

void registerServiceWorker()

createRoot(document.getElementById('app') as HTMLElement).render(
  <StrictMode>
    <CcApp />
  </StrictMode>
)
