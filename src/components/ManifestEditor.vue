<template>
  <div class="manifest-editor">
    <!-- 项目目录选择提示 -->
    <div v-if="!projectDirectory" class="directory-prompt">
      <div class="prompt-content">
        <h3>请选择项目文件夹</h3>
        <p>为了更快捷地生成manifest，请先选择您的项目文件夹。</p>
        <p>确保所有的文件都已经放在该文件夹下。</p>
        <button class="add-button" @click="selectProjectDirectory">选择文件夹</button>
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div v-else class="editor-content">
      <!-- 顶部项目路径显示 -->
      <div class="project-path">
        <span>当前项目路径: {{ projectDirectory.name }}</span>
        <button class="remove-button" @click="selectProjectDirectory">更改文件夹</button>
      </div>

      <div class="editor-container">
        <!-- 左侧图形化表单 -->
        <div class="form-container">
          <!-- 应用信息部分 -->
          <div class="form-section">
            <h3>应用信息</h3>
            <div class="form-group">
              <label>应用名称</label>
              <input v-model="manifest.item.name" placeholder="应用名称" />
            </div>
            <div class="form-group">
              <label>应用简介</label>
              <textarea v-model="manifest.item.description" placeholder="应用简介"></textarea>
            </div>
            <div class="form-group">
              <label>预览图（支持多选）</label>
              <div v-for="(preview, index) in manifest.item.preview" :key="index" class="array-item">
                <input v-model="manifest.item.preview[index]" readonly />
                <button class="remove-button" @click="removePreview(index)">删除</button>
              </div>
              <button class="add-button" @click="selectMultiplePreviews">+ 添加预览图</button>
            </div>
            <div class="form-group">
              <label>图标</label>
              <div class="file-input-group">
                <input v-model="manifest.item.icon" readonly />
                <button class="add-button" @click="selectFile('icon')">选择文件</button>
              </div>
            </div>
            <div class="form-group">
              <label>开源仓库 URL（可选）</label>
              <input v-model="manifest.item.source_url" placeholder="开源项目将有更多机会得到推荐" />
            </div>
          </div>

          <!-- 作者信息部分 -->
          <div class="form-section">
            <h3>作者信息</h3>
            <div v-for="(author, index) in manifest.item.author" :key="index" class="author-group">
              <div class="form-group">
                <label>作者名称</label>
                <input v-model="author.name" placeholder="作者名称" />
              </div>
              <div class="form-group">
                <label>作者主页（可选）</label>
                <input v-model="author.author_url" placeholder="https://example.com" />
              </div>
              <button class="remove-button" @click="removeAuthor(index)">删除</button>
            </div>
            <button class="add-button" @click="addAuthor">+ 添加作者</button>
          </div>

          <!-- 设备下载信息部分 -->
          <div class="form-section">
            <h3>支持设备信息</h3>
            <div v-for="(download, deviceCode) in manifest.downloads" :key="deviceCode" class="download-group">
              <h4>{{ getDeviceDisplayName(deviceCode) }}</h4>
              <div class="form-group">
                <label>应用版本</label>
                <input v-model="download.version" placeholder="1.0.0" />
              </div>
              <div class="form-group">
                <label>资源文件</label>
                <div class="file-input-group">
                  <input v-model="download.file_name" readonly />
                  <button class="add-button" @click="selectFile('download', deviceCode)">选择文件</button>
                </div>
              </div>
              <button class="remove-button" @click="removeDownload(deviceCode)">删除</button>
            </div>
            <button class="add-button" @click="openDeviceSelector">+ 添加支持的设备</button>
          </div>
        </div>

        <!-- 右侧 JSON 预览和操作按钮 -->
        <div class="preview-container">
          <div class="preview-actions">
            <button class="add-button" @click="saveManifest">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="currentColor"/>
              </svg>
              保存
            </button>
            <button class="add-button" @click="copyToClipboard">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z" fill="currentColor"/>
              </svg>
              复制
            </button>
          </div>
          <JsonPreview :data="manifest" />
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

      <!-- 覆盖确认对话框 -->
      <div v-if="showOverwriteDialog" class="modal-overlay">
        <div class="modal-content">
          <h3>确认覆盖文件</h3>
          <p>项目目录中已存在 manifest.json 文件，确定要覆盖吗？</p>
          <div class="modal-actions">
            <button class="remove-button" @click="cancelOverwrite">取消</button>
            <button class="add-button" @click="confirmOverwrite">确认</button>
          </div>
        </div>
      </div>

      <!-- 自定义提示框 -->
      <div v-if="showAlert" class="modal-overlay">
        <div class="modal-content alert-content">
          <h3>{{ alertTitle }}</h3>
          <p>{{ alertMessage }}</p>
          <div class="modal-actions">
            <button class="add-button" @click="closeAlert">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import JsonPreview from '../components/JsonPreview.vue'
import { Manifest } from '../type/manifest'

interface Device {
  codename: string
  name: string
}

interface FileSystemDirectoryHandle {
  name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  getFile(name: string): Promise<File>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  name: string
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream {
  write(data: string | BufferSource | Blob | ArrayBufferView | ArrayBuffer): Promise<void>
  close(): Promise<void>
}

declare global {
  interface Window {
    showDirectoryPicker(options?: { 
      id?: string
      mode?: 'read' | 'readwrite' 
    }): Promise<FileSystemDirectoryHandle>
    
    showOpenFilePicker(options?: {
      multiple?: boolean
      startIn?: FileSystemDirectoryHandle
      types?: Array<{
        description?: string
        accept: Record<string, string[]>
      }>
    }): Promise<FileSystemFileHandle[]>
  }
}

export default defineComponent({
  components: { JsonPreview },
  setup() {
    const manifest = ref<Manifest>({
      item: {
        name: '',
        description: '',
        preview: [],
        icon: '',
        source_url: '',
        author: [],
      },
      downloads: {}
    })

    const showDeviceSelector = ref(false)
    const selectedDevices = ref<string[]>([])
    const projectDirectory = ref<FileSystemDirectoryHandle | null>(null)
    const showOverwriteDialog = ref(false)
    const showAlert = ref(false)
    const alertTitle = ref('')
    const alertMessage = ref('')

    const supportedDevices: Device[] = [
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

    // 复制到剪贴板
    const copyToClipboard = async (): Promise<void> => {
      try {
        const manifestData = JSON.stringify(manifest.value, null, 2)
        await navigator.clipboard.writeText(manifestData)
        showCustomAlert('操作成功', '已复制到剪贴板')
      } catch (error) {
        console.error('复制失败:', error)
        showCustomAlert('操作失败', '复制失败，请检查控制台')
      }
    }

    // 保存 manifest.json 到项目根目录
    const saveManifest = async (): Promise<void> => {
      if (!projectDirectory.value) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        // 检查文件是否已存在
        try {
          await projectDirectory.value.getFileHandle('manifest.json', { create: false })
          // 文件存在，显示覆盖确认对话框
          showOverwriteDialog.value = true
        } catch {
          // 文件不存在，直接保存
          await performSave()
          showCustomAlert('操作成功', 'manifest.json 已成功保存')
        }
      } catch (error) {
        console.error('保存文件失败:', error)
        showCustomAlert('操作失败', '保存文件失败，请检查控制台')
      }
    }

    // 执行保存操作
    const performSave = async (): Promise<void> => {
      if (!projectDirectory.value) return

      try {
        const manifestData = JSON.stringify(manifest.value, null, 2)
        const fileHandle = await projectDirectory.value.getFileHandle('manifest.json', { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(manifestData)
        await writable.close()
      } catch (error) {
        console.error('保存文件失败:', error)
        throw error
      }
    }

    // 确认覆盖
    const confirmOverwrite = async (): Promise<void> => {
      showOverwriteDialog.value = false
      try {
        await performSave()
        showCustomAlert('操作成功', 'manifest.json 已成功覆盖')
      } catch (error) {
        console.error('覆盖文件失败:', error)
        showCustomAlert('操作失败', '覆盖文件失败，请检查控制台')
      }
    }

    // 取消覆盖
    const cancelOverwrite = (): void => {
      showOverwriteDialog.value = false
    }

    // 获取设备显示名称
    const getDeviceDisplayName = (codename: string): string => {
      const devices = supportedDevices.filter(d => d.codename === codename)
      if (devices.length === 0) return codename
      
      const download = manifest.value.downloads[codename]
      const version = download?.version ? ` (${download.version})` : ''
      
      if (devices.length === 1) {
        return `${devices[0].name} [${codename}]${version}`
      }
      
      const deviceNames = devices.map(d => d.name).join(" / ")
      return `${deviceNames} [${codename}]${version}`
    }

    // 检查设备是否被选中
    const isDeviceSelected = (device: Device): boolean => {
      return selectedDevices.value.includes(device.codename)
    }

    // 切换设备选择状态
    const toggleDeviceSelection = (device: Device): void => {
      if (isDeviceSelected(device)) {
        selectedDevices.value = selectedDevices.value.filter(d => d !== device.codename)
        delete manifest.value.downloads[device.codename]
      } else {
        selectedDevices.value = [...selectedDevices.value, device.codename]
        if (!manifest.value.downloads[device.codename]) {
          manifest.value.downloads[device.codename] = {
            version: '1.0.0',
            file_name: ''
          }
        }
      }
    }

    // 打开设备选择器
    const openDeviceSelector = (): void => {
      const currentDeviceCodes = Object.keys(manifest.value.downloads)
      selectedDevices.value = [...currentDeviceCodes]
      showDeviceSelector.value = true
    }

    // 确认设备选择
    const confirmDeviceSelection = (): void => {
      showDeviceSelector.value = false
    }

    // 取消设备选择
    const cancelDeviceSelection = (): void => {
      showDeviceSelector.value = false
    }

    // 删除设备
    const removeDownload = (deviceCode: string): void => {
      delete manifest.value.downloads[deviceCode]
      if (showDeviceSelector.value) {
        selectedDevices.value = selectedDevices.value.filter(d => d !== deviceCode)
      }
    }

    // 选择项目目录
    const selectProjectDirectory = async (): Promise<void> => {
      try {
        const directoryHandle = await window.showDirectoryPicker({
          id: 'projectDirectory',
          mode: 'readwrite'
        })
        projectDirectory.value = directoryHandle
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('选择目录错误:', error)
          showCustomAlert('操作失败', '选择文件夹失败，请重试')
        } else {
          showCustomAlert('操作提示', '未切换文件夹')
        }
      }
    }

    // 选择多个预览图
    const selectMultiplePreviews = async (): Promise<void> => {
      if (!projectDirectory.value) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        const fileHandles = await window.showOpenFilePicker({
          startIn: projectDirectory.value,
          multiple: true,
          types: [{
            description: '图片文件',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.webp']
            }
          }]
        })

        const newPreviews = await Promise.all(
          fileHandles.map(async (fileHandle: FileSystemFileHandle) => {
            const file = await fileHandle.getFile()
            return file.name
          })
        )

        const uniqueNewPreviews = newPreviews.filter(
          (preview: string) => !manifest.value.item.preview.includes(preview)
        )

        if (uniqueNewPreviews.length === 0) {
          showCustomAlert('操作提示', '您选择的文件已经存在于预览图列表中')
          return
        }

        manifest.value.item.preview = [...manifest.value.item.preview, ...uniqueNewPreviews]
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('选择文件错误:', error)
          showCustomAlert('操作失败', '选择文件失败，请检查控制台')
        } else {
          showCustomAlert('操作提示', '未导入文件')
        }
      }
    }

    // 选择单个文件
    const selectFile = async (type: 'icon' | 'download', deviceCode?: string): Promise<void> => {
      if (!projectDirectory.value) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        const fileHandles = await window.showOpenFilePicker({
          startIn: projectDirectory.value,
          multiple: false
        })
        
        const file = await fileHandles[0].getFile()
        
        if (type === 'icon') {
          manifest.value.item.icon = file.name
        } else if (type === 'download' && deviceCode) {
          if (manifest.value.downloads[deviceCode]) {
            manifest.value.downloads[deviceCode].file_name = file.name
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('选择文件错误:', error)
          showCustomAlert('操作失败', '选择文件失败，请检查控制台')
        } else {
          showCustomAlert('操作提示', '未导入文件')
        }
      }
    }

    // 删除预览图
    const removePreview = (index: number): void => {
      manifest.value.item.preview.splice(index, 1)
    }

    // 添加作者
    const addAuthor = (): void => {
      manifest.value.item.author.push({ name: '' })
    }

    // 删除作者
    const removeAuthor = (index: number): void => {
      manifest.value.item.author.splice(index, 1)
    }

    return {
      manifest,
      projectDirectory,
      showDeviceSelector,
      selectedDevices,
      supportedDevices,
      showOverwriteDialog,
      showAlert,
      alertTitle,
      alertMessage,
      saveManifest,
      copyToClipboard,
      confirmOverwrite,
      cancelOverwrite,
      closeAlert,
      getDeviceDisplayName,
      isDeviceSelected,
      toggleDeviceSelection,
      openDeviceSelector,
      confirmDeviceSelection,
      cancelDeviceSelection,
      removeDownload,
      selectProjectDirectory,
      selectMultiplePreviews,
      selectFile,
      removePreview,
      addAuthor,
      removeAuthor
    }
  }
})
</script>

<style scoped>
/* 基础样式 */
.manifest-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem;
}

/* 按钮样式 */
button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.remove-button {
  background: #ffebee;
  color: #f44336;
}

.remove-button:hover {
  background: #ffcdd2;
}

.add-button {
  background: #e8f5e9;
  color: #2e7d32;
}

.add-button:hover {
  background: #c8e6c9;
}

button svg {
  width: 16px;
  height: 16px;
}

/* 项目目录提示样式 */
.directory-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.prompt-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  text-align: center;
}

/* 编辑器内容样式 */
.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 1rem;
}

/* 项目路径样式 */
.project-path {
  background: #f0f0f0;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 编辑器容器 */
.editor-container {
  display: flex;
  flex: 1;
  gap: 2rem;
  overflow: hidden;
  min-height: 500px;
}

/* 表单容器 */
.form-container {
  flex: 1;
  min-width: 0;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
}

/* JSON预览容器 */
.preview-container {
  width: 40%;
  max-width: 40%;
  min-width: 300px;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 预览操作按钮 */
.preview-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

/* 表单部分 */
.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

/* 表单组 */
.form-group {
  margin-bottom: 1rem;
  width: 100%;
}

/* 标签样式 */
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  width: 100%;
}

/* 输入框和文本域 */
input, textarea, select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
}

textarea {
  resize: vertical;
  min-height: 60px;
}

/* 数组项样式 */
.array-item, .author-group, .download-group {
  border: 1px solid #eee;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

/* 文件输入组 */
.file-input-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.file-input-group input {
  flex: 1;
  min-width: 0;
}

.file-input-group button {
  flex-shrink: 0;
  white-space: nowrap;
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

/* 设备列表 */
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
  transition: all 0.2s;
}

.device-item:hover {
  background: #f5f5f5;
}

.device-item.selected {
  background: #e6f7ee;
  border-color: #42b983;
}

/* 模态框操作按钮 */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

/* 提示文本 */
.hint-text {
  color: #666;
  font-size: 0.9rem;
  font-weight: normal;
}

/* 设备名称和代号样式 */
.device-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.device-codename {
  color: #666;
  font-size: 0.85rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }
  
  .form-container,
  .preview-container {
    max-width: 100%;
    width: 100%;
  }
  
  .device-list {
    grid-template-columns: 1fr;
  }
}
</style>