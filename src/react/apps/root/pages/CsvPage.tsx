import { Check, CopySimple, Minus, WarningCircle } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Button } from '@/react/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/react/components/ui/card'
import { Input } from '@/react/components/ui/input'

type Device = { codename: string; name: string }

const supportedDevices: Device[] = [
  { codename: 'n66', name: 'Xiaomi Smart Band 9' },
  { codename: 'n66', name: 'Xiaomi Smart Band 9 NFC' },
  { codename: 'n67', name: 'Xiaomi Smart Band 9 Pro' },
  { codename: 'n67', name: 'Xiaomi Smart Band 9 Pro 国际版' },
  { codename: 'o66', name: 'Xiaomi Smart Band 10' },
  { codename: 'o66nfc', name: 'Xiaomi Smart Band 10 NFC' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列 eSIM版' },
  { codename: 'n62', name: 'Xiaomi Watch S3 系列 国际版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 eSIM版' },
  { codename: 'o62m', name: 'Xiaomi Watch S4 15周年纪念版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 Sport版' },
  { codename: 'o62', name: 'Xiaomi Watch S4 系列 41mm' },
  { codename: 'o65', name: 'REDMI Watch 5' },
  { codename: 'o65m', name: 'REDMI Watch 5 eSIM' },
  { codename: 'p65', name: 'REDMI Watch 6' }
]

type CsvForm = {
  name: string
  icon: string
  cover: string
  restype: string
  paymentType: string
  tags: string[]
  devices: string[]
  path: string
}

const initialForm: CsvForm = {
  name: '',
  icon: '',
  cover: '',
  restype: '',
  paymentType: '',
  tags: [''],
  devices: [''],
  path: ''
}

const validateUrlFormat = (url: string): boolean => url.startsWith('https://raw.githubusercontent.com/')

const getDeviceDisplayName = (codename: string): string => {
  const devices = supportedDevices.filter((d) => d.codename === codename)
  if (devices.length === 0) return codename
  if (devices.length === 1) return `${devices[0].name} [${codename}]`
  return `${devices.map((d) => d.name).join(' / ')} [${codename}]`
}

export function CsvPage() {
  const [form, setForm] = useState<CsvForm>(initialForm)
  const [showDevicePanel, setShowDevicePanel] = useState(false)
  const [tempDeviceSelection, setTempDeviceSelection] = useState<string[]>([])
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null)

  const showCustomAlert = (title: string, message: string) => setAlert({ title, message })

  const generatedCSV = useMemo(() => {
    const tagsStr = form.tags.length > 1 ? `"${form.tags.join(';')}"` : form.tags[0]
    const devicesStr = form.devices.length > 1 ? `"${form.devices.join(';')}"` : form.devices[0]
    const fields = [form.name, form.icon, form.cover, form.restype, tagsStr, devicesStr, form.path]

    if (form.paymentType !== 'free') {
      fields.push(form.paymentType)
      return fields.join(',')
    }
    fields.push('')
    return fields.join(',')
  }, [form])

  const updateField = <K extends keyof CsvForm>(key: K, value: CsvForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateTag = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.tags]
      next[index] = value
      return { ...prev, tags: next }
    })
  }

  const removeTag = (index: number) => {
    setForm((prev) => {
      const next = [...prev.tags]
      next.splice(index, 1)
      return { ...prev, tags: next.length ? next : [''] }
    })
  }

  const removeDevice = (index: number) => {
    setForm((prev) => {
      const next = [...prev.devices]
      next.splice(index, 1)
      return { ...prev, devices: next.length ? next : [''] }
    })
  }

  const validateForm = (): boolean => {
    if (!form.name) return showCustomAlert('表单验证失败', '请填写资源名称'), false
    if (!form.icon) return showCustomAlert('表单验证失败', '请填写图标URL'), false
    if (!validateUrlFormat(form.icon)) return showCustomAlert('表单验证失败', '图标URL必须以 https://raw.githubusercontent.com/ 开头'), false
    if (!form.cover) return showCustomAlert('表单验证失败', '请填写封面URL'), false
    if (!validateUrlFormat(form.cover)) return showCustomAlert('表单验证失败', '封面URL必须以 https://raw.githubusercontent.com/ 开头'), false
    if (!form.restype) return showCustomAlert('表单验证失败', '请选择资源类型'), false
    if (!form.paymentType) return showCustomAlert('表单验证失败', '请选择付费类型'), false
    if (form.tags.length === 0 || !form.tags[0]) return showCustomAlert('表单验证失败', '请至少添加一个资源标签'), false
    if (form.devices.length === 0 || !form.devices[0]) return showCustomAlert('表单验证失败', '请至少添加一个支持设备'), false
    if (!form.path) return showCustomAlert('表单验证失败', '请填写资源.json路径'), false
    return true
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCSV)
      showCustomAlert('操作成功', 'CSV 数据已复制到剪贴板！')
    } catch (error) {
      console.error('复制失败:', error)
      showCustomAlert('操作失败', '复制失败，请手动复制')
    }
  }

  const validateAndCopy = async () => {
    if (!validateForm()) return
    await copyToClipboard()
  }

  const openDeviceSelector = () => {
    setTempDeviceSelection(form.devices.filter(Boolean))
    setShowDevicePanel(true)
  }

  const toggleTempDevice = (codename: string) => {
    setTempDeviceSelection((prev) => (prev.includes(codename) ? prev.filter((item) => item !== codename) : [...prev, codename]))
  }

  const confirmDeviceSelection = () => {
    updateField('devices', tempDeviceSelection.length ? tempDeviceSelection : [''])
    setShowDevicePanel(false)
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">资源信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">资源名称</label>
            <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="WeatherPlus" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              图标 URL
              <span className="ml-1 text-xs font-normal text-muted-foreground">(最佳为200×200,AstroBox会自动割圆。若设计简陋、低质会被打回)</span>
            </label>
            <Input value={form.icon} onChange={(e) => updateField('icon', e.target.value)} placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              封面 URL
              <span className="ml-1 text-xs font-normal text-muted-foreground">(比例3:2显示最佳，分辨率不要过大，1200x800足矣。)</span>
            </label>
            <Input value={form.cover} onChange={(e) => updateField('cover', e.target.value)} placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/封面名" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">资源类型</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.restype}
                onChange={(e) => updateField('restype', e.target.value)}
              >
                <option value="">请选择资源类型</option>
                <option value="quickapp">快应用 (quickapp)</option>
                <option value="watchface">表盘 (watchface)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">付费类型</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.paymentType}
                onChange={(e) => updateField('paymentType', e.target.value)}
              >
                <option value="">请选择付费类型</option>
                <option value="free">免费(感谢你作出的贡献)</option>
                <option value="force_paid">强制付费(force_paid)</option>
                <option value="paid">应用内付费(paid)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">分类与设备</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">资源标签</label>
            <div className="space-y-2">
              {form.tags.map((tag, index) => (
                <div key={`${index}-${tag}`} className="flex items-center gap-2">
                  <Input value={tag} onChange={(e) => updateTag(index, e.target.value)} placeholder="天气" className="flex-1" />
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => removeTag(index)}>
                    <Minus size={16} weight="bold" />
                  </Button>
                </div>
              ))}
              <Button variant="default" className="w-fit font-semibold" onClick={() => updateField('tags', [...form.tags, ''])}>
                + 添加标签
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">支持设备</label>
            <div className="space-y-2">
              {form.devices.map((device, index) => (
                <div key={`${index}-${device}`} className="flex items-center gap-2">
                  <Input value={getDeviceDisplayName(device)} readOnly className="flex-1" />
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => removeDevice(index)}>
                    <Minus size={16} weight="bold" />
                  </Button>
                </div>
              ))}
              <Button variant="default" className="w-fit font-semibold" onClick={openDeviceSelector}>
                + 添加设备
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDevicePanel ? (
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">选择设备</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid gap-2 md:grid-cols-2">
              {supportedDevices.map((device) => (
                <label key={`${device.codename}-${device.name}`} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <input type="checkbox" checked={tempDeviceSelection.includes(device.codename)} onChange={() => toggleTempDevice(device.codename)} />
                  <span className="font-medium">{device.name}</span>
                  <span className="text-xs text-muted-foreground">{device.codename}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDevicePanel(false)}>
                取消
              </Button>
              <Button onClick={confirmDeviceSelection}>确认</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">其他信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <label className="mb-2 block text-sm font-semibold text-foreground">创建的 资源.json 路径</label>
          <Input value={form.path} onChange={(e) => updateField('path', e.target.value)} placeholder="yourname/AppName.json" />
          <p className="text-xs leading-5 text-muted-foreground">
            注意：此文件是你在 fork 官方软件源仓库后新建的资源 json，路径一般为 resources/你的昵称/资源名.json。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">生成的 CSV</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="scrollbar-none overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6">
            <pre className="m-0 whitespace-pre-wrap break-words font-mono">{generatedCSV}</pre>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={validateAndCopy}>
              <CopySimple size={16} weight="bold" />
              复制到剪贴板
            </Button>
          </div>
        </CardContent>
      </Card>

      {alert ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{alert.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{alert.message}</div>
            </div>
            <Button size="sm" onClick={() => setAlert(null)}>
              <Check size={16} weight="bold" />
              确定
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
