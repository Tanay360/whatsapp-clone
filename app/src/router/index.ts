import LoginView from '@/views/LoginView.vue'
import Vue from 'vue'
import VueRouter from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PageNotFound from '../views/PageNotFound.vue'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'history',
  base: import.meta.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'WhatsApp Clone' }
    },

    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: 'Login to WhatsApp Clone' }
    },
    { path: "*", component: PageNotFound, meta: { title: '404 not found' } }
  ]
})

const DEFAULT_TITLE = 'WhatsApp Clone';
router.afterEach((to, from) => {
    // Use next tick to handle router history correctly
    // see: https://github.com/vuejs/vue-router/issues/914#issuecomment-384477609
    Vue.nextTick(() => {
        document.title = to.meta?.title || DEFAULT_TITLE;
    });
});


export default router
