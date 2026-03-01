<template>
  <div class="app-container">
    <NavBar :mode="mode" @update:mode="setMode" />

    <Dialog :open="showPhonePrompt">
      <Card title="手机设备限制" description="Manifest 功能在手机设备不可用，请改用平板或桌面端。">
        <template #header>
          <div class="prompt-head">
            <DeviceMobile class="prompt-icon" :size="36" weight="duotone" />
            <div>
              <h3>手机设备限制</h3>
              <p>建议使用 Chrome 或 Edge 以获得完整能力。</p>
            </div>
          </div>
        </template>
      </Card>
    </Dialog>

    <Dialog :open="showUnsupportedPrompt">
      <Card title="浏览器不支持 FSA API" description="将使用 OPFS 模式，无法直接保存文件。">
        <template #header>
          <div class="prompt-head">
            <WarningCircle class="prompt-icon warning" :size="36" weight="duotone" />
            <div>
              <h3>浏览器不支持 FSA API</h3>
              <p>建议使用 Chrome 或 Edge。当前模式需要将文件放在项目根目录。</p>
            </div>
          </div>
        </template>
        <template #footer>
          <Button variant="secondary" @click="continueWithOPFS">
            <CheckCircle :size="16" weight="fill" />
            确定
          </Button>
        </template>
      </Card>
    </Dialog>

    <Dialog :open="showDirectoryPrompt">
      <Card title="请选择项目文件夹" description="先选择项目目录，再进行 manifest 编辑与保存。">
        <template #header>
          <div class="prompt-head">
            <FolderSimplePlus class="prompt-icon" :size="36" weight="duotone" />
            <div>
              <h3>请选择项目文件夹</h3>
              <p>已支持 FSA 模式处理非根目录文件。</p>
            </div>
          </div>
        </template>
        <template #footer>
          <Button @click="selectProjectDirectory">
            <FolderOpen :size="16" weight="duotone" />
            选择文件夹
          </Button>
        </template>
      </Card>
    </Dialog>

    <main class="content">
      <component
        :is="currentComponent"
        :project-directory="projectDirectory"
        :device-type="deviceType"
        :is-fsa-supported="isFsaSupported"
        @manifest-loaded="handleManifestLoaded"
      />
    </main>

    <Dialog :open="showAlert" @close="closeAlert">
      <Card :title="alertTitle" :description="alertMessage">
        <template #footer>
          <Button variant="secondary" @click="closeAlert">确定</Button>
        </template>
      </Card>
    </Dialog>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  PhCheckCircle as CheckCircle,
  PhDeviceMobile as DeviceMobile,
  PhFolderOpen as FolderOpen,
  PhFolderSimplePlus as FolderSimplePlus,
  PhWarningCircle as WarningCircle
} from '@phosphor-icons/vue'
import ManifestEditor from '../components/ManifestEditor.vue'
import CSVEGenerator from '../components/CSVEGenerator.vue'
import ResLinkGenerator from '../components/ResLinkGenerator.vue'
import NavBar from '../components/NavBar.vue'
import AppFooter from '../components/Footer.vue'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Button from '@/components/ui/Button.vue'
import type { AppMode, DeviceType } from '../type/manifest'
import FuckCodeReview from '../components/FuckCodeReview.vue'

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
const setMode = (newMode: AppMode): void => {
  mode.value = newMode
}

const currentComponent = computed(() => {
  switch (mode.value) {
    case 'manifest':
      return ManifestEditor
    case 'csv':
      return CSVEGenerator
    case 'res-link':
      return ResLinkGenerator
    case 'code-review':
      return FuckCodeReview
    default:
      return ManifestEditor
  }
})

const projectDirectory = ref<FileSystemDirectoryHandle | null>(null)
const deviceType = ref<DeviceType>('desktop')
const hasManifest = ref(false)
const showOPFSPrompt = ref(false)
const isFsaSupported = ref<boolean>(!!window.showDirectoryPicker)

const showPhonePrompt = computed(() => deviceType.value === 'phone' && mode.value === 'manifest')

const showUnsupportedPrompt = computed(
  () =>
    !showPhonePrompt.value &&
    !isFsaSupported.value &&
    mode.value === 'manifest' &&
    deviceType.value !== 'phone' &&
    !hasManifest.value &&
    showOPFSPrompt.value
)

const showDirectoryPrompt = computed(
  () =>
    !showPhonePrompt.value &&
    !showUnsupportedPrompt.value &&
    !projectDirectory.value &&
    mode.value === 'manifest' &&
    deviceType.value !== 'phone'
)

const detectDeviceType = (): DeviceType => {
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|tablet|playbook|silk|kindle/i.test(userAgent)
  const screenWidth = window.innerWidth
  if (isMobile && !isTablet && screenWidth < 768) {
    return 'phone'
  }
  if (isTablet || (isMobile && screenWidth >= 768)) {
    return 'tablet'
  }
  return 'desktop'
}

const checkDeviceType = (): void => {
  deviceType.value = detectDeviceType()
  window.addEventListener('resize', () => {
    deviceType.value = detectDeviceType()
  })
}

const handleManifestLoaded = (): void => {
  hasManifest.value = true
}

const continueWithOPFS = (): void => {
  showOPFSPrompt.value = false
  const virtualHandle: FileSystemDirectoryHandle = {
    name: 'OPFS_虚拟项目目录',
    kind: 'directory',
    isSameEntry: async () => false,
    getFileHandle: async (name: string) => {
      return {
        name,
        kind: 'file',
        isSameEntry: async () => false,
        getFile: async () => new File([], name),
        createWritable: async () => {
          throw new Error('Not supported in OPFS mode')
        }
      } as FileSystemFileHandle
    },
    getDirectoryHandle: async (name: string) => {
      return {
        name,
        kind: 'directory',
        isSameEntry: async () => false,
        getFileHandle: virtualHandle.getFileHandle,
        getDirectoryHandle: virtualHandle.getDirectoryHandle,
        removeEntry: virtualHandle.removeEntry,
        resolve: virtualHandle.resolve,
        entries: virtualHandle.entries,
        [Symbol.asyncIterator]: virtualHandle[Symbol.asyncIterator]
      } as FileSystemDirectoryHandle
    },
    removeEntry: async () => {
      throw new Error('Not supported in OPFS mode')
    },
    resolve: async () => null,
    entries: async function* () {
      yield [
        'manifest.json',
        {
          name: 'manifest.json',
          kind: 'file',
          isSameEntry: async () => false,
          getFile: async () => new File([], 'manifest.json'),
          createWritable: async () => {
            throw new Error('Not supported in OPFS mode')
          }
        } as FileSystemFileHandle
      ] as [string, FileSystemHandle]
    },
    [Symbol.asyncIterator]: function () {
      return this.entries()
    }
  }

  projectDirectory.value = virtualHandle
}

const selectProjectDirectory = async (): Promise<void> => {
  try {
    if (window.showDirectoryPicker) {
      const directoryHandle = await window.showDirectoryPicker({
        id: 'projectDirectory',
        mode: 'readwrite'
      })
      projectDirectory.value = directoryHandle
      return
    }

    continueWithOPFS()
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

onMounted(() => {
  checkDeviceType()
  if (!isFsaSupported.value && mode.value === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
    showOPFSPrompt.value = true
  }
})

watch(
  () => isFsaSupported.value,
  (newVal: boolean) => {
    if (!newVal && mode.value === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
      showOPFSPrompt.value = true
    }
  }
)

watch(
  () => mode.value,
  (newMode: AppMode) => {
    if (!isFsaSupported.value && newMode === 'manifest' && deviceType.value !== 'phone' && !hasManifest.value) {
      showOPFSPrompt.value = true
    }
  }
)
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: var(--space-4);
}

.prompt-head {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.prompt-head h3 {
  margin: 0;
  font-size: 1.05rem;
}

.prompt-head p {
  margin: var(--space-2) 0 0;
  color: var(--muted-foreground);
  line-height: 1.45;
  font-size: 0.9rem;
}

.prompt-icon {
  color: var(--primary);
  flex-shrink: 0;
  margin-top: 0.05rem;
}

.prompt-icon.warning {
  color: #d97706;
}

@media (max-width: 768px) {
  .content {
    padding: var(--space-3);
  }

  .prompt-head {
    flex-direction: column;
  }
}
</style>
