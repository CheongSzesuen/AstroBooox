<template>
  <div class="flex min-h-screen flex-col">
    <NavBar :mode="mode" @update:mode="setMode" />

    <Dialog :open="showPhonePrompt">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader class="gap-3">
          <div class="flex items-start gap-3">
            <DeviceMobile class="mt-0.5 text-foreground" :size="36" weight="duotone" />
            <div>
              <DialogTitle>手机设备限制</DialogTitle>
              <DialogDescription class="mt-2 text-sm leading-6">
                Manifest 功能在手机设备不可用，请改用平板或桌面端。建议使用 Chrome 或 Edge 以获得完整能力。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>

    <Dialog :open="showUnsupportedPrompt">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader class="gap-3">
          <div class="flex items-start gap-3">
            <WarningCircle class="mt-0.5 text-foreground" :size="36" weight="duotone" />
            <div>
              <DialogTitle>浏览器不支持 FSA API</DialogTitle>
              <DialogDescription class="mt-2 text-sm leading-6">
                将使用 OPFS 模式，无法直接保存文件。建议使用 Chrome 或 Edge；当前模式需要将文件放在项目根目录。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter class="sm:justify-start">
          <Button variant="secondary" @click="continueWithOPFS">
            <CheckCircle :size="16" weight="fill" />
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDirectoryPrompt">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader class="gap-3">
          <div class="flex items-start gap-3">
            <FolderSimplePlus class="mt-0.5 text-foreground" :size="36" weight="duotone" />
            <div>
              <DialogTitle>请选择项目文件夹</DialogTitle>
              <DialogDescription class="mt-2 text-sm leading-6">
                先选择项目目录，再进行 manifest 编辑与保存。已支持 FSA 模式处理非根目录文件。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter class="sm:justify-end">
          <Button @click="selectProjectDirectory">
            <FolderOpen :size="16" weight="duotone" />
            选择文件夹
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <main class="flex-1 p-4 md:p-6">
      <component
        :is="currentComponent"
        :project-directory="projectDirectory"
        :device-type="deviceType"
        :is-fsa-supported="isFsaSupported"
        @manifest-loaded="handleManifestLoaded"
      />
    </main>

    <Dialog :open="showAlert" @update:open="handleAlertOpenChange">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{{ alertTitle }}</DialogTitle>
          <DialogDescription>{{ alertMessage }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="sm:justify-start">
          <Button variant="secondary" @click="closeAlert">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import {
  PhCheckCircle as CheckCircle,
  PhDeviceMobile as DeviceMobile,
  PhFolderOpen as FolderOpen,
  PhFolderSimplePlus as FolderSimplePlus,
  PhWarningCircle as WarningCircle
} from '@phosphor-icons/vue'
import NavBar from '../components/NavBar.vue'
import AppFooter from '../components/Footer.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { AppMode, DeviceType } from '../type/manifest'

const ManifestEditor = defineAsyncComponent(() => import('../components/ManifestEditor.vue'))
const CSVEGenerator = defineAsyncComponent(() => import('../components/CSVEGenerator.vue'))
const ResLinkGenerator = defineAsyncComponent(() => import('../components/ResLinkGenerator.vue'))
const FuckCodeReview = defineAsyncComponent(() => import('../components/FuckCodeReview.vue'))
const GitBrowserOps = defineAsyncComponent(() => import('../components/GitBrowserOps.vue'))

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
    case 'git-browser':
      return GitBrowserOps
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

const handleAlertOpenChange = (open: boolean): void => {
  showAlert.value = open
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
