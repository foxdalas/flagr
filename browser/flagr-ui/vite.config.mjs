import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync, cpSync } from 'fs'

const srcDir = fileURLToPath(new URL('src', import.meta.url))
// Repo root holds docs/ and pkg/, imported as raw text by the Docs viewer.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const docsDir = fileURLToPath(new URL('../../docs', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url)))
// App version: injected from the build environment (e.g. Docker/CI sets
// VITE_VERSION to the real release/tag); falls back to package.json version.
const appVersion = process.env.VITE_VERSION || pkg.version

export default defineConfig({
  plugins: [
    vue(),
    // On-demand Element Plus: auto-import programmatic APIs (ElMessage, ...)
    // and register components with their styles. Mirrors the fork's setup.
    AutoImport({ resolvers: [ElementPlusResolver()], dts: false }),
    Components({ resolvers: [ElementPlusResolver()], dts: false }),
    // The in-app Docs viewer references repo docs images at docs/images/*;
    // copy them into the build output (replaces the fork's copy-webpack-plugin).
    {
      name: 'copy-docs-images',
      closeBundle() {
        const from = fileURLToPath(new URL('../../docs/images', import.meta.url))
        const to = fileURLToPath(new URL('dist/docs/images', import.meta.url))
        if (existsSync(from)) cpSync(from, to, { recursive: true })
      }
    }
  ],
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(appVersion)
  },
  resolve: {
    alias: {
      '@': srcDir,
      '@docs': docsDir
    },
    extensions: ['.mjs', '.js', '.vue', '.json']
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      },
      less: {}
    }
  },
  server: {
    port: 8080,
    fs: {
      // Allow importing raw docs/*.md and pkg/config/env.go from the repo root.
      allow: [repoRoot]
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:18000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    chunkSizeWarningLimit: 1500,
  }
})
