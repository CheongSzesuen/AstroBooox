export function CcFreeResourceNotice() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-foreground sm:px-6 sm:text-sm">
      本工具只提交免费资源，需要用到 AstroBox 加密的需要前往{' '}
      <a className="font-medium text-primary underline underline-offset-4" href="https://abox.run/docs/creator-tools/resource-management" target="_blank" rel="noopener noreferrer">
        https://abox.run/docs/creator-tools/resource-management
      </a>
    </div>
  )
}
