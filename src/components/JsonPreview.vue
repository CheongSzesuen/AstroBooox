<template>
  <div class="json-preview-container">
    <div class="json-preview">
      <pre v-if="data">{{ formattedJson }}</pre>
      <div v-else class="empty">预览区域</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
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

    return { 
      formattedJson
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
  font-size: 15px;
  line-height: 1.8;
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
</style>