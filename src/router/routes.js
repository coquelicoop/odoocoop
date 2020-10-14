
import App from '../App.vue'

const routes = [
  {
    path: '/',
    component: () => App,
    children: [
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes
