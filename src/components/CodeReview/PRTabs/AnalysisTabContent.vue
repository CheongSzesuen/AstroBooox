<template>
  <div class="tab-content">
    <div v-if="analyzedData" class="analysis-results">
      <Card class="analysis-section">
        <CardHeader class="analysis-header">
          <CardTitle class="text-base">PR变更分析</CardTitle>
        </CardHeader>
        <CardContent class="analysis-content">
          <div v-if="analyzedData.csvChange" class="csv-analysis">
            <h4>CSV变更</h4>
            <div class="form-layout">
              <div class="form-row">
                <div class="form-label">资源名:</div>
                <div class="form-value">{{ analyzedData.csvChange.appName || '未提供' }}</div>
              </div>
              <div class="form-row">
                <div class="form-label">图标:</div>
                <div class="form-value">
                  <a v-if="analyzedData.csvChange.iconUrl" :href="analyzedData.csvChange.iconUrl" target="_blank" class="resource-link">
                    {{ analyzedData.csvChange.iconUrl }}
                  </a>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="form-row">
                <div class="form-label">头图:</div>
                <div class="form-value">
                  <a v-if="analyzedData.csvChange.previewUrl" :href="analyzedData.csvChange.previewUrl" target="_blank" class="resource-link">
                    {{ analyzedData.csvChange.previewUrl }}
                  </a>
                  <span v-else>未提供</span>
                </div>
              </div>
              <div class="form-row">
                <div class="form-label">类型:</div>
                <div class="form-value">{{ analyzedData.csvChange.type || '未提供' }}</div>
              </div>
              <div class="form-row">
                <div class="form-label">标签:</div>
                <div class="form-value">{{ analyzedData.csvChange.tags || '未提供' }}</div>
              </div>
              <div class="form-row">
                <div class="form-label">支持设备:</div>
                <div class="form-value">{{ analyzedData.csvChange.supportedDevices || '未提供' }}</div>
              </div>
              <div class="form-row">
                <div class="form-label">JSON路径:</div>
                <div class="form-value">{{ analyzedData.csvChange.resourceFile || '未提供' }}</div>
              </div>
              <div class="form-row">
                <div class="form-label">付费类型:</div>
                <div class="form-value">{{ analyzedData.csvChange.paidType || '未提供' }}</div>
              </div>
            </div>
          </div>

          <div v-if="analyzedData.resourceChange" class="resource-analysis">
            <h4>资源文件变更</h4>
            <div class="json-viewer">
              <pre>{{ JSON.stringify(analyzedData.resourceChange, null, 2) }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="repoData" class="analysis-section">
        <CardHeader class="analysis-header">
          <CardTitle class="text-base">仓库信息分析</CardTitle>
        </CardHeader>
        <CardContent class="analysis-content">
          <div class="repo-info">
            <div class="form-row">
              <div class="form-label">仓库URL:</div>
              <div class="form-value">
                <a v-if="repoData.repo_url" :href="repoData.repo_url" target="_blank" class="resource-link">
                  {{ repoData.repo_url }}
                </a>
                <span v-else>未提供</span>
              </div>
            </div>
            
            <div v-if="manifestData" class="manifest-info">
              <h4>Manifest 内容</h4>
              <div class="form-layout">
                <div class="form-row">
                  <div class="form-label">应用名称:</div>
                  <div class="form-value">{{ manifestData.item.name || '未提供' }}</div>
                </div>
                <div class="form-row">
                  <div class="form-label">描述:</div>
                  <div class="form-value">{{ manifestData.item.description || '未提供' }}</div>
                </div>
                <div class="form-row">
                  <div class="form-label">作者:</div>
                  <div class="form-value">
                    <template v-if="manifestData.item.author?.length">
                      <a v-for="author in manifestData.item.author" 
                        :key="author.name"
                        :href="author.author_url" 
                        target="_blank"
                        class="author-link">
                        {{ author.name || '匿名作者' }}
                      </a>
                    </template>
                    <span v-else>未提供</span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-label">支持的设备:</div>
                  <div class="form-value">
                    <template v-if="manifestData.downloads && Object.keys(manifestData.downloads).length">
                      <span v-for="(device, index) in Object.keys(manifestData.downloads)" :key="device">
                        {{ device }}{{ index < Object.keys(manifestData.downloads).length - 1 ? ', ' : '' }}
                      </span>
                    </template>
                    <span v-else>未提供</span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-label">图标:</div>
                  <div class="form-value">
                    <a v-if="manifestData.item.icon" :href="getFullImageUrl(manifestData.item.icon)" target="_blank" class="resource-link">
                      {{ manifestData.item.icon }}
                    </a>
                    <span v-else>未提供</span>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-label">预览图:</div>
                  <div class="form-value">
                    <template v-if="manifestData.item.preview?.length">
                      <div v-for="preview in manifestData.item.preview" :key="preview">
                        <a :href="getFullImageUrl(preview)" target="_blank" class="resource-link">
                          {{ preview }}
                        </a>
                      </div>
                    </template>
                    <span v-else>未提供</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="error">
              无法获取或解析manifest.json文件
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    <div v-else class="empty-state">
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

<style scoped>
.tab-content {
  padding: 0.25rem;
}

.analysis-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.analysis-section {
  min-width: 0;
}

.analysis-header {
  padding: 1rem 1rem 0.7rem;
  border-bottom: 1px solid hsl(var(--border));
}

.analysis-content {
  padding: 0.85rem 1rem 1rem;
}

.csv-analysis {
  margin-top: 0.35rem;
}

.csv-analysis h4 {
  margin: 1rem 0 0.8rem;
  font-size: 0.95rem;
  color: hsl(var(--foreground));
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 0.2rem 0;
}

.form-label {
  font-weight: 500;
  min-width: 110px;
  color: hsl(var(--muted-foreground));
  font-size: 0.85rem;
}

.form-value {
  flex: 1;
  word-break: break-word;
  font-size: 0.9rem;
}

.resource-analysis {
  margin-top: 1.1rem;
}

.resource-analysis h4 {
  margin: 1rem 0 0.8rem;
  font-size: 0.95rem;
  color: hsl(var(--foreground));
}

.json-viewer {
  background-color: hsl(var(--muted) / 0.45);
  border: 1px solid hsl(var(--border));
  border-radius: 0.6rem;
  padding: 0.8rem;
  margin-top: 0.6rem;
  overflow-x: auto;
}

.json-viewer pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.repo-info {
  margin-top: 0.2rem;
}

.manifest-info {
  margin-top: 1rem;
}

.manifest-info h4 {
  margin: 0.6rem 0;
  font-size: 0.95rem;
  color: hsl(var(--muted-foreground));
}

.resource-link {
  color: hsl(var(--foreground));
  text-decoration: none;
  word-break: break-all;
}

.resource-link:hover {
  text-decoration: underline;
}

.author-link {
  color: hsl(var(--foreground));
  text-decoration: none;
  margin-right: 0.5rem;
}

.author-link:hover {
  text-decoration: underline;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 9rem;
  color: hsl(var(--muted-foreground));
  border: 1px dashed hsl(var(--border));
  border-radius: 0.75rem;
  background: hsl(var(--muted) / 0.25);
}

.error {
  color: hsl(var(--destructive));
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .analysis-results {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0.15rem;
  }
  
  .form-label {
    min-width: auto;
    padding-right: 0;
  }
}
</style>
