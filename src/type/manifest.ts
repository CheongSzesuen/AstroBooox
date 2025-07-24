/**
 • 作者信息
 */
export interface Author {
  name: string;
  author_url?: string;
}

/**
 • 下载项信息
 */
export interface DownloadItem {
  version: string;
  file_name: string;
}

/**
 • 应用项目信息
 */
export interface AppItem {
  name: string;
  description: string;
  preview: string[];
  icon: string;
  source_url?: string;
  author: Author[];
}

/**
 • Manifest 主结构
 */
export interface Manifest {
  item: AppItem;
  downloads: Record<string, DownloadItem>;
}

/**
 • 应用模式
 */
export type AppMode = 'manifest' | 'csv';

/**
 • 设备类型
 */
export type DeviceType = 'desktop' | 'tablet' | 'phone';

/**
 • 文件系统相关类型
 */
export interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

interface FileSystemGetFileOptions {
  create?: boolean;
}

interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

interface FileSystemRemoveOptions {
  recursive?: boolean;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob | ArrayBufferView | ArrayBuffer): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
    }): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker(options?: {
      multiple?: boolean;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }): Promise<FileSystemFileHandle[]>;
  }
}