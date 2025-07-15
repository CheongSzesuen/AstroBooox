<template>
  <div ref="container" class="monaco-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as monaco from 'monaco-editor'

const manifest = ref<Manifest>({
  item: {
    name: '',
    description: '',
    preview: [],
    icon: '',
    source_url: '',
    author: []
  },
  downloads: {}
})

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const container = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor

onMounted(() => {
  if (!container.value) return

  editor = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language || 'json',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14,
    scrollBeyondLastLine: false
  })

  editor.onDidChangeModelContent(() => {
    const value = editor.getValue()
    emit('update:modelValue', value)
  })
})
</script>

<style scoped>
.monaco-editor {
  width: 100%;
  height: 500px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
</style>