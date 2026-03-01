<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="['ui-button', `ui-button--${variant}`, `ui-button--${size}`]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineEmits<{
  click: [event: MouseEvent]
}>()

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false
  }
)
</script>
