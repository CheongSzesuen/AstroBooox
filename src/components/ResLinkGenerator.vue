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
        copyButtonText.value = '已复制！✅';
        // 1.5 秒后恢复按钮文本
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyButtonText.value = '复制链接';
        }, 1500);
      })
      .catch(err => {
        console.error('复制失败: ', err);
        copyButtonText.value = '复制失败 ❌';
      });
  } else {
    // 备用方案：对于不支持 Clipboard API 的浏览器
    fallbackCopyTextToClipboard(generatedLink.value);
    copyButtonText.value = '请手动复制 👆'; // 提示用户手动复制
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
    copyButtonText.value = '已复制！✅'; // 尽管是备用，也给个反馈
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copyButtonText.value = '复制链接';
    }, 1500);
  } catch (err) {
    console.error('备用复制失败', err);
    copyButtonText.value = '复制失败 ❌';
  }
  document.body.removeChild(textArea);
};

const clearInput = () => {
  resourceName.value = ''; // 核心逻辑：将 resourceName 重置为空字符串
  copyButtonText.value = '复制链接'; // 清除后，复制按钮文字也恢复
  if (copyTimeout) clearTimeout(copyTimeout); // 清除可能还在计时的复制成功提示
}
</script>

<template>
  <div class="res-link-generator"> <div class="editor-content"> <div class="editor-container">
        <!-- 表单容器 -->
        <div class="form-container">
          <!-- 资源信息部分 -->
          <div class="form-section">
            <h3>资源信息</h3>
            <div class="form-group">
              <label>资源名称</label>
              <input
                id="resourceNameInput"
                v-model="resourceName"
                placeholder="多彩线条"
                @keyup.enter="copyLink"
              />
            </div>

            <div class="button-group">
              <button @click="copyLink" :disabled="!resourceName.trim()">
                {{ copyButtonText }}
              </button>
              <button class="clear-button" @click="clearInput" :disabled="!resourceName.trim()">
                清除
              </button>
            </div>
          </div>

          <div class="form-section">
            <h3>生成的链接（点击可跳转）</h3>
            <div v-if="resourceName.trim()" class="preview-content">
              <pre><a :href="generatedLink" target="_blank" rel="noopener noreferrer">{{ generatedLink }}</a></pre>
            </div>
            <div v-else class="preview-content empty"> <pre>{{ generatedLink }}</pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 替换了 `--vp-c-` 变量为新组件中常用的具体颜色值，并调整了部分布局 */

/* 基础样式 - 沿用新组件的整体结构 */
.res-link-generator {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 1rem; /* 匹配新组件的 padding */
}

.editor-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  gap: 1rem; /* 匹配新组件的 gap */
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 500px; /* 保持新组件的最小高度 */
}

.form-container {
  flex: 1;
  min-width: 0;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
}

.form-section { /* 对应原组件的各个 section，例如 input-section, output-section */
  margin-bottom: 2rem; /* 匹配新组件的 section 间距 */
  padding: 1rem;
  background: #fff; /* 匹配新组件的 section 背景色 */
  border-radius: 6px;
}

/* 输入框区域的样式 */
.form-group { /* 对应原组件的 input-section */
  margin-bottom: 1rem; /* 调整为新组件的 form-group 间距 */
}

label {
  font-weight: bold;
  color: #1e293b; /* 匹配新组件的 label 颜色 */
  white-space: nowrap;
  display: block; /* 覆盖 flex 带来的行内显示，确保 label 独占一行或与 input 对齐 */
  margin-bottom: 0.5rem; /* 新组件 label 的 margin-bottom */
}

.hint-text {
  color: #666;
  font-size: 0.8rem;
  font-weight: normal;
}

input {
  flex-grow: 1;
  padding: 0.5rem; /* 匹配新组件的 padding */
  border: 1px solid #ccc; /* 匹配新组件的边框颜色 */
  border-radius: 4px; /* 匹配新组件的圆角 */
  font-size: 1rem;
  color: #333; /* 匹配新组件的文本颜色 */
  background-color: #fff; /* 匹配新组件的背景色 */
  box-shadow: none; /* 移除原组件的 box-shadow，或根据需要添加新组件的阴影 */
  box-sizing: border-box; /* 匹配新组件的 box-sizing */
  width: calc(100% - 1rem);
  max-width: 100%;
}

input:focus {
  border-color: #0e467c; /* 匹配新组件的 focus 边框颜色 */
  box-shadow: 0 0 0 2px rgba(14, 70, 124, 0.2); /* 匹配新组件的 focus 阴影 */
  outline: none;
}

input::placeholder {
  color: #999; /* 匹配新组件的 placeholder 颜色 */
  font-style: italic; /* 匹配新组件的 placeholder 样式 */
}

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px; /* 保持原组件的间距 */
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem; /* 匹配新组件按钮的 padding */
  background-color: #e6f0f8; /* 匹配新组件 add-button 的背景色 */
  color: #0e467c; /* 匹配新组件 add-button 的文本颜色 */
  border: none;
  border-radius: 4px; /* 匹配新组件 add-button 的圆角 */
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
  min-width: 100px;
}

button:hover {
  background: #cfe0f0; /* 匹配新组件 add-button 的 hover 背景色 */
}

.clear-button {
  background-color: #f8e6e6; /* 匹配新组件 round-remove-button 的背景色 */
  color: #8b0000; /* 匹配新组件 round-remove-button 的文本颜色 */
  border: none; /* 移除原组件的边框 */
}

.clear-button:hover {
  background: #f0cfcf; /* 匹配新组件 round-remove-button 的 hover 背景色 */
}

/* 添加这一条规则：当 .clear-button 禁用且被 hover 时 */
.clear-button:disabled:hover {
  /* 恢复到 disabled 状态的背景色和颜色，或者设为完全透明的背景 */
  background-color: #e2e8f0; /* 与 button:disabled 的背景色保持一致 */
  color: #94a3b8; /* 与 button:disabled 的文字颜色保持一致 */
  cursor: not-allowed; /* 确保鼠标仍然是禁止图标 */
}

button:disabled {
  background-color: #e2e8f0; /* 匹配新组件 modal-actions 按钮的 disabled 状态 */
  color: #94a3b8; /* 匹配新组件 modal-actions 按钮的 disabled 状态 */
  cursor: not-allowed;
  opacity: 0.7; /* 保持原组件的透明度 */
}


/* 输出部分样式 */
.preview-content { /* 对应原组件的 output-section */
  margin-top: 0; /* 移除原组件的 margin-top，因为 .form-section 已经有 margin-bottom */
  padding: 1rem; /* 匹配新组件的 padding */
  background: #f5f9fd; /* 匹配新组件的背景色 */
  border: 1px dashed #e2e8f0; /* 匹配新组件的边框样式 */
  border-radius: 6px; /* 保持原组件的圆角 */
  word-break: break-all;
  overflow: auto; /* 匹配新组件的 overflow */
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace; /* 匹配新组件的字体 */
  font-size: 14px; /* 匹配新组件的字体大小 */
  line-height: 1.5; /* 匹配新组件的行高 */
}

pre {
  margin: 0; /* 匹配新组件的 pre 样式 */
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: sans-serif;
}

.output-section h4 { /* 移除这个样式，因为现在用 h3 了 */
  display: none; /* 隐藏原组件的 h4 标题 */
}

a {
  color: #0e467c; /* 匹配新组件的链接颜色 */
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s ease;
  font-family: sans-serif; /* 匹配新组件的过渡效果 */
}

a:hover {
  color: #0a3560; /* 匹配新组件的链接 hover 颜色 */
  text-decoration: underline;
}

.placeholder-text.empty { /* 将原组件的 placeholder-text 与新组件的 empty 类合并 */
  color: #6a737d; /* 匹配新组件的 empty 文本颜色 */
  font-style: italic;
}

/* 移动设备响应式样式 - 沿用新组件的响应式处理 */
@media (max-width: 768px) {
  .res-link-generator {
    padding: 0.5rem;
    width: 100%;
  }

  .editor-content {
    padding: 0 0.5rem;
    width: 100%;
  }

  .editor-container {
    flex-direction: column;
    min-height: auto;
  }

  .form-container {
    padding: 0.75rem;
    border-radius: 0;
    width: 100%;
  }

  .form-section {
    padding: 0.75rem;
    margin-left: 0;
    margin-right: 0;
    margin-bottom: 1rem;
  }

  .form-row { /* 这在你的原组件中没有用到，但保留是为了兼容新组件的结构，以防将来需要 */
    flex-direction: column;
    gap: 0.5rem;
  }

  .half-width { /* 同上 */
    width: 100%;
  }

  input, select, textarea {
    width: calc(100% - 1rem); /* 调整宽度以适应 padding */
    max-width: 100%;
  }

  /* .device-list, .modal-content 等新组件特有的样式在此处不相关，无需引入 */

  .preview-content {
    padding: 0.75rem;
  }

  .button-group {
    flex-direction: column; /* 在移动端让按钮垂直堆叠 */
    gap: 0.5rem;
  }

  button {
    width: 100%; /* 按钮填充整个宽度 */
    min-width: auto;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }
}
</style>