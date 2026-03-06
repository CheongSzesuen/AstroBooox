import { createApp } from 'vue'
import App from './App.vue'
import { useTheme } from '@/composables/useTheme'
import { registerServiceWorker } from '@/utils/registerServiceWorker'
import '@/style.css'
import '@/cc/themes.css'

useTheme()
void registerServiceWorker()
createApp(App).mount('#app')
