import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import ManifestEditor from '../components/ManifestEditor.vue'
import CSVEGenerator from '../components/CSVEGenerator.vue'
import ResLinkGenerator from '../components/ResLinkGenerator.vue'
import FuckCodeReview from '../components/FuckCodeReview.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '', // 默认路由
          name: 'home',
          component: ManifestEditor
        },
        {
          path: 'manifest',
          name: 'manifest',
          component: ManifestEditor
        },
        {
          path: 'csv',
          name: 'csv',
          component: CSVEGenerator
        },
        {
          path: 'res-link',
          name: 'res-link',
          component: ResLinkGenerator
        },
        {
          path: 'code-review',
          name: 'code-review',
          component: FuckCodeReview
        }
      ]
    }
  ]
})

export default router