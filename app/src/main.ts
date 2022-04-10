import Vue from 'vue'
import VueCompositionAPI, { createApp, h } from '@vue/composition-api'
import { createPinia, PiniaVuePlugin } from 'pinia'
import vuetify from '@/plugins/vuetify'
import VTooltip from 'v-tooltip'
import DropdownMenu from '@innologica/vue-dropdown-menu'
import VueToast from 'vue-toast-notification';
import VueCountryCode from "vue-country-code";

import VuejsDialog from 'vuejs-dialog';
import VuejsDialogMixin from 'vuejs-dialog/dist/vuejs-dialog-mixin.min.js'; // only needed in custom components
 
// include the default style
import 'vuejs-dialog/dist/vuejs-dialog.min.css';
 
// Tell Vue to install the plugin.
Vue.use(VuejsDialog);

Vue.use(VueCountryCode);

// Import one of the available themes
//import 'vue-toast-notification/dist/theme-default.css';
import 'vue-toast-notification/dist/theme-sugar.css';

Vue.use(VueToast);

Vue.use(VTooltip)

import App from './App.vue'
import router from './router'

Vue.component('dropdown-menu', DropdownMenu)
Vue.use(VueCompositionAPI)

const app = createApp({
  router,
  vuetify,
  pinia: createPinia(),
  render: () => h(App)
})
app.use(PiniaVuePlugin)

app.mount('#app')
