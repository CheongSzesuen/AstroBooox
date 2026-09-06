export function CcDeprecationNotice() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-foreground sm:px-6 sm:text-sm">
      <span>此工具或将弃用，下载 </span>
      <a
        href="https://github.com/AstralSightStudios/AstroBoxCreatorConsole/releases"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:opacity-85"
      >
        AstroBox Creator Console
      </a>
      <span> 以体验最佳创作者功能，包含数据统计和加密支持。</span>
    </div>
  )
}
