import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/cc/:pathMatch(.*)*',
      component: {
        render: () => null
      },
      beforeEnter: () => {
        if (typeof window !== 'undefined') {
          const { origin, pathname, search, hash } = window.location

          if (pathname.startsWith('/cc/help')) {
            window.location.replace(`${origin}/cc/help/${search}${hash}`)
          } else if (pathname === '/cc' || pathname === '/cc/') {
            window.location.replace(`${origin}/cc/${search}${hash}`)
          } else {
            const redirectedPath = encodeURIComponent(pathname)
            const queryPrefix = search ? `${search}&` : '?'
            window.location.replace(`${origin}/cc/${queryPrefix}cc_path=${redirectedPath}${hash}`)
          }
        }
        return false
      }
    },
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
        }
      ]
    }
  ]
})

export default router
