<template>
  <div>
    <div v-if="analyzedData" class="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
      <Card class="min-w-0">
        <CardHeader class="border-b border-border px-3.5 pb-2.5 pt-3.5">
          <CardTitle class="text-base">PR变更分析</CardTitle>
        </CardHeader>
        <CardContent class="px-3.5 pb-3.5 pt-3">
          <div v-if="analyzedData.csvChange" class="mt-1">
            <h4 class="mb-2 mt-3 text-sm font-semibold text-foreground">CSV变更</h4>
            <div class="flex flex-col gap-1">
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">资源名:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.appName || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">图标:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <a v-if="analyzedData.csvChange.iconUrl" :href="analyzedData.csvChange.iconUrl" target="_blank" class="break-all text-foreground hover:underline">
                    {{ analyzedData.csvChange.iconUrl }}
                  </a>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">头图:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <a v-if="analyzedData.csvChange.previewUrl" :href="analyzedData.csvChange.previewUrl" target="_blank" class="break-all text-foreground hover:underline">
                    {{ analyzedData.csvChange.previewUrl }}
                  </a>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">类型:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.type || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">标签:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.tags || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">支持设备:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.supportedDevices || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">JSON路径:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.resourceFile || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">付费类型:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ analyzedData.csvChange.paidType || '未提供' }}</div>
              </div>
            </div>
          </div>

          <div v-if="analyzedData.resourceChange" class="mt-3.5">
            <h4 class="mb-2 mt-3 text-sm font-semibold text-foreground">资源文件变更</h4>
            <div class="mt-2 overflow-x-auto rounded-[0.6rem] border border-border bg-muted/45 p-2.5">
              <pre class="m-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.45]">{{ JSON.stringify(analyzedData.resourceChange, null, 2) }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="repoData" class="min-w-0">
        <CardHeader class="border-b border-border px-3.5 pb-2.5 pt-3.5">
          <CardTitle class="text-base">仓库信息分析</CardTitle>
        </CardHeader>
        <CardContent class="px-3.5 pb-3.5 pt-3">
          <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
            <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">仓库URL:</div>
            <div class="flex-1 break-words text-[0.86rem]">
              <a v-if="repoData.repo_url" :href="repoData.repo_url" target="_blank" class="break-all text-foreground hover:underline">
                {{ repoData.repo_url }}
              </a>
              <span v-else>未提供</span>
            </div>
          </div>

          <div v-if="manifestData" class="mt-3">
            <h4 class="mb-2 mt-2 text-sm font-semibold text-muted-foreground">Manifest 内容</h4>
            <div class="flex flex-col gap-1">
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">应用名称:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ manifestData.item.name || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">描述:</div>
                <div class="flex-1 break-words text-[0.86rem]">{{ manifestData.item.description || '未提供' }}</div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">作者:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <template v-if="manifestData.item.author?.length">
                    <a
                      v-for="author in manifestData.item.author"
                      :key="author.name"
                      :href="author.author_url"
                      target="_blank"
                      class="mr-2 text-foreground hover:underline"
                    >
                      {{ author.name || '匿名作者' }}
                    </a>
                  </template>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">支持的设备:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <template v-if="manifestData.downloads && Object.keys(manifestData.downloads).length">
                    <span v-for="(device, index) in Object.keys(manifestData.downloads)" :key="device">
                      {{ device }}{{ index < Object.keys(manifestData.downloads).length - 1 ? ', ' : '' }}
                    </span>
                  </template>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">图标:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <a v-if="manifestData.item.icon" :href="getFullImageUrl(manifestData.item.icon)" target="_blank" class="break-all text-foreground hover:underline">
                    {{ manifestData.item.icon }}
                  </a>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="flex items-start gap-1.5 py-0.5 max-[768px]:flex-col max-[768px]:gap-0.5">
                <div class="min-w-[104px] text-[0.82rem] font-medium text-muted-foreground">预览图:</div>
                <div class="flex-1 break-words text-[0.86rem]">
                  <template v-if="manifestData.item.preview?.length">
                    <div v-for="preview in manifestData.item.preview" :key="preview">
                      <a :href="getFullImageUrl(preview)" target="_blank" class="break-all text-foreground hover:underline">
                        {{ preview }}
                      </a>
                    </div>
                  </template>
                  <span v-else>未提供</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="mt-3 text-sm text-destructive">
            无法获取或解析manifest.json文件
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 text-muted-foreground">
      <p>暂无数据分析结果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyzedData, RepoData, ManifestData } from '@/type/codeReview'

const props = defineProps<{
  analyzedData: AnalyzedData | null
  repoData: RepoData | null
  manifestData: ManifestData | null
}>()

const getFullImageUrl = (relativePath: string): string => {
  if (!props.repoData?.repo_url || !relativePath) return ''
  const repoPath = props.repoData.repo_url.replace('https://github.com/', '')
  return `https://raw.githubusercontent.com/${repoPath}/main/${relativePath}`
}
</script>
