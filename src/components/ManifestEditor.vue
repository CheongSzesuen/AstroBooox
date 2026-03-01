<template>
  <div class="flex min-h-full w-full flex-col">
    <!-- 完整项目路径和操作按钮部分 -->
    <div v-if="projectDirectory" class="flex min-h-[calc(100vh-12rem)] w-full flex-col gap-4">
      <div class="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-3">
        <span class="min-w-0 flex-1 truncate">当前项目路径: {{ projectDirectory.name }} ({{ isFsaSupported ? 'FSA' : 'OPFS' }})</span>
        <Button
          variant="outline"
          size="sm"
          :class="[
            'max-[480px]:w-full max-[480px]:justify-center',
            { 'cursor-not-allowed opacity-60': isOPFSMode }
          ]"
          @click="selectProjectDirectory"
          :disabled="isOPFSMode"
        >
          更改文件夹
        </Button>
        <Button variant="outline" size="sm" class="gap-2 max-[480px]:w-full max-[480px]:justify-center" @click="findManifest">
          <MagnifyingGlass :size="16" weight="bold" />
          查找manifest.json
        </Button>
      </div>
      
      <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(380px,460px)]">
        <!-- 完整的表单容器 -->
        <div class="min-w-0 space-y-4 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4">
          <!-- 应用信息部分 -->
          <Card class="w-full border-border/80 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">应用信息</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
            <div class="w-full space-y-1.5">
              <label class="block text-sm font-medium text-foreground">应用名称</label>
              <Input v-model="manifest.item.name" placeholder="应用名称" />
            </div>
            <div class="w-full space-y-1.5">
              <label class="block text-sm font-medium text-foreground">应用简介</label>
              <Textarea v-model="manifest.item.description" placeholder="应用简介" />
            </div>
            <div class="w-full space-y-1.5">
              <label class="block text-sm font-medium text-foreground">预览图（支持多选）</label>
              <draggable 
                v-model="manifest.item.preview" 
                handle=".drag-handle"
                item-key="index"
                class="mb-2"
                ghost-class="opacity-50"
                chosen-class="opacity-80"
                @start="handleDragStart"
                @end="handleDragEnd"
              >
                <template #item="{element, index}">
                  <div class="mb-2 flex min-h-11 items-center gap-2.5 rounded-lg border border-border bg-background p-2.5">
                    <div class="drag-handle flex h-full w-6 cursor-move items-center justify-center rounded-md bg-muted py-1">
                      <div class="flex h-full w-full items-center justify-center">
                        <DotsSixVertical :size="16" weight="bold" />
                      </div>
                    </div>
                    <Input :model-value="element" readonly class="flex-1 min-w-0" />
                    <Button variant="outline" size="icon" class="h-8 w-8 rounded-full" @click="removePreview(index)">
                      <Minus :size="16" weight="bold" />
                    </Button>
                  </div>
                </template>
              </draggable>
              <Button class="mt-2" @click="selectMultiplePreviews">+ 添加预览图</Button>
            </div>
            <div class="w-full space-y-1.5">
              <label class="block text-sm font-medium text-foreground">图标</label>
              <div class="flex w-full gap-2 max-[640px]:flex-col">
                <Input v-model="manifest.item.icon" placeholder="icon.png" readonly class="flex-1 min-w-0" />
                <Button @click="selectFile('icon')">选择文件</Button>
              </div>
            </div>
            <div class="w-full space-y-1.5">
              <label class="block text-sm font-medium text-foreground">开源仓库 URL（可选）</label>
              <Input v-model="manifest.item.source_url" placeholder="开源项目将有更多机会得到推荐" />
            </div>
            </CardContent>
          </Card>
          
          <!-- 作者信息部分 -->
          <Card class="w-full border-border/80 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">作者信息</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
            <div class="space-y-3">
              <div
                v-for="(author, index) in manifest.item.author"
                :key="index"
                class="relative space-y-3 rounded-lg border border-border bg-background p-3.5"
              >
                <div class="w-full space-y-1.5">
                  <label class="block text-sm font-medium text-foreground">作者名称</label>
                  <Input v-model="author.name" placeholder="作者名称" />
                </div>
                <div class="w-full space-y-1.5">
                  <label class="block text-sm font-medium text-foreground">作者主页（可选）</label>
                  <Input v-model="author.author_url" placeholder="https://github.com/用户名" />
                </div>
                <Button variant="outline" @click="removeAuthor(index)">删除</Button>
              </div>
            </div>
            <Button @click="addAuthor">+ 添加作者</Button>
            </CardContent>
          </Card>
          
          <!-- 支持设备信息部分 -->
          <Card class="w-full border-border/80 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">支持设备信息</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 pt-0">
            <div class="space-y-3">
              <div
                v-for="(download, deviceCode) in manifest.downloads"
                :key="deviceCode"
                class="space-y-3 rounded-lg border border-border bg-background p-3.5"
              >
                <h4 class="mb-2 text-sm font-semibold text-foreground">{{ getDeviceDisplayName(deviceCode) }}</h4>
                <div class="w-full space-y-1.5">
                  <label class="block text-sm font-medium text-foreground">应用版本</label>
                  <Input v-model="download.version" placeholder="1.0.0" />
                </div>
                <div class="w-full space-y-1.5">
                  <label class="block text-sm font-medium text-foreground">资源文件</label>
                  <div class="flex w-full gap-2 max-[640px]:flex-col">
                    <Input v-model="download.file_name" readonly class="flex-1 min-w-0" />
                    <Button @click="selectFile('download', deviceCode)">选择文件</Button>
                  </div>
                </div>
                <Button variant="outline" @click="removeDownload(deviceCode)">删除</Button>
              </div>
            </div>
            <Button @click="openDeviceSelector">+ 添加支持的设备</Button>
            </CardContent>
          </Card>
        </div>
        
        <!-- JSON预览部分 -->
        <Card class="min-w-0 border-border bg-card lg:sticky lg:top-0 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">实时 JSON 预览</CardTitle>
            <div class="mt-2 flex flex-wrap gap-2.5">
            <Button :class="{ 'cursor-not-allowed opacity-60': isOPFSMode }" @click="saveManifest" :disabled="isOPFSMode">
              <FloppyDisk :size="16" weight="bold" />
              保存
            </Button>
            <Button @click="downloadManifest">
              <DownloadSimple :size="16" weight="bold" />
              下载
            </Button>
            <Button @click="copyToClipboard">
              <CopySimple :size="16" weight="bold" />
              复制
            </Button>
          </div>
          </CardHeader>
          <CardContent class="pt-0">
            <JsonPreview :data="manifest" />
          </CardContent>
        </Card>
      </div>
    </div>

    <div
      v-else
      class="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-6 text-center text-sm text-muted-foreground"
    >
      请先选择项目目录，再开始编辑 manifest.json。
    </div>
    
    <Dialog :open="showDeclaration">
      <DialogContent class="max-w-[860px] [&>button]:hidden" @pointer-down-outside.prevent @escape-key-down.prevent>
        <DialogHeader>
          <DialogTitle>AstroBox 官方社区源资源审核标准</DialogTitle>
          <DialogDescription>阅读完毕后方可继续使用生成功能。</DialogDescription>
        </DialogHeader>
        <div
          class="mt-3 max-h-[58vh] overflow-y-auto rounded-lg border border-border bg-background p-5
            [&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:text-foreground
            [&_ol]:m-0 [&_ol]:pl-6
            [&_li]:mb-3 [&_li]:leading-6 [&_li]:text-muted-foreground"
          @scroll="checkScrollPosition"
        >
          <h4>一、资源结构与清单合规性</h4>
          <ol>
            <li>是否正确在index.csv行末添加自己的资源信息</li>
            <li>csv中添加的icon链接是否可正常访问</li>
            <li>csv中添加的cover链接是否可正常访问</li>
            <li>csv中的兼容设备列表、tags的分隔符使用是否正确</li>
            <li>csv中指向的资源json是否真实存在</li>
            <li>资源json所处的文件夹是否命名合理，json本身是否命名合理</li>
            <li>资源json指向的目标仓库是否真实存在</li>
            <li>目标仓库中的manifest.json是否按要求填写，格式是否符合标准json规范</li>
            <li>manifest.json中的资源名称是否与csv中的资源名称完全相同</li>
            <li>manifest.json中downloads map中的设备代号是否真实存在，是否存在填了o66没填o66nfc之类的情况（类似情况可以先不merge，先提醒并得到确认）</li>
            <li>downloads map中的目标文件名是否在仓库中真实存在（特别注意）</li>
            <li>manifest.json中author数组中每个作者author_url的目标指向页面是否合规、是否存在不良内容</li>
            <li>存在任何问题都必须直接在Pull Request中与提交者公开、透明地进行沟通，如无任何问题，可以继续进行资源质量检查。</li>
          </ol>
          <h4>二、资源质量与版权</h4>
          <ol>
            <li>资源不是搬运/转载/盗传</li>
            <li>资源的创意没有明显的剽窃性（这属于主观判断，不要直接关闭Pull Request，由审核员共同探讨是否应该进行merge）</li>
            <li>资源的icon与cover设计是否合理得当、符合大众审美（icon不要求死追严打，cover若出现低质、简陋的情况，直接在Pull Request中对提交者作出修改意见）（可以参考下面的示例）</li>
            <li>资源本体在支持的设备上基本功能是否运行正常（一般情况下适当测试一个设备即可，剩余问题用户会自己去拷打作者）</li>
            <li>资源若使用了某些知名IP素材，必须在preview中留一张图来进行版权声明（这里不是要求提交者拥有素材版权，而是必须证明素材、IP本身与AstroBox以及小米无关）</li>
          </ol>
          <h4>三、资源数量和付费资源（2025.7.6日公告）</h4>
          <ol>
            <li>任何作者在 AstroBox 官方源上传的免费资源数量必须是付费资源的 2 倍以上</li>
            <li>对于存在任何应用内购买或类型为试用的资源，必须标注为付费</li>
            <li>付费资源将在首页被明显标注，并允许被用户一键过滤。</li>
          </ol>
          <h4 class="mt-4 text-right text-muted-foreground">文档来自官方</h4>
        </div>
        <DialogFooter class="mt-4 flex justify-between gap-2.5 max-[480px]:flex-col">
          <Button variant="outline" @click="disagreeDeclaration">听不懂私密达</Button>
          <Button :disabled="!isDeclarationScrolledToBottom" @click="agreeDeclaration">听懂了</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeviceSelector" @update:open="showDeviceSelector = $event">
      <DialogContent class="max-w-[820px]">
        <DialogHeader>
          <DialogTitle>选择设备</DialogTitle>
          <DialogDescription>可多选，建议按实际支持情况勾选。</DialogDescription>
        </DialogHeader>
        <div class="my-3 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-[768px]:grid-cols-1">
          <div
            v-for="device in supportedDevices"
            :key="device.codename + device.name"
            :class="[
              'cursor-pointer rounded-lg border p-4 transition-colors',
              isDeviceSelected(device) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
            ]"
            @click="toggleDeviceSelection(device)"
          >
            <div class="mb-1 font-semibold text-foreground">{{ device.name }}</div>
            <div class="text-xs text-muted-foreground">{{ device.codename }}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="cancelDeviceSelection">取消</Button>
          <Button :disabled="selectedDevices.length === 0" @click="confirmDeviceSelection">确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showOverwriteDialog" @update:open="showOverwriteDialog = $event">
      <DialogContent class="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>确认覆盖文件</DialogTitle>
          <DialogDescription>项目目录中已存在 manifest.json 文件，确定要覆盖吗？</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="cancelOverwrite">取消</Button>
          <Button @click="confirmOverwrite">确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showAlert" @update:open="handleAlertOpenChange">
      <DialogContent class="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{{ alertTitle }}</DialogTitle>
          <DialogDescription>{{ alertMessage }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button v-if="alertType === 'confirm'" variant="outline" @click="closeAlert(false)">取消</Button>
          <Button @click="closeAlert(true)">{{ alertType === 'confirm' ? '确定' : '我知道了' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showEditPrompt" @update:open="showEditPrompt = $event">
      <DialogContent class="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{{ isFsaSupported ? '检测到manifest.json' : '进入manifest编辑模式' }}</DialogTitle>
          <DialogDescription>
            {{ isFsaSupported ? '文件夹中已存在manifest.json文件，是否要加载并编辑现有文件？' : '是否要加载并编辑现有的manifest.json文件？' }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="cancelEditPrompt">取消</Button>
          <Button @click="confirmEditPrompt">确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, watch, onMounted, computed } from 'vue'
import {
  PhCopySimple as CopySimple,
  PhDotsSixVertical as DotsSixVertical,
  PhDownloadSimple as DownloadSimple,
  PhFloppyDisk as FloppyDisk,
  PhMagnifyingGlass as MagnifyingGlass,
  PhMinus as Minus
} from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import JsonPreview from './JsonPreview.vue'
import { Manifest } from '../type/manifest'
import draggable from 'vuedraggable'

interface Device {
  codename: string
  name: string
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory'
  readonly name: string
  isSameEntry(other: FileSystemHandle): Promise<boolean>
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

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
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
  components: {
    Button,
    Input,
    Textarea,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    JsonPreview,
    draggable,
    CopySimple,
    DotsSixVertical,
    DownloadSimple,
    FloppyDisk,
    MagnifyingGlass,
    Minus
  },
  props: {
    projectDirectory: {
      type: Object as PropType<FileSystemDirectoryHandle | null>,
      default: null
    },
    deviceType: {
      type: String as PropType<'desktop' | 'tablet' | 'phone'>,
      default: 'desktop'
    },
    isFsaSupported: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:projectDirectory', 'manifest-loaded'],
  setup(props, { emit }) {
    // 定义响应式数据
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
    const DECLARATION_EXPIRE_DAYS = 7; // 7天后需要重新确认声明
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
    const showEditPrompt = ref(false)
    const showDeclaration = ref(true)
    const isDeclarationScrolledToBottom = ref(false)

    // 计算属性：是否是OPFS模式
    const isOPFSMode = computed(() => !props.isFsaSupported)

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

    // 计算相对路径
    const calculateRelativePath = async (fileHandle: FileSystemFileHandle): Promise<string> => {
      if (!props.projectDirectory || isOPFSMode.value) return fileHandle.name
      
      try {
        const pathArray = await props.projectDirectory.resolve(fileHandle)
        if (!pathArray) return fileHandle.name
        return pathArray.join('/')
      } catch (error) {
        console.error('计算相对路径失败:', error)
        return fileHandle.name
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
      alertCallbacks.value = { onConfirm, onCancel }
    }

    // 关闭提示
    const closeAlert = (confirmed: boolean): void => {
      showAlert.value = false
      if (confirmed && alertCallbacks.value.onConfirm) {
        alertCallbacks.value.onConfirm()
      } else if (!confirmed && alertCallbacks.value.onCancel) {
        alertCallbacks.value.onCancel()
      }
      alertCallbacks.value = {}
    }

    const handleAlertOpenChange = (open: boolean): void => {
      if (!open && showAlert.value) {
        closeAlert(false)
        return
      }
      showAlert.value = open
    }

    // 检查滚动位置
    const checkScrollPosition = (e: Event): void => {
  const el = e.target as HTMLElement
  // 使用阈值判断，允许1像素的误差
  const threshold = 1
  const isBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= threshold
  isDeclarationScrolledToBottom.value = isBottom
  // console.log('滚动检测:', {
  //   scrollHeight: el.scrollHeight,
  //   scrollTop: el.scrollTop,
  //   clientHeight: el.clientHeight,
  //   isBottom
  // })
}

    // 同意声明
    const agreeDeclaration = (): void => {
    showDeclaration.value = false;
    const now = new Date().getTime();
    localStorage.setItem('hasAgreedToDeclaration', 'true');
    localStorage.setItem('declarationAgreedAt', now.toString());
    }

    // 不同意声明
    const disagreeDeclaration = (): void => {
      showCustomAlert('什么？你不同意？', '？玩你的自定义工具去', 'alert', () => {
        // window.location.href = 'https://www.bandbbs.cn/'
      })
    }

    // 查找manifest.json文件
    const findManifest = async (): Promise<void> => {
      if (props.isFsaSupported && props.projectDirectory) {
        try {
          const fileHandle = await props.projectDirectory.getFileHandle('manifest.json', { create: false })
          if (fileHandle) {
            showEditPrompt.value = true
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'NotFoundError') {
            console.error('读取manifest.json失败:', error)
            showCustomAlert('读取失败', error.message || '读取manifest.json文件失败')
          }
        }
      } else {
        showEditPrompt.value = true
      }
    }

    // 确认编辑提示
    const confirmEditPrompt = (): void => {
      showEditPrompt.value = false
      if (isOPFSMode.value) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e: Event) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            const file = files[0]
            if (file.name !== 'manifest.json') {
              showCustomAlert('文件错误', '请上传名为manifest.json的文件')
              return
            }
            
            try {
              const content = await file.text()
              const parsedManifest = JSON.parse(content)
              manifest.value = parsedManifest
              emit('manifest-loaded')
            } catch (error) {
              console.error('解析manifest.json失败:', error)
              showCustomAlert('解析失败', 'manifest.json文件格式不正确，无法解析。请检查文件内容。')
            }
          }
        }
        input.click()
      } else if (props.projectDirectory) {
        props.projectDirectory.getFileHandle('manifest.json', { create: false })
          .then(async (fileHandle) => {
            const file = await fileHandle.getFile()
            const content = await file.text()
            try {
              const parsedManifest = JSON.parse(content)
              manifest.value = parsedManifest
              emit('manifest-loaded')
            } catch (parseError) {
              console.error('解析manifest.json失败:', parseError)
              showCustomAlert('解析失败', 'manifest.json文件格式不正确，无法解析。请检查文件内容。')
            }
          })
          .catch(error => {
            console.error('读取manifest.json失败:', error)
            showCustomAlert('读取失败', error.message || '读取manifest.json文件失败')
          })
      }
    }

    // 取消编辑提示
    const cancelEditPrompt = (): void => {
      showEditPrompt.value = false
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

    // 下载manifest.json
    const downloadManifest = (): void => {
      const manifestData = JSON.stringify(manifest.value, null, 2)
      const blob = new Blob([manifestData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'manifest.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    // 保存manifest.json
    const saveManifest = async (): Promise<void> => {
      if (!props.projectDirectory || isOPFSMode.value) {
        showCustomAlert('操作失败', '当前浏览器不支持直接保存功能')
        return
      }
      try {
        try {
          await props.projectDirectory.getFileHandle('manifest.json', { create: false })
          showOverwriteDialog.value = true
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'NotFoundError') {
            throw error
          }
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

    // 选择项目目录
    const selectProjectDirectory = async (): Promise<void> => {
      if (isOPFSMode.value) return
      
      try {
        if (window.showDirectoryPicker) {
          const directoryHandle = await window.showDirectoryPicker({
            id: 'projectDirectory',
            mode: 'readwrite'
          })
          emit('update:projectDirectory', directoryHandle)
        } else {
          const virtualHandle = {
            name: 'OPFS_虚拟项目目录',
            kind: 'directory',
            isSameEntry: async (other: any) => false,
            getFileHandle: async (name: string) => {
              return {
                name,
                kind: 'file',
                getFile: async () => new File([], name),
                isSameEntry: async (other: any) => false
              }
            },
            getFile: async (name: string) => {
              return new File([], name)
            }
          } as unknown as FileSystemDirectoryHandle
          emit('update:projectDirectory', virtualHandle)
        }
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
      
      if (props.isFsaSupported) {
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
              return await calculateRelativePath(fileHandle)
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
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = 'image/*'
        input.onchange = async (e: Event) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            const newPreviews = Array.from(files).map(file => file.name)
            const uniqueNewPreviews = newPreviews.filter(
              preview => !manifest.value.item.preview.includes(preview)
            )
            if (uniqueNewPreviews.length === 0) {
              showCustomAlert('操作提示', '您选择的文件已经存在于预览图列表中')
              return
            }
            manifest.value.item.preview = [...manifest.value.item.preview, ...uniqueNewPreviews]
          }
        }
        input.click()
      }
    }

    // 选择文件
    const selectFile = async (type: 'icon' | 'download', deviceCode?: string): Promise<void> => {
      if (!props.projectDirectory) {
        showCustomAlert('操作失败', '请先选择项目目录')
        return
      }
      
      if (props.isFsaSupported) {
        try {
          const fileHandles = await window.showOpenFilePicker({
            startIn: props.projectDirectory,
            multiple: false
          })
          const relativePath = await calculateRelativePath(fileHandles[0])
          
          if (type === 'icon') {
            manifest.value.item.icon = relativePath
          } else if (type === 'download' && deviceCode) {
            if (manifest.value.downloads[deviceCode]) {
              manifest.value.downloads[deviceCode].file_name = relativePath
            }
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('选择文件错误:', error)
            showCustomAlert('操作失败', error.message || '选择文件失败，请检查控制台')
          }
        }
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            if (type === 'icon') {
              manifest.value.item.icon = file.name
            } else if (type === 'download' && deviceCode) {
              if (manifest.value.downloads[deviceCode]) {
                manifest.value.downloads[deviceCode].file_name = file.name
              }
            }
          }
        }
        input.click()
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

    // 拖拽开始
    const handleDragStart = (): void => {
      // 拖拽开始时的处理
    }

    // 拖拽结束
    const handleDragEnd = (): void => {
      // 拖拽结束时的处理
    }

    // 组件挂载时检查manifest.json
    onMounted(() => {
  // 检查声明是否过期
  const hasAgreed = localStorage.getItem('hasAgreedToDeclaration');
  const agreedAt = localStorage.getItem('declarationAgreedAt');
  
  if (hasAgreed === 'true' && agreedAt) {
    const now = new Date().getTime();
    const daysPassed = (now - parseInt(agreedAt)) / (1000 * 60 * 60 * 24);
    
    if (daysPassed > DECLARATION_EXPIRE_DAYS) {
      localStorage.removeItem('hasAgreedToDeclaration');
      localStorage.removeItem('declarationAgreedAt');
      showDeclaration.value = true;
    } else {
      showDeclaration.value = false;
    }
  }

  if (props.projectDirectory) {
    findManifest();
  }
});

    // 监听projectDirectory变化
    watch(() => props.projectDirectory, (newDir) => {
      if (newDir) {
        findManifest()
      }
    })

    // 返回所有方法和数据
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
      showEditPrompt,
      showDeclaration,
      isDeclarationScrolledToBottom,
      isOPFSMode,
      saveManifest,
      copyToClipboard,
      downloadManifest,
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
      findManifest,
      confirmEditPrompt,
      cancelEditPrompt,
      agreeDeclaration,
      disagreeDeclaration,
      checkScrollPosition,
      handleAlertOpenChange,
      handleDragStart,
      handleDragEnd
    }
  }
})
</script>
