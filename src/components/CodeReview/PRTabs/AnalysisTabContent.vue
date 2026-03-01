<template>
  <div class="tab-content">
    <div v-if="analyzedData" class="analysis-results">
      <div class="analysis-section">
        <h3>PR变更分析</h3>
        
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
      </div>

      <div v-if="repoData" class="analysis-section">
        <h3>仓库信息分析</h3>
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
      </div>
    </div>
    <div v-else class="empty-state">
      <p>暂无数据分析结果</p>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  padding: 16px;
}

.analysis-results {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.analysis-section {
  flex: 1;
  min-width: 400px;
}

.analysis-section h3 {
  margin-top: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.csv-analysis {
  margin-top: 1rem;
}

.csv-analysis h4 {
  margin: 1.5rem 0 1rem;
  font-size: 1.1rem;
  color: hsl(var(--foreground));
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  align-items: flex-start;
}

.form-label {
  font-weight: 500;
  min-width: 120px;
  padding-right: 1rem;
  color: hsl(var(--muted-foreground));
}

.form-value {
  flex: 1;
  word-break: break-word;
}

.resource-analysis {
  margin-top: 1.5rem;
}

.resource-analysis h4 {
  margin: 1.5rem 0 1rem;
  font-size: 1.1rem;
  color: hsl(var(--foreground));
}

.json-viewer {
  background-color: hsl(var(--muted) / 0.45);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  padding: 16px;
  margin-top: 1rem;
  overflow-x: auto;
}

.json-viewer pre {
  margin: 0;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.repo-info {
  margin-top: 1.5rem;
}

.manifest-info {
  margin-top: 1.5rem;
}

.manifest-info h4 {
  margin: 1rem 0;
  font-size: 1rem;
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
  height: 100px;
  color: hsl(var(--muted-foreground));
}

.error {
  color: hsl(var(--destructive));
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .analysis-section {
    min-width: 100%;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .form-label {
    min-width: auto;
    padding-right: 0;
  }
}
</style>
