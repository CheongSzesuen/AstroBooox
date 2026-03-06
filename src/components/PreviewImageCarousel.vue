<template>
  <div
    v-if="items.length === 0"
    class="rounded-md border border-dashed border-border px-2.5 py-3 text-xs text-muted-foreground sm:px-3 sm:py-4"
  >
    {{ emptyText }}
  </div>
  <div v-else class="space-y-2 sm:space-y-3">
    <div class="space-y-1.5 sm:space-y-2">
      <div class="flex items-center justify-between gap-1.5 sm:gap-2">
        <div class="text-xs text-muted-foreground">
          共 {{ items.length }} 张
        </div>
        <div class="inline-flex items-center gap-0.5 sm:gap-1">
          <Button
            size="icon"
            variant="outline"
            class="h-7 w-7"
            :disabled="!canPreviewPrev"
            @click="scrollPreviewPrev"
          >
            <CaretRight :size="14" weight="bold" class="rotate-180" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            class="h-7 w-7"
            :disabled="!canPreviewNext"
            @click="scrollPreviewNext"
          >
            <CaretRight :size="14" weight="bold" />
          </Button>
        </div>
      </div>
      <div
        ref="previewScrollerRef"
        class="scrollbar-none flex flex-nowrap gap-2 overflow-x-auto pb-1 snap-x snap-mandatory touch-pan-x sm:gap-3"
        @scroll="syncPreviewScrollState"
        @wheel="onPreviewWheel"
      >
        <div
          v-for="(item, index) in items"
          :key="item.url"
          data-preview-slide="1"
          class="w-full max-w-full shrink-0 snap-start rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-sm sm:w-[320px] sm:max-w-[320px] sm:px-3 sm:py-2"
        >
          <div v-if="removable" class="mb-1 flex justify-end">
            <Button
              size="icon"
              variant="outline"
              class="h-7 w-7"
              :aria-label="`删除第 ${index + 1} 张预览图`"
              @click="emit('remove', index)"
            >
              <XIcon :size="14" weight="bold" />
            </Button>
          </div>
          <a
            :href="resolveImageUrl(item.url)"
            target="_blank"
            rel="noopener noreferrer"
            class="block overflow-hidden rounded-md border border-border/60 bg-background/70"
          >
            <img
              :src="resolveImageUrl(item.url)"
              :alt="`${item.file} 预览`"
              class="h-40 w-full object-contain sm:h-52"
              loading="lazy"
              @load="onImageLoad(item.url, $event)"
            />
          </a>
          <div class="mt-2 break-all text-xs text-muted-foreground">{{ item.file }}</div>
        </div>
      </div>
      <div v-if="previewSnapCount > 1" class="flex items-center justify-center gap-1.5">
        <button
          v-for="index in previewSnapCount"
          :key="`preview-dot-${index}`"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="index - 1 === previewActiveIndex ? 'w-5 bg-foreground/80' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'"
          :aria-label="`跳转到第 ${index} 张预览图`"
          @click="scrollPreviewTo(index - 1)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCaretRight as CaretRight, PhX as XIcon } from '@phosphor-icons/vue'
import { Button } from '@/components/ui/button'

type PreviewImageItem = {
  file: string
  url: string
}

const props = withDefaults(defineProps<{
  items: PreviewImageItem[]
  emptyText?: string
  imageUrlResolver?: (url: string) => string
  removable?: boolean
}>(), {
  emptyText: '未检测到图片资源',
  removable: false
})

const emit = defineEmits<{
  (event: 'image-load', payload: { url: string; event: Event }): void
  (event: 'remove', index: number): void
}>()

const previewScrollerRef = ref<HTMLElement | null>(null)
const previewCanPrev = ref(false)
const previewCanNext = ref(false)
const previewActiveIndex = ref(0)
const previewSnapCount = ref(0)
const PREVIEW_SCROLL_DISTANCE = 320

const syncPreviewScrollState = (): void => {
  const el = previewScrollerRef.value
  if (!el) {
    previewCanPrev.value = false
    previewCanNext.value = false
    previewActiveIndex.value = 0
    previewSnapCount.value = props.items.length
    return
  }
  previewCanPrev.value = el.scrollLeft > 4
  previewCanNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
  previewSnapCount.value = props.items.length

  const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-preview-slide="1"]'))
  if (slides.length === 0) {
    previewActiveIndex.value = 0
    return
  }
  const viewportCenter = el.scrollLeft + el.clientWidth / 2
  let matchedIndex = 0
  let minDistance = Number.POSITIVE_INFINITY
  slides.forEach((slide, index) => {
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
    const distance = Math.abs(slideCenter - viewportCenter)
    if (distance < minDistance) {
      minDistance = distance
      matchedIndex = index
    }
  })
  previewActiveIndex.value = matchedIndex
}

const canPreviewPrev = computed(() =>
  props.items.length > 0 && previewCanPrev.value
)
const canPreviewNext = computed(() =>
  props.items.length > 0 && previewCanNext.value
)

const scrollPreviewPrev = (): void => {
  const el = previewScrollerRef.value
  if (!el) return
  el.scrollBy({
    left: -Math.max(el.clientWidth * 0.82, PREVIEW_SCROLL_DISTANCE),
    behavior: 'smooth'
  })
}

const scrollPreviewNext = (): void => {
  const el = previewScrollerRef.value
  if (!el) return
  el.scrollBy({
    left: Math.max(el.clientWidth * 0.82, PREVIEW_SCROLL_DISTANCE),
    behavior: 'smooth'
  })
}

const scrollPreviewTo = (index: number): void => {
  const el = previewScrollerRef.value
  if (!el) return
  const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-preview-slide="1"]'))
  const target = slides[index]
  if (!target) return
  el.scrollTo({ left: Math.max(target.offsetLeft - 8, 0), behavior: 'smooth' })
}

const onPreviewWheel = (event: WheelEvent): void => {
  const el = previewScrollerRef.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth + 1) return

  const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY

  if (Math.abs(horizontalDelta) < 0.5) return
  event.preventDefault()
  el.scrollBy({ left: horizontalDelta, behavior: 'auto' })
}

const resolveImageUrl = (url: string): string =>
  props.imageUrlResolver ? props.imageUrlResolver(url) : url

const onImageLoad = (url: string, event: Event): void => {
  emit('image-load', { url, event })
}

watch(
  () => props.items.map(item => item.url).join('|'),
  async () => {
    await nextTick()
    const el = previewScrollerRef.value
    if (el) el.scrollTo({ left: 0, behavior: 'auto' })
    syncPreviewScrollState()
  },
  { immediate: true }
)

const handleWindowResize = (): void => {
  syncPreviewScrollState()
}

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
})
</script>
