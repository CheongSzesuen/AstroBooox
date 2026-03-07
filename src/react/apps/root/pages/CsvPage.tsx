import { Check, CopySimple, Minus, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/react/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/react/components/ui/dialog'
import { Input } from '@/react/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react/components/ui/select'

type Device = { codename: string; name: string }

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
  const devices = supportedDevices.filter((device) => device.codename === codename)
  if (devices.length === 0) return codename
  if (devices.length === 1) return `${devices[0].name} [${codename}]`
  return `${devices.map((device) => device.name).join(' / ')} [${codename}]`
}

const fallbackCopyText = (text: string): boolean => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  let success = false
  try {
    success = document.execCommand('copy')
  } catch {
    success = false
  }
  document.body.removeChild(textArea)
  return success
}

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return fallbackCopyText(text)
    }
  }
  return fallbackCopyText(text)
}

export function CsvPage() {
  const [form, setForm] = useState<CsvForm>(initialForm)
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [currentDevices, setCurrentDevices] = useState<string[]>([])
  const [showAlert, setShowAlert] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const showCustomAlert = (title: string, message: string): void => {
    setAlertTitle(title)
    setAlertMessage(message)
    setShowAlert(true)
  }

  const closeAlert = (): void => {
    setShowAlert(false)
  }

  const generatedCSV = useMemo(() => {
    const { name, icon, cover, restype, paymentType, tags, devices, path } = form

    const tagsStr = tags.length > 1 ? `"${tags.join(';')}"` : tags[0]
    const devicesStr = devices.length > 1 ? `"${devices.join(';')}"` : devices[0]

    const fields = [name, icon, cover, restype, tagsStr, devicesStr, path]

    if (paymentType !== 'free') {
      fields.push(paymentType)
      return fields.join(',')
    }

    fields.push('')
    return fields.join(',')
  }, [form])

  const updateField = <K extends keyof CsvForm>(key: K, value: CsvForm[K]) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }))
  }

  const addTag = () => {
    setForm((previous) => ({
      ...previous,
      tags: [...previous.tags, '']
    }))
  }

  const removeTag = (index: number) => {
    setForm((previous) => {
      const next = [...previous.tags]
      next.splice(index, 1)
      if (next.length === 0) {
        next.push('')
      }
      return {
        ...previous,
        tags: next
      }
    })
  }

  const removeDevice = (index: number) => {
    setForm((previous) => {
      const nextDevices = [...previous.devices]
      const removed = nextDevices[index]
      nextDevices.splice(index, 1)
      if (nextDevices.length === 0) {
        nextDevices.push('')
      }

      setCurrentDevices((current) => {
        const nextCurrent = current.filter((device) => device !== removed)
        return nextCurrent.length > 0 ? nextCurrent : ['']
      })

      setSelectedDevices((current) => current.filter((device) => device !== removed))

      return {
        ...previous,
        devices: nextDevices
      }
    })
  }

  const validateForm = (): boolean => {
    if (!form.name) {
      showCustomAlert('表单验证失败', '请填写资源名称')
      return false
    }

    if (!form.icon) {
      showCustomAlert('表单验证失败', '请填写图标URL')
      return false
    }

    if (!validateUrlFormat(form.icon)) {
      showCustomAlert('表单验证失败', '图标URL必须以 https://raw.githubusercontent.com/ 开头')
      return false
    }

    if (!form.cover) {
      showCustomAlert('表单验证失败', '请填写封面URL')
      return false
    }

    if (!validateUrlFormat(form.cover)) {
      showCustomAlert('表单验证失败', '封面URL必须以 https://raw.githubusercontent.com/ 开头')
      return false
    }

    if (!form.restype) {
      showCustomAlert('表单验证失败', '请选择资源类型')
      return false
    }

    if (!form.paymentType) {
      showCustomAlert('表单验证失败', '请选择付费类型')
      return false
    }

    if (form.tags.length === 0 || !form.tags[0]) {
      showCustomAlert('表单验证失败', '请至少添加一个资源标签')
      return false
    }

    if (form.devices.length === 0 || !form.devices[0]) {
      showCustomAlert('表单验证失败', '请至少添加一个支持设备')
      return false
    }

    if (!form.path) {
      showCustomAlert('表单验证失败', '请填写资源.json路径')
      return false
    }

    return true
  }

  const copyToClipboard = async () => {
    const success = await copyText(generatedCSV)
    if (success) {
      showCustomAlert('操作成功', 'CSV 数据已复制到剪贴板！')
      return
    }

    showCustomAlert('操作失败', '复制失败，请手动复制')
  }

  const validateAndCopy = async () => {
    if (!validateForm()) return
    await copyToClipboard()
  }

  const isDeviceSelected = (device: Device): boolean => selectedDevices.includes(device.codename)

  const toggleDeviceSelection = (device: Device) => {
    setSelectedDevices((previous) => {
      if (previous.includes(device.codename)) {
        return previous.filter((codename) => codename !== device.codename)
      }
      return [...previous, device.codename]
    })
  }

  const openDeviceSelector = () => {
    setSelectedDevices([...currentDevices])
    setShowDeviceSelector(true)
  }

  const confirmDeviceSelection = () => {
    const nextDevices = selectedDevices.filter((device) => device)
    const resolved = nextDevices.length === 0 ? [''] : nextDevices
    setCurrentDevices(resolved)
    updateField('devices', resolved)
    setShowDeviceSelector(false)
  }

  const cancelDeviceSelection = () => {
    setShowDeviceSelector(false)
  }

  useEffect(() => {
    setCurrentDevices(form.devices.filter((device) => device))
  }, [form.devices])

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="flex min-h-full w-full flex-col gap-4">
        <div className="min-w-0">
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">资源信息</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-foreground">资源名称</label>
              <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="WeatherPlus" />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-foreground">
                图标 URL
                <span className="ml-1 text-xs font-normal text-muted-foreground">(最佳为200×200,AstroBox会自动割圆。若设计简陋、低质会被打回)</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span>
              </label>
              <Input
                value={form.icon}
                onChange={(event) => updateField('icon', event.target.value)}
                placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-foreground">
                封面 URL
                <span className="ml-1 text-xs font-normal text-muted-foreground">(比例3:2显示最佳，分辨率不要过大，1200x800足矣。若设计简陋、低质会被打回。)</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span>
              </label>
              <Input
                value={form.cover}
                onChange={(event) => updateField('cover', event.target.value)}
                placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/封面名"
              />
            </div>

            <div className="flex gap-4 max-[768px]:flex-col">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-semibold text-foreground">资源类型</label>
                <Select value={form.restype} onValueChange={(value) => updateField('restype', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择资源类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quickapp">快应用 (quickapp)</SelectItem>
                    <SelectItem value="watchface">表盘 (watchface)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  付费类型
                  <span className="ml-1 text-xs font-normal text-muted-foreground">（体验版请选择“应用内付费”）</span>
                </label>
                <Select value={form.paymentType} onValueChange={(value) => updateField('paymentType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择付费类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">免费(感谢你作出的贡献)</SelectItem>
                    <SelectItem value="force_paid">强制付费(force_paid)</SelectItem>
                    <SelectItem value="paid">应用内付费(paid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">分类与设备</h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-foreground">资源标签</label>
              <div className="flex flex-col gap-3">
                {form.tags.map((tag, index) => (
                  <div key={`tag-${index}`} className="flex items-center gap-2">
                    <Input
                      value={tag}
                      onChange={(event) => {
                        const next = [...form.tags]
                        next[index] = event.target.value
                        updateField('tags', next)
                      }}
                      placeholder="天气"
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => removeTag(index)}>
                      <Minus size={16} weight="bold" />
                    </Button>
                  </div>
                ))}
                <Button variant="default" className="w-fit font-semibold" onClick={addTag}>
                  + 添加标签
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                支持设备
                <span className="ml-1 text-xs font-normal text-muted-foreground">（注意环10和环10nfc是否都支持）</span>
              </label>
              <div className="flex flex-col gap-3">
                {form.devices.map((deviceCode, index) => (
                  <div key={`device-${index}`} className="flex items-center gap-2">
                    <Input
                      value={getDeviceDisplayName(deviceCode)}
                      placeholder="请点击下方按钮添加设备"
                      className="flex-1"
                      readOnly
                    />
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
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">其他信息</h3>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">创建的 资源.json 路径</label>
              <Input value={form.path} onChange={(event) => updateField('path', event.target.value)} placeholder="yourname/AppName.json" />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                注意：此文件不是manifest页面生成的，是你在fork官方软件源仓库
                <a className="mx-1 underline underline-offset-4" href="https://github.com/AstralSightStudios/AstroBox-Repo" target="_blank" rel="noopener noreferrer">
                  AstroBox-Repo
                </a>
                后，新建的manifest文件，路径如下：resources/你的昵称/资源名.json文件。内容类似
                <code className="ml-1 break-all">{'{"manifest_ver": 1,"repo_url": "https://github.com/你的用户名/你的资源仓库"}'}</code>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">生成的 CSV</h3>
            <div className="scrollbar-none overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6">
              <pre className="m-0 whitespace-pre-wrap break-words font-mono">{generatedCSV}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void validateAndCopy()}>
                <CopySimple size={16} weight="bold" />
                复制到剪贴板
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showDeviceSelector} onOpenChange={setShowDeviceSelector}>
          <DialogContent className="w-[95vw] !max-w-[1120px]">
            <DialogHeader>
              <DialogTitle>选择设备</DialogTitle>
              <DialogDescription>可多选，按真实支持设备勾选。</DialogDescription>
            </DialogHeader>
            <div className="my-2 max-h-[68vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 max-[420px]:grid-cols-1">
                {supportedDevices.map((device) => (
                  <div
                    key={`${device.codename}-${device.name}`}
                    className={[
                      'h-full min-h-[96px] cursor-pointer rounded-lg border p-4 transition-colors',
                      isDeviceSelected(device) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
                    ].join(' ')}
                    onClick={() => toggleDeviceSelection(device)}
                  >
                    <div className="mb-1 font-semibold text-foreground">{device.name}</div>
                    <div className="text-xs text-muted-foreground">{device.codename}</div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelDeviceSelection}>
                取消
              </Button>
              <Button disabled={selectedDevices.length === 0} onClick={confirmDeviceSelection}>
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAlert} onOpenChange={setShowAlert}>
          <DialogContent className="max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="inline-flex items-center gap-2">
                <WarningCircle size={22} weight="duotone" />
                {alertTitle}
              </DialogTitle>
              <DialogDescription>{alertMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={closeAlert}>
                <Check size={16} weight="bold" />
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
