import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import ManifestEditor from '../components/ManifestEditor.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '', // 空路径表示默认子路由
          name: 'home',
          component: ManifestEditor
        }
      ]
    }
  ]
})

export default router