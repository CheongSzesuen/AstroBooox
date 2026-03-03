import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useTheme } from './composables/useTheme'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { syncBuildStorage } from './utils/syncBuildStorage'
import './style.css'

syncBuildStorage()
useTheme()
void registerServiceWorker()
createApp(App).use(router).mount('#app')
