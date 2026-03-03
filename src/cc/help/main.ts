import { createApp } from 'vue'
import App from './App.vue'
import '@/style.css'
import { useTheme } from '@/composables/useTheme'
import { registerServiceWorker } from '@/utils/registerServiceWorker'

useTheme()
void registerServiceWorker()
createApp(App).mount('#app')
