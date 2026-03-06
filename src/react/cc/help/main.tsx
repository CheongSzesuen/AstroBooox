import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CcHelpApp } from '@/react/apps/cc-help/CcHelpApp'
import { registerServiceWorker } from '@/utils/registerServiceWorker'
import '@/style.css'

void registerServiceWorker()

createRoot(document.getElementById('app') as HTMLElement).render(
  <StrictMode>
    <CcHelpApp />
  </StrictMode>
)
