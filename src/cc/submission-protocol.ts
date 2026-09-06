import type { CatalogEntry } from '@/utils/resourcePublishApi'

export type SubmissionMode = 'create' | 'edit'

export const SUBMISSION_ROOT_PATH = 'tmp'
export const SUBMISSION_CSV_FILE_NAME = 'resource.csv'
export const SUBMISSION_REQUEST_FILE_NAME = 'request.json'

export const CATALOG_CSV_COLUMNS = [
  'id',
  'name',
  'restype',
  'repo_owner',
  'repo_name',
  'repo_commit_hash',
  'icon',
  'cover',
  'tags',
  'device_vendors',
  'devices',
  'paid_type'
] as const satisfies ReadonlyArray<keyof CatalogEntry>

export const CATALOG_CSV_HEADER = CATALOG_CSV_COLUMNS.join(',')

const CSV_STRUCTURAL_CHAR_PATTERN = /[,\r\n\0]/

export type CatalogWriteIntent = { mode: 'create' } | { mode: 'edit'; originalId: string }

export interface SubmissionClientInfo {
  version: string
  git_commit_hash: string
  build_time: string
  build_user: string
}

export interface SubmissionRequest {
  schema_version: 1
  mode: SubmissionMode
  original_id: string | null
  base_entry_digest: string | null
  base_catalog_commit: string | null
  client: SubmissionClientInfo | null
}

const ZERO_WIDTH_PATTERN = /[\u200b\u200c\u200d\u2060\ufeff]/
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/

export function normalizeCatalogPaidType(paidType?: string): string {
  const normalized = paidType?.trim() ?? ''
  return normalized.toLowerCase() === 'free' ? '' : normalized
}

export function normalizeCatalogEntryForCsv(entry: CatalogEntry): CatalogEntry {
  return {
    ...entry,
    paid_type: normalizeCatalogPaidType(entry.paid_type)
  }
}

export function validateCatalogEntryForCsv(entry: CatalogEntry): void {
  for (const column of CATALOG_CSV_COLUMNS) {
    const value = entry[column]
    if (typeof value !== 'string') {
      throw new Error(`CSV 字段 ${column} 必须是字符串，无法写入目录。`)
    }
    if (CSV_STRUCTURAL_CHAR_PATTERN.test(value)) {
      throw new Error(
        `CSV 字段 ${column} 不能包含逗号、换行或 NUL 字符，否则会破坏目录结构。请修改后重试。`
      )
    }
  }
}

export function serializeCatalogEntry(entry: CatalogEntry): string {
  const normalizedEntry = normalizeCatalogEntryForCsv(entry)
  validateCatalogEntryForCsv(normalizedEntry)
  return CATALOG_CSV_COLUMNS.map((column) => normalizedEntry[column]).join(',')
}

export function normalizeSubmissionPathSegment(value: string, label: string): string {
  const normalized = value.trim().toLowerCase()
  if (!normalized) throw new Error(`${label} 不能为空。`)
  if (CONTROL_PATTERN.test(normalized) || ZERO_WIDTH_PATTERN.test(normalized)) {
    throw new Error(`${label} 包含不可见或控制字符。`)
  }
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.includes('/') ||
    normalized.includes('\\')
  ) {
    throw new Error(`${label} 包含非法路径片段。`)
  }
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(normalized)) {
    throw new Error(`${label} 只允许小写字母、数字、点、连字符和下划线。`)
  }
  return normalized
}

export function buildSubmissionPath(githubLogin: string, repoName: string): string {
  const login = normalizeSubmissionPathSegment(githubLogin, 'GitHub 用户名')
  const name = normalizeSubmissionPathSegment(repoName, '仓库名')
  return `${SUBMISSION_ROOT_PATH}/${login}/${name}`
}

export function submissionCsvPath(submissionPath: string): string {
  return `${submissionPath}/${SUBMISSION_CSV_FILE_NAME}`
}

export function submissionRequestPath(submissionPath: string): string {
  return `${submissionPath}/${SUBMISSION_REQUEST_FILE_NAME}`
}

export function isSubmissionFilePath(filename: string | undefined): boolean {
  if (!filename) return false
  return filename.startsWith(`${SUBMISSION_ROOT_PATH}/`)
}

export function isSubmissionCsvFilePath(filename: string | undefined): boolean {
  if (!filename) return false
  return filename.startsWith(`${SUBMISSION_ROOT_PATH}/`) && filename.endsWith(`/${SUBMISSION_CSV_FILE_NAME}`)
}

export function extractSubmissionPathFromFilePath(filename: string | undefined): string | undefined {
  if (!filename || !isSubmissionFilePath(filename)) return undefined
  const parts = filename.split('/')
  // tmp/<login>/<repo>/<file>
  if (parts.length < 4) return undefined
  return parts.slice(0, 3).join('/')
}

export function parseSubmissionCsv(csv: string): CatalogEntry {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (rows.length !== 2) {
    throw new Error(`submission CSV 必须精确包含 1 行表头和 1 行数据，当前为 ${rows.length} 行。`)
  }
  if (rows[0] !== CATALOG_CSV_HEADER) {
    throw new Error('submission CSV 表头与目录表头不一致。')
  }
  const cols = rows[1].split(',')
  if (cols.length < 12) throw new Error('无法解析 submission CSV 数据行。')
  return {
    id: cols[0],
    name: cols[1],
    restype: cols[2],
    repo_owner: cols[3],
    repo_name: cols[4],
    repo_commit_hash: cols[5],
    icon: cols[6],
    cover: cols[7],
    tags: cols[8],
    device_vendors: cols[9],
    devices: cols[10],
    paid_type: cols[11] ?? ''
  }
}

export function buildSubmissionCsv(entry: CatalogEntry): string {
  const normalized = normalizeCatalogEntryForCsv(entry)
  const row = serializeCatalogEntry(normalized)
  return `${CATALOG_CSV_HEADER}\n${row}`
}

export function parseSubmissionRequestJson(raw: string): SubmissionRequest {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('request.json 不是合法 JSON。')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('request.json 必须是对象。')
  }
  const value = parsed as Record<string, unknown>
  if (value.schema_version !== 1) {
    throw new Error('request.json schema_version 必须为 1。')
  }
  if (value.mode !== 'create' && value.mode !== 'edit') {
    throw new Error('request.json mode 必须为 create 或 edit。')
  }
  const originalId =
    value.original_id === null ? null : String(value.original_id ?? '').trim() || null
  const digest =
    value.base_entry_digest === null
      ? null
      : String(value.base_entry_digest ?? '').trim() || null
  const commit =
    value.base_catalog_commit === null
      ? null
      : String(value.base_catalog_commit ?? '').trim() || null
  if (value.mode === 'edit' && (!originalId || !digest || !commit)) {
    throw new Error('edit 请求必须提供 original_id、base_entry_digest、base_catalog_commit。')
  }
  return {
    schema_version: 1,
    mode: value.mode,
    original_id: originalId,
    base_entry_digest: digest,
    base_catalog_commit: commit,
    client: parseSubmissionClientInfo(value.client)
  }
}

export function buildSubmissionRequest(request: SubmissionRequest): string {
  return `${JSON.stringify(request, null, 2)}\n`
}

function parseSubmissionClientInfo(value: unknown): SubmissionClientInfo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const read = (key: string): string => {
    const raw = record[key]
    const text = typeof raw === 'string' ? raw.trim() : ''
    return text || 'unknown'
  }
  return {
    version: read('version'),
    git_commit_hash: read('git_commit_hash'),
    build_time: read('build_time'),
    build_user: read('build_user')
  }
}

export function buildClientInfo(): SubmissionClientInfo {
  return {
    version: __APP_VERSION__ || 'unknown',
    git_commit_hash: (__BUILD_COMMIT_SHA__ || 'unknown').slice(0, 7),
    build_time: __BUILD_TIME_RFC3339__ || 'unknown',
    build_user: 'web'
  }
}

export async function canonicalCatalogEntryDigest(entry: CatalogEntry): Promise<string> {
  const normalized = normalizeCatalogEntryForCsv(entry)
  const row = CATALOG_CSV_COLUMNS.map((column) => normalized[column]).join(',')
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('当前环境不支持 SHA-256，无法生成目录行摘要。')
  const bytes = new TextEncoder().encode(row)
  const digest = await subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildCreateSubmissionRequest(
  baseCatalogCommit?: string | null
): Promise<SubmissionRequest> {
  return {
    schema_version: 1,
    mode: 'create',
    original_id: null,
    base_entry_digest: null,
    base_catalog_commit: baseCatalogCommit ?? null,
    client: buildClientInfo()
  }
}

export async function buildEditSubmissionRequest(params: {
  originalId: string
  baseEntryDigest: string
  baseCatalogCommit: string
}): Promise<SubmissionRequest> {
  return {
    schema_version: 1,
    mode: 'edit',
    original_id: params.originalId,
    base_entry_digest: params.baseEntryDigest,
    base_catalog_commit: params.baseCatalogCommit,
    client: buildClientInfo()
  }
}

export function buildSubmissionPrTitle(params: {
  mode: 'create' | 'edit'
  itemName: string
  itemId: string
}): string {
  const label = params.mode === 'create' ? '[ABOOOX] Add new resource' : '[ABOOOX] Update resource'
  return `${label}: ${params.itemName || params.itemId || '资源'}`
}
