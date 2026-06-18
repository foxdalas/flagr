import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/components/Flags')
    },
    {
      path: '/flags/:flagId',
      name: 'flag',
      component: () => import('@/components/Flag')
    },
    {
      path: '/docs/:section?',
      name: 'docs',
      component: () => import('@/components/Docs')
    },
    {
      // Catch-all for unmatched routes (e.g. "/flags" without an id, typos,
      // stale links). Without this, vue-router renders a blank page and logs
      // "No match found". Redirect to the flags list instead of dead-ending.
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/'
    }
  ]
})
