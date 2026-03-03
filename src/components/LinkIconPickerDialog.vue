<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="w-[95vw] !max-w-[900px]">
      <DialogHeader>
        <DialogTitle>搜索 phosphor 图标</DialogTitle>
        <DialogDescription>选择后会自动填入 links.icon 的图标名。</DialogDescription>
      </DialogHeader>

      <div class="max-h-[64vh] overflow-y-auto rounded-lg border border-border bg-muted/20">
        <div class="sticky top-0 z-10 border-b border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/85">
          <Input v-model="query" placeholder="输入关键词，例如 github / link / globe / chat / docs" />
          <div class="mt-2 text-xs text-muted-foreground">
            共 {{ filteredOptions.length }} 个候选图标
            <template v-if="filteredOptions.length > displayedOptions.length">
              ，当前仅展示前 {{ displayedOptions.length }} 个，请继续输入关键词缩小范围
            </template>
          </div>
        </div>

        <div class="p-3">
          <div class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
            <button
              v-for="option in displayedOptions"
              :key="option.key"
              type="button"
              class="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-center text-xs text-foreground transition hover:bg-accent"
              @click="selectIcon(option.name)"
            >
              <component
                :is="getIconComponent(option.pascalName)"
                :size="24"
                class="h-6 w-6 shrink-0 text-foreground"
              />
              <span class="line-clamp-2 break-all text-[11px] leading-4">{{ option.name }}</span>
            </button>
          </div>

          <div
            v-if="filteredOptions.length === 0"
            class="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground"
          >
            没有匹配结果
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">取消</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { icons as phosphorCoreIcons } from '@phosphor-icons/core'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface LinkIconOption {
  key: string
  name: string
  pascalName: string
  keywords: string
  baseScore: number
}

const props = defineProps<{
  open: boolean
  initialQuery?: string
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'select', value: string): void
}>()

const LINK_ICON_MAX_RENDER = 720

const preferredExact = new Set<string>([
  'link',
  'link-simple',
  'link-simple-horizontal',
  'link-simple-break',
  'github-logo',
  'gitlab-logo',
  'git-pull-request',
  'globe',
  'globe-hemisphere-west',
  'globe-simple',
  'code',
  'terminal',
  'book',
  'book-open',
  'article',
  'newspaper',
  'rss',
  'download',
  'download-simple',
  'cloud-arrow-down',
  'package',
  'telegram-logo',
  'discord-logo',
  'youtube-logo',
  'x-logo',
  'twitter-logo',
  'instagram-logo',
  'facebook-logo',
  'wechat-logo',
  'whatsapp-logo',
  'envelope',
  'envelope-simple',
  'chat',
  'chat-circle',
  'notion-logo',
  'figma-logo',
  'medium-logo',
  'dev-to-logo',
  'open-ai-logo'
])

const preferredTokens = [
  'link',
  'git',
  'repo',
  'github',
  'gitlab',
  'code',
  'terminal',
  'web',
  'globe',
  'site',
  'blog',
  'book',
  'article',
  'news',
  'docs',
  'read',
  'rss',
  'download',
  'cloud',
  'package',
  'message',
  'chat',
  'mail',
  'envelope',
  'social',
  'telegram',
  'discord',
  'youtube',
  'twitter',
  'x-logo',
  'instagram',
  'facebook',
  'wechat',
  'whatsapp',
  'notion',
  'figma',
  'medium',
  'dev',
  'stack',
  'open-ai'
]

const phosphorIconModules = import.meta.glob('/node_modules/@phosphor-icons/vue/dist/icons/*.vue.mjs', { eager: true })

const query = ref('')

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      query.value = props.initialQuery?.trim() || ''
    }
  }
)

const getBaseScore = (name: string, keywords: string): number => {
  let score = 0
  if (preferredExact.has(name)) score += 800
  for (const token of preferredTokens) {
    if (keywords.includes(token)) score += 40
  }
  return score
}

const iconOptions = computed<LinkIconOption[]>(() =>
  phosphorCoreIcons.map(icon => {
    const keywords = `${icon.name} ${icon.pascal_name} ${icon.tags.join(' ')} ${icon.categories.join(' ')}`.toLowerCase()
    return {
      key: icon.name,
      name: icon.name,
      pascalName: icon.pascal_name,
      keywords,
      baseScore: getBaseScore(icon.name, keywords)
    }
  })
)

const matchScore = (option: LinkIconOption, token: string): number => {
  const normalized = token.toLowerCase()
  if (option.name === normalized) return 300
  if (option.name.startsWith(normalized)) return 180
  if (option.pascalName.toLowerCase().startsWith(normalized)) return 170
  if (option.name.includes(normalized)) return 120
  if (option.keywords.includes(normalized)) return 60
  return 0
}

const filteredOptions = computed(() => {
  const raw = query.value.trim().toLowerCase()
  const tokens = raw.split(/\s+/).filter(Boolean)
  const matched = tokens.length
    ? iconOptions.value.filter(option => tokens.every(token => option.keywords.includes(token)))
    : iconOptions.value

  return [...matched].sort((a, b) => {
    const aMatch = tokens.reduce((sum, token) => sum + matchScore(a, token), 0)
    const bMatch = tokens.reduce((sum, token) => sum + matchScore(b, token), 0)
    const scoreDiff = bMatch + b.baseScore - (aMatch + a.baseScore)
    if (scoreDiff !== 0) return scoreDiff
    return a.name.localeCompare(b.name)
  })
})

const displayedOptions = computed(() =>
  filteredOptions.value.slice(0, LINK_ICON_MAX_RENDER)
)

const getIconComponent = (pascalName: string): Component | null => {
  const modulePath = `/node_modules/@phosphor-icons/vue/dist/icons/Ph${pascalName}.vue.mjs`
  const iconModule = phosphorIconModules[modulePath] as { default?: Component } | undefined
  return iconModule?.default || null
}

const selectIcon = (iconName: string): void => {
  emit('select', iconName)
  emit('update:open', false)
}
</script>
