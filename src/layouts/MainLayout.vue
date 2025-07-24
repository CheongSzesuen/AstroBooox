<template>
  <div class="app-container">
    <NavBar :mode="mode" @update:mode="setMode" />
    
    <div v-if="deviceType === 'phone' && mode === 'manifest'" class="phone-prompt">
      <div class="prompt-content">
        <div class="prompt-header">
          <svg width="48" height="48" viewBox="0 0 24 24" class="phone-icon">
            <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.89 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z" fill="#2563eb"/>
          </svg>
          <h3>手机设备限制</h3>
        </div>
        <div class="prompt-body">
          <p>本功能在手机设备上不可用。</p>
          <p class="hint-text">请使用平板或桌面电脑访问以获得完整功能。</p>
        </div>
        <div class="prompt-actions">
          <button class="confirm-button" @click="closePhonePrompt">
            <svg width="20" height="20" viewBox="0 0 24 24" class="check-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
            我知道了
          </button>
        </div>
      </div>
    </div>
    
    <div v-else-if="!isFsaSupported && mode === 'manifest' && deviceType !== 'phone' && !hasManifest && showOPFSPrompt" class="fsa-unsupported-prompt">
      <div class="prompt-content">
        <div class="prompt-header">
       <svg width="48" height="48" viewBox="0 0 24 24" class="warning-icon">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#d97706"/>
</svg>
          <h3>浏览器不支持FSA API</h3>
        </div>
        <div class="prompt-body">
          <p>当前浏览器不支持文件系统访问API，将使用OPFS模式，无法直接保存文件。</p>
          <p class="hint-text">建议使用Edge或Chrome浏览器以获得完整功能。</p>
        </div>
        <div class="prompt-actions">
          <button class="confirm-button" @click="continueWithOPFS">
            <svg width="20" height="20" viewBox="0 0 24 24" class="check-icon">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
            确定
          </button>
        </div>
      </div>
    </div>
    
    <div v-else-if="!projectDirectory && mode === 'manifest' && deviceType !== 'phone'" class="directory-prompt">
      <div class="prompt-content">
        <div class="prompt-header">
          <svg width="48" height="48" viewBox="0 0 24 24" class="folder-icon">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" fill="#2563eb"/>
          </svg>
          <h3>请选择项目文件夹</h3>
        </div>
        <div class="prompt-body">
          <p>为了更快捷地生成manifest，请先选择您的项目文件夹。</p>
          <p class="hint-text">确保所有的文件都已经放在该文件夹下。</p>
        </div>
        <div class="prompt-actions">
          <button class="select-button" @click="selectProjectDirectory">
            <svg width="20" height="20" viewBox="0 0 24 24" class="folder-add-icon">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z" fill="currentColor"/>
            </svg>
            选择文件夹
          </button>
        </div>
      </div>
    </div>
    
    <main class="content">
      <component 
        :is="currentComponent" 
        :project-directory="projectDirectory" 
        :device-type="deviceType" 
        :is-fsa-supported="isFsaSupported"
        @manifest-loaded="handleManifestLoaded"
      />
    </main>
    
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import ManifestEditor from '../components/ManifestEditor.vue'
import CSVEGenerator from '../components/CSVEGenerator.vue'
import NavBar from '../components/NavBar.vue'
import AppFooter from '../components/Footer.vue'
import type { AppMode, DeviceType } from '../type/manifest'

// 定义完整的文件系统接口
interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
  isSameEntry(other: FileSystemHandle): Promise<boolean>
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>
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
  }
}

const mode = ref<AppMode>('manifest')
const setMode = (newMode: AppMode) => {
  mode.value = newMode
}
const currentComponent = computed(() => {
  return mode.value === 'manifest' ? ManifestEditor : CSVEGenerator
})
const projectDirectory = ref<FileSystemDirectoryHandle | null>(null)
const deviceType = ref<DeviceType>('desktop')
const showPhonePrompt = ref(false)
const hasManifest = ref(false)
const showOPFSPrompt = ref(false)

const isFsaSupported = ref<boolean>(!!window.showDirectoryPicker)

// 设备检测函数保持不变
const detectDeviceType = (): DeviceType => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(userAgent)
  const screenWidth = window.innerWidth
  if (isMobile && !isTablet && screenWidth < 768) {
    return 'phone'
  } else if (isTablet || (isMobile && screenWidth >= 768)) {
    return 'tablet'
  }
  return 'desktop'
}

const checkDeviceType = () => {
  deviceType.value = detectDeviceType()
  if (deviceType.value === 'phone' && mode.value === 'manifest') {
    showPhonePrompt.value = true
  }
  window.addEventListener('resize', () => {
    deviceType.value = detectDeviceType()
  })
}

const closePhonePrompt = () => {
  showPhonePrompt.value = false
}

const handleManifestLoaded = () => {
  hasManifest.value = true
}

const continueWithOPFS = () => {
  showOPFSPrompt.value = false
  const virtualHandle: FileSystemDirectoryHandle = {
    name: 'OPFS_虚拟项目目录',
    kind: 'directory',
    isSameEntry: async (other: FileSystemHandle) => false,
    getFileHandle: async (name: string, options?: { create?: boolean }) => {
      return {
        name,
        kind: 'file',
        isSameEntry: async (other: FileSystemHandle) => false,
        getFile: async () => new File([], name),
        createWritable: async () => {
          throw new Error('Not supported in OPFS mode')
        }
      } as FileSystemFileHandle
    },
    getDirectoryHandle: async (name: string, options?: { create?: boolean }) => {
      return {
        name,
        kind: 'directory',
        isSameEntry: async (other: FileSystemHandle) => false,
        getFileHandle: virtualHandle.getFileHandle,
        getDirectoryHandle: virtualHandle.getDirectoryHandle,
        removeEntry: virtualHandle.removeEntry,
        resolve: virtualHandle.resolve,
        entries: virtualHandle.entries,
        [Symbol.asyncIterator]: virtualHandle[Symbol.asyncIterator]
      } as FileSystemDirectoryHandle
    },
    removeEntry: async (name: string, options?: { recursive?: boolean }) => {
      throw new Error('Not supported in OPFS mode')
    },
    resolve: async (possibleDescendant: FileSystemHandle) => null,
    entries: async function* () {
      yield ['manifest.json', {
        name: 'manifest.json',
        kind: 'file',
        isSameEntry: async (other: FileSystemHandle) => false,
        getFile: async () => new File([], 'manifest.json'),
        createWritable: async () => {
          throw new Error('Not supported in OPFS mode')
        }
      } as FileSystemFileHandle] as [string, FileSystemHandle]
    },
    [Symbol.asyncIterator]: function() {
      return this.entries()
    }
  }
  
  projectDirectory.value = virtualHandle
}

onMounted(() => {
  checkDeviceType()
  if (!isFsaSupported.value && mode.value === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
    showOPFSPrompt.value = true
  }
})

const selectProjectDirectory = async (): Promise<void> => {
  try {
    if (window.showDirectoryPicker) {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'projectDirectory',
        mode: 'readwrite'
      })
      projectDirectory.value = directoryHandle
    } else {
      continueWithOPFS()
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('选择目录错误:', error)
      showCustomAlert('操作失败', error.message || '选择文件夹失败，请重试')
    }
  }
}

const alertTitle = ref('')
const alertMessage = ref('')
const showAlert = ref(false)
const showCustomAlert = (title: string, message: string): void => {
  alertTitle.value = title
  alertMessage.value = message
  showAlert.value = true
}
const closeAlert = (): void => {
  showAlert.value = false
}

watch(() => isFsaSupported.value, (newVal: boolean) => {
  if (!newVal && mode.value === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
    showOPFSPrompt.value = true
  }
})

watch(() => mode.value, (newMode: AppMode) => {
  if (!isFsaSupported.value && newMode === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
    showOPFSPrompt.value = true
  }
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* 允许表单元素和按钮中的文本选中 */
input, textarea, button, [contenteditable] {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.phone-prompt,
.directory-prompt,
.fsa-unsupported-prompt {
  position: fixed;
  top: 48px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 900;
  padding: 1rem;
  box-sizing: border-box;
}

.prompt-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: calc(100% - 2rem);
  max-width: 450px;
  overflow: hidden;
  margin: 0 auto;
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

.phone-icon,
.folder-icon,
.warning-icon {
  background: #e0e7ff;
  padding: 0.75rem;
  border-radius: 50%;
  width: 48px;
  height: 48px;
}

.warning-icon {
  background: #fef3c7;
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

.hint-text {
  color: #64748b;
  font-size: 0.875rem;
}

.prompt-actions {
  padding: 0 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
}

.select-button,
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
}

.select-button {
  background: #e3f2fd;
  color: #1565c0;
}

.select-button:hover {
  background: #d1e8f9;
}

.confirm-button {
  background: #e6f0f8;
  color: #0e467c;
}

.confirm-button:hover {
  background: #cfe0f0;
}

.content {
  flex: 1;
  padding: 1rem;
  width: 100%;
  box-sizing: border-box;
  margin-top: 48px;
  min-height: calc(100vh - 48px - 80px);
}

/* 响应式调整 */
@media (max-width: 640px) {
  .prompt-content {
    width: calc(100% - 1rem);
  }
  .prompt-header {
    padding: 1rem;
  }
  .phone-icon,
  .folder-icon,
  .warning-icon {
    width: 40px;
    height: 40px;
  }
  .prompt-body {
    padding: 1rem;
  }
}

@media (max-width: 375px) {
  .prompt-header h3 {
    font-size: 1rem;
  }
  .select-button,
  .confirm-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}
</style>