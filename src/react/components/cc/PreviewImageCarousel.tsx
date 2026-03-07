import { CaretRight, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/react/components/ui/button'

export type PreviewImageItem = {
  file: string
  url: string
}

export function PreviewImageCarousel(props: {
  items: PreviewImageItem[]
  emptyText?: string
  imageUrlResolver?: (url: string) => string
  removable?: boolean
  onImageLoad?: (payload: { url: string; event: Event }) => void
  onRemove?: (index: number) => void
}) {
  const { items, emptyText = '未检测到图片资源', imageUrlResolver, removable = false, onImageLoad, onRemove } = props

  const previewScrollerRef = useRef<HTMLDivElement | null>(null)
  const [previewCanPrev, setPreviewCanPrev] = useState(false)
  const [previewCanNext, setPreviewCanNext] = useState(false)
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0)
  const [previewSnapCount, setPreviewSnapCount] = useState(0)

  const PREVIEW_SCROLL_DISTANCE = 320

  const syncPreviewScrollState = () => {
    const el = previewScrollerRef.current
    if (!el) {
      setPreviewCanPrev(false)
      setPreviewCanNext(false)
      setPreviewActiveIndex(0)
      setPreviewSnapCount(items.length)
      return
    }

    setPreviewCanPrev(el.scrollLeft > 4)
    setPreviewCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    setPreviewSnapCount(items.length)

    const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-preview-slide="1"]'))
    if (slides.length === 0) {
      setPreviewActiveIndex(0)
      return
    }

    const viewportCenter = el.scrollLeft + el.clientWidth / 2
    let matchedIndex = 0
    let minDistance = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
      const distance = Math.abs(slideCenter - viewportCenter)
      if (distance < minDistance) {
        minDistance = distance
        matchedIndex = index
      }
    })

    setPreviewActiveIndex(matchedIndex)
  }

  const canPreviewPrev = useMemo(() => items.length > 0 && previewCanPrev, [items.length, previewCanPrev])
  const canPreviewNext = useMemo(() => items.length > 0 && previewCanNext, [items.length, previewCanNext])

  const scrollPreviewPrev = () => {
    const el = previewScrollerRef.current
    if (!el) return
    el.scrollBy({
      left: -Math.max(el.clientWidth * 0.82, PREVIEW_SCROLL_DISTANCE),
      behavior: 'smooth'
    })
  }

  const scrollPreviewNext = () => {
    const el = previewScrollerRef.current
    if (!el) return
    el.scrollBy({
      left: Math.max(el.clientWidth * 0.82, PREVIEW_SCROLL_DISTANCE),
      behavior: 'smooth'
    })
  }

  const scrollPreviewTo = (index: number) => {
    const el = previewScrollerRef.current
    if (!el) return
    const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-preview-slide="1"]'))
    const target = slides[index]
    if (!target) return
    el.scrollTo({ left: Math.max(target.offsetLeft - 8, 0), behavior: 'smooth' })
  }

  const onPreviewWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = previewScrollerRef.current
    if (!el) return
    if (el.scrollWidth <= el.clientWidth + 1) return

    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (Math.abs(horizontalDelta) < 0.5) return

    event.preventDefault()
    el.scrollBy({ left: horizontalDelta, behavior: 'auto' })
  }

  const resolveImageUrl = (url: string): string => (imageUrlResolver ? imageUrlResolver(url) : url)

  useEffect(() => {
    const handleWindowResize = () => {
      syncPreviewScrollState()
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  useEffect(() => {
    const run = async () => {
      const el = previewScrollerRef.current
      if (el) {
        el.scrollTo({ left: 0, behavior: 'auto' })
      }
      syncPreviewScrollState()
    }
    void run()
  }, [items.map((item) => item.url).join('|')])

  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-border px-2.5 py-3 text-xs text-muted-foreground sm:px-3 sm:py-4">{emptyText}</div>
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="text-xs text-muted-foreground">共 {items.length} 张</div>
          <div className="inline-flex items-center gap-0.5 sm:gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={!canPreviewPrev} onClick={scrollPreviewPrev}>
              <CaretRight size={14} weight="bold" className="rotate-180" />
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={!canPreviewNext} onClick={scrollPreviewNext}>
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>

        <div
          ref={previewScrollerRef}
          className="scrollbar-none flex flex-nowrap gap-2 overflow-x-auto pb-1 snap-x snap-mandatory touch-pan-x sm:gap-3"
          onScroll={syncPreviewScrollState}
          onWheel={onPreviewWheel}
        >
          {items.map((item, index) => (
            <div key={`${item.url}-${index}`} data-preview-slide="1" className="w-full max-w-full shrink-0 snap-start rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-sm sm:w-[320px] sm:max-w-[320px] sm:px-3 sm:py-2">
              {removable ? (
                <div className="mb-1 flex justify-end">
                  <Button size="icon" variant="outline" className="h-7 w-7" aria-label={`删除第 ${index + 1} 张预览图`} onClick={() => onRemove?.(index)}>
                    <X size={14} weight="bold" />
                  </Button>
                </div>
              ) : null}

              <a href={resolveImageUrl(item.url)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border/60 bg-background/70">
                <img
                  src={resolveImageUrl(item.url)}
                  alt={`${item.file} 预览`}
                  className="h-40 w-full object-contain sm:h-52"
                  loading="lazy"
                  onLoad={(event) => onImageLoad?.({ url: item.url, event: event.nativeEvent })}
                />
              </a>
              <div className="mt-2 break-all text-xs text-muted-foreground">{item.file}</div>
            </div>
          ))}
        </div>

        {previewSnapCount > 1 ? (
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: previewSnapCount }).map((_, index) => (
              <button
                key={`preview-dot-${index}`}
                type="button"
                className={`h-1.5 rounded-full transition-all ${index === previewActiveIndex ? 'w-5 bg-foreground/80' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                aria-label={`跳转到第 ${index + 1} 张预览图`}
                onClick={() => scrollPreviewTo(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
