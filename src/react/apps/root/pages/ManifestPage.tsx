import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/react/components/ui/card'

export function ManifestPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manifest 内容编辑</CardTitle>
        <CardDescription>React 版本已接管入口，当前正在迁移原 Vue 编辑器能力。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">下一阶段会优先迁移文件目录选择、manifest 读写与 OPFS/FSA 逻辑。</p>
      </CardContent>
    </Card>
  )
}
