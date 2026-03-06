import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

export function CodeReviewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>代码审查</CardTitle>
        <CardDescription>React 版页面容器已完成。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">后续会迁移 PR 信息、文件树与 diff/分析视图。</p>
      </CardContent>
    </Card>
  )
}
