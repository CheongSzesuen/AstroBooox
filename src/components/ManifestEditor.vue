<template>
  <div class="manifest-editor">
    <!-- 主编辑区域 -->
    <div v-if="projectDirectory" class="editor-content">
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
              <draggable 
                v-model="manifest.item.preview" 
                handle=".drag-handle"
                item-key="index"
                class="preview-list"
                ghost-class="ghost-item"
                chosen-class="chosen-item"
                @start="onDragStart"
                @end="onDragEnd"
                @move="handleDragMove"
              >
                <template #item="{element, index}">
                  <div class="preview-item">
                    <div class="drag-handle-container">
                      <div class="drag-handle">
                        <svg width="16" height="16" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                          <path d="M460.670707 795.79798V287.418182c0-28.056566-22.755556-50.812121-50.812121-50.812121s-50.812121 22.755556-50.812121 50.812121v508.379798c0 28.056566 22.755556 50.812121 50.812121 50.812121s50.812121-22.755556 50.812121-50.812121zM613.236364 236.606061c-28.056566 0-50.812121 22.755556-50.812122 50.812121v508.379798c0 28.056566 22.755556 50.812121 50.812122 50.812121s50.812121-22.755556 50.812121-50.812121V287.418182c0-28.056566-22.755556-50.812121-50.812121-50.812121z" fill="#0e467c"></path>
                        </svg>
                      </div>
                    </div>
                    <input :value="element" readonly />
                    <button class="round-remove-button" @click="removePreview(index)">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </template>
              </draggable>
              <button class="add-button" @click="selectMultiplePreviews">+ 添加预览图</button>
            </div>
            <div class="form-group">
              <label>图标</label>
              <div class="file-input-group">
                <input v-model="manifest.item.icon" placeholder="icon.png" readonly />
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
                <input v-model="author.author_url" placeholder="https://github.com/用户名" />
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
            <button v-if="alertType === 'confirm'" class="add-button" @click="closeAlert(false)">取消</button>
            <button class="add-button" @click="closeAlert(true)">{{ alertType === 'confirm' ? '确定' : '我知道了' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, watch, onMounted, onUnmounted } from 'vue'
import JsonPreview from './JsonPreview.vue'
import { Manifest } from '../type/manifest'
import draggable from 'vuedraggable'

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
  components: { JsonPreview, draggable },
  props: {
    projectDirectory: {
      type: Object as PropType<FileSystemDirectoryHandle | null>,
      default: null
    },
    deviceType: {
      type: String as PropType<'desktop' | 'tablet' | 'phone'>,
      default: 'desktop'
    }
  },
  emits: ['update:projectDirectory'],
  setup(props, { emit }) {
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
    const showOverwriteDialog = ref(false)
    const showAlert = ref(false)
    const alertTitle = ref('')
    const alertMessage = ref('')
    const alertType = ref<'alert' | 'confirm'>('alert')
    const alertCallbacks = ref<{
      onConfirm?: () => void
      onCancel?: () => void
    }>({})

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

    // 滚动相关变量
    const scrollInterval = ref<number | null>(null)
    const baseScrollSpeed = 5 // 基础滚动速度
    const scrollThreshold = 100 // 触发滚动的阈值
    const isDragging = ref(false)
    const navHeight = ref(0) // 存储导航栏高度

    // 获取导航栏高度
    const getNavHeight = () => {
      const nav = document.querySelector('.project-path') as HTMLElement
      if (nav) {
        navHeight.value = nav.offsetHeight
      }
    }

    // 拖拽开始
    const onDragStart = (): void => {
      isDragging.value = true
      getNavHeight() // 获取当前导航栏高度
    }

    // 拖拽结束
    const onDragEnd = (): void => {
      isDragging.value = false
      clearScroll()
    }

    // 计算动态滚动速度
    const calculateDynamicSpeed = (distance: number, direction: 'up' | 'down'): number => {
      // 距离越小速度越快（越靠近边缘）
      const minDistance = 20 // 最小距离
      const maxDistance = scrollThreshold // 最大距离
      
      // 确保距离在合理范围内
      distance = Math.max(minDistance, Math.min(distance, maxDistance))
      
      // 计算速度比例 (0-1)
      const speedRatio = 1 - (distance - minDistance) / (maxDistance - minDistance)
      
      // 应用非线性曲线（二次方）
      const curvedRatio = Math.pow(speedRatio, 2)
      
      // 计算最终速度 (基础速度 * 比例 * 方向系数)
      return baseScrollSpeed * (1 + curvedRatio * 2) * (direction === 'down' ? 1 : 0.8)
    }

    // 处理拖拽移动事件
    const handleDragMove = (event: any): void => {
      const { dragged } = event
      const draggedRect = dragged.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop

      // 清除之前的滚动定时器
      if (scrollInterval.value) {
        clearInterval(scrollInterval.value)
        scrollInterval.value = null
      }

      // 计算距离导航栏底部的距离
      const distanceToNavBottom = draggedRect.top - navHeight.value
      
      // 检查是否需要向上滚动（靠近导航栏底部）
      if (distanceToNavBottom < scrollThreshold && scrollTop > 0) {
        // 计算动态速度
        const speed = calculateDynamicSpeed(distanceToNavBottom, 'up')
        
        scrollInterval.value = window.setInterval(() => {
          const currentScroll = window.pageYOffset || document.documentElement.scrollTop
          const scrollAmount = Math.min(speed, currentScroll)
          window.scrollBy({
            top: -scrollAmount,
            behavior: 'instant'
          })
        }, 16)
      }
      // 检查是否需要向下滚动（靠近窗口底部）
      else if (draggedRect.bottom > windowHeight - scrollThreshold) {
        // 计算距离窗口底部的距离
        const distanceToBottom = windowHeight - draggedRect.bottom
        // 计算动态速度
        const speed = calculateDynamicSpeed(distanceToBottom, 'down')
        
        scrollInterval.value = window.setInterval(() => {
          window.scrollBy({
            top: speed,
            behavior: 'instant'
          })
        }, 16)
      }
    }

    // 拖拽结束时清除滚动定时器
    const clearScroll = (): void => {
      if (scrollInterval.value) {
        clearInterval(scrollInterval.value)
        scrollInterval.value = null
      }
    }

    // 显示自定义提示
    const showCustomAlert = (
      title: string, 
      message: string, 
      type: 'alert' | 'confirm' = 'alert',
      onConfirm?: () => void, 
      onCancel?: () => void
    ): void => {
      alertTitle.value = title
      alertMessage.value = message
      alertType.value = type
      showAlert.value = true
      // 存储回调函数
      alertCallbacks.value = { onConfirm, onCancel }
    }

    // 关闭自定义提示
    const closeAlert = (confirmed: boolean): void => {
      showAlert.value = false
      if (confirmed && alertCallbacks.value.onConfirm) {
        alertCallbacks.value.onConfirm()
      } else if (!confirmed && alertCallbacks.value.onCancel) {
        alertCallbacks.value.onCancel()
      }
      alertCallbacks.value = {}
    }

    // 复制到剪贴板
    const copyToClipboard = async (): Promise<void> => {
      try {
        const manifestData = JSON.stringify(manifest.value, null, 2)
        await navigator.clipboard.writeText(manifestData)
        showCustomAlert('操作成功', '已复制到剪贴板')
      } catch (error: unknown) {
        console.error('复制失败:', error)
        showCustomAlert('操作失败', error instanceof Error ? error.message : '复制失败，请检查控制台')
      }
    }

    // 保存 manifest.json 到项目根目录
    const saveManifest = async (): Promise<void> => {
      if (!props.projectDirectory) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        // 检查文件是否已存在
        try {
          await props.projectDirectory.getFileHandle('manifest.json', { create: false })
          // 文件存在，显示覆盖确认对话框
          showOverwriteDialog.value = true
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'NotFoundError') {
            throw error
          }
          // 文件不存在，直接保存
          await performSave()
          showCustomAlert('操作成功', 'manifest.json 已成功保存')
        }
      } catch (error: unknown) {
        console.error('保存文件失败:', error)
        showCustomAlert('操作失败', error instanceof Error ? error.message : '保存文件失败，请检查控制台')
      }
    }

    // 执行保存操作
    const performSave = async (): Promise<void> => {
      if (!props.projectDirectory) return

      try {
        const manifestData = JSON.stringify(manifest.value, null, 2)
        const fileHandle = await props.projectDirectory.getFileHandle('manifest.json', { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(manifestData)
        await writable.close()
      } catch (error: unknown) {
        console.error('保存文件失败:', error)
        throw error instanceof Error ? error : new Error('保存文件失败')
      }
    }

    // 确认覆盖
    const confirmOverwrite = async (): Promise<void> => {
      showOverwriteDialog.value = false
      try {
        await performSave()
        showCustomAlert('操作成功', 'manifest.json 已成功覆盖')
      } catch (error: unknown) {
        console.error('覆盖文件失败:', error)
        showCustomAlert('操作失败', error instanceof Error ? error.message : '覆盖文件失败，请检查控制台')
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

    // 检查并加载现有的manifest.json
    const checkAndLoadManifest = async (): Promise<void> => {
      if (!props.projectDirectory) return

      try {
        // 尝试获取manifest.json文件
        const fileHandle = await props.projectDirectory.getFileHandle('manifest.json')
        const file = await fileHandle.getFile()
        const content = await file.text()
        
        // 解析JSON内容
        try {
          const parsedManifest = JSON.parse(content)
          
          // 显示确认对话框
          showCustomAlert(
            '检测到manifest.json',
            '文件夹中已存在manifest.json文件，是否要加载并编辑现有文件？',
            'confirm',
            () => {
              // 用户确认加载
              manifest.value = parsedManifest
            },
            () => {
              // 用户取消，保持空manifest
            }
          )
        } catch (parseError) {
          console.error('解析manifest.json失败:', parseError)
          showCustomAlert(
            '解析失败',
            'manifest.json文件格式不正确，无法解析。请检查文件内容或创建新的manifest。'
          )
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'NotFoundError') {
          console.error('读取manifest.json失败:', error)
          showCustomAlert(
            '读取失败',
            `无法读取manifest.json文件: ${error.message || '未知错误'}`
          )
        }
        // 文件不存在，不做任何操作
      }
    }

    // 选择项目目录
    const selectProjectDirectory = async (): Promise<void> => {
      try {
        const directoryHandle = await window.showDirectoryPicker({
          id: 'projectDirectory',
          mode: 'readwrite'
        })
        emit('update:projectDirectory', directoryHandle)
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('选择目录错误:', error)
          showCustomAlert('操作失败', error.message || '选择文件夹失败，请重试')
        }
      }
    }

    // 选择多个预览图
    const selectMultiplePreviews = async (): Promise<void> => {
      if (!props.projectDirectory) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        const fileHandles = await window.showOpenFilePicker({
          startIn: props.projectDirectory,
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
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('选择文件错误:', error)
          showCustomAlert('操作失败', error.message || '选择文件失败，请检查控制台')
        }
      }
    }

    // 选择单个文件
    const selectFile = async (type: 'icon' | 'download', deviceCode?: string): Promise<void> => {
      if (!props.projectDirectory) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }

      try {
        const fileHandles = await window.showOpenFilePicker({
          startIn: props.projectDirectory,
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
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('选择文件错误:', error)
          showCustomAlert('操作失败', error.message || '选择文件失败，请检查控制台')
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

    // 在组件挂载时检查manifest.json
    onMounted(() => {
      if (props.projectDirectory) {
        checkAndLoadManifest()
      }
      // 添加拖拽结束事件监听
      document.addEventListener('dragend', clearScroll)
      document.addEventListener('mouseup', clearScroll)
      getNavHeight() // 初始获取导航栏高度
      window.addEventListener('resize', getNavHeight) // 窗口大小变化时重新获取
    })

    // 组件卸载时移除事件监听
    onUnmounted(() => {
      document.removeEventListener('dragend', clearScroll)
      document.removeEventListener('mouseup', clearScroll)
      window.removeEventListener('resize', getNavHeight)
      if (scrollInterval.value) {
        clearInterval(scrollInterval.value)
      }
    })

    // 添加对projectDirectory变化的监听
    watch(() => props.projectDirectory, (newDir) => {
      if (newDir) {
        checkAndLoadManifest()
      }
    })

    return {
      manifest,
      showDeviceSelector,
      selectedDevices,
      supportedDevices,
      showOverwriteDialog,
      showAlert,
      alertTitle,
      alertMessage,
      alertType,
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
      removeAuthor,
      handleDragMove,
      onDragStart,
      onDragEnd
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
  background: #f8e6e6;  
  color: #8b0000;      
  border: none;
}

.remove-button:hover {
  background: #f0cfcf;  /* 悬停时稍深的蓝色 */
}

.add-button {
  background: #e3f2fd;  /* 浅蓝色背景 */
  color: #1565c0;      /* 深蓝色文字 */
  border: none;
}

.add-button:hover {
  background: #bbdefb;  /* 悬停时稍深的蓝色 */
}

button svg {
  width: 16px;
  height: 16px;
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

/* 占位符样式 - 新增部分 */
input::placeholder,
textarea::placeholder {
  color: #999;
  font-style: italic;
  opacity: 1; /* 确保在Firefox中也能正常显示 */
}

/* 兼容IE和Edge */
input:-ms-input-placeholder,
textarea:-ms-input-placeholder {
  color: #999;
  font-style: italic;
}

input::-ms-input-placeholder,
textarea::-ms-input-placeholder {
  color: #999;
  font-style: italic;
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

/* 预览图列表样式 */
.preview-list {
  margin-bottom: 0.5rem;
}

/* 预览图项目样式 */
.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  background: #f8f8f8;
  padding: 0.5rem;
  border-radius: 4px;
  height: 40px; /* 固定高度 */
  transition: transform 0.2s, box-shadow 0.2s;
}

.preview-item input {
  flex: 1;
}

/* 拖拽把手容器样式 */
.drag-handle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 80%; /* 与表单等高 */
  background-color: #bbdefb;
  border-radius: 4px;
  transition: background-color 0.5s;
  padding: 4px 0; /* 上下内边距 */
}

/* 拖拽把手样式 */
.drag-handle {
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 拖拽把手悬停和拖拽时的样式 */
.draggable-source--is-dragging .drag-handle-container {
  background-color: #4a6b8a;
}

/* 圆形删除按钮 - 仅用于预览图部分 */
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
  max-width: 500px;
  text-align: center;
}

.alert-content h3 {
  color: #0e467c;
  margin-bottom: 1rem;
}

.alert-content p {
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

/* 设备列表样式 - 更新部分 */
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
  background: #e8f4fd; /* 浅蓝色背景 */
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(14, 70, 124, 0.1); /* 添加轻微阴影 */
}

.device-item:hover {
  background: #d0e5fa; /* 悬停时稍深的蓝色 */
  transform: translateY(-2px); /* 添加轻微上浮效果 */
  box-shadow: 0 4px 8px rgba(14, 70, 124, 0.1);
}

.device-item.selected {
  background: #b3d6f7; /* 选中状态更深的蓝色 */
}

.device-name {
  font-weight: bold;
   color: #0e467c; /*主蓝色文字 */
}

.device-codename {
  font-size: 0.8rem;
  color: #4a6b8a; /* 蓝色系灰色 */
}

/* 模态框操作按钮 */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-actions .add-button {
  background: #e6f0f8; /* 浅蓝色背景 */
  color: #0e467c; /* 主蓝色文字 */
}

.modal-actions .add-button:hover {
  background: #cfe0f0; /* 稍深的蓝色悬停背景 */
}

.modal-actions .add-button:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

/* 提示文本 */
.hint-text {
  color: #666;
  font-size: 0.9rem;
  font-weight: normal;
}

/* 拖拽时的幽灵项样式 */
.ghost-item {
  opacity: 0.5;
  background: #e3f2fd;
  border: 2px dashed #1565c0;
}

/* 被拖拽项的样式 */
.chosen-item {
  opacity: 0.8;
  transform: scale(1.02);
}

/* 拖拽时目标位置的样式 */
.preview-list.sortable-chosen {
  position: relative;
  margin-top: 100px;
}

.preview-list.sortable-chosen::before {
  content: "";
  display: block;
  height: 40px;
  margin: 4px 0;
  background: #e3f2fd;
  border-radius: 4px;
  border: 2px dashed #1565c0;
  box-sizing: border-box;
}

/* 拖拽目标项的样式 */
.drop-target {
  position: relative;
}

.drop-target::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  margin: 4px 0;
  background: #e3f2fd;
  border-radius: 4px;
  border: 2px dashed #1565c0;
  box-sizing: border-box;
  z-index: 1;
}

/* 确保预览项之间有足够的间距 */
.preview-item {
  margin-bottom: 8px;
}

/* 拖拽时提升其他项的层级 */
.preview-list > * {
  transition: transform 0.2s;
}

.preview-list.sortable-ghost + * {
  transform: translateY(48px);
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
  
  .device-item {
    padding: 0.8rem;
  }
}
</style>