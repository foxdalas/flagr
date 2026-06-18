import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync, cpSync } from 'fs'
import { execSync } from 'node:child_process'

const srcDir = fileURLToPath(new URL('src', import.meta.url))
// Repo root holds docs/ and pkg/, imported as raw text by the Docs viewer.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const docsDir = fileURLToPath(new URL('../../docs', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url)))

// App version shown in the UI. Priority:
//   1. VITE_VERSION env (lets the build pipeline pin an explicit value)
//   2. exact git tag, else short commit hash (the "show true version" feature)
//   3. package.json version (when git is unavailable, e.g. a tarball build)
function resolveAppVersion() {
  if (process.env.VITE_VERSION) return process.env.VITE_VERSION
  try {
    return execSync(
      'git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD',
      { cwd: repoRoot, encoding: 'utf-8', shell: '/bin/sh' }
    ).trim() || pkg.version
  } catch {
    return pkg.version
  }
}
const appVersion = resolveAppVersion()

export default defineConfig({
  // Public base path. Mirrors the fork's vue.config `publicPath: BASE_URL`,
  // allowing deployment under a sub-path. Also drives import.meta.env.BASE_URL
  // used by the Docs/ApiDocs viewers. Defaults to '/' (serve at root).
  base: process.env.BASE_URL || '/',
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
    rollupOptions: {
      output: {
        // Keep the Vue/Element Plus runtime in a single chunk. Splitting them
        // makes the bundler emit a cross-chunk init reference
        // (init_runtime_dom_esm_bundler) that runs before it is defined,
        // crashing the app on load in the production build.
        manualChunks(id) {
          if (/node_modules\/(vue|@vue|@vueuse|element-plus|@element-plus)\//.test(id)) {
            return 'vendor-core'
          }
        }
      }
    }
  }
})
