<template>
  <div v-if="open" class="ui-dialog-overlay" @click.self="$emit('close')">
    <section class="ui-dialog-content" role="dialog" aria-modal="true">
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()
</script>
