<template>
  <div
    v-loading="loading"
    class="api-docs"
    element-loading-text="Loading API documentation..."
  >
    <div id="redoc-container" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import constants from '@/constants'

const loading = ref(true)
let scriptEl = null

function getSwaggerUrl() {
  const apiUrl = constants.API_URL
  const base = process.env.BASE_URL || '/'
  if (!apiUrl || !apiUrl.startsWith('http')) {
    return base + 'swagger.json'
  }
  const url = new URL(apiUrl)
  return url.origin + base + 'swagger.json'
}

onMounted(() => {
  scriptEl = document.createElement('script')
  scriptEl.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js'
  scriptEl.onload = () => {
    loading.value = false
    window.Redoc.init(getSwaggerUrl(), {
      hideHostname: true,
      hideLoading: true
    }, document.getElementById('redoc-container'))
  }
  scriptEl.onerror = () => {
    loading.value = false
  }
  document.head.appendChild(scriptEl)
})

onBeforeUnmount(() => {
  if (scriptEl && scriptEl.parentNode) {
    scriptEl.parentNode.removeChild(scriptEl)
  }
})
</script>

<style lang="less" scoped>
.api-docs {
  min-height: 400px;
}
</style>
