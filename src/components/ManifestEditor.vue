<template>
  <div class="manifest-editor">
    <!-- 项目目录选择提示 -->
    <div v-if="!projectDirectory" class="directory-prompt">
      <div class="prompt-content">
        <h3>请选择项目文件夹</h3>
        <p>为了正确管理资源文件，请先选择您的项目文件夹</p>
        <button @click="selectProjectDirectory">选择文件夹</button>
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div v-else class="editor-content">
      <!-- 顶部项目路径显示 -->
      <div class="project-path">
        <span>当前项目路径: {{ projectDirectory.name }}</span>
        <button @click="selectProjectDirectory">更改文件夹</button>
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
              <label>预览图路径（支持多张）</label>
              <div v-for="(preview, index) in manifest.item.preview" :key="index" class="array-item">
                <input v-model="manifest.item.preview[index]" readonly />
                <button @click="removePreview(index)">删除</button>
              </div>
              <button @click="selectMultiplePreviews">+ 添加预览图</button>
            </div>
            <div class="form-group">
              <label>图标路径</label>
              <div class="file-input-group">
                <input v-model="manifest.item.icon" readonly />
                <button @click="selectFile('icon')">选择文件</button>
              </div>
            </div>
            <div class="form-group">
              <label>源码仓库 URL（可选）</label>
              <input v-model="manifest.item.source_url" placeholder="https://github.com/yourname/yourrepo" />
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
              <button @click="removeAuthor(index)">删除</button>
            </div>
            <button @click="addAuthor">+ 添加作者</button>
          </div>

          <!-- 设备下载信息部分 -->
          <div class="form-section">
            <h3>设备下载信息</h3>
            <div v-for="(download, deviceCode) in manifest.downloads" :key="deviceCode" class="download-group">
              <h4>{{ getDeviceDisplayName(deviceCode) }}</h4>
              <div class="form-group">
                <label>应用版本</label>
                <input v-model="download.version" placeholder="1.0.0" />
              </div>
              <div class="form-group">
                <label>资源文件路径</label>
                <div class="file-input-group">
                  <input v-model="download.file_name" readonly />
                  <button @click="selectFile('download', deviceCode)">选择文件</button>
                </div>
              </div>
              <button @click="removeDownload(deviceCode)">删除</button>
            </div>
            <button @click="openDeviceSelector">+ 添加设备下载</button>
          </div>
        </div>

        <!-- 右侧 JSON 预览 -->
        <div class="preview-container">
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
            <button @click="cancelDeviceSelection">取消</button>
            <button @click="confirmDeviceSelection" :disabled="selectedDevices.length === 0">确认</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import JsonPreview from '../components/JsonPreview.vue'
import { Manifest } from '../type/manifest'

interface Device {
  codename: string
  name: string
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
    const selectedDevices = ref<string[]>([]) // 临时选择的设备
    const projectDirectory = ref<FileSystemDirectoryHandle | null>(null)

    // 支持的设备列表（包含所有变体）
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

    // 获取设备显示名称
    const getDeviceDisplayName = (codename: string) => {
      const devices = supportedDevices.filter(d => d.codename === codename)
      if (devices.length === 0) return codename
      
      const download = manifest.value.downloads[codename]
      const version = download?.version ? ` (${download.version})` : ''
      
      if (devices.length === 1) {
        return `${devices[0].name} [${codename}]${version}`
      }
      
      // 显示所有设备名称，用/分隔
      const deviceNames = devices.map(d => d.name).join(" / ")
      return `${deviceNames} [${codename}]${version}`
    }

    // 检查设备是否被选中
    const isDeviceSelected = (device: Device) => {
      return selectedDevices.value.includes(device.codename)
    }

    // 切换设备选择状态
    const toggleDeviceSelection = (device: Device) => {
      if (isDeviceSelected(device)) {
        selectedDevices.value = selectedDevices.value.filter(d => d !== device.codename)
      } else {
        selectedDevices.value = [...selectedDevices.value, device.codename]
      }
    }

    // 打开设备选择器 - 修复：初始化时添加已选择的设备
    const openDeviceSelector = () => {
      // 获取当前已添加的设备codename
      const currentDeviceCodes = Object.keys(manifest.value.downloads)
      // 初始化selectedDevices为当前已选择的设备
      selectedDevices.value = [...currentDeviceCodes]
      showDeviceSelector.value = true
    }

    // 确认设备选择
    const confirmDeviceSelection = () => {
      // 创建新的downloads对象
      const newDownloads: Record<string, any> = {}
      
      // 添加新选择的设备
      selectedDevices.value.forEach(codename => {
        // 保留原有设备信息或创建新条目
        newDownloads[codename] = manifest.value.downloads[codename] || {
          version: '1.0.0',
          file_name: ''
        }
      })
      
      // 更新manifest.downloads
      manifest.value.downloads = newDownloads
      
      // 重置并关闭选择器
      selectedDevices.value = []
      showDeviceSelector.value = false
    }

    // 取消设备选择
    const cancelDeviceSelection = () => {
      showDeviceSelector.value = false
    }

    // 删除设备
    const removeDownload = (deviceCode: string) => {
      delete manifest.value.downloads[deviceCode]
      
      // 如果设备选择对话框是打开的，也更新selectedDevices
      if (showDeviceSelector.value) {
        selectedDevices.value = selectedDevices.value.filter(d => d !== deviceCode)
      }
    }

    // 其他方法保持不变...
    const selectProjectDirectory = async () => {
      try {
        // @ts-ignore - 实验性API
        const directoryHandle = await window.showDirectoryPicker({
          id: 'projectDirectory',
          mode: 'readwrite'
        })
        
        projectDirectory.value = directoryHandle
      } catch (error) {
        console.error('Error selecting directory:', error)
        alert('选择文件夹失败，请重试')
      }
    }

    const selectMultiplePreviews = async () => {
      if (!projectDirectory.value) {
        alert('请先选择项目目录')
        return
      }

      try {
        // @ts-ignore - 实验性API
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
          fileHandles.map(async fileHandle => {
            const file = await fileHandle.getFile()
            return file.name
          })
        )

        // 过滤掉已存在的文件
        const uniqueNewPreviews = newPreviews.filter(
          preview => !manifest.value.item.preview.includes(preview)
        )

        if (uniqueNewPreviews.length === 0) {
          alert('您选择的文件已经存在于预览图列表中')
          return
        }

        if (newPreviews.length !== uniqueNewPreviews.length) {
          alert(`已过滤 ${newPreviews.length - uniqueNewPreviews.length} 个重复文件`)
        }

        manifest.value.item.preview = [...manifest.value.item.preview, ...uniqueNewPreviews]
      } catch (error) {
        console.error('Error selecting files:', error)
      }
    }

    const selectFile = async (type: 'icon' | 'download', deviceCode?: string) => {
      if (!projectDirectory.value) {
        alert('请先选择项目目录')
        return
      }

      try {
        // @ts-ignore - 实验性API
        const fileHandles = await window.showOpenFilePicker({
          startIn: projectDirectory.value,
          multiple: false
        })
        
        const file = await fileHandles[0].getFile()
        
        if (type === 'icon') {
          manifest.value.item.icon = file.name
        } else if (type === 'download' && deviceCode) {
          // 更新所有相同codename的设备
          Object.keys(manifest.value.downloads).forEach(code => {
            if (code === deviceCode) {
              manifest.value.downloads[code].file_name = file.name
            }
          })
        }
      } catch (error) {
        console.error('Error selecting file:', error)
      }
    }

    const removePreview = (index: number) => {
      manifest.value.item.preview.splice(index, 1)
    }

    const addAuthor = () => {
      manifest.value.item.author.push({ name: '' })
    }

    const removeAuthor = (index: number) => {
      manifest.value.item.author.splice(index, 1)
    }

    return {
      manifest,
      projectDirectory,
      showDeviceSelector,
      selectedDevices,
      supportedDevices,
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
.manifest-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem;
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

.project-path button {
  padding: 0.25rem 0.75rem;
  background: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
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

/* 按钮样式 */
button {
  margin-top: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: none;
  background: #42b983;
  color: white;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
  white-space: nowrap;
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

/* 移除按钮 */
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
  flex-shrink: 0;
}

/* 添加按钮 */
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