<template>
  <div class="relative w-full">
    <div class="rounded-xl border border-border bg-muted/45 p-5 font-mono text-[15px] leading-[1.8] text-foreground">
      <pre v-if="data" class="m-0 whitespace-pre-wrap break-words">{{ formattedJson }}</pre>
      <div v-else class="italic text-muted-foreground">预览区域</div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { Manifest } from '../type/manifest'

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
