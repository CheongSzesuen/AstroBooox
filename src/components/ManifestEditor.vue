<template>
  <div class="manifest-editor">
    <!-- 完整项目路径和操作按钮部分 -->
    <div v-if="projectDirectory" class="editor-content">
      <div class="project-path">
        <span>当前项目路径: {{ projectDirectory.name }} ({{ isFsaSupported ? 'FSA' : 'OPFS' }})</span>
        <button 
          class="remove-button" 
          :class="{ 'disabled-button': isOPFSMode }"
          @click="selectProjectDirectory"
          :disabled="isOPFSMode"
        >
          更改文件夹
        </button>
        <button class="find-manifest-button" @click="findManifest">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
          </svg>
          查找manifest.json
        </button>
      </div>
      
      <div class="editor-container">
        <!-- 完整的表单容器 -->
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
                @start="handleDragStart"
                @end="handleDragEnd"
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
          
          <!-- 支持设备信息部分 -->
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
        
        <!-- JSON预览部分 -->
        <div class="preview-container">
          <div class="preview-actions">
            <button class="add-button" :class="{ 'disabled-button': isOPFSMode }" @click="saveManifest" :disabled="isOPFSMode">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="currentColor"/>
              </svg>
              保存
            </button>
            <button class="add-button" @click="downloadManifest">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
              </svg>
              下载
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
    </div>
    
    <!-- 声明弹窗 -->
    <div v-if="showDeclaration" class="modal-overlay">
      <div class="modal-content declaration-content">
        <h3>AstroBox 官方社区源资源审核标准</h3>
        <div class="declaration-text" @scroll="checkScrollPosition">
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

          <h4 style="text-align: right;">文档来自官方</h4>
          
        </div>
        <div class="declaration-actions">
          <button class="declaration-disagree" @click="disagreeDeclaration">听不懂私密达</button>
          <button class="declaration-agree" :class="{ 'disabled-button': !isDeclarationScrolledToBottom }" @click="agreeDeclaration" :disabled="!isDeclarationScrolledToBottom">听懂了</button>
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
    
    <!-- 编辑提示弹窗 -->
    <div v-if="showEditPrompt" class="modal-overlay">
      <div class="modal-content alert-content">
        <h3>{{ isFsaSupported ? '检测到manifest.json' : '进入manifest编辑模式' }}</h3>
        <p>{{ isFsaSupported ? '文件夹中已存在manifest.json文件，是否要加载并编辑现有文件？' : '是否要加载并编辑现有的manifest.json文件？' }}</p>
        <div class="modal-actions">
          <button class="remove-button" @click="cancelEditPrompt">取消</button>
          <button class="add-button" @click="confirmEditPrompt">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, watch, onMounted, computed } from 'vue'
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
  components: { JsonPreview, draggable },
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
      handleDragStart,
      handleDragEnd
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
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 1rem;
}

.project-path {
  background: #f0f0f0;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.project-path span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.find-manifest-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #e3f2fd;
  color: #1565c0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
}

.find-manifest-button:hover {
  background: #cfe0f0;
}

.find-manifest-button svg {
  width: 16px;
  height: 16px;
}

.editor-container {
  display: flex;
  flex: 1;
  gap: 2rem;
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

.preview-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}

.form-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1e293b;
}

.form-group {
  margin-bottom: 1rem;
  width: 100%;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #1e293b;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.file-input-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.file-input-group input {
  flex: 1;
  min-width: 0;
}

.preview-list {
  margin-bottom: 0.5rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  background: #f8f8f8;
  padding: 0.5rem;
  border-radius: 4px;
  height: 40px;
}

.preview-item input {
  flex: 1;
  background: transparent;
  border: none;
}

.drag-handle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 100%;
  background-color: #bbdefb;
  border-radius: 4px;
  cursor: move;
  padding: 4px 0;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.round-remove-button {
  margin: 0;
  padding: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: #f8e6e6;
  color: #8b0000;
  border-radius: 50%;
  cursor: pointer;
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

.author-group {
  border: 1px solid #eee;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
  position: relative;
}

.download-group {
  border: 1px solid #eee;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
}

.download-group h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #1e293b;
}

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
}

.remove-button:hover {
  background: #f0cfcf;
}

.add-button {
  background: #e3f2fd;
  color: #1565c0;
}

.add-button:hover {
  background: #bbdefb;
}

.disabled-button {
  opacity: 0.6;
  cursor: not-allowed;
  background: #e9ecef !important;
  color: #6c757d !important;
}

button svg {
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

.modal-content h3 {
  margin-top: 0;
  color: #0e467c;
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

/* 声明弹窗样式 */
.declaration-content {
  max-width: 800px;
  padding: 2rem;
}

.declaration-text {
  max-height: 60vh;
  overflow-y: auto;
  padding: 1rem;
  margin: 0;
  /* 添加以下样式确保正确计算 */
  box-sizing: border-box;
  border: 1px solid #dee2e6;
}

.declaration-text h4 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #0e467c;
}

.declaration-text ol {
  padding-left: 1.5rem;
}

.declaration-text li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.declaration-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

.declaration-agree {
  background: #e3f2fd;
  color: #1565c0;
  padding: 0.75rem 1.5rem;
}

.declaration-agree:hover {
  background: #bbdefb;
}

.declaration-disagree {
  background: #f8e6e6;
  color: #8b0000;
  padding: 0.75rem 1.5rem;
}

.declaration-disagree:hover {
  background: #f0cfcf;
}

/* 设备列表样式 */
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
  transition: all 0.2s;
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
  margin-bottom: 0.25rem;
}

.device-codename {
  font-size: 0.8rem;
  color: #4a6b8a;
}

/* 模态框操作按钮 */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.modal-actions .add-button {
  background: #e3f2fd;
  color: #1565c0;
}

.modal-actions .add-button:hover {
  background: #bbdefb;
}

.modal-actions .add-button:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.hint-text {
  color: #64748b;
  font-size: 0.875rem;
}

.ghost-item {
  opacity: 0.5;
  background: #e3f2fd;
  border: 2px dashed #1565c0;
}

.chosen-item {
  opacity: 0.8;
  transform: scale(1.02);
}

@media (max-width: 768px) {
  .editor-container {
    flex-direction: column;
  }
  
  .form-container,
  .preview-container {
    width: 100%;
    max-width: 100%;
  }
  
  .device-list {
    grid-template-columns: 1fr;
  }
  
  .device-item {
    padding: 0.8rem;
  }
}

@media (max-width: 480px) {
  .project-path {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .find-manifest-button {
    width: 100%;
  }
  
  .modal-content {
    padding: 1rem;
  }
  
  .declaration-content {
    padding: 1rem;
  }
  
  .declaration-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .declaration-agree,
  .declaration-disagree {
    width: 100%;
  }
}
</style>