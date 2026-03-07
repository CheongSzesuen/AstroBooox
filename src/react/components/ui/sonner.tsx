import { useEffect, useState } from 'react'
import { Toaster as SonnerPrimitive, type ToasterProps } from 'sonner'
import { useTheme } from '@/react/hooks/useTheme'
import 'sonner/dist/styles.css'

function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 768px)')
    const handleChange = () => setIsMobile(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const responsivePosition: ToasterProps['position'] = isMobile ? 'top-center' : 'bottom-right'
  const { position, ...rest } = props

  return (
    <SonnerPrimitive
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position={position ?? responsivePosition}
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
      {...rest}
    />
  )
}

export { Toaster, Toaster as Sonner }
