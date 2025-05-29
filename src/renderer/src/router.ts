import { createWebHashHistory, createRouter } from 'vue-router'
const routes = [
  {
    path: '/main',
    component: () => import('./windows/main/Layout.vue'),
    children: [
      {
        path: '',
        component: () => import('./windows/main/pages/Index.vue')
      },
      {
        path: 'version',
        component: () => import('./windows/main/pages/Version.vue')
      }
    ]
  },
  {
    path: '/monitor',
    component: () => import('./windows/monitor/Layout.vue'),
    children: [
      {
        path: '',
        component: () => import('./windows/monitor/pages/Process.vue')
      }
    ]
  }
]
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
export default router
