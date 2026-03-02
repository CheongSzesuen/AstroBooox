<template>
  <CcTokenGate v-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <div v-else class="min-h-screen bg-background">
    <header
      class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-2 px-4 md:px-6">
        <a href="/" class="text-sm text-muted-foreground hover:text-foreground">返回主站</a>
        <div class="h-4 w-px bg-border" />
        <h1 class="text-sm font-semibold text-foreground md:text-base">Creator Console</h1>
        <div class="ml-2 min-w-0 flex-1 overflow-x-auto">
          <div class="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'publish' ? 'default' : 'ghost'"
              @click="tab = 'publish'"
            >
              <UploadSimple :size="15" weight="duotone" />
              资源发布
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'review' ? 'default' : 'ghost'"
              @click="tab = 'review'"
            >
              <ClockCounterClockwise :size="15" weight="duotone" />
              等待审核
            </Button>
            <Button
              size="sm"
              class="h-8 shrink-0"
              :variant="tab === 'published' ? 'default' : 'ghost'"
              @click="tab = 'published'"
            >
              <ArchiveBox :size="15" weight="duotone" />
              已发布资源
            </Button>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <a
            v-if="currentUser"
            :href="`https://github.com/${currentUser}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground transition hover:bg-accent"
            :title="`打开 ${currentUser} 的 GitHub 页面`"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="User Avatar"
              class="h-6 w-6 rounded-full border border-border object-cover"
            />
            <UserCircle v-else :size="18" weight="duotone" class="text-muted-foreground" />
            <span class="hidden sm:inline">{{ currentUser }}</span>
          </a>
          <div
            v-else
            class="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground"
          >
            <UserCircle :size="18" weight="duotone" />
            <span class="hidden sm:inline">未校验 Token</span>
          </div>

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

          <Button variant="outline" size="sm" class="h-8 px-2" @click="handleSignOut">
            <SignOut :size="15" weight="duotone" />
            <span class="hidden sm:inline">退出</span>
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] p-4 md:p-6">
      <div class="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div class="space-y-4 lg:sticky lg:top-[84px] lg:self-start">
          <aside v-if="workspacePath || workspaceTree.length" class="rounded-xl border border-border bg-card p-3">
            <div class="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">File Tree</div>
            <p class="truncate px-1 text-[11px] text-muted-foreground">{{ workspacePath || '未选择文件夹' }}</p>
            <nav class="mt-2 max-h-56 overflow-y-auto" aria-label="Workspace File Tree">
              <div
                v-if="workspaceTree.length === 0"
                class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
              >
                当前文件夹暂无可识别文件
              </div>
              <ul v-else class="space-y-1" role="tree" aria-label="Workspace Tree">
                <li
                  v-for="item in visibleWorkspaceItems"
                  :key="item.path"
                  role="treeitem"
                  :aria-level="item.depth + 1"
                >
                  <button
                    v-if="item.type === 'folder'"
                    type="button"
                    class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                    :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                    :title="item.path"
                    @click="toggleFolder(item.path)"
                  >
                    <CaretRight
                      v-if="item.collapsed"
                      :size="12"
                      weight="bold"
                      class="shrink-0 text-muted-foreground"
                    />
                    <CaretDown
                      v-else
                      :size="12"
                      weight="bold"
                      class="shrink-0 text-muted-foreground"
                    />
                    <FolderIcon
                      :size="14"
                      weight="fill"
                      class="shrink-0 text-muted-foreground"
                    />
                    <span class="truncate">{{ item.label }}</span>
                  </button>
                  <div
                    v-else
                    class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                    :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                    :title="item.path"
                  >
                    <span class="w-3 shrink-0" />
                    <FileIcon
                      :size="14"
                      weight="duotone"
                      class="shrink-0 text-muted-foreground"
                    />
                    <span class="truncate">{{ item.label }}</span>
                  </div>
                </li>
              </ul>
            </nav>
          </aside>

          <aside v-if="remoteWorkspacePath || remoteWorkspaceTree.length" class="rounded-xl border border-border bg-card p-3">
            <div class="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">GitHub仓库文件</div>
            <p class="truncate px-1 text-[11px] text-muted-foreground">{{ remoteWorkspacePath || '未同步远程仓库' }}</p>
            <nav class="mt-2 max-h-56 overflow-y-auto" aria-label="Remote File Tree">
              <div
                v-if="remoteWorkspaceTree.length === 0"
                class="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground"
              >
                当前 GitHub 仓库暂无可识别文件
              </div>
              <ul v-else class="space-y-1" role="tree" aria-label="Remote Tree">
                <li
                  v-for="item in visibleRemoteItems"
                  :key="item.path"
                  role="treeitem"
                  :aria-level="item.depth + 1"
                >
                  <button
                    v-if="item.type === 'folder'"
                    type="button"
                    class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/40"
                    :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                    :title="item.path"
                    @click="toggleRemoteFolder(item.path)"
                  >
                    <CaretRight
                      v-if="item.collapsed"
                      :size="12"
                      weight="bold"
                      class="shrink-0 text-muted-foreground"
                    />
                    <CaretDown
                      v-else
                      :size="12"
                      weight="bold"
                      class="shrink-0 text-muted-foreground"
                    />
                    <FolderIcon
                      :size="14"
                      weight="fill"
                      class="shrink-0 text-muted-foreground"
                    />
                    <span class="truncate">{{ item.label }}</span>
                  </button>
                  <div
                    v-else
                    class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-foreground hover:bg-muted/40"
                    :style="{ paddingLeft: `${0.5 + item.depth * 0.9}rem` }"
                    :title="item.path"
                  >
                    <span class="w-3 shrink-0" />
                    <FileIcon
                      :size="14"
                      weight="duotone"
                      class="shrink-0 text-muted-foreground"
                    />
                    <span class="truncate">{{ item.label }}</span>
                  </div>
                </li>
              </ul>
            </nav>
          </aside>

        </div>

        <section class="min-w-0 flex justify-center">
          <ResourcePublishWorkbench :mode="tab" />
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PhArchiveBox as ArchiveBox,
  PhCaretDown as CaretDown,
  PhCaretRight as CaretRight,
  PhClockCounterClockwise as ClockCounterClockwise,
  PhFile as FileIcon,
  PhFolder as FolderIcon,
  PhMoon as Moon,
  PhSignOut as SignOut,
  PhSun as Sun,
  PhUploadSimple as UploadSimple,
  PhUserCircle as UserCircle
} from '@phosphor-icons/vue'
import ResourcePublishWorkbench from '@/components/ResourcePublishWorkbench.vue'
import { Button } from '@/components/ui/button'
import CcTokenGate from '@/cc/CcTokenGate.vue'
import { useCcSession } from '@/composables/useCcSession'
import { useCcWorkspace } from '@/composables/useCcWorkspace'
import { useTheme } from '@/composables/useTheme'

const tab = ref<'publish' | 'review' | 'published'>('publish')
const { currentUser, avatarUrl, isAuthenticated, clearSession } = useCcSession()
const {
  workspacePath,
  workspaceTree,
  remoteWorkspacePath,
  remoteWorkspaceTree,
  clearWorkspace,
  clearRemoteWorkspace
} = useCcWorkspace()
const { theme, toggleTheme } = useTheme()
const collapsedFolders = ref<string[]>([])
const collapsedRemoteFolders = ref<string[]>([])

const visibleWorkspaceItems = computed(() => {
  const collapsedSet = new Set(collapsedFolders.value)
  const stack: string[] = []
  const items: Array<(typeof workspaceTree.value)[number] & { hidden: boolean; collapsed: boolean }> = []

  for (const item of workspaceTree.value) {
    while (stack.length > item.depth) {
      stack.pop()
    }

    const hidden = stack.some(path => collapsedSet.has(path))
    const collapsed = item.type === 'folder' && collapsedSet.has(item.path)
    items.push({ ...item, hidden, collapsed })

    if (item.type === 'folder') {
      stack.push(item.path)
    }
  }

  return items.filter(item => !item.hidden)
})

const visibleRemoteItems = computed(() => {
  const collapsedSet = new Set(collapsedRemoteFolders.value)
  const stack: string[] = []
  const items: Array<(typeof remoteWorkspaceTree.value)[number] & { hidden: boolean; collapsed: boolean }> = []

  for (const item of remoteWorkspaceTree.value) {
    while (stack.length > item.depth) {
      stack.pop()
    }

    const hidden = stack.some(path => collapsedSet.has(path))
    const collapsed = item.type === 'folder' && collapsedSet.has(item.path)
    items.push({ ...item, hidden, collapsed })

    if (item.type === 'folder') {
      stack.push(item.path)
    }
  }

  return items.filter(item => !item.hidden)
})

const toggleFolder = (path: string): void => {
  if (collapsedFolders.value.includes(path)) {
    collapsedFolders.value = collapsedFolders.value.filter(item => item !== path)
    return
  }
  collapsedFolders.value = [...collapsedFolders.value, path]
}

const toggleRemoteFolder = (path: string): void => {
  if (collapsedRemoteFolders.value.includes(path)) {
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(item => item !== path)
    return
  }
  collapsedRemoteFolders.value = [...collapsedRemoteFolders.value, path]
}

watch(
  () => workspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedFolders.value = collapsedFolders.value.filter(path => validFolderPaths.has(path))
  },
  { deep: true }
)

watch(
  () => remoteWorkspaceTree.value,
  tree => {
    const validFolderPaths = new Set(tree.filter(item => item.type === 'folder').map(item => item.path))
    collapsedRemoteFolders.value = collapsedRemoteFolders.value.filter(path => validFolderPaths.has(path))
  },
  { deep: true }
)

const handleAuthenticated = (): void => {
  tab.value = 'publish'
}

const handleSignOut = (): void => {
  clearWorkspace()
  clearRemoteWorkspace()
  clearSession()
}
</script>
