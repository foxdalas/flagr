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
    }
  ]
})
