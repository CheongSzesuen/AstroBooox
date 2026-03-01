<template>
  <div class="relative w-full">
    <div class="rounded-xl border border-border bg-muted/35 p-4 font-mono text-sm leading-6 text-foreground md:p-5">
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
