<template>
  <div class="csv-generator">
    <div class="editor-content">
      <div class="editor-container">
        <!-- 表单容器 -->
        <div class="form-container">
          <!-- 应用信息部分 -->
          <div class="form-section">
            <h3>应用信息</h3>
            <div class="form-group">
              <label>应用名称</label>
              <input v-model="csvData.name" placeholder="例如：WeatherPlus" />
            </div>
            <div class="form-group">
              <label>图标 URL <span class="hint-text">(最小为96×96)</span></label>
              <input v-model="csvData.iconUrl" placeholder="https://example.com/icon.png" />
            </div>
            <div class="form-group">
              <label>封面 URL <span class="hint-text">(推荐比例3:2)</span></label>
              <input v-model="csvData.coverUrl" placeholder="https://example.com/cover.png" />
            </div>
            <div class="form-group">
              <label>应用类型</label>
              <select v-model="csvData.appType">
                <option value="quickapp">快应用 (quickapp)</option>
                <option value="watchface">表盘 (watchface)</option>
              </select>
            </div>
          </div>

          <!-- 分类与设备部分 -->
          <div class="form-section">
            <h3>分类与设备</h3>
            <div class="form-group">
              <label>应用分类</label>
              <div class="array-input">
                <div v-for="(category, index) in csvData.categories" :key="index" class="array-item">
                  <input v-model="csvData.categories[index]" placeholder="例如：天气" />
                  <button @click="removeCategory(index)" class="remove-btn">×</button>
                </div>
                <button @click="addCategory" class="add-btn">+ 添加分类</button>
              </div>
            </div>
            <div class="form-group">
              <label>支持设备</label>
              <div class="array-input">
                <div v-for="(deviceCode, index) in csvData.devices" :key="index" class="array-item">
                  <input 
                    :value="getDeviceDisplayName(deviceCode)"
                    placeholder="请点击下方按钮添加设备" 
                    readonly
                  />
                  <button @click="removeDevice(index)" class="remove-btn">×</button>
                </div>
                <button @click="openDeviceSelector" class="add-btn">+ 添加设备</button>
              </div>
            </div>
          </div>

          <!-- 其他信息部分 -->
          <div class="form-section">
            <h3>其他信息</h3>
            <div class="form-group">
              <label>创建的 资源.json 路径</label>
              <input 
                v-model="csvData.manifestPath" 
                placeholder="例如：yourname/AppName.json"
              />
              <p class="hint-text">
                注意：此文件不是manifest页面生成的，是在fork官方软件源仓库
                <a href="https://github.com/AstralSightStudios/AstroBox-Repo" target="_blank">AstroBox-Repo</a>
                后，在resources/目录下新建以你名字或昵称命名的文件夹内创建的.json文件。内容类似{"manifest_ver": 1,"repo_url": "https://github.com/你的用户名/你的资源仓库"
              </p>
            </div>
          </div>

          <!-- CSV预览区域 -->
          <div class="preview-section">
            <h3>生成的 CSV</h3>
            <div class="preview-content">
              <pre>{{ generatedCSV }}</pre>
            </div>
            <div class="copy-section">
              <button @click="copyToClipboard" class="copy-btn">复制到剪贴板</button>
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
            <button @click="cancelDeviceSelection">取消</button>
            <button @click="confirmDeviceSelection" :disabled="selectedDevices.length === 0">确认</button>
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
  iconUrl: '',
  coverUrl: '',
  appType: 'quickapp',
  categories: [''],
  devices: [''],
  manifestPath: ''
})

const showDeviceSelector = ref(false)
const selectedDevices = ref<string[]>([]) // 临时选择的设备
const currentDevices = ref<string[]>([]) // 当前实际选择的设备

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

// 生成 CSV 字符串
const generatedCSV = computed(() => {
  const { name, iconUrl, coverUrl, appType, categories, devices, manifestPath } = csvData.value
  
  // 处理可能包含逗号的内容
  const categoriesStr = categories.length > 1 ? `"${categories.join(';')}"` : categories[0]
  const devicesStr = devices.length > 1 ? `"${devices.join(';')}"` : devices[0]
  
  return [name, iconUrl, coverUrl, appType, categoriesStr, devicesStr, manifestPath].join(',')
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
const addCategory = () => {
  csvData.value.categories.push('')
}

const removeCategory = (index: number) => {
  csvData.value.categories.splice(index, 1)
  if (csvData.value.categories.length === 0) {
    csvData.value.categories.push('')
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
    alert('CSV 数据已复制到剪贴板！')
  } catch (err) {
    console.error('复制失败:', err)
    alert('复制失败，请手动复制')
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
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 500px;
}

.form-container {
  flex: 1;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
  height: 100%;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
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

button {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: none;
  background: #42b983;
  color: white;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
}

button:hover {
  background: #369d6d;
}

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.array-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.array-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.array-item input {
  flex-grow: 1;
  padding: 0.5rem 0.75rem;
}

.remove-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  background: #ffebee;
  color: #f44336;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #ffcdd2;
}

.add-btn {
  align-self: flex-start;
  padding: 0.5rem 0.75rem;
  border: none;
  background: #f0f0f0;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #e0e0e0;
}

.preview-section {
  margin-top: 2rem;
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
}

.preview-content {
  background: #1e1e1e;
  color: #dcdcdc;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  margin-bottom: 1rem;
  font-family: 'MiSans', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.copy-section {
  display: flex;
  justify-content: flex-end;
}

.copy-btn {
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.copy-btn:hover {
  background: #369d6d;
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

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.device-item {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.device-item:hover {
  background: #f5f5f5;
}

.device-item.selected {
  background: #e6f7ee;
  border-color: #42b983;
}

.device-name {
  font-weight: bold;
}

.device-codename {
  font-size: 0.8rem;
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .device-list {
    grid-template-columns: 1fr;
  }
}

a {
  color: #42b983;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>