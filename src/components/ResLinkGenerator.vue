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
                  placeholder="多彩线条"
                  @keyup.enter="copyLink"
                />
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// 由 Google Gemini 编写
// Script by Google Gemini

// 用于存储用户输入的资源名称
const resourceName = ref('');

// 基础链接
const baseUrl = 'https://astrobox.online/open?source=res&res=';
const suffixUrl = '&provider=official';

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
  /* font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace; */
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

/* 移动设备响应式样式 - 重点修改部分 */
@media (max-width: 768px) {
  .res-link-generator {
    padding: 0.5rem;
    width: 100%;
    box-sizing: border-box; /* 新增 */
  }

  .editor-content {
    padding: 0;
    width: 100%;
    margin: 0;
  }

  .editor-container {
    flex-direction: column;
    min-height: auto;
    width: 100%;
  }

  .form-container {
    padding: 0.75rem;
    border-radius: 0;
    width: 100%;
    margin: 0;
    box-sizing: border-box; /* 新增 */
  }

  .form-section {
    padding: 0.75rem;
    margin: 0 0 1rem 0; /* 简化边距 */
    width: 100%;
    box-sizing: border-box; /* 新增 */
  }

  .input-with-button {
    flex-direction: column;
    width: 100%;
  }

  .input-with-button input,
  .input-with-button button {
    width: 100%;
    box-sizing: border-box; /* 新增 */
  }

  .preview-content {
    padding: 0.75rem;
    width: 100%;
    box-sizing: border-box; /* 新增 */
    overflow-x: auto; /* 允许水平滚动 */
  }

  .preview-actions {
    justify-content: center;
    width: 100%;
  }

  /* 确保长链接不会撑开容器 */
  pre {
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>