import { computed, ref } from 'vue'

const publishLogs = ref<string[]>([])

export const useCcPublishLogs = () => {
  const appendPublishLog = (message: string): void => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    publishLogs.value = [`[${time}] ${message}`, ...publishLogs.value].slice(0, 200)
  }

  const clearPublishLogs = (): void => {
    publishLogs.value = []
  }

  return {
    publishLogs: computed(() => publishLogs.value),
    publishLogsText: computed(() =>
      publishLogs.value.length ? publishLogs.value.join('\n') : '暂无日志'
    ),
    appendPublishLog,
    clearPublishLogs
  }
}
