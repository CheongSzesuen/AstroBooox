<template>
  <div class="flex min-h-full w-full flex-col">
    <div class="flex min-h-full w-full flex-col gap-4">
      <div class="min-w-0">
          <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">资源信息</h3>
            <div class="mb-4">
              <label class="mb-2 block text-sm font-semibold text-foreground">资源名称</label>
              <Input v-model="csvData.name" placeholder="WeatherPlus" />
            </div>
            <div class="mb-4">
              <label class="mb-2 block text-sm font-semibold text-foreground">
                图标 URL
                <span class="ml-1 text-xs font-normal text-muted-foreground">(最佳为200×200,AstroBox会自动割圆。若设计简陋、低质会被打回)</span>
                <span class="ml-1 text-xs font-normal text-muted-foreground">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span>
              </label>
              <Input v-model="csvData.icon" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名" />
            </div>
            <div class="mb-4">
              <label class="mb-2 block text-sm font-semibold text-foreground">
                封面 URL
                <span class="ml-1 text-xs font-normal text-muted-foreground">(比例3:2显示最佳，分辨率不要过大，1200x800足矣。若设计简陋、低质会被打回。)</span>
                <span class="ml-1 text-xs font-normal text-muted-foreground">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span>
              </label>
              <Input v-model="csvData.cover" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/封面名" />
            </div>
            <div class="flex gap-4 max-[768px]:flex-col">
              <div class="min-w-0 flex-1">
                <label class="mb-2 block text-sm font-semibold text-foreground">资源类型</label>
                <Select v-model="csvData.restype">
                  <SelectTrigger>
                    <SelectValue placeholder="请选择资源类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quickapp">快应用 (quickapp)</SelectItem>
                    <SelectItem value="watchface">表盘 (watchface)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="min-w-0 flex-1">
                <label class="mb-2 block text-sm font-semibold text-foreground">付费类型<span class="ml-1 text-xs font-normal text-muted-foreground">（体验版请选择“应用内付费”）</span></label>
                <Select v-model="csvData.paymentType">
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

          <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">分类与设备</h3>
            <div class="mb-4">
              <label class="mb-2 block text-sm font-semibold text-foreground">资源标签</label>
              <div class="flex flex-col gap-3">
                <div v-for="(tag, index) in csvData.tags" :key="index" class="flex items-center gap-2">
                  <Input v-model="csvData.tags[index]" placeholder="天气" class="flex-1" />
                  <Button variant="outline" size="icon" class="h-9 w-9 rounded-full" @click="removeTag(index)">
                    <Minus :size="16" weight="bold" />
                  </Button>
                </div>
                <Button variant="default" class="w-fit font-semibold" @click="addTag">+ 添加标签</Button>
              </div>
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-foreground">支持设备<span class="ml-1 text-xs font-normal text-muted-foreground">（注意环10和环10nfc是否都支持）</span></label>
              <div class="flex flex-col gap-3">
                <div v-for="(deviceCode, index) in csvData.devices" :key="index" class="flex items-center gap-2">
                  <Input
                    :model-value="getDeviceDisplayName(deviceCode)"
                    placeholder="请点击下方按钮添加设备"
                    class="flex-1"
                    readonly
                  />
                  <Button variant="outline" size="icon" class="h-9 w-9 rounded-full" @click="removeDevice(index)">
                    <Minus :size="16" weight="bold" />
                  </Button>
                </div>
                <Button variant="default" class="w-fit font-semibold" @click="openDeviceSelector">+ 添加设备</Button>
              </div>
            </div>
          </div>

          <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">其他信息</h3>
            <div>
              <label class="mb-2 block text-sm font-semibold text-foreground">创建的 资源.json 路径</label>
              <Input
                v-model="csvData.path"
                placeholder="yourname/AppName.json"
              />
              <p class="mt-2 text-xs leading-5 text-muted-foreground">
                注意：此文件不是manifest页面生成的，是你在fork官方软件源仓库
                <a class="underline underline-offset-4" href="https://github.com/AstralSightStudios/AstroBox-Repo" target="_blank">AstroBox-Repo</a>
                后，新建的manifest文件，路径如下：resources/你的昵称/资源名.json文件。内容类似{"manifest_ver": 1,"repo_url": "https://github.com/你的用户名/你的资源仓库"}
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">生成的 CSV</h3>
            <div class="scrollbar-none overflow-auto rounded-lg border border-border bg-background p-4 text-sm leading-6">
              <pre class="m-0 whitespace-pre-wrap break-words font-mono">{{ generatedCSV }}</pre>
            </div>
            <div class="mt-4 flex justify-end">
              <Button @click="validateAndCopy">
                <CopySimple :size="16" weight="bold" />
                复制到剪贴板
              </Button>
            </div>
          </div>
      </div>

      <Dialog :open="showDeviceSelector" @update:open="showDeviceSelector = $event">
        <DialogContent class="w-[95vw] !max-w-[1120px]">
          <DialogHeader>
            <DialogTitle>选择设备</DialogTitle>
            <DialogDescription>可多选，按真实支持设备勾选。</DialogDescription>
          </DialogHeader>
          <div class="my-2 max-h-[68vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 max-[420px]:grid-cols-1">
              <div
                v-for="device in supportedDevices"
                :key="device.codename + device.name"
                :class="[
                  'h-full min-h-[96px] cursor-pointer rounded-lg border p-4 transition-colors',
                  isDeviceSelected(device) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
                ]"
                @click="toggleDeviceSelection(device)"
              >
                <div class="mb-1 font-semibold text-foreground">{{ device.name }}</div>
                <div class="text-xs text-muted-foreground">{{ device.codename }}</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="cancelDeviceSelection">取消</Button>
            <Button :disabled="selectedDevices.length === 0" @click="confirmDeviceSelection">确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="showAlert" @update:open="showAlert = $event">
        <DialogContent class="max-w-[520px]">
          <DialogHeader>
            <DialogTitle class="inline-flex items-center gap-2">
              <WarningCircle :size="22" weight="duotone" />
              {{ alertTitle }}
            </DialogTitle>
            <DialogDescription>{{ alertMessage }}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button @click="closeAlert">
              <Check :size="16" weight="bold" />
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PhCheck as Check,
  PhCopySimple as CopySimple,
  PhMinus as Minus,
  PhWarningCircle as WarningCircle
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Device } from '../type/manifest'
// CSV 数据结构
const csvData = ref({
  name: '',
  icon: '',
  cover: '',
  restype: '',
  paymentType: '',
  tags: [''],
  devices: [''],
  path: ''
})

const showDeviceSelector = ref(false)
const selectedDevices = ref<string[]>([]) // 临时选择的设备
const currentDevices = ref<string[]>([]) // 当前实际选择的设备
const showAlert = ref(false)
const alertTitle = ref('')
const alertMessage = ref('')

// 支持的设备列表
const supportedDevices: Device[] = [
  { codename: "n66", name: "Xiaomi Smart Band 9" },
  { codename: "n66", name: "Xiaomi Smart Band 9 NFC" },
  { codename: "n67", name: "Xiaomi Smart Band 9 Pro" },
  { codename: "n67", name: "Xiaomi Smart Band 9 Pro 国际版" },
  { codename: "o66", name: "Xiaomi Smart Band 10" },
  { codename: "o66nfc", name: "Xiaomi Smart Band 10 NFC" },
  { codename: "n62", name: "Xiaomi Watch S3 系列" },
  { codename: "n62", name: "Xiaomi Watch S3 系列 eSIM版" },
  { codename: "n62", name: "Xiaomi Watch S3 系列 国际版" },
  { codename: "o62", name: "Xiaomi Watch S4 系列" },
  { codename: "o62", name: "Xiaomi Watch S4 系列 eSIM版" },
  { codename: "o62m", name: "Xiaomi Watch S4 15周年纪念版" },
  { codename: "o62", name: "Xiaomi Watch S4 系列 Sport版" },
  { codename: "o62", name: "Xiaomi Watch S4 系列 41mm" },
  { codename: "o65", name: "REDMI Watch 5" },
  { codename: "o65m", name: "REDMI Watch 5 eSIM" },
  { codename: "p65", name: "REDMI Watch 6" }
]

// 显示自定义提示
const showCustomAlert = (title: string, message: string): void => {
  alertTitle.value = title
  alertMessage.value = message
  showAlert.value = true
}

// 关闭自定义提示
const closeAlert = (): void => {
  showAlert.value = false
}

// 验证URL格式
const validateUrlFormat = (url: string): boolean => {
  return url.startsWith('https://raw.githubusercontent.com/')
}

// 验证表单
const validateForm = (): boolean => {
  if (!csvData.value.name) {
    showCustomAlert('表单验证失败', '请填写资源名称')
    return false
  }
  
  if (!csvData.value.icon) {
    showCustomAlert('表单验证失败', '请填写图标URL')
    return false
  }
  
  if (!validateUrlFormat(csvData.value.icon)) {
    showCustomAlert('表单验证失败', '图标URL必须以 https://raw.githubusercontent.com/ 开头')
    return false
  }
  
  if (!csvData.value.cover) {
    showCustomAlert('表单验证失败', '请填写封面URL')
    return false
  }
  
  if (!validateUrlFormat(csvData.value.cover)) {
    showCustomAlert('表单验证失败', '封面URL必须以 https://raw.githubusercontent.com/ 开头')
    return false
  }
  
  if (!csvData.value.restype) {
    showCustomAlert('表单验证失败', '请选择资源类型')
    return false
  }
  
  if (!csvData.value.paymentType) {
    showCustomAlert('表单验证失败', '请选择付费类型')
    return false
  }
  
  if (csvData.value.tags.length === 0 || csvData.value.tags[0] === '') {
    showCustomAlert('表单验证失败', '请至少添加一个资源标签')
    return false
  }
  
  if (csvData.value.devices.length === 0 || csvData.value.devices[0] === '') {
    showCustomAlert('表单验证失败', '请至少添加一个支持设备')
    return false
  }
  
  if (!csvData.value.path) {
    showCustomAlert('表单验证失败', '请填写资源.json路径')
    return false
  }
  
  return true
}

// 验证并复制
const validateAndCopy = async () => {
  if (validateForm()) {
    await copyToClipboard()
  }
}

// 生成 CSV 字符串
const generatedCSV = computed(() => {
  const { name, icon, cover, restype, paymentType, tags, devices, path } = csvData.value
  
  // 处理可能包含逗号的内容
  const tagsStr = tags.length > 1 ? `"${tags.join(';')}"` : tags[0]
  const devicesStr = devices.length > 1 ? `"${devices.join(';')}"` : devices[0]
  
  // 构建字段数组
  const fields = [
    name,
    icon,
    cover,
    restype,
    tagsStr,
    devicesStr,
    path
  ]
  
  // 如果不是免费资源，添加paymentType
  if (paymentType !== 'free') {
    fields.push(paymentType)
    // 当有付费类型时，不添加最后的空字段
    return fields.join(',')
  }
  
  // 免费资源添加最后一个空字段
  fields.push('')
  return fields.join(',')
})

// 获取设备显示名称
const getDeviceDisplayName = (codename: string) => {
  const devices = supportedDevices.filter(d => d.codename === codename)
  if (devices.length === 0) return codename
  
  if (devices.length === 1) {
    return `${devices[0].name} [${codename}]`
  }
  
  // 显示所有设备名称，用/分隔
  const deviceNames = devices.map(d => d.name).join(" / ")
  return `${deviceNames} [${codename}]`
}

// 检查设备是否被选中
const isDeviceSelected = (device: { codename: string }) => {
  return selectedDevices.value.includes(device.codename)
}

// 切换设备选择状态
const toggleDeviceSelection = (device: { codename: string }) => {
  if (isDeviceSelected(device)) {
    selectedDevices.value = selectedDevices.value.filter(d => d !== device.codename)
  } else {
    selectedDevices.value = [...selectedDevices.value, device.codename]
  }
}

// 打开设备选择器
const openDeviceSelector = () => {
  selectedDevices.value = [...currentDevices.value]
  showDeviceSelector.value = true
}

// 确认设备选择
const confirmDeviceSelection = () => {
  currentDevices.value = [...selectedDevices.value.filter(d => d)]
  if (currentDevices.value.length === 0) {
    currentDevices.value.push('')
  }
  csvData.value.devices = [...currentDevices.value]
  showDeviceSelector.value = false
}

// 取消设备选择
const cancelDeviceSelection = () => {
  showDeviceSelector.value = false
}

// 表单操作方法
const addTag = () => {
  csvData.value.tags.push('')
}

const removeTag = (index: number) => {
  csvData.value.tags.splice(index, 1)
  if (csvData.value.tags.length === 0) {
    csvData.value.tags.push('')
  }
}

const removeDevice = (index: number) => {
  const removedDevice = csvData.value.devices[index]
  csvData.value.devices.splice(index, 1)
  
  // 更新当前设备列表
  currentDevices.value = currentDevices.value.filter(d => d !== removedDevice)
  
  // 如果设备选择对话框是打开的，也更新selectedDevices
  if (showDeviceSelector.value) {
    selectedDevices.value = selectedDevices.value.filter(d => d !== removedDevice)
  }
  
  if (csvData.value.devices.length === 0) {
    csvData.value.devices.push('')
    currentDevices.value.push('')
  }
}

// 复制到剪贴板
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(generatedCSV.value)
    showCustomAlert('操作成功', 'CSV 数据已复制到剪贴板！')
  } catch (err) {
    console.error('复制失败:', err)
    showCustomAlert('操作失败', '复制失败，请手动复制')
  }
}

// 监听csvData.devices的变化
watch(() => csvData.value.devices, (newVal) => {
  currentDevices.value = [...newVal.filter(d => d)]
}, { deep: true, immediate: true })
</script>
