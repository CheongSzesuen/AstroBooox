import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

export function ResLinkPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>资源链接生成</CardTitle>
        <CardDescription>React 路由与样式体系已切换。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">后续提交将迁移链接解析、批量处理与导出交互。</p>
      </CardContent>
    </Card>
  )
}
