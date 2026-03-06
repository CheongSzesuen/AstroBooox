/// <reference types="vite/client" />
declare const __BUILD_VERSION__: string
declare const __APP_VERSION__: string
declare const __APP_NAME__: string
declare const __BUILD_COMMIT_SHA__: string
declare const __BUILD_COMMIT_REF__: string
declare const __BUILD_TIMESTAMP__: string
declare const __BUILD_BRANCH__: string
declare const __BUILD_TIME_UTC8__: string

// 添加FileSystem API类型声明
interface FileSystemFileHandle {
  getFile(): Promise<File>
  name: string
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  name: string
}

interface Window {
  showDirectoryPicker(options?: { id?: string; mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  showOpenFilePicker(options?: {
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
  }): Promise<FileSystemFileHandle[]>
}
