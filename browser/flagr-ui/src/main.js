import { createApp } from 'vue'
import '@fontsource-variable/inter'
import './assets/tokens.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/message/style/css'
import App from './App.vue'
import router from './router'
import { useTheme } from './composables/useTheme'

// Init theme before mount to prevent flash
useTheme().init()

const app = createApp(App)
app.use(router)

app.directive('focus', {
  mounted(el) {
    const input = el.querySelector('input')
    if (input) input.focus()
  }
})

app.mount('#app')
