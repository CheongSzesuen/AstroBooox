<template>
  <section class="ui-card">
    <header v-if="$slots.header || title || description" class="ui-card__header">
      <slot name="header">
        <h3 v-if="title" class="ui-card__title">{{ title }}</h3>
        <p v-if="description" class="ui-card__description">{{ description }}</p>
      </slot>
    </header>

    <div class="ui-card__content">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>
