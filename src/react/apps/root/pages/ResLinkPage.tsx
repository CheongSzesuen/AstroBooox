import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

export function ResLinkPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>资源链接生成</CardTitle>
        <CardDescription>主站页面迁移暂缓，当前优先完成 CC 全量重构。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">该页面会在 CC 完整迁移后继续补齐 React 功能等效实现。</p>
      </CardContent>
    </Card>
  )
}
