<template>
  <div class="min-h-screen bg-background">
    <header class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div class="mx-auto flex h-14 w-full max-w-[1320px] items-center gap-2 px-4 md:px-6">
        <a href="/" class="text-sm text-muted-foreground hover:text-foreground">
          返回主站
        </a>
        <div class="h-4 w-px bg-border" />
        <h1 class="text-sm font-semibold text-foreground md:text-base">Creator Console</h1>
        <div class="ml-auto">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
            @click="toggleTheme"
          >
            <Moon v-if="theme === 'light'" :size="16" weight="duotone" />
            <Sun v-else :size="16" weight="duotone" />
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1320px] space-y-4 p-4 md:p-6">
      <Tabs v-model:model-value="tab" class="space-y-4">
        <TabsList class="h-10 w-full justify-start border border-border bg-muted/40 p-1">
          <TabsTrigger value="publish" class="h-8 px-3">资源发布</TabsTrigger>
          <TabsTrigger value="git" class="h-8 px-3">Git 提交</TabsTrigger>
        </TabsList>

        <TabsContent value="publish" class="mt-0">
          <ResourcePublishWorkbench />
        </TabsContent>

        <TabsContent value="git" class="mt-0">
          <GitBrowserOps />
        </TabsContent>
      </Tabs>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PhMoon as Moon, PhSun as Sun } from '@phosphor-icons/vue'
import GitBrowserOps from '@/components/GitBrowserOps.vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/composables/useTheme'

const tab = ref<'publish' | 'git'>('publish')
const { theme, toggleTheme } = useTheme()
</script>
