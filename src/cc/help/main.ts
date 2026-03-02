import { createApp } from 'vue'
import App from './App.vue'
import '@/style.css'
import { useTheme } from '@/composables/useTheme'

useTheme()
createApp(App).mount('#app')
