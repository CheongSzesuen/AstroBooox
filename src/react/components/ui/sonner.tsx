import { Toaster } from 'sonner'
import { useTheme } from '@/react/hooks/useTheme'
import 'sonner/dist/styles.css'

function Sonner() {
  const { theme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      closeButton
      richColors
      theme={theme}
      toastOptions={{
        className: 'border border-border bg-popover text-popover-foreground shadow-lg'
      }}
    />
  )
}

export { Sonner }
