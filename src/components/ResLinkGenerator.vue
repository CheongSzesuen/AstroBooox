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
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                  </svg>
                  搜索
                </button>
                <button 
                  @click="clearInput" 
                  :disabled="!resourceName.trim()" 
                  class="round-remove-button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
                  </svg>
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
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z" fill="currentColor"/>
                </svg>
                {{ copyButtonText }}
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

// 计算属性：根据 resourceName 生成最终的链接
const generatedLink = computed(() => {
  if (resourceName.value.trim() === '') {
    return '...'; // 如果没有输入，显示提示
  }
  // 对资源名称进行 URL 编码
  const encodedResourceName = encodeURIComponent(resourceName.value);
  return `${baseUrl}${encodedResourceName}${suffixUrl}`;
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
    
    // 处理CSV数据，过滤空行和无效数据
    const lines = csvText.split('\n')
      .filter(line => line.trim() !== '') // 过滤空行
      .filter(line => line.split(',').length >= 8); // 确保有足够的数据列
    
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
          obj[header] = values[index] || ''; // 处理可能缺失的值
          return obj;
        }, {});
      })
      .filter(resource => resource.name && resource.name.trim() !== ''); // 确保资源有名称
    
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

// 过滤资源列表
const filterResources = () => {
  if (!searchQuery.value) {
    filteredResources.value = [...allResources.value];
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredResources.value = allResources.value.filter(resource => {
    // 检查资源名称是否匹配
    const nameMatch = resource.name.toLowerCase().includes(query);
    // 检查作者名是否匹配
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
  // 检查浏览器是否支持 Clipboard API
  if (navigator.clipboard) {
    navigator.clipboard.writeText(generatedLink.value)
      .then(() => {
        copyButtonText.value = '已复制！';
        // 1.5 秒后恢复按钮文本
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
    // 备用方案：对于不支持 Clipboard API 的浏览器
    fallbackCopyTextToClipboard(generatedLink.value);
    copyButtonText.value = '请手动复制'; // 提示用户手动复制
  }
};

// 备用复制方法
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  // 避免在屏幕上显示文本区域
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    copyButtonText.value = '已复制！'; // 尽管是备用，也给个反馈
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
  resourceName.value = ''; // 核心逻辑：将 resourceName 重置为空字符串
  copyButtonText.value = '复制链接'; // 清除后，复制按钮文字也恢复
  if (copyTimeout) clearTimeout(copyTimeout); // 清除可能还在计时的复制成功提示
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
  padding: 1rem;
  background: #fff;
  border-radius: 6px;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
}

.input-with-button input:focus {
  border-color: #0e467c;
  box-shadow: 0 0 0 2px rgba(14, 70, 124, 0.2);
}

.input-with-button input::placeholder {
  color: #999;
  font-style: italic;
}

.preview-content {
  background: #f5f9fd;
  color: #333;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  font-size: 14px;
  line-height: 1.5;
}

.hint-text {
  color: #666;
  font-size: 0.9rem;
  font-weight: normal;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.empty {
  color: #6a737d;
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

.search-button:hover {
  background: #cfe0f0;
}

.search-button svg {
  width: 16px;
  height: 16px;
}

.round-remove-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: #f8e6e6;
  color: #8b0000;
  cursor: pointer;
  border-radius: 4px;
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
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-input-container {
  padding: 0 0.5rem 1rem;
  width: calc(100% - 1rem);
  box-sizing: border-box;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  font-weight: bold;
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
  color: #718096;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

/* 响应式调整 */
@media (min-width: 1200px) {
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 992px) {
  .modal-content {
    width: 90%;
    max-height: 75vh;
  }
  
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 1rem;
    max-height: 80vh;
  }
  
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 576px) {
  .modal-content {
    width: 98%;
    padding: 0.75rem;
    max-height: 85vh;
  }
  
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.5rem;
  }
  
  .resource-card {
    padding: 0.75rem;
  }
  
  .resource-name {
    font-size: 0.85rem;
  }
  
  .resource-type {
    font-size: 0.6rem;
  }
  
  .resource-author {
    font-size: 0.7rem;
  }
}

@media (max-width: 400px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .input-with-button {
    flex-direction: column;
  }
  
  .input-with-button input,
  .input-with-button button {
    width: 100%;
  }
}
</style>