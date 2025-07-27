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
              <label>图标 URL <span class="hint-text">(最佳为200×200,AstroBox会自动割圆) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
              <input v-model="csvData.icon" placeholder="https://raw.githubusercontent.com/用户名/资源仓库/refs/heads/分支名/图标名" />
            </div>
            <div class="form-group">
              <label>封面 URL <span class="hint-text">(比例3:2显示最佳，分辨率不要过大，1200x800足矣) </span><span class="hint-text">(地址是在你创建的仓库里右键图片并在新标签页中打开的地址)</span></label>
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
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
                    </svg>
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
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
                    </svg>
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
                后，新建的manifest文件，路径如下：resources/你的昵称/资源名.json文件。内容类似{"manifest_ver": 1,"repo_url": "https://github.com/你的用户名/你的资源仓库"
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
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z" fill="currentColor"/>
                </svg>
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
            <svg width="48" height="48" viewBox="0 0 24 24" class="warning-icon">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#d97706"/>
            </svg>
            <h3>{{ alertTitle }}</h3>
          </div>
          <div class="prompt-body">
            <p>{{ alertMessage }}</p>
          </div>
          <div class="prompt-actions">
            <button class="confirm-button" @click="closeAlert">
              <svg width="20" height="20" viewBox="0 0 24 24" class="check-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
              </svg>
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
const supportedDevices = [
  { codename: "n66", name: "Xiaomi Smart Band 9" },
  { codename: "n66", name: "Xiaomi Smart Band 9 NFC" },
  { codename: "n67", name: "Xiaomi Smart Band 9 Pro" },
  { codename: "o66", name: "Xiaomi Smart Band 10" },
  { codename: "o66nfc", name: "Xiaomi Smart Band 10 NFC" },
  { codename: "n62", name: "Xiaomi Watch S3" },
  { codename: "n62", name: "Xiaomi Watch S3 eSIM" },
  { codename: "o62", name: "Xiaomi Watch S4" },
  { codename: "o62m", name: "Xiaomi Watch S4 eSIM" },
  { codename: "o63", name: "Xiaomi Watch S4 41mm" },
  { codename: "o65", name: "REDMI Watch 5" },
  { codename: "o65m", name: "REDMI Watch 5 eSIM" }
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
  
  // 确保所有字段都被正确分隔
  const fields = [
    name,
    icon,
    cover,
    restype,
    tagsStr,
    devicesStr,
    path,
    paymentType === 'free' ? '' : paymentType,
    '' // 最后一个空字段
  ]
  
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
  padding: 1rem;
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.half-width {
  flex: 1;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.hint-text {
  color: #666;
  font-size: 0.8rem;
  font-weight: normal;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
}

input:focus, select:focus, textarea:focus {
  border-color: #0e467c;
  box-shadow: 0 0 0 2px rgba(14, 70, 124, 0.2);
}

input::placeholder,
textarea::placeholder {
  color: #999;
  font-style: italic;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.array-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-item input {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
}

.round-remove-button {
  margin: 0;
  padding: 0;
  width: 2rem;
  height: 2rem;
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
}

.round-remove-button:hover {
  background: #f0cfcf;
}

.round-remove-button svg {
  width: 16px;
  height: 16px;
}

.add-button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: #e6f0f8;
  color: #0e467c;
  cursor: pointer;
  border-radius: 4px;
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
  width: 16px;
  height: 16px;
}

.preview-content {
  background: #f5f9fd;
  color: #333;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

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
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.alert-content {
  max-width: 400px;
  text-align: center;
}

.prompt-header {
  background: #f8fafc;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.warning-icon {
  background: #fef3c7;
  padding: 0.75rem;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}

.prompt-header h3 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}

.prompt-body {
  padding: 1.5rem;
  text-align: center;
}

.prompt-body p {
  margin: 0 0 0.75rem;
  color: #475569;
  line-height: 1.5;
}

.prompt-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
}

.confirm-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #e6f0f8;
  color: #0e467c;
}

.confirm-button:hover {
  background: #cfe0f0;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.device-item {
  padding: 1rem;
  border-radius: 4px;
  cursor: pointer;
  background: #e8f4fd;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(14, 70, 124, 0.1);
}

.device-item:hover {
  background: #d0e5fa;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(14, 70, 124, 0.1);
}

.device-item.selected {
  background: #b3d6f7;
}

.device-name {
  font-weight: bold;
  color: #0e467c;
}

.device-codename {
  font-size: 0.8rem;
  color: #4a6b8a;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.empty {
  color: #6a737d;
  font-style: italic;
}

a {
  color: #0e467c;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #0a3560;
  text-decoration: underline;
}

/* 移动设备响应式样式 */
@media (max-width: 768px) {
  .csv-generator {
    padding: 0.5rem;
    width: 100%;
  }

  .editor-content {
    padding: 0 0.5rem;
    width: 100%;
  }

  .editor-container {
    flex-direction: column;
    min-height: auto;
  }

  .form-container {
    padding: 0.75rem;
    border-radius: 0;
    width: 100%;
  }

  .form-section {
    padding: 0.75rem;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 1rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .half-width {
    width: 100%;
  }

  input, select, textarea {
    width: calc(100% - 1rem);
    max-width: 100%;
  }

  .device-list {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .modal-content {
    width: 95%;
    margin: 0 auto;
    padding: 1rem;
  }

  .preview-content {
    padding: 0.75rem;
  }

  .array-input {
    gap: 0.5rem;
  }

  .preview-item {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }

  .preview-item input {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .round-remove-button {
    width: 2rem;
    height: 2rem;
    margin-top: 0;
    align-self: auto;
    flex-shrink: 0;
  }

  .add-button {
    width: auto;
    justify-content: center;
  }

  .modal-actions {
    flex-direction: row;
    gap: 0.5rem;
  }

  .modal-actions button {
    width: auto;
    flex: 1;
  }

  /* 确保表单组间距合适 */
  .form-group {
    margin-bottom: 0.75rem;
  }
  
  /* 调整提示文本大小 */
  .hint-text {
    font-size: 0.7rem;
  }
}
</style>