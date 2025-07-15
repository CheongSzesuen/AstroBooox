<template>
  <div class="json-preview-container">
    <div class="json-preview">
      <pre v-if="data">{{ formattedJson }}</pre>
      <div v-else class="empty">预览区域</div>
    </div>
    <button class="copy-button" @click="copyToClipboard" :title="copyButtonText">
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"/>
      </svg>
      <span>{{ copyButtonText }}</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { Manifest } from '../type/manifest'
type JsonData = Record<string, any> | Array<any> | string | number | boolean | null

export default defineComponent({
  props: {
    data: {
      type: Object as () => Manifest | Record<string, any>,
      required: true
    }
  },
  setup(props) {
    const formattedJson = computed(() => JSON.stringify(props.data, null, 2))
    const copyButtonText = ref('复制')
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(formattedJson.value)
        copyButtonText.value = '已复制!'
        setTimeout(() => {
          copyButtonText.value = '复制'
        }, 2000)
      } catch (err) {
        console.error('复制失败:', err)
        copyButtonText.value = '复制失败'
        setTimeout(() => {
          copyButtonText.value = '复制'
        }, 2000)
      }
    }

    return { 
      formattedJson,
      copyButtonText,
      copyToClipboard
    }
  }
})
</script>

<style scoped>
.json-preview-container {
  position: relative;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.json-preview {
  background: #1e1e1e;
  color: #dcdcdc;
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
  flex: 1;
  font-family: 'MiSans', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  min-height: 0; /* 修复flex布局中的溢出问题 */
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty {
  color: #888;
  font-style: italic;
}

.copy-button {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(30, 30, 30, 0.8);
  color: #dcdcdc;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.copy-button:hover {
  background: rgba(60, 60, 60, 0.8);
  border-color: #82c1fd;
}

.copy-button svg {
  width: 16px;
  height: 16px;
}

.copy-button span {
  font-size: 0.875rem;
}
</style>