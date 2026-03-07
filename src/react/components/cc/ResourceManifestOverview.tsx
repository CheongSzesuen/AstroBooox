import { LinkSimple } from '@phosphor-icons/react'
import { Badge } from '@/react/components/ui/badge'
import { PreviewImageCarousel } from '@/react/components/cc/PreviewImageCarousel'
import type { ResourceManifestView } from '@/react/components/cc/resource-manifest'

export function ResourceManifestOverview(props: {
  manifestView: ResourceManifestView | null
}) {
  const { manifestView } = props

  return (
    <div className="space-y-4">
      {manifestView?.icon ? (
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Icon · {manifestView.icon.file}</div>
          <a href={manifestView.icon.url} target="_blank" rel="noopener noreferrer" className="mt-2 mx-auto flex h-[180px] w-[180px] items-center justify-center overflow-hidden rounded-full border border-border/60 bg-background/70">
            <img src={manifestView.icon.url} alt="Icon 预览" className="h-full w-full rounded-full object-contain p-3" loading="lazy" />
          </a>
        </div>
      ) : null}

      {manifestView?.cover ? (
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Cover · {manifestView.cover.file}</div>
          <a href={manifestView.cover.url} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-md border border-border/60 bg-background/70">
            <img src={manifestView.cover.url} alt="Cover 预览" className="max-h-[50vh] w-full object-contain" loading="lazy" />
          </a>
        </div>
      ) : null}

      <PreviewImageCarousel items={manifestView?.previews || []} emptyText="未检测到预览图" />

      <div className="space-y-2">
        {manifestView && manifestView.links.length > 0 ? (
          manifestView.links.map((link) => (
            <a
              key={`${link.title}-${link.url}`}
              href={link.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm hover:bg-accent"
            >
              <LinkSimple size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 break-all text-foreground">{link.title || link.url || '-'}</span>
              {link.type ? <Badge variant="outline">{link.type}</Badge> : null}
            </a>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">暂无 links</div>
        )}
      </div>
    </div>
  )
}
