export function CcFreeResourceNotice() {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-foreground sm:px-6 sm:text-sm">
      当前仅支持 V2 资源提交流程，V1 已停用；付费类型请按实际选择：免费留空、应用内付费选 paid、强制付费选 force_paid。
    </div>
  )
}
