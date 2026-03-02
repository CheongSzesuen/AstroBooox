<template>
  <svg
    :width="cellWidth * columns"
    :height="cellHeight * rows"
    class="absolute inset-0 h-full w-full border border-white/25"
    aria-hidden="true"
  >
    <rect
      v-for="cell in cells"
      :key="cell.index"
      :x="cell.x"
      :y="cell.y"
      :width="cellWidth"
      :height="cellHeight"
      class="stroke-white/25 transition-all duration-150 [&:not(:hover)]:duration-1000"
      :class="hoveredIndex === cell.index ? 'fill-white/20' : 'fill-transparent'"
      @mouseenter="hoveredIndex = cell.index"
      @mouseleave="hoveredIndex = -1"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const cellWidth = 64
const cellHeight = 64
const columns = 16
const rows = 16
const hoveredIndex = ref(-1)

const cells = computed(() => {
  const result: Array<{ index: number; x: number; y: number }> = []
  const total = columns * rows
  for (let index = 0; index < total; index++) {
    const x = (index % columns) * cellWidth
    const y = Math.floor(index / columns) * cellHeight
    result.push({ index, x, y })
  }
  return result
})
</script>
