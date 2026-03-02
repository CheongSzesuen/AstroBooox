<template>
  <div class="flex min-h-full w-full flex-col">
    <div class="flex min-h-full w-full flex-col gap-4">
      <div class="min-w-0">
          <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">资源信息</h3>
            <div>
              <label class="mb-2 block text-sm font-semibold text-foreground">资源名称</label>
              <div class="flex items-center gap-2 max-[768px]:flex-col">
                <Input
                  id="resourceNameInput"
                  v-model="resourceName"
                  placeholder="PoP☆P"
                  class="flex-1"
                  @keyup.enter="copyLink"
                />
                <Button
                  variant="outline"
                  class="gap-2 max-[768px]:w-full"
                  @click="openResourceSearch"
                >
                  <MagnifyingGlass :size="16" weight="bold" />
                  搜索
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  :disabled="!resourceName.trim()"
                  class="min-w-9 max-[768px]:w-full max-[768px]:justify-center"
                  @click="clearInput"
                >
                  <Minus :size="16" weight="bold" />
                </Button>
              </div>
            </div>
          </div>

          <div class="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">
              生成的链接<span class="ml-1 text-xs font-normal text-muted-foreground">（点击可跳转）</span>
            </h3>
            <div
              :class="[
                'rounded-lg border border-border bg-background p-4 text-sm leading-6',
                resourceName.trim() ? 'text-foreground' : 'italic text-muted-foreground'
              ]"
            >
              <pre class="m-0 whitespace-pre-wrap break-words font-mono">
                <a
                  v-if="resourceName.trim()"
                  :href="generatedLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline-offset-4 hover:underline"
                >{{ generatedLink }}</a>
                <template v-else>{{ generatedLink }}</template>
              </pre>
            </div>
            <div class="mt-4 flex justify-end">
              <Button :disabled="!resourceName.trim()" @click="copyLink">
                <CopySimple :size="16" weight="bold" />
                {{ copyButtonText }}
              </Button>
            </div>
          </div>

          <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 class="mb-4 text-base font-semibold">徽标代码生成</h3>

            <div class="mb-6 flex items-stretch gap-4 max-[768px]:flex-col">
              <div class="flex min-w-0 flex-1 flex-col max-w-[400px] max-[768px]:max-w-full">
                <div class="mb-4">
                  <label class="mb-2 block text-sm font-semibold text-foreground">语言</label>
                  <RadioGroup
                    v-model="badgeLanguage"
                    class="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                  >
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-lang-zhcn" value="zhcn" />
                      <Label for="badge-lang-zhcn">简体中文</Label>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-lang-en" value="en" />
                      <Label for="badge-lang-en">英文</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div class="mb-4">
                  <label class="mb-2 block text-sm font-semibold text-foreground">样式</label>
                  <RadioGroup
                    v-model="badgeStyle"
                    class="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                  >
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-style-standard" value="standard" />
                      <Label for="badge-style-standard">标准</Label>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-style-rounded" value="rounded" />
                      <Label for="badge-style-rounded">胶囊</Label>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-style-linked" value="linked" />
                      <Label for="badge-style-linked">链接</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-semibold text-foreground">配色</label>
                  <RadioGroup
                    v-model="badgeColor"
                    class="mt-2 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 max-[992px]:gap-2"
                  >
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-color-black" value="black" />
                      <Label for="badge-color-black">黑色</Label>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-color-gray" value="gray" />
                      <Label for="badge-color-gray">灰色</Label>
                    </div>
                    <div class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                      <RadioGroupItem id="badge-color-white" value="white" />
                      <Label for="badge-color-white">亮色</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div class="flex min-w-0 flex-1 flex-col max-[768px]:order-first">
                <div>
                  <label class="mb-2 block text-sm font-semibold text-foreground">
                    徽标预览<span class="ml-1 text-xs font-normal text-muted-foreground">（点击可跳转）</span>
                  </label>
                  <div class="mt-2 flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-background p-4">
                    <a
                      v-if="resourceName.trim()"
                      :href="generatedLink"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img :src="badgeImageUrl" alt="徽标预览" class="max-h-full max-w-full object-contain transition-all" />
                    </a>
                    <img
                      v-else
                      :src="badgeImageUrl"
                      alt="徽标预览"
                      class="max-h-full max-w-full object-contain transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <label class="mb-2 block text-sm font-semibold text-foreground">生成的HTML代码</label>
              <div class="scrollbar-none mt-2 overflow-x-auto rounded-lg border border-border bg-background p-4">
                <pre class="m-0 whitespace-pre-wrap break-words font-mono text-[0.85rem] text-foreground">{{ badgeHtmlCode }}</pre>
              </div>
            </div>

            <div class="mt-4 flex justify-end">
              <Button :disabled="!resourceName.trim()" @click="copyBadgeCode">
                <CopySimple :size="16" weight="bold" />
                {{ copyBadgeButtonText }}
              </Button>
            </div>
          </div>
      </div>

      <Dialog :open="showResourceSearch" @update:open="showResourceSearch = $event">
        <DialogContent class="max-w-[840px]">
          <DialogHeader>
            <DialogTitle>搜索资源</DialogTitle>
            <DialogDescription>暂时不支持模糊拼写纠错，请输入关键字搜索。</DialogDescription>
          </DialogHeader>
          <div class="w-full pb-3">
            <Input
              v-model="searchQuery"
              placeholder="输入资源名称或作者名搜索..."
              class="w-full"
              @input="filterResources"
            />
          </div>
          <div class="grid max-h-[52vh] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 overflow-y-auto p-1 min-[1200px]:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] max-[768px]:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-[768px]:gap-3">
            <div
              v-for="resource in filteredResources"
              :key="resource.name"
              :class="[
                'flex min-h-20 cursor-pointer flex-col justify-center rounded-lg border px-3.5 py-3 transition-colors',
                isResourceSelected(resource) ? 'border-ring bg-muted' : 'border-border bg-background hover:bg-accent'
              ]"
              @click="selectResource(resource)"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1 truncate text-[0.95rem] font-semibold text-foreground">{{ resource.name }}</div>
                <div class="shrink-0 whitespace-nowrap rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.7rem] text-foreground">
                  {{ resource.restype === 'quickapp' ? '快应用' : '表盘' }}
                </div>
              </div>
              <div class="truncate text-xs text-muted-foreground">作者: {{ getAuthorName(resource.path) }}</div>
            </div>
            <div v-if="filteredResources.length === 0" class="col-[1/-1] p-8 text-center text-sm text-muted-foreground">
              没有找到匹配的资源
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="closeResourceSearch">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  PhCopySimple as CopySimple,
  PhMagnifyingGlass as MagnifyingGlass,
  PhMinus as Minus
} from '@phosphor-icons/vue';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGitHubClient } from '@/utils/githubOctokitClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// 用于存储用户输入的资源名称
const resourceName = ref('');

// 基础链接
const baseUrl = 'https://astrobox.online/open?source=res&res=';
const suffixUrl = '&provider=official';

// 资源搜索相关状态
const showResourceSearch = ref(false);
const searchQuery = ref('');
const allResources = ref([]);
const filteredResources = ref([]);

// 徽标相关状态
const badgeStyle = ref('standard');
const badgeColor = ref('black');
const badgeLanguage = ref('zhcn');
const copyBadgeButtonText = ref('复制代码');
let copyBadgeTimeout = null;

// 计算属性：根据 resourceName 生成最终的链接
const generatedLink = computed(() => {
  if (resourceName.value.trim() === '') {
    return '...'; // 如果没有输入，显示提示
  }
  // 对资源名称进行 URL 编码
  const encodedResourceName = encodeURIComponent(resourceName.value);
  return `${baseUrl}${encodedResourceName}${suffixUrl}`;
});

// 计算属性：生成徽标图片URL
const badgeImageUrl = computed(() => {
  let stylePath = '';
  if (badgeStyle.value === 'rounded') {
    stylePath = 'rounded/';
  } else if (badgeStyle.value === 'linked') {
    stylePath = 'linked/';
  }
  return `https://astrobox.online/goab/${badgeLanguage.value}/${stylePath}${badgeColor.value}.svg`;
});

// 计算属性：生成徽标HTML代码
const badgeHtmlCode = computed(() => {
  if (resourceName.value.trim() === '') {
    return '<!-- 请输入资源名称后生成徽标代码 -->';
  }
  return `<a href="${generatedLink.value}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeImageUrl.value}" alt="Get it on AstroBox" height="46">
</a>`;
});

// 点击复制按钮时的提示文本
const copyButtonText = ref('复制链接');
let copyTimeout = null; // 用于清除延时器

// 从路径中提取作者名
const getAuthorName = (path) => {
  if (!path) return '未知';
  const parts = path.split('/');
  return parts.length > 0 ? parts[0] : '未知';
};

const decodeBase64Utf8 = (base64) => {
  const normalized = base64.replace(/\n/g, '');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

// 从远程加载资源列表
const loadResources = async () => {
  try {
    const { rest } = createGitHubClient();
    const { data } = await rest.repos.getContent({
      owner: 'AstralSightStudios',
      repo: 'AstroBox-Repo',
      path: 'index.csv',
      ref: 'main'
    });

    if (Array.isArray(data) || data.type !== 'file' || !data.content) {
      throw new Error('index.csv 内容获取失败');
    }

    const csvText = decodeBase64Utf8(data.content);
    const lines = csvText.split('\n').filter(line => line.trim() !== ''); // 过滤空行
    
    if (lines.length <= 1) {
      allResources.value = [];
      filteredResources.value = [];
      return;
    }
    
    const headers = lines[0].split(',');
    
    allResources.value = lines.slice(1)
      .map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      })
      .filter(resource => resource.name && resource.name.trim() !== '');
    
    filteredResources.value = [...allResources.value];
  } catch (error) {
    console.error('加载资源列表失败:', error);
    allResources.value = [];
    filteredResources.value = [];
  }
};

// 检查资源是否被选中
const isResourceSelected = (resource) => {
  return resourceName.value === resource.name;
}

// 打开资源搜索对话框
const openResourceSearch = async () => {
  if (allResources.value.length === 0) {
    await loadResources();
  }
  searchQuery.value = '';
  filteredResources.value = [...allResources.value];
  showResourceSearch.value = true;
};

// 关闭资源搜索对话框
const closeResourceSearch = () => {
  showResourceSearch.value = false;
};

// 过滤资源列表 (支持模糊搜索和作者名搜索)
const filterResources = () => {
  if (!searchQuery.value) {
    filteredResources.value = [...allResources.value];
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredResources.value = allResources.value.filter(resource => {
    const nameMatch = resource.name.toLowerCase().includes(query);
    const authorMatch = getAuthorName(resource.path).toLowerCase().includes(query);
    return nameMatch || authorMatch;
  });
};

// 选择资源
const selectResource = (resource) => {
  resourceName.value = resource.name;
  closeResourceSearch();
};

// 复制链接到剪贴板
const copyLink = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(generatedLink.value)
      .then(() => {
        copyButtonText.value = '已复制！';
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          copyButtonText.value = '复制链接';
        }, 1500);
      })
      .catch(err => {
        console.error('复制失败: ', err);
        copyButtonText.value = '复制失败 ';
      });
  } else {
    fallbackCopyTextToClipboard(generatedLink.value);
    copyButtonText.value = '请手动复制';
  }
};

// 复制徽标代码到剪贴板
const copyBadgeCode = () => {
  const codeToCopy = badgeHtmlCode.value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(codeToCopy)
      .then(() => {
        copyBadgeButtonText.value = '已复制！';
        if (copyBadgeTimeout) clearTimeout(copyBadgeTimeout);
        copyBadgeTimeout = setTimeout(() => {
          copyBadgeButtonText.value = '复制代码';
        }, 1500);
      })
      .catch(err => {
        console.error('复制失败: ', err);
        copyBadgeButtonText.value = '复制失败 ';
      });
  } else {
    fallbackCopyTextToClipboard(codeToCopy);
    copyBadgeButtonText.value = '请手动复制';
  }
};

// 备用复制方法
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    copyButtonText.value = '已复制！';
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
      copyButtonText.value = '复制链接';
    }, 1500);
  } catch (err) {
    console.error('备用复制失败', err);
    copyButtonText.value = '复制失败 ';
  }
  document.body.removeChild(textArea);
};

const clearInput = () => {
  resourceName.value = '';
  copyButtonText.value = '复制链接';
  if (copyTimeout) clearTimeout(copyTimeout);
}
</script>
