<template>
  <div class="ui-tabs" role="tablist" :aria-label="label">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="item.value === modelValue"
      :class="['ui-tabs__item', item.value === modelValue && 'ui-tabs__item--active']"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label?: string
  items: Array<{ label: string; value: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
