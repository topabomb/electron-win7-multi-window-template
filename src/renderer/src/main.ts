import { createApp } from 'vue'
import App from './App.vue'

import { Quasar, Notify, Dialog } from 'quasar'
import quasarLang from 'quasar/lang/zh-CN'
import router from './router'
import { createPinia } from 'pinia'
// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'
// Import Quasar css
import 'quasar/src/css/index.sass'

const app = createApp(App)
const pinia = createPinia()
app.use(router)
app.use(pinia)
app.use(Quasar, {
  plugins: { Notify, Dialog }, // import Quasar plugins and add here
  lang: quasarLang
  /*
  config: {
    brand: {
      // primary: '#e46262',
      // ... or all other brand colors
    },
    notify: {...}, // default set of options for Notify Quasar plugin
    loading: {...}, // default set of options for Loading Quasar plugin
    loadingBar: { ... }, // settings for LoadingBar Quasar plugin
    // ..and many more (check Installation card on each Quasar component/directive/plugin)
  }
  */
})
app.mount('#app')
