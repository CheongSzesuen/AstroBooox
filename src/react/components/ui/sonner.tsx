import { Toaster as SonnerPrimitive, type ToasterProps } from 'sonner'
import { useTheme } from '@/react/hooks/useTheme'
import 'sonner/dist/styles.css'

function Toaster(props: ToasterProps) {
  const { theme } = useTheme()

  return (
    <SonnerPrimitive
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
        }
      }}
      {...props}
    />
  )
}

export { Toaster, Toaster as Sonner }
