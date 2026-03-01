import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        {
          path: '', // 默认路由
          name: 'home',
          component: () => import('../components/ManifestEditor.vue')
        },
        {
          path: 'manifest',
          name: 'manifest',
          component: () => import('../components/ManifestEditor.vue')
        },
        {
          path: 'csv',
          name: 'csv',
          component: () => import('../components/CSVEGenerator.vue')
        },
        {
          path: 'res-link',
          name: 'res-link',
          component: () => import('../components/ResLinkGenerator.vue')
        },
        {
          path: 'code-review',
          name: 'code-review',
          component: () => import('../components/FuckCodeReview.vue')
        },
        {
          path: 'git-browser',
          name: 'git-browser',
          component: () => import('../components/GitBrowserOps.vue')
        }
      ]
    }
  ]
})

export default router
