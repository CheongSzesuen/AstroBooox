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
                <input
                  id="resourceNameInput"
                  v-model="resourceName"
                  placeholder="PoP☆P"
                  @keyup.enter="copyLink"
                />
                <button 
                  @click="openResourceSearch" 
                  class="search-button"
                >
                  <MagnifyingGlass :size="16" weight="bold" />
                  搜索
                </button>
                <button 
                  @click="clearInput" 
                  :disabled="!resourceName.trim()" 
                  class="round-remove-button"
                >
                  <Minus :size="16" weight="bold" />
                  清除
                </button>
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
              <button @click="copyLink" :disabled="!resourceName.trim()" class="add-button">
                <CopySimple :size="16" weight="bold" />
                {{ copyButtonText }}
              </button>
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
                  <div class="config-options">
                    <label class="config-option" :class="{ active: badgeLanguage === 'zhcn' }">
                      <input 
                        type="radio" 
                        v-model="badgeLanguage" 
                        value="zhcn"
                        class="sr-only"
                      >
                      <span class="option-text">简体中文</span>
                    </label>
                    <label class="config-option" :class="{ active: badgeLanguage === 'en' }">
                      <input 
                        type="radio" 
                        v-model="badgeLanguage" 
                        value="en"
                        class="sr-only"
                      >
                      <span class="option-text">英文</span>
                    </label>
                  </div>
                </div>
                
                <!-- 样式选择 -->
                <div class="form-group">
                  <label class="config-label">样式</label>
                  <div class="config-options">
                    <label class="config-option" :class="{ active: badgeStyle === 'standard' }">
                      <input 
                        type="radio" 
                        v-model="badgeStyle" 
                        value="standard"
                        class="sr-only"
                      >
                      <span class="option-text">标准</span>
                    </label>
                    <label class="config-option" :class="{ active: badgeStyle === 'rounded' }">
                      <input 
                        type="radio" 
                        v-model="badgeStyle" 
                        value="rounded"
                        class="sr-only"
                      >
                      <span class="option-text">胶囊</span>
                    </label>
                    <label class="config-option" :class="{ active: badgeStyle === 'linked' }">
                      <input 
                        type="radio" 
                        v-model="badgeStyle" 
                        value="linked"
                        class="sr-only"
                      >
                      <span class="option-text">链接</span>
                    </label>
                  </div>
                </div>
                
                <!-- 配色选择 -->
                <div class="form-group">
                  <label class="config-label">配色</label>
                  <div class="config-options">
                    <label class="config-option" :class="{ active: badgeColor === 'black' }">
                      <input 
                        type="radio" 
                        v-model="badgeColor" 
                        value="black"
                        class="sr-only"
                      >
                      <span class="option-text">黑色</span>
                    </label>
                    <label class="config-option" :class="{ active: badgeColor === 'gray' }">
                      <input 
                        type="radio" 
                        v-model="badgeColor" 
                        value="gray"
                        class="sr-only"
                      >
                      <span class="option-text">灰色</span>
                    </label>
                    <label class="config-option" :class="{ active: badgeColor === 'white' }">
                      <input 
                        type="radio" 
                        v-model="badgeColor" 
                        value="white"
                        class="sr-only"
                      >
                      <span class="option-text">亮色</span>
                    </label>
                  </div>
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
              <button @click="copyBadgeCode" :disabled="!resourceName.trim()" class="add-button">
                <CopySimple :size="16" weight="bold" />
                {{ copyBadgeButtonText }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 资源搜索对话框 -->
      <div v-if="showResourceSearch" class="modal-overlay">
        <div class="modal-content">
          <h3>搜索资源 <span class="hint-text">(暂时不支持模糊搜索)</span></h3>
          <div class="search-input-container">
            <input 
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
          <div class="modal-actions">
            <button @click="closeResourceSearch" class="add-button">取消</button>
          </div>
        </div>
      </div>
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
/* 基础样式 */
.res-link-generator {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem;
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #1e293b;
}

.config-label {
  display: block;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  font-size: 0.95rem;
}

.input-with-button {
  display: flex;
  gap: 0.75rem;
}

.input-with-button input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  color: #334155;
  box-sizing: border-box;
  transition: all 0.2s;
}

.input-with-button input:focus {
  border-color: #0e467c;
  box-shadow: 0 0 0 2px rgba(14, 70, 124, 0.1);
  outline: none;
}

.input-with-button input::placeholder {
  color: #94a3b8;
  font-style: italic;
}

.preview-content {
  background: #f8fafc;
  color: #334155;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  overflow: auto;
  font-size: 0.95rem;
  line-height: 1.5;
}

.hint-text {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: normal;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.empty {
  color: #94a3b8;
  font-style: italic;
}

a {
  color: #0e467c;
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: #0a3560;
  text-decoration: underline;
}

/* 按钮样式 */
.search-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  background: #e6f0f8;
  color: #0e467c;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.search-button:hover {
  background: #d0e5fa;
}

.search-button svg {
  width: 16px;
  height: 16px;
}

.round-remove-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  background: #f8e6e6;
  color: #8b0000;
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.round-remove-button:hover {
  background: #f0cfcf;
}

.round-remove-button svg {
  width: 16px;
  height: 16px;
}

.add-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: #e6f0f8;
  color: #0e467c;
  cursor: pointer;
  border-radius: 4px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.add-button:hover {
  background: #cfe0f0;
}

.add-button:disabled {
  background-color: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

.add-button svg {
  width: 16px;
  height: 16px;
}

button:disabled {
  background-color: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 徽标配置选项样式 */
.config-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.config-option {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
  color: #475569;
}

.config-option:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.config-option.active {
  background: #e6f0f8;
  border-color: #0e467c;
  color: #0e467c;
  font-weight: 500;
}

.option-text {
  pointer-events: none;
}

/* 隐藏原生radio按钮 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* 徽标预览区域 */
.badge-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
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

/* 代码预览区域 */
.code-preview {
  background: #f8fafc;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 0.5rem;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
}

.code-preview pre {
  margin: 0;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 0.85rem;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 徽标配置容器 */
.badge-config-container {
  display: flex;
  gap: 2rem;
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

/* 资源搜索对话框样式 */
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
  padding: 1.5rem;
  border-radius: 8px;
  width: 85%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-input-container {
  padding: 0 0.5rem 1rem;
  width: 100%;
  box-sizing: border-box;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #0e467c;
  box-shadow: 0 0 0 2px rgba(14, 70, 124, 0.1);
  outline: none;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  padding: 0.5rem;
  overflow-y: auto;
  flex: 1;
  margin-top: 0.5rem;
}

.resource-card {
  padding: 1rem;
  border-radius: 6px;
  cursor: pointer;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border-color: #cbd5e1;
}

.resource-card.selected {
  background: #e6f0f8;
  border-color: #0e467c;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.resource-name {
  font-weight: 600;
  color: #0e467c;
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.resource-type {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  background: #e6f0f8;
  color: #0e467c;
  white-space: nowrap;
  margin-left: 0.5rem;
}

.resource-author {
  font-size: 0.8rem;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-resources {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

/* 响应式调整 */
@media (min-width: 1200px) {
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

@media (max-width: 992px) {
  .modal-content {
    width: 90%;
  }
  
  .config-options {
    gap: 0.5rem;
  }
  
  .config-option {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 1rem;
    max-height: 85vh;
  }
  
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .form-section {
    padding: 1.25rem;
  }
  
  .input-with-button {
    flex-direction: column;
  }
  
  .input-with-button input,
  .input-with-button button {
    width: 100%;
  }
  
  /* 窄屏设备下徽标配置改为垂直布局 */
  .badge-config-container {
    flex-direction: column;
    gap: 1.5rem;
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
    padding: 1rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .preview-actions {
    margin-top: 1rem;
  }
  
  .add-button {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
