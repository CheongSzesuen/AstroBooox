<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { PhX as X } from "@phosphor-icons/vue"
import {
  DialogContent,
  DialogPortal,
  DialogClose,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import { sheetVariants, type SheetVariants } from "."
import SheetOverlay from "./SheetOverlay.vue"

const props = withDefaults(
  defineProps<DialogContentProps & { class?: HTMLAttributes["class"]; side?: SheetVariants["side"]; hideClose?: boolean }>(),
  {
    side: "right",
    hideClose: false,
  },
)
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "side")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      v-bind="forwarded"
      :class="cn(sheetVariants({ side: props.side }), props.class)"
    >
      <slot />

      <DialogClose
        v-if="!props.hideClose"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X :size="16" weight="bold" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
