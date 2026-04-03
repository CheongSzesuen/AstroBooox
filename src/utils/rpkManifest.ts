const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_STORED = 0
const ZIP_DEFLATED = 8
const MAX_EOCD_COMMENT_LENGTH = 0xffff

export type RpkManifestInfo = {
  packageName: string
}

export const isRpkManifestAutoValidationSupported = (): boolean => typeof DecompressionStream === 'function'

const decodeUtf8 = (bytes: Uint8Array): string => new TextDecoder('utf-8').decode(bytes)

const inflateRaw = async (bytes: Uint8Array): Promise<Uint8Array> => {
  if (!isRpkManifestAutoValidationSupported()) {
    throw new Error('当前浏览器不支持解压 deflate 数据')
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

const findEndOfCentralDirectoryOffset = (bytes: Uint8Array, view: DataView): number => {
  const minOffset = Math.max(0, bytes.length - (22 + MAX_EOCD_COMMENT_LENGTH))
  for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) {
      return offset
    }
  }
  throw new Error('未找到 ZIP 目录结构，RPK 可能已损坏')
}

const extractManifestBytes = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEndOfCentralDirectoryOffset(bytes, view)
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true)
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true)
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize

  let offset = centralDirectoryOffset
  while (offset < centralDirectoryEnd) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('RPK 中央目录损坏，无法读取 manifest.json')
    }

    const generalPurposeFlag = view.getUint16(offset + 8, true)
    const compressionMethod = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const fileNameLength = view.getUint16(offset + 28, true)
    const extraFieldLength = view.getUint16(offset + 30, true)
    const fileCommentLength = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)
    const fileNameOffset = offset + 46
    const fileNameEnd = fileNameOffset + fileNameLength
    const fileName = decodeUtf8(bytes.subarray(fileNameOffset, fileNameEnd))

    if (fileName === 'manifest.json') {
      if ((generalPurposeFlag & 0x0001) !== 0) {
        throw new Error('RPK manifest.json 已加密，暂不支持校验')
      }

      if (view.getUint32(localHeaderOffset, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
        throw new Error('RPK 本地文件头损坏，无法读取 manifest.json')
      }

      const localFileNameLength = view.getUint16(localHeaderOffset + 26, true)
      const localExtraFieldLength = view.getUint16(localHeaderOffset + 28, true)
      const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength
      const compressedBytes = bytes.subarray(dataOffset, dataOffset + compressedSize)

      if (compressionMethod === ZIP_STORED) return compressedBytes
      if (compressionMethod === ZIP_DEFLATED) return await inflateRaw(compressedBytes)
      throw new Error(`RPK manifest.json 使用了不支持的压缩方式：${compressionMethod}`)
    }

    offset = fileNameEnd + extraFieldLength + fileCommentLength
  }

  throw new Error('RPK 中未找到 manifest.json')
}

export const readRpkManifestInfo = async (file: File): Promise<RpkManifestInfo> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const manifestBytes = await extractManifestBytes(bytes)
  let manifest: unknown
  try {
    manifest = JSON.parse(decodeUtf8(manifestBytes))
  } catch {
    throw new Error('RPK 中的 manifest.json 不是有效 JSON')
  }

  const packageName = typeof (manifest as { package?: unknown }).package === 'string'
    ? (manifest as { package: string }).package.trim()
    : ''
  if (!packageName) {
    throw new Error('RPK manifest.json 缺少 package 字段')
  }

  return { packageName }
}
