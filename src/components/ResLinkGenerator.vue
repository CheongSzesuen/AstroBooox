<template>
  <div class="res-link-generator">
    <div class="editor-content">
      <div class="editor-container">
        <!-- 表单容器 -->
        <div class="form-container">
          <!-- 资源信息部分 -->
          <div class="form-section">
            <h3>资源信息</h3>
            <div class="form-group">
              <label>资源名称</label>
              <div class="input-with-button">
                <Input
                  id="resourceNameInput"
                  v-model="resourceName"
                  placeholder="PoP☆P"
                  class="flex-1"
                  @keyup.enter="copyLink"
                />
                <Button
                  variant="outline"
                  @click="openResourceSearch" 
                  class="search-button"
                >
                  <MagnifyingGlass :size="16" weight="bold" />
                  搜索
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  @click="clearInput" 
                  :disabled="!resourceName.trim()" 
                  class="round-remove-button"
                >
                  <Minus :size="16" weight="bold" />
                </Button>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>生成的链接<span class="hint-text">（点击可跳转）</span></h3>
            <div v-if="resourceName.trim()" class="preview-content">
              <pre><a :href="generatedLink" target="_blank" rel="noopener noreferrer">{{ generatedLink }}</a></pre>
            </div>
            <div v-else class="preview-content empty">
              <pre>{{ generatedLink }}</pre>
            </div>
            <div class="preview-actions">
              <Button @click="copyLink" :disabled="!resourceName.trim()">
                <CopySimple :size="16" weight="bold" />
                {{ copyButtonText }}
              </Button>
            </div>
          </div>

          <!-- 徽标生成部分 -->
          <div class="form-section">
            <h3>徽标代码生成</h3>
            
            <div class="badge-config-container">
              <!-- 左侧：配置选项 - 占据主要空间 -->
              <div class="badge-config-options">
                <!-- 语言选择 -->
                <div class="form-group">
                  <label class="config-label">语言</label>
                  <RadioGroup v-model="badgeLanguage" class="config-options">
                    <div class="config-item">
                      <RadioGroupItem id="badge-lang-zhcn" value="zhcn" />
                      <Label for="badge-lang-zhcn">简体中文</Label>
                    </div>
                    <div class="config-item">
                      <RadioGroupItem id="badge-lang-en" value="en" />
                      <Label for="badge-lang-en">英文</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <!-- 样式选择 -->
                <div class="form-group">
                  <label class="config-label">样式</label>
                  <RadioGroup v-model="badgeStyle" class="config-options">
                    <div class="config-item">
                      <RadioGroupItem id="badge-style-standard" value="standard" />
                      <Label for="badge-style-standard">标准</Label>
                    </div>
                    <div class="config-item">
                      <RadioGroupItem id="badge-style-rounded" value="rounded" />
                      <Label for="badge-style-rounded">胶囊</Label>
                    </div>
                    <div class="config-item">
                      <RadioGroupItem id="badge-style-linked" value="linked" />
                      <Label for="badge-style-linked">链接</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <!-- 配色选择 -->
                <div class="form-group">
                  <label class="config-label">配色</label>
                  <RadioGroup v-model="badgeColor" class="config-options">
                    <div class="config-item">
                      <RadioGroupItem id="badge-color-black" value="black" />
                      <Label for="badge-color-black">黑色</Label>
                    </div>
                    <div class="config-item">
                      <RadioGroupItem id="badge-color-gray" value="gray" />
                      <Label for="badge-color-gray">灰色</Label>
                    </div>
                    <div class="config-item">
                      <RadioGroupItem id="badge-color-white" value="white" />
                      <Label for="badge-color-white">亮色</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              
              <!-- 右侧：徽标预览 - 自适应宽度 -->
              <div class="badge-preview-wrapper">
                <div class="form-group">
                  <label class="config-label">徽标预览<span class="hint-text">（点击可跳转）</span></label>
                  <div class="badge-preview-container">
                    <a 
                      v-if="resourceName.trim()"
                      :href="generatedLink" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <img :src="badgeImageUrl" alt="徽标预览" class="badge-preview-image" />
                    </a>
                    <img 
                      v-else
                      :src="badgeImageUrl" 
                      alt="徽标预览" 
                      class="badge-preview-image" 
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label class="config-label">生成的HTML代码</label>
              <div class="code-preview">
                <pre>{{ badgeHtmlCode }}</pre>
              </div>
            </div>
            
            <div class="preview-actions">
              <Button @click="copyBadgeCode" :disabled="!resourceName.trim()">
                <CopySimple :size="16" weight="bold" />
                {{ copyBadgeButtonText }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog :open="showResourceSearch" @update:open="showResourceSearch = $event">
        <DialogContent class="max-w-[840px]">
          <DialogHeader>
            <DialogTitle>搜索资源</DialogTitle>
            <DialogDescription>暂时不支持模糊拼写纠错，请输入关键字搜索。</DialogDescription>
          </DialogHeader>
          <div class="search-input-container">
            <Input
              v-model="searchQuery"
              placeholder="输入资源名称或作者名搜索..."
              @input="filterResources"
              class="search-input"
            />
          </div>
          <div class="resource-grid">
            <div
              v-for="resource in filteredResources"
              :key="resource.name"
              class="resource-card"
              :class="{ selected: isResourceSelected(resource) }"
              @click="selectResource(resource)"
            >
              <div class="resource-header">
                <div class="resource-name">{{ resource.name }}</div>
                <div class="resource-type">{{ resource.restype === 'quickapp' ? '快应用' : '表盘' }}</div>
              </div>
              <div class="resource-author">作者: {{ getAuthorName(resource.path) }}</div>
            </div>
            <div v-if="filteredResources.length === 0" class="empty-resources">
              没有找到匹配的资源
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="closeResourceSearch">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  PhCopySimple as CopySimple,
  PhMagnifyingGlass as MagnifyingGlass,
  PhMinus as Minus
} from '@phosphor-icons/vue';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// 用于存储用户输入的资源名称
const resourceName = ref('');

// 基础链接
const baseUrl = 'https://astrobox.online/open?source=res&res=';
const suffixUrl = '&provider=official';

// 资源搜索相关状态
const showResourceSearch = ref(false);
const searchQuery = ref('');
const allResources = ref([]);
const filteredResources = ref([]);

// 徽标相关状态
const badgeStyle = ref('standard');
const badgeColor = ref('black');
const badgeLanguage = ref('zhcn');
const copyBadgeButtonText = ref('复制代码');
let copyBadgeTimeout = null;

// 计算属性：根据 resourceName 生成最终的链接
const generatedLink = computed(() => {
  if (resourceName.value.trim() === '') {
    return '...'; // 如果没有输入，显示提示
  }
  // 对资源名称进行 URL 编码
  const encodedResourceName = encodeURIComponent(resourceName.value);
  return `${baseUrl}${encodedResourceName}${suffixUrl}`;
});

// 计算属性：生成徽标图片URL
const badgeImageUrl = computed(() => {
  let stylePath = '';
  if (badgeStyle.value === 'rounded') {
    stylePath = 'rounded/';
  } else if (badgeStyle.value === 'linked') {
    stylePath = 'linked/';
  }
  return `https://astrobox.online/goab/${badgeLanguage.value}/${stylePath}${badgeColor.value}.svg`;
});

// 计算属性：生成徽标HTML代码
const badgeHtmlCode = computed(() => {
  if (resourceName.value.trim() === '') {
    return '<!-- 请输入资源名称后生成徽标代码 -->';
  }
  return `<a href="${generatedLink.value}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeImageUrl.value}" alt="Get it on AstroBox" height="46">
</a>`;
});

// 点击复制按钮时的提示文本
const copyButtonText = ref('复制链接');
let copyTimeout = null; // 用于清除延时器

// 从路径中提取作者名
const getAuthorName = (path) => {
  if (!path) return '未知';
  const parts = path.split('/');
  return parts.length > 0 ? parts[0] : '未知';
};

// 从远程加载资源列表
const loadResources = async () => {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/AstralSightStudios/AstroBox-Repo@refs/heads/main/index.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim() !== ''); // 过滤空行
    
    if (lines.length <= 1) {
      allResources.value = [];
      filteredResources.value = [];
      return;
    }
    
    const headers = lines[0].split(',');
    
    allResources.value = lines.slice(1)
      .map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      })
      .filter(resource => resource.name && resource.name.trim() !== '');
    
    filteredResources.value = [...allResources.value];
  } catch (error) {
    console.error('加载资源列表失败:', error);
    allResources.value = [];
    filteredResources.value = [];
  }
};

// 检查资源是否被选中
const isResourceSelected = (resource) => {
  return resourceName.value === resource.name;
}

// 打开资源搜索对话框
const openResourceSearch = async () => {
  if (allResources.value.length === 0) {
    await loadResources();
  }
  searchQuery.value = '';
  filteredResources.value = [...allResources.value];
  showResourceSearch.value = true;
};

// 关闭资源搜索对话框
const closeResourceSearch = () => {
  showResourceSearch.value = false;
};

// 过滤资源列表 (支持模糊搜索和作者名搜索)
const filterResources = () => {
  if (!searchQuery.value) {
    filteredResources.value = [...allResources.value];
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredResources.value = allResources.value.filter(resource => {
    const nameMatch = resource.name.toLowerCase().includes(query);
    const authorMatch = getAuthorName(resource.path).toLowerCase().includes(query);
    return nameMatch || authorMatch;
  });
};

// 选择资源
const selectResource = (resource) => {
  resourceName.value = resource.name;
  closeResourceSearch();
};

// 复制链接到剪贴板
const copyLink = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(generatedLink.value)
      .then(() => {
        copyButtonText.value = '已复制！';
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyButtonText.value = '复制链接';
        }, 1500);
      })
      .catch(err => {
        console.error('复制失败: ', err);
        copyButtonText.value = '复制失败 ';
      });
  } else {
    fallbackCopyTextToClipboard(generatedLink.value);
    copyButtonText.value = '请手动复制';
  }
};

// 复制徽标代码到剪贴板
const copyBadgeCode = () => {
  const codeToCopy = badgeHtmlCode.value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(codeToCopy)
      .then(() => {
        copyBadgeButtonText.value = '已复制！';
        if (copyBadgeTimeout) clearTimeout(copyBadgeTimeout);
        copyBadgeTimeout = setTimeout(() => {
          copyBadgeButtonText.value = '复制代码';
        }, 1500);
      })
      .catch(err => {
        console.error('复制失败: ', err);
        copyBadgeButtonText.value = '复制失败 ';
      });
  } else {
    fallbackCopyTextToClipboard(codeToCopy);
    copyBadgeButtonText.value = '请手动复制';
  }
};

// 备用复制方法
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    copyButtonText.value = '已复制！';
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copyButtonText.value = '复制链接';
    }, 1500);
  } catch (err) {
    console.error('备用复制失败', err);
    copyButtonText.value = '复制失败 ';
  }
  document.body.removeChild(textArea);
};

const clearInput = () => {
  resourceName.value = '';
  copyButtonText.value = '复制链接';
  if (copyTimeout) clearTimeout(copyTimeout);
}
</script>

<style scoped>
.res-link-generator {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

.editor-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  gap: 1rem;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 500px;
}

.form-container {
  flex: 1;
  min-width: 0;
  background: hsl(var(--muted) / 0.55);
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  padding: 1rem;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.04);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.config-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: hsl(var(--foreground));
  font-size: 0.9rem;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.preview-content {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border));
  overflow: auto;
  font-size: 0.9rem;
  line-height: 1.5;
}

.hint-text {
  color: hsl(var(--muted-foreground));
  font-size: 0.8rem;
  font-weight: normal;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', monospace;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.empty {
  color: hsl(var(--muted-foreground));
  font-style: italic;
}

a {
  color: hsl(var(--foreground));
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: hsl(var(--foreground));
  text-decoration: underline;
}

.search-button {
  gap: 0.5rem;
}

.round-remove-button {
  min-width: 2.25rem;
}

.config-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.config-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: hsl(var(--background));
}

.badge-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: hsl(var(--background));
  border-radius: 0.5rem;
  border: 1px dashed hsl(var(--border));
  margin-top: 0.5rem;
  height: 100%;
  box-sizing: border-box;
  flex-grow: 1;
}

.badge-preview-image {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
}

.code-preview {
  background: hsl(var(--background));
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
  border: 1px solid hsl(var(--border));
  overflow-x: auto;
}

.code-preview pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  word-break: break-word;
}

.badge-config-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: stretch;
}

.badge-config-options {
  flex: 1;
  min-width: 0;
  max-width: 400px;
  display: flex;
  flex-direction: column;
}

.badge-preview-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.search-input-container {
  padding: 0 0 0.75rem;
  width: 100%;
  box-sizing: border-box;
}

.search-input {
  width: 100%;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  padding: 0.25rem;
  overflow-y: auto;
  max-height: 52vh;
}

.resource-card {
  padding: 0.875rem;
  border-radius: 0.5rem;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  transition: border-color 0.2s ease, background-color 0.2s ease;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.resource-card:hover {
  background: hsl(var(--accent));
}

.resource-card.selected {
  background: hsl(var(--muted));
  border-color: hsl(var(--ring));
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.resource-name {
  font-weight: 600;
  color: hsl(var(--foreground));
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.resource-type {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 0.375rem;
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  white-space: nowrap;
  margin-left: 0.5rem;
  border: 1px solid hsl(var(--border));
}

.resource-author {
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-resources {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: hsl(var(--muted-foreground));
}

@media (min-width: 1200px) {
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

@media (max-width: 992px) {
  .config-options {
    gap: 0.5rem;
  }
}

@media (max-width: 768px) {
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .form-section {
    padding: 1rem;
  }
  
  .input-with-button {
    flex-direction: column;
  }
  
  .input-with-button :deep(button) {
    width: 100%;
    justify-content: center;
  }
  
  .badge-config-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .badge-preview-wrapper {
    order: -1;
    width: 100%;
  }
  
  .badge-config-options {
    max-width: 100%;
  }
  
  .badge-preview-container {
    width: 100%;
  }
}


@media (max-width: 400px) {
  .form-section {
    padding: 0.875rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .preview-actions {
    margin-top: 1rem;
  }
}
</style>
