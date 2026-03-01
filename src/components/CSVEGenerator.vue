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
              <input v-model="csvData.name" placeholder="WeatherPlus" />
            </div>
            <div class="form-group">
              <label>图标 URL <span class="hint-text">(最佳为200×200,AstroBox会自动割圆。若设计简陋、低质会被打回) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
              <input v-model="csvData.icon" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名" />
            </div>
            <div class="form-group">
              <label>封面 URL <span class="hint-text">(比例3:2显示最佳，分辨率不要过大，1200x800足矣。若设计简陋、低质会被打回。) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
              <input v-model="csvData.cover" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/封面名" />
            </div>
            <div class="form-row">
              <div class="form-group half-width">
                <label>资源类型</label>
                <select v-model="csvData.restype">
                  <option value="">请选择资源类型</option>
                  <option value="quickapp">快应用 (quickapp)</option>
                  <option value="watchface">表盘 (watchface)</option>
                </select>
              </div>
              <div class="form-group half-width">
                <label>付费类型<span class="hint-text">（体验版请选择“应用内付费”）</span></label>
                <select v-model="csvData.paymentType">
                  <option value="">请选择付费类型</option>
                  <option value="free">免费(感谢你作出的贡献)</option>
                  <option value="force_paid">强制付费(force_paid)</option>
                  <option value="paid">应用内付费(paid)</option>
                </select>
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
                  <input v-model="csvData.tags[index]" placeholder="天气" />
                  <button @click="removeTag(index)" class="round-remove-button">
                    <Minus :size="16" weight="bold" />
                  </button>
                </div>
                <button @click="addTag" class="add-button">+ 添加标签</button>
              </div>
            </div>
            <div class="form-group">
              <label>支持设备<span class="hint-text">（注意环10和环10nfc是否都支持）</span></label>
              <div class="array-input">
                <div v-for="(deviceCode, index) in csvData.devices" :key="index" class="preview-item">
                  <input 
                    :value="getDeviceDisplayName(deviceCode)"
                    placeholder="请点击下方按钮添加设备" 
                    readonly
                  />
                  <button @click="removeDevice(index)" class="round-remove-button">
                    <Minus :size="16" weight="bold" />
                  </button>
                </div>
                <button @click="openDeviceSelector" class="add-button">+ 添加设备</button>
              </div>
            </div>
          </div>

          <!-- 其他信息部分 -->
          <div class="form-section">
            <h3>其他信息</h3>
            <div class="form-group">
              <label>创建的 资源.json 路径</label>
              <input 
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
              <button @click="validateAndCopy" class="add-button">
                <CopySimple :size="16" weight="bold" />
                复制到剪贴板
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 设备选择对话框 -->
      <div v-if="showDeviceSelector" class="modal-overlay">
        <div class="modal-content">
          <h3>选择设备 <span class="hint-text">(可多选)</span></h3>
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
          <div class="modal-actions">
            <button @click="cancelDeviceSelection" class="add-button">取消</button>
            <button @click="confirmDeviceSelection" class="add-button" :disabled="selectedDevices.length === 0">确认</button>
          </div>
        </div>
      </div>

      <!-- 自定义提示框 -->
      <div v-if="showAlert" class="modal-overlay">
        <div class="modal-content alert-content">
          <div class="prompt-header">
            <WarningCircle :size="48" weight="duotone" class="warning-icon" />
            <h3>{{ alertTitle }}</h3>
          </div>
          <div class="prompt-body">
            <p>{{ alertMessage }}</p>
          </div>
          <div class="prompt-actions">
            <button class="confirm-button" @click="closeAlert">
              <Check :size="20" weight="bold" class="check-icon" />
              确定
            </button>
          </div>
        </div>
      </div>
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
/* 基础样式 */
.csv-generator {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 1.5rem;
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 1.5rem;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 600px;
}

.form-container {
  flex: 1;
  min-width: 0;
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 12px;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 2.5rem;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 1.75rem;
}

label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.hint-text {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: normal;
}

input, select, textarea {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  color: #334155;
  box-sizing: border-box;
  transition: all 0.2s;
}

input:focus, select:focus, textarea:focus {
  border-color: #0e467c;
  box-shadow: 0 0 0 3px rgba(14, 70, 124, 0.1);
  outline: none;
}

input::placeholder,
textarea::placeholder {
  color: #94a3b8;
  font-style: italic;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1rem;
}

.form-row {
  display: flex;
  gap: 1.5rem;
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
  gap: 0.75rem;
}

.preview-item input {
  flex-grow: 1;
  padding: 0.75rem 1rem;
}

/* 圆形移除按钮 - 重点优化部分 */
.round-remove-button {
  margin: 0;
  padding: 0;
  width: 2.5rem;
  height: 2.5rem;
  min-width: 2.5rem; /* 确保最小宽度 */
  min-height: 2.5rem; /* 确保最小高度 */
  aspect-ratio: 1/1; /* 强制保持1:1宽高比 */
  border: none;
  background: #f8e6e6;
  color: #8b0000;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0; /* 防止按钮被压缩 */
}

.round-remove-button:hover {
  background: #f0cfcf;
}

.round-remove-button svg {
  width: 18px;
  height: 18px;
}

.add-button {
  margin-top: 0.75rem;
  padding: 0.75rem 1.25rem;
  border: none;
  background: #e6f0f8;
  color: #0e467c;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.add-button:hover {
  background: #cfe0f0;
}

.add-button svg {
  width: 18px;
  height: 18px;
}

.preview-content {
  background: #f8fafc;
  color: #334155;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: auto;
  font-size: 0.95rem;
  line-height: 1.6;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
  margin: 1.5rem 0;
}

.device-item {
  padding: 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.device-item:hover {
  background: #e6f0f8;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.device-item.selected {
  background: #e6f0f8;
  border-color: #0e467c;
}

.device-name {
  font-weight: 600;
  color: #0e467c;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.device-codename {
  font-size: 0.85rem;
  color: #475569;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* 提示框样式 */
.alert-content {
  max-width: 500px;
  text-align: center;
}

.prompt-header {
  background: #f8fafc;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.warning-icon {
  background: #fef3c7;
  padding: 1rem;
  border-radius: 50%;
  width: 56px;
  height: 56px;
}

.prompt-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
}

.prompt-body {
  padding: 1.5rem;
  text-align: center;
}

.prompt-body p {
  margin: 0 0 1rem;
  color: #475569;
  line-height: 1.6;
  font-size: 1.05rem;
}

.prompt-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
}

.confirm-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  border-radius: 8px;
  background: #e6f0f8;
  color: #0e467c;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.confirm-button:hover {
  background: #cfe0f0;
}

.confirm-button svg {
  width: 20px;
  height: 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .csv-generator {
    padding: 1rem;
  }
  
  .form-container {
    padding: 1rem;
  }
  
  .form-section {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .half-width {
    width: 100%;
  }
  
  .modal-content {
    padding: 1.5rem;
    width: 95%;
  }
  
  .device-list {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  /* 移动设备下的圆形按钮调整 */
  .round-remove-button {
    width: 2.25rem;
    height: 2.25rem;
    min-width: 2.25rem;
    min-height: 2.25rem;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 1.25rem;
  }
  
  input, select, textarea {
    padding: 0.75rem;
  }
  
  .preview-content {
    padding: 1rem;
  }
  
  .modal-content {
    padding: 1.25rem;
    width: 98%;
  }
  
  .device-list {
    grid-template-columns: 1fr;
  }

  /* 小屏幕下的圆形按钮调整 */
  .round-remove-button {
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
    min-height: 2rem;
  }
}
</style>
