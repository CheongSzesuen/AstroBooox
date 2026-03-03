import { createApp } from 'vue'
import App from './App.vue'
import { useTheme } from '@/composables/useTheme'
import { registerServiceWorker } from '@/utils/registerServiceWorker'
import '@/style.css'

useTheme()
void registerServiceWorker()
createApp(App).mount('#app')
