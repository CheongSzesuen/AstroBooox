import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/react/components/ui/button'

export function ReviewDetailHeader(props: {
  title: string
  number?: string | number
  leadingImageUrl?: string
  leadingImageAlt?: string
  showBack?: boolean
  backText?: string
  meta?: ReactNode
  actions?: ReactNode
  onBack?: () => void
}) {
  const {
    title,
    number,
    leadingImageUrl = '',
    leadingImageAlt = 'header image',
    showBack = false,
    backText = '返回',
    meta,
    actions,
    onBack
  } = props

  const hasNumber = number !== undefined && number !== null && String(number).trim() !== ''

  return (
    <header className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          {showBack ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" onClick={onBack}>
              <ArrowLeft size={14} weight="bold" />
              {backText}
            </Button>
          ) : null}

          <div className="flex items-end gap-3">
            {leadingImageUrl ? (
              <img
                src={leadingImageUrl}
                alt={leadingImageAlt}
                className="h-14 w-14 shrink-0 rounded-full border border-border bg-muted/30 object-cover md:h-16 md:w-16"
              />
            ) : null}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <h1 className="min-w-0 break-words text-xl font-semibold leading-tight text-foreground md:text-2xl">{title}</h1>
                {hasNumber ? <span className="text-sm font-medium text-muted-foreground md:text-base">#{number}</span> : null}
              </div>
              {meta ? <div className="flex flex-wrap items-center gap-x-3 gap-y-2">{meta}</div> : null}
            </div>
          </div>
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2 md:justify-end">{actions}</div> : null}
      </div>
    </header>
  )
}
