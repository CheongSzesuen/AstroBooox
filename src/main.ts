import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useTheme } from './composables/useTheme'
import './style.css'

useTheme()
createApp(App).use(router).mount('#app')
