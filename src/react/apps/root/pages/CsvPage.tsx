import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

export function CsvPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV 生成</CardTitle>
        <CardDescription>页面骨架已迁移到 React。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">接下来会迁移 CSV 字段映射、导出与校验流程。</p>
      </CardContent>
    </Card>
  )
}
