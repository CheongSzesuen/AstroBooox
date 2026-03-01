<template>
  <div class="csv-generator">
    <div class="editor-content">
      <div class="editor-container">
        <!-- 表单容器 -->
        <div class="form-container">
          <!-- 资源信息部分 -->
          <div class="form-section">
            <h3>资源信息</h3>
            <div class="form-group">
              <label>资源名称</label>
              <Input v-model="csvData.name" placeholder="WeatherPlus" />
            </div>
            <div class="form-group">
              <label>图标 URL <span class="hint-text">(最佳为200×200,AstroBox会自动割圆。若设计简陋、低质会被打回) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
              <Input v-model="csvData.icon" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名" />
            </div>
            <div class="form-group">
              <label>封面 URL <span class="hint-text">(比例3:2显示最佳，分辨率不要过大，1200x800足矣。若设计简陋、低质会被打回。) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
              <Input v-model="csvData.cover" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/封面名" />
            </div>
            <div class="form-row">
              <div class="form-group half-width">
                <label>资源类型</label>
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
              <div class="form-group half-width">
                <label>付费类型<span class="hint-text">（体验版请选择“应用内付费”）</span></label>
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

          <!-- 分类与设备部分 -->
          <div class="form-section">
            <h3>分类与设备</h3>
            <div class="form-group">
              <label>资源标签</label>
              <div class="array-input">
                <div v-for="(tag, index) in csvData.tags" :key="index" class="preview-item">
                  <Input v-model="csvData.tags[index]" placeholder="天气" class="flex-1" />
                  <Button variant="outline" size="icon" @click="removeTag(index)" class="h-9 w-9 rounded-full">
                    <Minus :size="16" weight="bold" />
                  </Button>
                </div>
                <Button @click="addTag" class="w-fit">+ 添加标签</Button>
              </div>
            </div>
            <div class="form-group">
              <label>支持设备<span class="hint-text">（注意环10和环10nfc是否都支持）</span></label>
              <div class="array-input">
                <div v-for="(deviceCode, index) in csvData.devices" :key="index" class="preview-item">
                  <Input
                    :model-value="getDeviceDisplayName(deviceCode)"
                    placeholder="请点击下方按钮添加设备" 
                    class="flex-1"
                    readonly
                  />
                  <Button variant="outline" size="icon" @click="removeDevice(index)" class="h-9 w-9 rounded-full">
                    <Minus :size="16" weight="bold" />
                  </Button>
                </div>
                <Button @click="openDeviceSelector" class="w-fit">+ 添加设备</Button>
              </div>
            </div>
          </div>

          <!-- 其他信息部分 -->
          <div class="form-section">
            <h3>其他信息</h3>
            <div class="form-group">
              <label>创建的 资源.json 路径</label>
              <Input
                v-model="csvData.path" 
                placeholder="yourname/AppName.json"
              />
              <p class="hint-text">
                注意：此文件不是manifest页面生成的，是你在fork官方软件源仓库
                <a href="https://github.com/AstralSightStudios/AstroBox-Repo" target="_blank">AstroBox-Repo</a>
                后，新建的manifest文件，路径如下：resources/你的昵称/资源名.json文件。内容类似{"manifest_ver": 1,"repo_url": "https://github.com/你的用户名/你的资源仓库"}
              </p>
            </div>
          </div>

          <!-- CSV预览区域 -->
          <div class="form-section">
            <h3>生成的 CSV</h3>
            <div class="preview-content">
              <pre>{{ generatedCSV }}</pre>
            </div>
            <div class="preview-actions">
              <Button @click="validateAndCopy">
                <CopySimple :size="16" weight="bold" />
                复制到剪贴板
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog :open="showDeviceSelector" @update:open="showDeviceSelector = $event">
        <DialogContent class="max-w-[820px]">
          <DialogHeader>
            <DialogTitle>选择设备</DialogTitle>
            <DialogDescription>可多选，按真实支持设备勾选。</DialogDescription>
          </DialogHeader>
          <div class="device-list">
            <div
              v-for="device in supportedDevices"
              :key="device.codename + device.name"
              class="device-item"
              :class="{ selected: isDeviceSelected(device) }"
              @click="toggleDeviceSelection(device)"
            >
              <div class="device-name">{{ device.name }}</div>
              <div class="device-codename">{{ device.codename }}</div>
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

<style scoped>
.csv-generator {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

.editor-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  gap: 1rem;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 500px;
}

.form-container {
  flex: 1;
  min-width: 0;
  background: hsl(var(--muted) / 0.55);
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1rem;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.04);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.hint-text {
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
  font-weight: normal;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.half-width {
  flex: 1;
  min-width: 0;
}

.array-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-content {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  overflow: auto;
  font-size: 0.9rem;
  line-height: 1.6;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', monospace;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0.5rem 0;
}

.device-item {
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.device-item:hover {
  background: hsl(var(--accent));
}

.device-item.selected {
  background: hsl(var(--muted));
  border-color: hsl(var(--ring));
}

.device-name {
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 0.25rem;
}

.device-codename {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 768px) {
  .form-container {
    padding: 1rem;
  }
  
  .form-section {
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .half-width {
    width: 100%;
  }

  .device-list {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 0.875rem;
  }
  
  .preview-content {
    padding: 1rem;
  }

  .device-list {
    grid-template-columns: 1fr;
  }
}
</style>
